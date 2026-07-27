export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES_PERMITIDOS = ['jose', 'admin', 'director']

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
    .from('vendedoras')
    .select('id, nombre, codigo, activa, created_at')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { nombre, codigo } = await req.json()
  if (!nombre?.trim() || !codigo?.trim()) {
    return NextResponse.json({ error: 'Nombre y código son requeridos' }, { status: 400 })
  }
  if (!/^[A-Za-z]\d{3}$/.test(codigo.trim())) {
    return NextResponse.json({ error: 'El código debe ser exactamente 3 dígitos' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  const { data: existe } = await supabase
    .from('vendedoras')
    .select('id')
    .eq('codigo', codigo.trim())
    .single()

  if (existe) {
    return NextResponse.json({ error: 'Ese código ya está en uso' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('vendedoras')
    .insert([{ nombre: nombre.trim(), codigo: codigo.trim(), activa: true }])
    .select('id, nombre, activa, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: Request) {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id, activa, nombre, codigo } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (typeof activa === 'boolean') update.activa = activa
  if (nombre?.trim()) update.nombre = nombre.trim()
  if (codigo?.trim()) {
    if (!/^[A-Za-z]\d{3}$/.test(codigo.trim())) {
      return NextResponse.json({ error: 'El código debe ser exactamente 3 dígitos' }, { status: 400 })
    }
    const supabase = await createAdminClient()
    const { data: existe } = await supabase
      .from('vendedoras')
      .select('id')
      .eq('codigo', codigo.trim())
      .neq('id', id)
      .single()
    if (existe) return NextResponse.json({ error: 'Ese código ya está en uso' }, { status: 409 })
    update.codigo = codigo.trim()
  }

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('vendedoras')
    .update(update)
    .eq('id', id)
    .select('id, nombre, activa, created_at')
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
  const { error } = await supabase.from('vendedoras').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
