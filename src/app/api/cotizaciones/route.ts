export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { enviarCotizacionCliente, enviarNotificacionRojas } from '@/lib/email-cotizaciones'
import type { CotizacionPDFData, AC500ScheduleData, AC500CuotaItem } from '@/lib/cotizacion-pdf'
import { getConcesionarioIdentity } from '@/lib/concesionario'

function fmtDate(d: Date) {
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export async function POST(req: Request) {
  try {
    const authClient = await createClient()
    const { data: { user: authUser } } = await authClient.auth.getUser()
    if (!authUser) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const {
      codigo,
      vehiculoId,
      clienteNombre,
      clienteCiRif,
      clienteCorreo,
      clienteTelefono,
      clienteDireccion,
      clienteCiudadEstado,
      clienteCodigoPostal,
      agenteRetencion,
      modalidad,
      plan = 'vehimotors',
      ac500PlanId,
      ac500Meses: ac500MesesBody,
      cantidad,
      concesionarioId,
    } = body

    // Cantidad de vehículos (entero >= 1), independiente del stock de showroom
    const cantidadNum = Math.max(1, Math.floor(Number(cantidad) || 1))

    // Validaciones básicas
    if (!codigo || !vehiculoId || !clienteNombre?.trim() || !clienteCiRif?.trim() || !clienteCorreo?.trim() || !modalidad) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }
    if (!['contado', 'credito_24'].includes(modalidad)) {
      return NextResponse.json({ error: 'Modalidad inválida' }, { status: 400 })
    }
    if (!['vehimotors', 'banco_100', 'ac500'].includes(plan)) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }
    if (plan === 'ac500' && (!ac500PlanId || !ac500MesesBody)) {
      return NextResponse.json({ error: 'Plan AC500 incompleto' }, { status: 400 })
    }
    if (!/^[A-Za-z]\d{3}$/.test(String(codigo).trim())) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Identidad del concesionario para el encabezado. Solo se acepta uno ACTIVO;
    // si no existe o está inactivo, se usa La Oriental (por defecto).
    let concIdSolicitado: string | null = concesionarioId ?? null
    if (concIdSolicitado) {
      const { data: cRow } = await supabase
        .from('concesionarios')
        .select('activo')
        .eq('id', concIdSolicitado)
        .maybeSingle()
      if (!cRow || !cRow.activo) concIdSolicitado = null
    }
    const conces = await getConcesionarioIdentity(supabase, concIdSolicitado)

    // Verificar vendedora. El código interno de la casa (R000) siempre es
    // válido: lo usa el generador del Centro de Mando y no debe depender del
    // interruptor de "activa" (que sí aplica a las vendedoras públicas).
    const CODIGO_CASA = 'R000'
    const codigoTrim = String(codigo).trim()
    const { data: vendedora } = await supabase
      .from('vendedoras')
      .select('nombre, activa')
      .eq('codigo', codigoTrim)
      .single()

    if (!vendedora || (!vendedora.activa && codigoTrim !== CODIGO_CASA)) {
      return NextResponse.json({ error: 'Código de vendedora inválido' }, { status: 401 })
    }

    // Obtener vehículo
    const { data: vehiculo } = await supabase
      .from('catalogo_ventas')
      .select('brand, model, cash, gc, gcr, tasa_credito, placa_monto, poliza_vehiculo_banco, poliza_vida_banco, honorarios_banco, gastos_internos_banco, alfombras_banco, diferencial_pct, tasa_banco_pct')
      .eq('id', vehiculoId)
      .single()

    if (!vehiculo) {
      return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 })
    }

    const precioBase = Number(vehiculo.cash) || 0
    const iva = precioBase * 0.16

    // AC500 plan lookup
    let ac500Schedule: AC500ScheduleData | null = null
    const ac500Meses = ac500MesesBody ? Number(ac500MesesBody) : null

    if (plan === 'ac500' && ac500PlanId) {
      const { data: planRow } = await supabase
        .from('planes_ac500')
        .select('cuota_0, cuota_1, cuota_2, cuota_3, cuota_4, cuota_5, cuota_6, cuota_7, cuota_8, cuota_9, total, modelo, meses')
        .eq('id', ac500PlanId)
        .eq('activo', true)
        .single()
      if (!planRow) {
        return NextResponse.json({ error: 'Plan AC500 no encontrado' }, { status: 404 })
      }
      const n = Number(planRow.meses)
      const cuotas: AC500CuotaItem[] = []
      for (let i = 1; i <= n; i++) {
        cuotas.push({
          label: i === n ? `Cuota ${i} (Entrega)` : `Cuota ${i}`,
          monto: Number((planRow as Record<string, unknown>)[`cuota_${i}`]) || 0,
        })
      }
      ac500Schedule = {
        reserva: Number(planRow.cuota_0) || 500,
        meses: n,
        modelo: String(planRow.modelo ?? ''),
        cuotas,
        total: Number(planRow.total) || 0,
      }
    }

    // Diferencial plan 100% Banco
    let diferencial = 0
    let totalVehiculoBanco = 0

    if (plan === 'banco_100' && modalidad === 'credito_24') {
      // El diferencial cambiario sale de las tasas globales (BCV y USDT):
      // % = (USDT - BCV) / BCV, aplicado sobre el monto financiado (70%).
      const { data: cfgTasas } = await supabase
        .from('config_cotizaciones')
        .select('clave, valor')
        .in('clave', ['tasa_bcv', 'tasa_usdt'])
      const tasaBcv  = Number(cfgTasas?.find(c => c.clave === 'tasa_bcv')?.valor) || 0
      const tasaUsdt = Number(cfgTasas?.find(c => c.clave === 'tasa_usdt')?.valor) || 0
      const difPct = (tasaBcv > 0 && tasaUsdt > tasaBcv) ? (tasaUsdt - tasaBcv) / tasaBcv : 0

      const placaMonto = Number(vehiculo.placa_monto) || 400
      totalVehiculoBanco = precioBase + iva + placaMonto
      const financiamientoBanco = totalVehiculoBanco * 0.70
      diferencial = financiamientoBanco * difPct
    }

    let gastosBase: number
    if (plan === 'banco_100' && modalidad === 'credito_24') {
      gastosBase =
        (Number(vehiculo.poliza_vehiculo_banco) || 0) +
        (Number(vehiculo.poliza_vida_banco) || 0) +
        (Number(vehiculo.honorarios_banco) || 0) +
        (Number(vehiculo.gastos_internos_banco) || 0) +
        (Number(vehiculo.alfombras_banco) || 0)
    } else if (plan === 'ac500') {
      gastosBase = 0
    } else if (modalidad === 'contado') {
      gastosBase = Number(vehiculo.gc) || 0
    } else {
      gastosBase = Number(vehiculo.gcr) || 0
    }
    const gastos = gastosBase + diferencial

    let totalInicial: number
    let financiamientoMonto: number | null = null
    let cuotaMensual: number | null = null
    let costoTotal: number

    if (plan === 'ac500' && ac500Schedule) {
      totalInicial = ac500Schedule.reserva
      costoTotal = ac500Schedule.total
      financiamientoMonto = costoTotal - totalInicial
      cuotaMensual = null
    } else if (modalidad === 'contado') {
      totalInicial = precioBase + iva + gastos
      costoTotal = totalInicial
    } else if (plan === 'banco_100') {
      const inicialBanco = totalVehiculoBanco * 0.30
      totalInicial = inicialBanco + gastos
      financiamientoMonto = totalVehiculoBanco * 0.70
      const tasaBanco = Number(vehiculo.tasa_banco_pct) || 16
      const r = tasaBanco / 100 / 12
      const financiamiento = totalVehiculoBanco * 0.70
      cuotaMensual = financiamiento * r * Math.pow(1 + r, 24) / (Math.pow(1 + r, 24) - 1)
      costoTotal = totalInicial + cuotaMensual * 24
    } else {
      const inicial40 = precioBase * 0.4
      totalInicial = inicial40 + iva + gastos
      financiamientoMonto = precioBase * 0.6
      cuotaMensual = Number(vehiculo.tasa_credito) || 0
      costoTotal = totalInicial + cuotaMensual * 24
    }

    const hoy = new Date()
    const venc = new Date(hoy)
    venc.setDate(venc.getDate() + 3)

    // Vincular cliente_id si ya existe un cliente con esta CI/RIF
    const ciNorm = clienteCiRif.trim().toUpperCase()
    const { data: clienteExistente } = await supabase
      .from('clientes')
      .select('id')
      .ilike('cedula_rif', ciNorm)
      .limit(1)
      .maybeSingle()
    const clienteIdVinculado = clienteExistente?.id ?? null

    // Insertar cotización (trigger auto-genera numero y numero_seq)
    const { data: cot, error: insertError } = await supabase
      .from('cotizaciones')
      .insert([{
        fecha: hoy.toISOString().slice(0, 10),
        vencimiento: venc.toISOString().slice(0, 10),
        vendedora_nombre: vendedora.nombre,
        concesionario_id: conces.id,
        cliente_id: clienteIdVinculado,
        cliente_nombre: clienteNombre.trim(),
        cliente_ci_rif: clienteCiRif.trim(),
        cliente_correo: clienteCorreo.trim().toLowerCase(),
        cliente_telefono: clienteTelefono?.trim() || null,
        cliente_direccion: clienteDireccion?.trim() || null,
        cliente_ciudad_estado: clienteCiudadEstado?.trim() || null,
        cliente_codigo_postal: clienteCodigoPostal?.trim() || null,
        agente_retencion: !!agenteRetencion,
        vehiculo_id: vehiculoId,
        marca: vehiculo.brand,
        modelo: vehiculo.model,
        cantidad: cantidadNum,
        precio_base: precioBase,
        modalidad,
        plan,
        iva_monto: iva,
        gastos_monto: gastos,
        diferencial_monto: diferencial > 0 ? diferencial : null,
        tasa_bcv_snap: null,
        tasa_vhm_snap: null,
        total_inicial: totalInicial,
        financiamiento_monto: financiamientoMonto,
        cuota_mensual: cuotaMensual,
        costo_total: costoTotal,
        ac500_meses: plan === 'ac500' ? ac500Meses : null,
        ac500_cuotas: plan === 'ac500' && ac500Schedule ? ac500Schedule.cuotas.map(c => c.monto) : null,
      }])
      .select()
      .single()

    if (insertError || !cot) {
      console.error('[cotizaciones] insert error:', insertError)
      return NextResponse.json({ error: 'Error al guardar la cotización' }, { status: 500 })
    }

    const pdfData: CotizacionPDFData = {
      logoSrc: conces.logoSrc,
      empresaNombre: conces.nombre,
      empresaRif: conces.rif,
      empresaDireccion: conces.direccion,
      empresaTelefono: conces.telefono,
      empresaCorreo: conces.correo,
      numero: cot.numero,
      fecha: fmtDate(hoy),
      vencimiento: fmtDate(venc),
      clienteNombre: clienteNombre.trim(),
      clienteCiRif: clienteCiRif.trim(),
      clienteDireccion: clienteDireccion?.trim() || null,
      clienteCorreo: clienteCorreo.trim().toLowerCase(),
      clienteTelefono: clienteTelefono?.trim() || null,
      clienteCiudadEstado: clienteCiudadEstado?.trim() || null,
      clienteCodigoPostal: clienteCodigoPostal?.trim() || null,
      agenteRetencion: !!agenteRetencion,
      marca: vehiculo.brand,
      modelo: vehiculo.model,
      cantidad: cantidadNum,
      precioBase,
      modalidad,
      plan,
      ivaMonto: iva,
      gastosMonto: gastos,
      totalVehiculo: plan === 'banco_100' ? totalVehiculoBanco : undefined,
      totalInicial,
      financiamientoMonto,
      cuotaMensual,
      costoTotal,
      ac500Schedule: plan === 'ac500' && ac500Schedule ? ac500Schedule : undefined,
    }

    // Enviar emails (ambos en paralelo, errores no bloqueantes)
    const emailResults = await Promise.allSettled([
      enviarCotizacionCliente(pdfData, cot.token_respuesta, cot.id),
      enviarNotificacionRojas({
        numero: cot.numero,
        vendedoraNombre: vendedora.nombre,
        clienteNombre: clienteNombre.trim(),
        clienteCorreo: clienteCorreo.trim().toLowerCase(),
        clienteCiRif: clienteCiRif.trim(),
        marca: vehiculo.brand,
        modelo: vehiculo.model,
        modalidad,
        plan,
        totalInicial,
        cuotaMensual,
        costoTotal,
        fecha: fmtDate(hoy),
        ac500Schedule: plan === 'ac500' && ac500Schedule ? ac500Schedule : undefined,
      }),
    ])

    emailResults.forEach((r, i) => {
      if (r.status === 'rejected') console.error(`[cotizaciones] email ${i} error:`, r.reason)
    })

    return NextResponse.json({ ok: true, numero: cot.numero }, { status: 201 })
  } catch (err) {
    console.error('[cotizaciones] unexpected error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const authClient = await createClient()
  const { data: { user: authUser } } = await authClient.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('cotizaciones')
    .select('id, numero, fecha, vencimiento, vendedora_nombre, cliente_nombre, cliente_ci_rif, cliente_correo, cliente_telefono, cliente_direccion, cliente_ciudad_estado, cliente_codigo_postal, agente_retencion, marca, modelo, modalidad, plan, precio_base, iva_monto, gastos_monto, financiamiento_monto, cuota_mensual, total_inicial, costo_total, estado, motivo_rechazo, descuento_solicitado, motivo_descuento, created_at, resend_email_id, email_ultimo_estado, email_ultimo_evento_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
