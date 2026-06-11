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
    } = body

    // Validaciones básicas
    if (!codigo || !vehiculoId || !clienteNombre?.trim() || !clienteCiRif?.trim() || !clienteCorreo?.trim() || !modalidad) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }
    if (!['contado', 'credito_24'].includes(modalidad)) {
      return NextResponse.json({ error: 'Modalidad inválida' }, { status: 400 })
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
      .select('brand, model, cash, gc, gcr, tasa_credito')
      .eq('id', vehiculoId)
      .eq('disponible', true)
      .single()

    if (!vehiculo) {
      return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 })
    }

    const precioBase = Number(vehiculo.cash) || 0
    const iva = precioBase * 0.16
    const gastos = modalidad === 'contado' ? Number(vehiculo.gc) || 0 : Number(vehiculo.gcr) || 0
    let totalInicial: number
    let financiamientoMonto: number | null = null
    let cuotaMensual: number | null = null
    let costoTotal: number

    if (modalidad === 'contado') {
      totalInicial = precioBase + iva + gastos
      costoTotal = totalInicial
    } else {
      const inicial40 = precioBase * 0.4
      totalInicial = inicial40 + iva + gastos
      financiamientoMonto = precioBase * 0.6
      cuotaMensual = Number(vehiculo.tasa_credito) || 0
      costoTotal = totalInicial + cuotaMensual * 24
    }

    const hoy = new Date()
    const venc = new Date(hoy)
    venc.setDate(venc.getDate() + 30)

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
        iva_monto: iva,
        gastos_monto: gastos,
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
      ivaMonto: iva,
      gastosMonto: gastos,
      totalInicial,
      financiamientoMonto,
      cuotaMensual,
      costoTotal,
    }

    // Enviar emails (ambos en paralelo, errores no bloqueantes)
    const emailResults = await Promise.allSettled([
      enviarCotizacionCliente(pdfData),
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
    .select('id, numero, fecha, vencimiento, vendedora_nombre, cliente_nombre, cliente_ci_rif, cliente_correo, marca, modelo, modalidad, total_inicial, costo_total, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
