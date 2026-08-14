export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES_PERMITIDOS = ['jose', 'admin', 'director', 'mary', 'leysdem']

async function checkAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES_PERMITIDOS.includes(rol)) return null
  return user
}

export async function GET() {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('aliados')
    .select('id, nombre, codigo, sector, activo, created_at')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { nombre, codigo, sector } = await req.json()
  if (!nombre?.trim() || !codigo?.trim() || !['inmobiliario', 'seguros'].includes(sector)) {
    return NextResponse.json({ error: 'Nombre, código y sector son requeridos' }, { status: 400 })
  }
  if (!/^[A-Za-z]\d{3}$/.test(codigo.trim())) {
    return NextResponse.json({ error: 'El código debe ser una letra + 3 dígitos' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  const { data: existe } = await supabase
    .from('aliados')
    .select('id')
    .eq('codigo', codigo.trim().toUpperCase())
    .maybeSingle()

  if (existe) return NextResponse.json({ error: 'Ese código ya está en uso' }, { status: 409 })

  const { data, error } = await supabase
    .from('aliados')
    .insert([{ nombre: nombre.trim(), codigo: codigo.trim().toUpperCase(), sector, activo: true }])
    .select('id, nombre, codigo, sector, activo, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: Request) {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id, activo, nombre, sector } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (typeof activo === 'boolean') update.activo = activo
  if (nombre?.trim()) update.nombre = nombre.trim()
  if (sector && ['inmobiliario', 'seguros'].includes(sector)) update.sector = sector

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('aliados')
    .update(update)
    .eq('id', id)
    .select('id, nombre, codigo, sector, activo, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const supabase = await createAdminClient()
  const { error } = await supabase.from('aliados').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
