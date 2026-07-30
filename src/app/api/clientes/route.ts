export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = await createAdminClient()
  const body = await req.json()

  const { nombre, cedula_rif, tipo, telefono, whatsapp, correo, direccion, ciudad, observaciones, identificacion_juridica } = body

  if (!nombre || !cedula_rif) {
    return NextResponse.json({ error: 'Nombre y cédula/RIF son obligatorios' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('clientes')
    .insert({
      nombre: String(nombre).trim(),
      cedula_rif: String(cedula_rif).trim().toUpperCase(),
      tipo: tipo ?? 'natural',
      telefono: telefono || null,
      whatsapp: whatsapp || null,
      correo: correo || null,
      direccion: direccion || null,
      ciudad: ciudad || null,
      observaciones: observaciones || null,
      identificacion_juridica: (tipo === 'juridico' && identificacion_juridica) ? String(identificacion_juridica).trim() : null,
      activo: true,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}
