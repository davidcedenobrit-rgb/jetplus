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

export async function POST(req: Request) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { cotizacionId, enviarCorreo, correoDestino, observaciones, bancaNacional } = body ?? {}
  if (!cotizacionId) return NextResponse.json({ error: 'Falta la cotización' }, { status: 400 })

  const supabase = await createAdminClient()

  const { data: cot } = await supabase.from('cotizaciones').select('*').eq('id', cotizacionId).single()
  if (!cot) return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })

  // Una proforma por cotización.
  const { data: existente } = await supabase.from('proformas').select('id, numero').eq('cotizacion_id', cotizacionId).maybeSingle()
  if (existente) {
    return NextResponse.json({ error: 'Esta cotización ya tiene proforma', proformaId: existente.id, numero: existente.numero }, { status: 409 })
  }

  const modalidad = String(cot.modalidad ?? 'credito_24')
  const plan = String(cot.plan ?? 'vehimotors')
  const { key: planTipo, label: planLbl } = planLabelCotizacion(modalidad, plan)

  const est = (cot.estructura_costos ?? {}) as any
  const precioBase = Number(cot.precio_base ?? 0)
  const inicial = Number(cot.total_inicial ?? 0)
  const financiado = Number(cot.financiamiento_monto ?? 0)
  const cuotaMensual = Number(cot.cuota_mensual ?? 0)
  const meses = modalidad === 'contado' ? 0
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
    marca: cot.marca,
    modelo: cot.modelo,
    placa: null,
    color: null,
    anio: null,
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
      correo_destino: enviarCorreo ? String(correoDestino ?? cot.cliente_correo ?? '').trim().toLowerCase() : null,
      emitida_por: user.id,
    }])
    .select()
    .single()

  if (insertErr || !proforma) {
    console.error('[proformas/desde-cotizacion] insert error:', insertErr)
    return NextResponse.json({ error: 'Error al guardar la proforma' }, { status: 500 })
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
