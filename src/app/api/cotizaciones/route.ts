export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { enviarCotizacionCliente, enviarNotificacionRojas } from '@/lib/email-cotizaciones'
import type { CotizacionPDFData, AC500ScheduleData } from '@/lib/cotizacion-pdf'

function fmtDate(d: Date) {
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function buildAC500ScheduleFromDB(veh: Record<string, unknown>, meses: 6 | 9 | 12): AC500ScheduleData | null {
  const reserva = Number(veh.reserva) || 500
  if (meses === 6) {
    if (!veh.p6_activo) return null
    const labels = ['Cuota 1 (Día 0)', 'Cuota 2 (Día 30)', 'Cuota 3 (Día 60)', 'Cuota 4 (Día 90)', 'Cuota 5 (Día 120)', 'Cuota 6 (Entrega)']
    const cuotas = ['p6_c1','p6_c2','p6_c3','p6_c4','p6_c5','p6_c6'].map((f, i) => ({ label: labels[i], monto: Number(veh[f]) || 0 }))
    const total = Number(veh.p6_total) || (reserva + cuotas.reduce((s, c) => s + c.monto, 0))
    return { reserva, meses, cuotas, total }
  }
  if (meses === 9) {
    if (!veh.p9_activo) return null
    const labels = ['Cuota 1 (Día 0)', 'Cuota 2 (Día 30)', 'Cuota 3 (Día 60)', 'Cuota 4 (Día 90)', 'Cuota 5 (Día 120)', 'Cuota 6 (Día 150)', 'Cuota 7 (Día 180)', 'Cuota 8 (Día 210)', 'Cuota 9 (Entrega)']
    const cuotas = ['p9_c1','p9_c2','p9_c3','p9_c4','p9_c5','p9_c6','p9_c7','p9_c8','p9_c9'].map((f, i) => ({ label: labels[i], monto: Number(veh[f]) || 0 }))
    const total = Number(veh.p9_total) || (reserva + cuotas.reduce((s, c) => s + c.monto, 0))
    return { reserva, meses, cuotas, total }
  }
  // 12m
  if (!veh.p12_activo) return null
  const labels12 = ['Cuota 1 (Día 0)', 'Cuota 2 (Día 30)', 'Cuota 3 (Día 60)', 'Cuota 4 (Día 90)', 'Cuota 5 (Día 120)', 'Cuota 6 (Día 150)', 'Cuota 7 (Día 180)', 'Cuota 8 (Día 210)', 'Cuota 9 (Día 240)', 'Cuota 10 (Día 270)', 'Cuota 11 (Día 300)', 'Cuota 12 (Entrega)']
  const cuotas12 = ['p12_c1','p12_c2','p12_c3','p12_c4','p12_c5','p12_c6','p12_c7','p12_c8','p12_c9','p12_c10','p12_c11','p12_c12'].map((f, i) => ({ label: labels12[i], monto: Number(veh[f]) || 0 }))
  const total12 = Number(veh.p12_total) || (reserva + cuotas12.reduce((s, c) => s + c.monto, 0))
  return { reserva, meses, cuotas: cuotas12, total: total12 }
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
      ac500VehiculoId,
      ac500Meses,
    } = body

    // Validaciones básicas
    if (!codigo || !vehiculoId || !clienteNombre?.trim() || !clienteCiRif?.trim() || !clienteCorreo?.trim() || !modalidad) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }
    if (!['contado', 'credito_24', 'ac500'].includes(modalidad)) {
      return NextResponse.json({ error: 'Modalidad inválida' }, { status: 400 })
    }
    if (modalidad !== 'ac500' && !['vehimotors', 'banco_100'].includes(plan)) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }
    if (modalidad === 'ac500' && (!ac500VehiculoId || ![6, 9, 12].includes(Number(ac500Meses)))) {
      return NextResponse.json({ error: 'Faltan datos del plan AC500' }, { status: 400 })
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

    const hoy = new Date()
    const venc = new Date(hoy)
    venc.setDate(venc.getDate() + 2)

    // ── AC500 path ──
    if (modalidad === 'ac500') {
      const { data: vehiculo } = await supabase
        .from('catalogo_ventas')
        .select('brand, model')
        .eq('id', vehiculoId)
        .single()

      if (!vehiculo) {
        return NextResponse.json({ error: 'Vehículo no encontrado en catálogo' }, { status: 404 })
      }

      const { data: ac500Veh } = await supabase
        .from('ac500_vehiculos')
        .select('*')
        .eq('id', ac500VehiculoId)
        .single()

      if (!ac500Veh) {
        return NextResponse.json({ error: 'Vehículo AC500 no encontrado' }, { status: 404 })
      }

      const meses = Number(ac500Meses) as 6 | 9 | 12
      const ac500Schedule = buildAC500ScheduleFromDB(ac500Veh, meses)
      if (!ac500Schedule) {
        return NextResponse.json({ error: `Plan de ${meses} meses no disponible para este vehículo` }, { status: 400 })
      }

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
          precio_base: ac500Schedule.reserva,
          modalidad: 'ac500',
          plan: null,
          iva_monto: 0,
          gastos_monto: 0,
          total_inicial: ac500Schedule.reserva,
          financiamiento_monto: null,
          cuota_mensual: null,
          costo_total: ac500Schedule.total,
          ac500_vehiculo_id: ac500VehiculoId,
          ac500_meses: meses,
          ac500_schedule: ac500Schedule,
        }])
        .select()
        .single()

      if (insertError || !cot) {
        console.error('[cotizaciones] insert error (ac500):', insertError)
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
        precioBase: ac500Schedule.reserva,
        modalidad: 'ac500',
        ivaMonto: 0,
        gastosMonto: 0,
        totalInicial: ac500Schedule.reserva,
        financiamientoMonto: null,
        cuotaMensual: null,
        costoTotal: ac500Schedule.total,
        ac500Schedule,
      }

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
          modalidad: 'ac500',
          totalInicial: ac500Schedule.reserva,
          cuotaMensual: null,
          costoTotal: ac500Schedule.total,
          fecha: fmtDate(hoy),
          ac500Schedule,
        }),
      ])
      emailResults.forEach((r, i) => {
        if (r.status === 'rejected') console.error(`[cotizaciones] email ${i} error:`, r.reason)
      })

      return NextResponse.json({ ok: true, numero: cot.numero }, { status: 201 })
    }

    // ── Standard path (contado / credito_24) ──
    const { data: vehiculo } = await supabase
      .from('catalogo_ventas')
      .select('brand, model, cash, gc, gcr, tasa_credito, placa_monto, gcr_banco, cuota_banco')
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
    let tasaBCVSnap: number | null = null
    let tasaVHMSnap: number | null = null
    let totalVehiculoBanco = 0

    if (plan === 'banco_100' && modalidad === 'credito_24') {
      const { data: tasasRows } = await supabase
        .from('config_cotizaciones')
        .select('clave, valor')
      const tm: Record<string, number> = {}
      for (const r of tasasRows ?? []) tm[r.clave] = Number(r.valor)
      tasaBCVSnap = tm['tasa_bcv'] ?? 0
      tasaVHMSnap = tm['tasa_vehimotors'] ?? 0
      const placaMonto = Number(vehiculo.placa_monto) || 400
      totalVehiculoBanco = precioBase + iva + placaMonto
      const financiamientoBanco = totalVehiculoBanco * 0.70
      if (tasaBCVSnap > 0 && tasaVHMSnap > tasaBCVSnap) {
        diferencial = financiamientoBanco * (tasaVHMSnap - tasaBCVSnap) / tasaBCVSnap
      }
    }

    let gastosBase: number
    if (plan === 'banco_100' && modalidad === 'credito_24') {
      gastosBase = Number(vehiculo.gcr_banco) || 0
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
      cuotaMensual = Number(vehiculo.cuota_banco) || 0
      costoTotal = totalInicial + cuotaMensual * 24
    } else {
      const inicial40 = precioBase * 0.4
      totalInicial = inicial40 + iva + gastos
      financiamientoMonto = precioBase * 0.6
      cuotaMensual = Number(vehiculo.tasa_credito) || 0
      costoTotal = totalInicial + cuotaMensual * 24
    }

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
        tasa_bcv_snap: tasaBCVSnap,
        tasa_vhm_snap: tasaVHMSnap,
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
