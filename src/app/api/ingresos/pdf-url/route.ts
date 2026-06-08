export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { ReciboPDF } from '@/lib/recibo-pdf'

const ROL_PERMITIDO = ['jose', 'admin', 'director', 'mary', 'leysdem', 'carla']

function getAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const rol = (user.user_metadata?.rol as string) ?? ''
  if (!ROL_PERMITIDO.includes(rol)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  let body: { ingresoId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const { ingresoId } = body
  if (!ingresoId) return NextResponse.json({ error: 'ingresoId requerido' }, { status: 400 })

  const { data: ingreso } = await supabase
    .from('ingresos')
    .select('*, clientes(nombre, cedula_rif, telefono, correo, ciudad)')
    .eq('id', ingresoId)
    .single()

  if (!ingreso) return NextResponse.json({ error: 'Ingreso no encontrado' }, { status: 404 })

  const cliente = (ingreso as any).clientes

  let vehiculo: any = null
  if (ingreso.vehiculo_id) {
    const { data: v } = await supabase
      .from('vehiculos')
      .select('marca, modelo, version, anio, placa')
      .eq('id', ingreso.vehiculo_id)
      .single()
    vehiculo = v
  }

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
      },
    }) as any
  )

  const admin = getAdmin()
  const storagePath = `recibos/${ingreso.numero_recibo}.pdf`

  const { error: uploadError } = await admin.storage
    .from('comprobantes')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    console.error('[pdf-url] upload error:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = admin.storage.from('comprobantes').getPublicUrl(storagePath)

  return NextResponse.json({ url: urlData.publicUrl, nombre: `${ingreso.numero_recibo}.pdf` })
}
