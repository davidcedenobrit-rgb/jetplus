export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { enviarCotizacionCliente, enviarNotificacionRojas } from '@/lib/email-cotizaciones'
import type { CotizacionPDFData, AC500ScheduleData, AC500CuotaItem } from '@/lib/cotizacion-pdf'
import { getLogoBase64 } from '@/lib/cotizacion-logo'

function fmtDate(d: Date) {
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

type Comparativa = {
  precio_base_original: number
  precio_base_actual: number
  precio_diff: number
  cuota_mensual_original: number | null
  cuota_mensual_actual: number | null
  cuota_diff: number | null
  total_inicial_original: number
  total_inicial_actual: number
  inicial_diff: number
  costo_total_original: number
  costo_total_actual: number
  total_diff: number
  hubo_cambio: boolean
  fecha_original: string
  fecha_actual: string
}

export async function POST(req: Request) {
  try {
    const authClient = await createClient()
    const { data: { user: authUser } } = await authClient.auth.getUser()
    if (!authUser) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const { cotizacionOriginalId, codigo, overrides = {}, enviarCorreo = true } = body

    if (!cotizacionOriginalId) {
      return NextResponse.json({ error: 'cotizacionOriginalId requerido' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // 1. Cargar la cotización original
    const { data: original, error: errOrig } = await supabase
      .from('cotizaciones')
      .select('*')
      .eq('id', cotizacionOriginalId)
      .single()

    if (errOrig || !original) {
      return NextResponse.json({ error: 'Cotización original no encontrada' }, { status: 404 })
    }

    // 2. Vendedora (usar la del override, o buscar de la original por nombre)
    let vendedoraNombre = original.vendedora_nombre
    if (codigo) {
      // El código interno de la casa (R000) siempre es válido, aunque esté
      // inactivo; el interruptor de "activa" solo aplica a vendedoras públicas.
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
      vendedoraNombre = vendedora.nombre
    }

    // 3. Cargar precios ACTUALES del catálogo
    const { data: vehiculo } = await supabase
      .from('catalogo_ventas')
      .select('brand, model, cash, gc, gcr, tasa_credito, placa_monto, poliza_vehiculo_banco, poliza_vida_banco, honorarios_banco, gastos_internos_banco, alfombras_banco, diferencial_pct, tasa_banco_pct, inicial_pct')
      .eq('id', original.vehiculo_id)
      .single()

    if (!vehiculo) {
      return NextResponse.json({ error: 'Vehículo no encontrado en el catálogo actual' }, { status: 404 })
    }

    // 4. Recalcular con precios actuales (misma lógica que POST /cotizaciones)
    const modalidad = overrides.modalidad ?? original.modalidad
    const plan = overrides.plan ?? original.plan ?? 'vehimotors'

    const precioBase = Number(overrides.precioBase ?? vehiculo.cash) || 0
    const iva = precioBase * 0.16

    // AC500 schedule (si aplica)
    let ac500Schedule: AC500ScheduleData | null = null
    const ac500Meses = original.ac500_meses
    if (plan === 'ac500' && original.ac500_vehiculo_id && ac500Meses) {
      const activoField = ac500Meses === 6 ? 'p6_activo' : ac500Meses === 9 ? 'p9_activo' : 'p12_activo'
      const totalField = ac500Meses === 6 ? 'p6_total' : ac500Meses === 9 ? 'p9_total' : 'p12_total'
      const { data: acVeh } = await supabase
        .from('ac500_vehiculos')
        .select(`id, brand, model, reserva, ${activoField}, ${totalField}, p6_c1,p6_c2,p6_c3,p6_c4,p6_c5,p6_c6, p9_c1,p9_c2,p9_c3,p9_c4,p9_c5,p9_c6,p9_c7,p9_c8,p9_c9, p12_c1,p12_c2,p12_c3,p12_c4,p12_c5,p12_c6,p12_c7,p12_c8,p12_c9,p12_c10,p12_c11,p12_c12`)
        .eq('id', original.ac500_vehiculo_id)
        .single()

      if (acVeh) {
        const cuotas: AC500CuotaItem[] = []
        for (let i = 1; i <= ac500Meses; i++) {
          const prefix = ac500Meses === 6 ? 'p6' : ac500Meses === 9 ? 'p9' : 'p12'
          const monto = Number((acVeh as Record<string, unknown>)[`${prefix}_c${i}`]) || 0
          cuotas.push({
            label: i === ac500Meses ? `Cuota ${i} (Entrega)` : `Cuota ${i}`,
            monto,
          })
        }
        ac500Schedule = {
          reserva: Number(acVeh.reserva) || 500,
          meses: ac500Meses,
          modelo: String(acVeh.model ?? ''),
          cuotas,
          total: Number((acVeh as Record<string, unknown>)[totalField]) || 0,
        }
      }
    }

    // Diferencial banco 100% — usa las tasas globales BCV/USDT (panel de Tasas)
    let diferencial = 0
    let totalVehiculoBanco = 0
    if (plan === 'banco_100' && modalidad === 'credito_24') {
      const { data: cfgTasas } = await supabase
        .from('config_cotizaciones')
        .select('clave, valor')
        .in('clave', ['tasa_bcv', 'tasa_usdt'])
      const tasaBcv = Number(cfgTasas?.find(c => c.clave === 'tasa_bcv')?.valor) || 0
      const tasaUsdt = Number(cfgTasas?.find(c => c.clave === 'tasa_usdt')?.valor) || 0
      const difPct = (tasaBcv > 0 && tasaUsdt > tasaBcv) ? (tasaUsdt - tasaBcv) / tasaBcv : 0
      const placaMonto = Number(vehiculo.placa_monto) || 400
      totalVehiculoBanco = precioBase + iva + placaMonto
      const financiamientoBanco = totalVehiculoBanco * 0.70
      diferencial = financiamientoBanco * difPct
    }

    // Gastos según modalidad
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
    const iniPct = (Number(vehiculo.inicial_pct) || 40) / 100

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
      const inicial = precioBase * iniPct
      totalInicial = inicial + iva + gastos
      financiamientoMonto = precioBase * (1 - iniPct)
      cuotaMensual = Number(vehiculo.tasa_credito) || 0
      costoTotal = totalInicial + cuotaMensual * 24
    }

    // 5. Calcular comparativa INTERNA (no se muestra en la cotización al cliente)
    const comparativa: Comparativa = {
      precio_base_original: Number(original.precio_base) || 0,
      precio_base_actual: precioBase,
      precio_diff: precioBase - (Number(original.precio_base) || 0),
      cuota_mensual_original: original.cuota_mensual ? Number(original.cuota_mensual) : null,
      cuota_mensual_actual: cuotaMensual,
      cuota_diff: (cuotaMensual != null && original.cuota_mensual != null)
        ? cuotaMensual - Number(original.cuota_mensual)
        : null,
      total_inicial_original: Number(original.total_inicial) || 0,
      total_inicial_actual: totalInicial,
      inicial_diff: totalInicial - (Number(original.total_inicial) || 0),
      costo_total_original: Number(original.costo_total) || 0,
      costo_total_actual: costoTotal,
      total_diff: costoTotal - (Number(original.costo_total) || 0),
      hubo_cambio: false,
      fecha_original: original.fecha,
      fecha_actual: new Date().toISOString().slice(0, 10),
    }
    comparativa.hubo_cambio =
      Math.abs(comparativa.precio_diff) > 0.01 ||
      Math.abs(comparativa.total_diff) > 0.01 ||
      (comparativa.cuota_diff != null && Math.abs(comparativa.cuota_diff) > 0.01)

    // 6. Fecha nueva + vencimiento +3 días
    const hoy = new Date()
    const venc = new Date(hoy)
    venc.setDate(venc.getDate() + 3)

    // 7. Insertar nueva cotización (el trigger genera número nuevo)
    const { data: cot, error: insertError } = await supabase
      .from('cotizaciones')
      .insert([{
        fecha: hoy.toISOString().slice(0, 10),
        vencimiento: venc.toISOString().slice(0, 10),
        vendedora_nombre: vendedoraNombre,
        cliente_id: original.cliente_id,
        cliente_nombre: original.cliente_nombre,
        cliente_ci_rif: original.cliente_ci_rif,
        cliente_correo: original.cliente_correo,
        cliente_telefono: original.cliente_telefono,
        cliente_direccion: original.cliente_direccion,
        cliente_ciudad_estado: original.cliente_ciudad_estado,
        cliente_codigo_postal: original.cliente_codigo_postal,
        agente_retencion: original.agente_retencion,
        vehiculo_id: original.vehiculo_id,
        marca: vehiculo.brand,
        modelo: vehiculo.model,
        precio_base: precioBase,
        modalidad,
        plan,
        iva_monto: iva,
        gastos_monto: gastos,
        diferencial_monto: diferencial > 0 ? diferencial : null,
        total_inicial: totalInicial,
        financiamiento_monto: financiamientoMonto,
        cuota_mensual: cuotaMensual,
        costo_total: costoTotal,
        ac500_vehiculo_id: original.ac500_vehiculo_id,
        ac500_meses: original.ac500_meses,
        ac500_cuotas: original.ac500_cuotas,
        reactivada_de: cotizacionOriginalId,
        comparativa,
      }])
      .select()
      .single()

    if (insertError || !cot) {
      console.error('[cotizaciones/reactivar] insert error:', insertError)
      return NextResponse.json({ error: 'Error al reactivar la cotización', detail: insertError?.message }, { status: 500 })
    }

    // 8. Marcar la original como reactivada (no la borra, deja rastro)
    await supabase.from('cotizaciones')
      .update({ estado: 'reactivada' })
      .eq('id', cotizacionOriginalId)

    // 9. Enviar correos si se pidió
    if (enviarCorreo) {
      const pdfData: CotizacionPDFData = {
        logoSrc: getLogoBase64(),
        numero: cot.numero,
        fecha: fmtDate(hoy),
        vencimiento: fmtDate(venc),
        clienteNombre: original.cliente_nombre,
        clienteCiRif: original.cliente_ci_rif,
        clienteDireccion: original.cliente_direccion,
        clienteCorreo: original.cliente_correo,
        clienteTelefono: original.cliente_telefono,
        clienteCiudadEstado: original.cliente_ciudad_estado,
        clienteCodigoPostal: original.cliente_codigo_postal,
        agenteRetencion: !!original.agente_retencion,
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
        ac500Schedule: plan === 'ac500' && ac500Schedule ? ac500Schedule : undefined,
      }

      const emailResults = await Promise.allSettled([
        enviarCotizacionCliente(pdfData, cot.token_respuesta, cot.id),
        enviarNotificacionRojas({
          numero: cot.numero,
          vendedoraNombre,
          clienteNombre: original.cliente_nombre,
          clienteCorreo: original.cliente_correo,
          clienteCiRif: original.cliente_ci_rif,
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
        if (r.status === 'rejected') console.error(`[cotizaciones/reactivar] email ${i} error:`, r.reason)
      })
    }

    return NextResponse.json({
      ok: true,
      numero: cot.numero,
      cotizacionId: cot.id,
      comparativa,
    }, { status: 201 })
  } catch (err) {
    console.error('[cotizaciones/reactivar] unexpected error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
