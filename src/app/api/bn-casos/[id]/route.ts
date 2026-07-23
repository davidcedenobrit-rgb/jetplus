export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

/* eslint-disable @typescript-eslint/no-explicit-any */
async function rolDe(supabase: any, user: any): Promise<string> {
  const rolMeta = (user?.app_metadata?.rol as string) ?? ''
  if (rolMeta) return rolMeta
  const { data } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  return data?.rol ?? ''
}

// Actualizar un caso: guardar avances (aprobado %, merma, gastos, condiciones),
// marcarlo como cotizado (con su cotizacion_id) o rechazarlo.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES.includes(await rolDe(supabase, user))) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id } = await params
  const b = await req.json().catch(() => ({}))
  const admin = await createAdminClient()

  const upd: Record<string, any> = { updated_at: new Date().toISOString() }
  if (b.aprobado_pct != null) upd.aprobado_pct = Number(b.aprobado_pct)
  if (b.merma_pct != null) upd.merma_pct = Number(b.merma_pct)
  if (b.banco !== undefined) upd.banco = b.banco?.trim() || null
  if (b.gastos_estructura !== undefined) upd.gastos_estructura = b.gastos_estructura
  if (b.condiciones !== undefined) upd.condiciones = b.condiciones?.trim() || null
  if (b.notas !== undefined) upd.notas = b.notas?.trim() || null
  if (b.expediente !== undefined) {
    upd.expediente = Array.isArray(b.expediente)
      ? b.expediente.filter((f: any) => f?.url).map((f: any) => ({ url: f.url, nombre: f.nombre ?? null }))
      : null
  }

  if (b.estado === 'rechazado') {
    upd.estado = 'rechazado'
  } else if (b.estado === 'cotizado') {
    if (!b.cotizacion_id) return NextResponse.json({ error: 'Falta la cotización generada' }, { status: 400 })
    upd.estado = 'cotizado'
    upd.cotizacion_id = b.cotizacion_id
    if (b.proforma_id) upd.proforma_id = b.proforma_id
    upd.cotizado_at = new Date().toISOString()
  }

  const { data, error } = await admin.from('bn_casos').update(upd).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, caso: data })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!['jose', 'admin', 'director'].includes(await rolDe(supabase, user))) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  const { id } = await params
  const admin = await createAdminClient()
  const { error } = await admin.from('bn_casos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
