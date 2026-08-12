export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director']

// Lista pública de financiadoras activas (nombre + tasa de comisión). La
// necesita el link de vendedores (sin sesión de staff) para armar el
// presupuesto, así que no lleva auth — igual que el catálogo de vehículos.
export async function GET() {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('financiadoras')
    .select('id, nombre, tasa_comision_pct')
    .eq('activo', true)
    .order('orden')
  return NextResponse.json(data ?? [])
}

// Editar la tasa de comisión de una financiadora (solo staff). Gabriel pidió
// poder ajustarla en cualquier momento sin depender de un despliegue de código.
export async function PATCH(req: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = user.app_metadata?.rol as string
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id, tasaComisionPct, activo } = await req.json().catch(() => ({}))
  if (!id || typeof id !== 'string') return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (tasaComisionPct != null) {
    const t = Number(tasaComisionPct)
    if (!(t >= 0 && t <= 100)) return NextResponse.json({ error: 'Tasa inválida' }, { status: 400 })
    update.tasa_comision_pct = t
  }
  if (typeof activo === 'boolean') update.activo = activo

  const supabase = await createAdminClient()
  const { data, error } = await supabase.from('financiadoras').update(update).eq('id', id).select('id, nombre, tasa_comision_pct, activo').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
