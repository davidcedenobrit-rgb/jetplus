export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

// Reasigna el centro de costo de un egreso. Si centroId === '__comun__', el
// egreso se marca como gasto común (se reparte por % entre las líneas) y se
// deja sin centro. Solo dirección/administración.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { egresoId, centroId } = await req.json().catch(() => ({}))
  if (!egresoId) return NextResponse.json({ error: 'Falta egresoId' }, { status: 400 })

  const esComun = centroId === '__comun__'
  const centro = esComun ? null : (typeof centroId === 'string' && centroId.trim() ? centroId.trim() : null)

  const admin = await createAdminClient()
  const { error } = await admin.from('egresos').update({
    centro_costo_id: centro,
    es_comun: esComun,
    updated_at: new Date().toISOString(),
  }).eq('id', egresoId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
