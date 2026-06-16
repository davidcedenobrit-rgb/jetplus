export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { enviarCotizacionCliente, enviarNotificacionRojas } from '@/lib/email-cotizaciones'
import type { CotizacionPDFData } from '@/lib/cotizacion-pdf'

function fmtDate(d: Date) {
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export async function POST(req: Request) {
  try {
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
    } = body

    // Validaciones básicas
    if (!codigo || !vehiculoId || !clienteNombre?.trim() || !clienteCiRif?.trim() || !clienteCorreo?.trim() || !modalidad) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }
    if (!['contado', 'credito_24'].includes(modalidad)) {
      return NextResponse.json({ error: 'Modalidad inválida' }, { status: 400 })
    }
    if (!['vehimotors', 'banco_100'].includes(plan)) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }
    if (!/^[A-Za-z]\d{3}$/.test(String(codigo).trim())) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Verificar vendedora
    const { data: vendedora } = await supabase
      .from('vendedoras')
      .select('nombre')
      .eq('codigo', String(codigo).trim())
      .eq('activa', true)
      .single()

    if (!vendedora) {
      return NextResponse.json({ error: 'Código de vendedora inválido' }, { status: 401 })
    }

    // Obtener vehículo
    const { data: vehiculo } = await supabase
      .from('catalogo_ventas')
      .select('brand, model, cash, gc, gcr, tasa_credito, placa_monto, poliza_vehiculo_banco, poliza_vida_banco, honorarios_banco, gastos_internos_banco, alfombras_banco, diferencial_pct, tasa_banco_pct')
      .eq('id', vehiculoId)
      .eq('disponible', true)
      .single()

    if (!vehiculo) {
      return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 })
    }

    const precioBase = Number(vehiculo.cash) || 0
    const iva = precioBase * 0.16

    // Diferencial plan 100% Banco
    let diferencial = 0
    let totalVehiculoBanco = 0

    if (plan === 'banco_100' && modalidad === 'credito_24') {
      const placaMonto = Number(vehiculo.placa_monto) || 400
      totalVehiculoBanco = precioBase + iva + placaMonto
    }

    let gastosBase: number
    if (plan === 'banco_100' && modalidad === 'credito_24') {
      const diferencialPct = Number(vehiculo.diferencial_pct) || 30
      const financiamientoBanco = totalVehiculoBanco * 0.70
      diferencial = financiamientoBanco * diferencialPct / 100
      gastosBase =
        (Number(vehiculo.poliza_vehiculo_banco) || 0) +
        (Number(vehiculo.poliza_vida_banco) || 0) +
        (Number(vehiculo.honorarios_banco) || 0) +
        (Number(vehiculo.gastos_internos_banco) || 0) +
        (Number(vehiculo.alfombras_banco) || 0)
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

    if (modalidad === 'contado') {
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
    venc.setDate(venc.getDate() + 2)

    // Insertar cotización (trigger auto-genera numero y numero_seq)
    const { data: cot, error: insertError } = await supabase
      .from('cotizaciones')
      .insert([{
        fecha: hoy.toISOString().slice(0, 10),
        vencimiento: venc.toISOString().slice(0, 10),
        vendedora_nombre: vendedora.nombre,
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
      }])
      .select()
      .single()

    if (insertError || !cot) {
      console.error('[cotizaciones] insert error:', insertError)
      return NextResponse.json({ error: 'Error al guardar la cotización' }, { status: 500 })
    }

    const pdfData: CotizacionPDFData = {
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
    }

    // Enviar emails (ambos en paralelo, errores no bloqueantes)
    const emailResults = await Promise.allSettled([
      enviarCotizacionCliente(pdfData, cot.token_respuesta),
      enviarNotificacionRojas({
        numero: cot.numero,
        vendedoraNombre: vendedora.nombre,
        clienteNombre: clienteNombre.trim(),
        clienteCorreo: clienteCorreo.trim().toLowerCase(),
        clienteCiRif: clienteCiRif.trim(),
        marca: vehiculo.brand,
        modelo: vehiculo.model,
        modalidad,
        totalInicial,
        cuotaMensual,
        costoTotal,
        fecha: fmtDate(hoy),
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
  // Admin: list cotizaciones
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)

  // Use admin client; auth check via cookie
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('cotizaciones')
    .select('id, numero, fecha, vencimiento, vendedora_nombre, cliente_nombre, cliente_ci_rif, cliente_correo, cliente_telefono, cliente_direccion, cliente_ciudad_estado, cliente_codigo_postal, agente_retencion, marca, modelo, modalidad, plan, precio_base, iva_monto, gastos_monto, financiamiento_monto, cuota_mensual, total_inicial, costo_total, estado, motivo_rechazo, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
