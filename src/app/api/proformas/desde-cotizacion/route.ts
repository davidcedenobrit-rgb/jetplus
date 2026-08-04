export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { enviarProformaCliente } from '@/lib/email-proformas'

function fmtDate(d: string | Date) {
  const date = typeof d === 'string' ? new Date(d + (d.length === 10 ? 'T12:00:00' : '')) : d
  return date.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Etiqueta de plan para la proforma según la cotización.
function planLabelCotizacion(modalidad: string, plan: string): { key: string; label: string } {
  if (plan === 'banca_nacional') return { key: 'banca_nacional', label: 'Banca Nacional' }
  if (modalidad === 'contado') return { key: 'contado', label: 'Contado' }
  if (plan === 'banco_100') return { key: 'credito_40_60', label: 'Crédito 100% Banco' }
  if (plan === 'ac500') return { key: 'asegurate_500', label: 'Asegúrate con $500' }
  if (plan === 'personalizado') return { key: 'cuota_especial', label: 'Crédito personalizado' }
  return { key: 'financiamiento_vehimotors', label: 'Crédito Vehimotors' }
}

// Suma meses a una fecha (día 5 de cada mes, como el resto de los créditos).
function fechaCuota(base: Date, mesesAdelante: number): string {
  const d = new Date(base.getFullYear(), base.getMonth() + mesesAdelante, 5)
  return d.toISOString().slice(0, 10)
}

// Suma días a una fecha (para el cronograma armado por el director, que usa
// "a los N días" en abonos y cuotas).
function fechaMasDias(base: Date, dias: number): string {
  const d = new Date(base.getTime() + Math.round(dias) * 86400000)
  return d.toISOString().slice(0, 10)
}

export async function POST(req: Request) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { cotizacionId, enviarCorreo, correoDestino, observaciones, bancaNacional, showroomId, montos } = body ?? {}
  const ov = (montos ?? {}) as Record<string, any>
  const hasOv = (k: string) => ov[k] != null && ov[k] !== ''
  if (!cotizacionId) return NextResponse.json({ error: 'Falta la cotización' }, { status: 400 })

  const supabase = await createAdminClient()

  const { data: cot } = await supabase.from('cotizaciones').select('*').eq('id', cotizacionId).single()
  if (!cot) return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })

  // Unidad del showroom a reservar (opcional). Debe estar en agencia.
  let unidad: Record<string, any> | null = null
  if (showroomId) {
    const { data: u } = await supabase.from('vehiculos_showroom')
      .select('id, marca, modelo, version, color, placa, anio, vin, serial_motor, fecha_llegada, estado')
      .eq('id', showroomId).maybeSingle()
    if (!u) return NextResponse.json({ error: 'La unidad del showroom no existe' }, { status: 404 })
    // Se permite reservar una unidad en agencia o ya reservada (reasignarla a
    // esta proforma). Solo se bloquea si ya se vendió/salió.
    if (!['en_agencia', 'reservado'].includes(u.estado)) {
      return NextResponse.json({ error: 'Esa unidad ya no está disponible (vendida o transferida)' }, { status: 409 })
    }
    unidad = u
  }

  // Una proforma por cotización.
  const { data: existente } = await supabase.from('proformas').select('id, numero').eq('cotizacion_id', cotizacionId).maybeSingle()
  if (existente) {
    return NextResponse.json({ error: 'Esta cotización ya tiene proforma', proformaId: existente.id, numero: existente.numero }, { status: 409 })
  }

  // Gate del acuerdo de gestión de cobro: cuando La Oriental financia la
  // inicial, existe un acuerdo ligado a la cotización. En ese caso NO se puede
  // crear la proforma hasta que (a) la vendedora aceptó el acuerdo Y (b) el
  // cliente aprobó la cotización. Sin acuerdo, el flujo normal no cambia.
  const { data: acuerdo } = await supabase
    .from('acuerdos_cobro')
    .select('estado')
    .eq('cotizacion_id', cotizacionId)
    .maybeSingle()
  if (acuerdo) {
    if (acuerdo.estado !== 'aceptado') {
      return NextResponse.json({ error: 'La vendedora debe aceptar el acuerdo de gestión de cobro antes de crear la proforma.' }, { status: 409 })
    }
    if (cot.estado !== 'aceptada') {
      return NextResponse.json({ error: 'El cliente debe aprobar la cotización antes de crear la proforma.' }, { status: 409 })
    }
  }

  const modalidad = String(cot.modalidad ?? 'credito_24')
  const plan = String(cot.plan ?? 'vehimotors')
  const { key: planTipo, label: planLbl } = planLabelCotizacion(modalidad, plan)

  const est = (cot.estructura_costos ?? {}) as any
  // Montos: por defecto vienen de la cotización, pero si Rojas los editó en el
  // preview de "Así quedará la proforma" (montos.*), se usan esos.
  const precioBase = hasOv('precioBase') ? Number(ov.precioBase) : Number(cot.precio_base ?? 0)
  const inicial = hasOv('inicial') ? Number(ov.inicial) : Number(cot.total_inicial ?? 0)
  const financiado = hasOv('financiado') ? Number(ov.financiado) : Number(cot.financiamiento_monto ?? 0)
  const cuotaMensual = hasOv('cuotaMensual') ? Number(ov.cuotaMensual) : Number(cot.cuota_mensual ?? 0)
  const meses = hasOv('meses') ? Math.max(0, Math.round(Number(ov.meses)))
    : modalidad === 'contado' ? 0
    : Math.max(1, Math.round(
        Number(est.meses)
        || Number(cot.personalizado_meses)
        || Number(cot.cuotas_banco)
        || (plan === 'ac500' ? Number(cot.ac500_meses) : 0)
        || 24
      ))

  // Cronograma derivado. AC500 tiene cuotas variables (arreglo ac500_cuotas);
  // el resto usa N cuotas mensuales iguales.
  const hoy = new Date()
  const ac500Cuotas = Array.isArray(cot.ac500_cuotas) ? (cot.ac500_cuotas as number[]) : []
  let cronogramaSnapshot: any[]
  if (plan === 'ac500' && ac500Cuotas.length > 0) {
    cronogramaSnapshot = ac500Cuotas.map((monto, i) => ({
      numero: i + 1,
      fecha_vencimiento: fechaCuota(hoy, i + 1),
      monto: Number(monto) || 0,
      estado: 'pendiente',
      monto_pagado: 0,
    }))
  } else if (modalidad === 'contado' || cuotaMensual <= 0) {
    cronogramaSnapshot = []
  } else {
    cronogramaSnapshot = Array.from({ length: meses }, (_, i) => ({
      numero: i + 1,
      fecha_vencimiento: fechaCuota(hoy, i + 1),
      monto: cuotaMensual,
      estado: 'pendiente',
      monto_pagado: 0,
    }))
  }
  // Si el director armó el cronograma en el editor (abonos del inicial + cuotas),
  // ese cronograma manda sobre el derivado.
  if (Array.isArray(ov.cronograma) && ov.cronograma.length > 0) {
    cronogramaSnapshot = ov.cronograma.map((c: any, i: number) => {
      const dias = c.dias != null && c.dias !== '' ? Math.round(Number(c.dias)) : null
      return {
        numero: Number(c.numero) || (i + 1),
        tipo: c.tipo ?? null,
        etiqueta: c.etiqueta ?? null,
        dias,
        // Fecha real del pago: la envía el cliente, o se calcula desde "a los N días".
        fecha_vencimiento: c.fecha_vencimiento ?? (dias != null && Number.isFinite(dias) ? fechaMasDias(hoy, dias) : null),
        monto: Number(c.monto) || 0,
        estado: 'pendiente',
        monto_pagado: 0,
      }
    })
  }

  // Para AC500, la "cuota mensual" de referencia (correo/PDF) es la primera cuota.
  const cuotaRef = plan === 'ac500' && ac500Cuotas.length > 0 ? Number(ac500Cuotas[0]) || 0 : cuotaMensual

  const clienteSnapshot = {
    id: cot.cliente_id ?? null,
    nombre: cot.cliente_nombre,
    cedula_rif: cot.cliente_ci_rif,
    telefono: cot.cliente_telefono,
    whatsapp: cot.cliente_telefono,
    direccion: cot.cliente_direccion,
    correo: cot.cliente_correo,
    ciudad: cot.cliente_ciudad_estado,
  }
  const vehiculoSnapshot = {
    id: cot.vehiculo_id ?? null,
    showroom_id: unidad?.id ?? null,
    marca: unidad?.marca ?? cot.marca,
    modelo: unidad?.modelo ?? cot.modelo,
    version: unidad?.version ?? null,
    placa: unidad?.placa ?? null,
    color: unidad?.color ?? null,
    anio: unidad?.anio ?? null,
    vin: unidad?.vin ?? null,
    serial_motor: unidad?.serial_motor ?? null,
    fecha_llegada: unidad?.fecha_llegada ?? null,
    precio_total: precioBase,
    precio_base: precioBase,
  }
  const creditoSnapshot = {
    id: null,
    plan_tipo: planTipo,
    monto_financiado: financiado,
    inicial,
    saldo: financiado,
    num_cuotas: meses,
    frecuencia_pago: 'mensual',
    fecha_inicio: hoy.toISOString().slice(0, 10),
    moneda: 'USD',
    estado: 'proforma',
    acuerdo_inicial: null,
  }

  // Banca nacional: reparto banco/cliente. Se guarda y se resume en observaciones.
  const fmtMoney = (n: number) => Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  let bancaNacionalData: any = null
  let observacionesFinal = observaciones?.trim() || null

  // Condiciones de pago personalizadas propuestas en la cotización: si el cliente
  // aceptó, se convierten en la modalidad/observación de la proforma.
  const condPersonalizadas = (cot.condiciones_personalizadas ?? '').trim() || null
  if (condPersonalizadas) {
    const resumenCond = `Condiciones de pago acordadas: ${condPersonalizadas}`
    observacionesFinal = observacionesFinal ? `${resumenCond}\n${observacionesFinal}` : resumenCond
  }

  if (plan === 'banca_nacional' && bancaNacional && Number(bancaNacional.aprobado_banco) > 0) {
    const aprobado = Number(bancaNacional.aprobado_banco) || 0
    const restante = Math.max(0, Number(bancaNacional.restante ?? (inicial - aprobado)))
    const metodo = bancaNacional.restante_metodo === 'acuerdo' ? 'acuerdo' : 'contado'
    bancaNacionalData = { aprobado_banco: aprobado, restante, restante_metodo: metodo, banco: null }
    const resumen = `Banca Nacional — Banco aprueba $${fmtMoney(aprobado)} · Cliente $${fmtMoney(restante)} (${metodo === 'acuerdo' ? 'acuerdo de pago' : 'de contado'}).`
    observacionesFinal = observacionesFinal ? `${resumen}\n${observacionesFinal}` : resumen
  }

  const { data: proforma, error: insertErr } = await supabase
    .from('proformas')
    .insert([{
      cotizacion_id: cotizacionId,
      credito_id: null,
      cliente_id: cot.cliente_id ?? null,
      banca_nacional: bancaNacionalData,
      // vehiculo_id FK apunta a `vehiculos` (carro físico). En pre-venta aún no
      // hay unidad asignada; el modelo/precio viaja en vehiculo_snapshot. Se
      // asigna el carro físico al registrar la venta (fase venta).
      vehiculo_id: null,
      cliente_snapshot: clienteSnapshot,
      vehiculo_snapshot: vehiculoSnapshot,
      credito_snapshot: creditoSnapshot,
      cronograma_snapshot: cronogramaSnapshot,
      precio_vehiculo: precioBase,
      monto_inicial: inicial,
      monto_financiado: financiado,
      saldo_pendiente: financiado,
      num_cuotas: meses,
      primera_cuota_fecha: cronogramaSnapshot[0]?.fecha_vencimiento ?? null,
      ultima_cuota_fecha: cronogramaSnapshot[cronogramaSnapshot.length - 1]?.fecha_vencimiento ?? null,
      observaciones: observacionesFinal,
      // El texto de condiciones del editor (auto-generado/editado en el modal)
      // manda sobre el de la cotización, para que el PDF muestre lo acordado.
      condiciones_personalizadas: (String(observaciones ?? '').trim() || condPersonalizadas),
      // Propuesta de pago negociada (desglose renglón por renglón) — viaja
      // estructurada a la proforma para reusarla en la venta.
      estructura_costos: cot.estructura_costos ?? null,
      // Unidad física del showroom reservada para esta proforma (opcional).
      showroom_id: unidad?.id ?? null,
      bn_vehimotors: cot.bn_vehimotors ?? null,
      vendedoras: cot.vendedoras ?? (cot.vendedora_nombre ? [{ nombre: cot.vendedora_nombre }] : null),
      correo_destino: enviarCorreo ? String(correoDestino ?? cot.cliente_correo ?? '').trim().toLowerCase() : null,
      emitida_por: user.id,
    }])
    .select()
    .single()

  if (insertErr || !proforma) {
    console.error('[proformas/desde-cotizacion] insert error:', insertErr)
    return NextResponse.json({ error: 'Error al guardar la proforma' }, { status: 500 })
  }

  // Reservar la unidad del showroom para este cliente/proforma.
  if (unidad) {
    await supabase.from('vehiculos_showroom').update({
      estado: 'reservado',
      cliente_id: cot.cliente_id ?? null,
      reservado_por: user.id,
      reserva_notas: `Proforma ${proforma.numero}${cot.cliente_nombre ? ` · ${cot.cliente_nombre}` : ''}`,
      updated_at: new Date().toISOString(),
    }).eq('id', unidad.id).in('estado', ['en_agencia', 'reservado'])
  }

  let correoEnviado = false
  let correoError: string | null = null
  const destino = String(correoDestino ?? cot.cliente_correo ?? '').trim().toLowerCase()
  if (enviarCorreo && destino) {
    try {
      await enviarProformaCliente({
        proformaId: proforma.id,
        numero: proforma.numero,
        fecha: fmtDate(proforma.fecha_emision),
        correoDestino: destino,
        clienteNombre: cot.cliente_nombre,
        marca: cot.marca ?? '',
        modelo: cot.modelo ?? '',
        placa: null,
        precioVehiculo: precioBase,
        inicialPagada: inicial,
        saldoFinanciado: financiado,
        cuotaMensual: cuotaRef,
        numeroCuotas: meses,
        planLabel: planLbl,
        condicionesPersonalizadas: condPersonalizadas,
        preVenta: true,
      })
      await supabase.from('proformas').update({ correo_enviado_at: new Date().toISOString() }).eq('id', proforma.id)
      correoEnviado = true
    } catch (e: any) {
      console.error('[proformas/desde-cotizacion] email error:', e?.message)
      correoError = e?.message ?? 'Error al enviar el correo'
    }
  }

  return NextResponse.json({ ok: true, proformaId: proforma.id, numero: proforma.numero, correoEnviado, correoError })
}
