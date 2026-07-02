export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES_PERMITIDOS = ['jose', 'director', 'admin', 'arianna']

async function verificarPermiso() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return { user: null, rol: null, permitido: false }
  const { data: usuarioData } = await auth.from('usuarios').select('rol').eq('id', user.id).single()
  const rol = usuarioData?.rol ?? null
  return { user, rol, permitido: rol ? ROLES_PERMITIDOS.includes(rol) : false }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, permitido } = await verificarPermiso()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!permitido) return NextResponse.json({ error: 'Sin permisos para editar servicios' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const { fechaServicio, km, concepto, numeroExterno, comprobanteUrl, observaciones } = body

  const update: Record<string, unknown> = {}
  if (fechaServicio) update.fecha_servicio = fechaServicio
  if (typeof km === 'number' && km >= 0) update.km = Math.round(km)
  if (concepto?.trim()) update.concepto = concepto.trim()
  if (numeroExterno !== undefined) update.numero_externo = numeroExterno?.trim() || null
  if (comprobanteUrl !== undefined) update.comprobante_url = comprobanteUrl || null
  if (observaciones !== undefined) update.observaciones = observaciones?.trim() || null

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })
  }

  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('servicios_vehiculo')
    .update(update)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, permitido } = await verificarPermiso()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!permitido) return NextResponse.json({ error: 'Sin permisos para eliminar servicios' }, { status: 403 })

  const { id } = await params
  const supabase = await createAdminClient()
  const { error } = await supabase.from('servicios_vehiculo').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
