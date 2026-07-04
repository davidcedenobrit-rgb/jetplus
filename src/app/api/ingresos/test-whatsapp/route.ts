export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { ReciboPDF } from '@/lib/recibo-pdf'
import { fetchECData } from '@/lib/ingreso-ec-data'

// GET /api/ingresos/test-whatsapp?id=<ingresoId>&tel=<telefono>
// tel es opcional: si se omite, usa el teléfono del cliente del ingreso
// Retorna la URL de WhatsApp con el mensaje pre-cargado y el PDF adjunto

function getAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function formatPhoneWA(telefono: string): string {
  const digits = telefono.replace(/\D/g, '')
  if (digits.startsWith('0')) return '58' + digits.slice(1)
  if (digits.startsWith('58')) return digits
  return '58' + digits
}

export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') return new Response(null, { status: 404 })
  const { searchParams } = new URL(req.url)
  const ingresoId = searchParams.get('id')
  const telOverride = searchParams.get('tel')

  if (!ingresoId) {
    return NextResponse.json({ error: 'Parámetro ?id=<ingresoId> requerido' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: ingreso } = await supabase
    .from('ingresos')
    .select('*, clientes(nombre, cedula_rif, telefono, correo, ciudad)')
    .eq('id', ingresoId)
    .single()

  if (!ingreso) return NextResponse.json({ error: 'Ingreso no encontrado' }, { status: 404 })

  const cliente = (ingreso as any).clientes
  const telefono = telOverride ?? cliente?.telefono ?? null

  if (!telefono) {
    return NextResponse.json({ error: 'Sin teléfono: usa ?tel=04XX... para sobrescribir' }, { status: 400 })
  }

  let vehiculo: any = null
  if (ingreso.vehiculo_id) {
    const { data: v } = await supabase
      .from('vehiculos')
      .select('marca, modelo, version, anio, placa')
      .eq('id', ingreso.vehiculo_id)
      .single()
    vehiculo = v
  }

  const ec = await fetchECData(ingresoId, ingreso.vehiculo_id ?? null, (ingreso as any).acuerdo_inicial_id ?? null)

  // Generar PDF y subirlo
  const pdfBuffer = await renderToBuffer(
    React.createElement(ReciboPDF, {
      data: {
        numeroRecibo: ingreso.numero_recibo,
        fechaPago: ingreso.fecha_pago,
        concepto: ingreso.concepto,
        monto: Number(ingreso.monto),
        moneda: ingreso.moneda,
        tasaCambio: ingreso.tasa_cambio ? Number(ingreso.tasa_cambio) : null,
        metodoPago: ingreso.metodo_pago,
        referencia: ingreso.referencia ?? null,
        bancoEmisor: ingreso.banco_emisor ?? null,
        bancoReceptor: ingreso.banco_receptor ?? null,
        observaciones: ingreso.observaciones ?? null,
        fechaAprobacion: ingreso.fecha_aprobacion ?? null,
        clienteNombre: cliente?.nombre ?? '',
        clienteCedula: cliente?.cedula_rif ?? null,
        clienteTelefono: cliente?.telefono ?? null,
        clienteCorreo: cliente?.correo ?? null,
        clienteCiudad: cliente?.ciudad ?? null,
        vehiculoMarca: vehiculo?.marca ?? null,
        vehiculoModelo: vehiculo?.modelo ?? null,
        vehiculoVersion: vehiculo?.version ?? null,
        vehiculoAnio: vehiculo?.anio ?? null,
        placa: ingreso.placa ?? vehiculo?.placa ?? null,
        ...ec,
      },
    }) as any
  )

  const admin = getAdmin()
  const storagePath = `recibos/${ingreso.numero_recibo}.pdf`

  const { error: uploadError } = await admin.storage
    .from('comprobantes')
    .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrodemando.laoriental.co'
  const pdfUrl = `${APP_URL}/api/recibo/${ingreso.numero_recibo}`

  const montoFmt = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(Number(ingreso.monto))
  const monedaLabel = ingreso.moneda === 'VES' ? 'Bs.' : ingreso.moneda

  const fechaLegible = (() => {
    try {
      return new Date(ingreso.fecha_pago + 'T12:00:00').toLocaleDateString('es-VE', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    } catch { return ingreso.fecha_pago }
  })()

  const lines = [
    `Estimado/a ${cliente?.nombre ?? 'cliente'},`,
    '',
    'Le confirmamos la recepción de su pago:',
    '',
    `📋 N° Recibo: ${ingreso.numero_recibo}`,
    `💼 Concepto: ${ingreso.concepto}`,
    `💰 Monto: ${monedaLabel} ${montoFmt}`,
    `📅 Fecha: ${fechaLegible}`,
    `💳 Método: ${ingreso.metodo_pago}`,
    ...(ingreso.referencia ? [`🔢 Referencia: ${ingreso.referencia}`] : []),
    '',
    `📄 Su recibo en PDF: ${pdfUrl}`,
    '',
    'Gracias por su preferencia.',
    'La Oriental Automotors',
  ]

  const waUrl = `https://wa.me/${formatPhoneWA(telefono)}?text=${encodeURIComponent(lines.join('\n'))}`

  return NextResponse.json({
    ok: true,
    pdfUrl,
    waUrl,
    telefono: formatPhoneWA(telefono),
    mensaje: 'Redirige a waUrl para abrir WhatsApp con el mensaje pre-cargado',
  })
}
