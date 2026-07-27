export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { CENTROS_NO_PROPIOS } from '@/lib/centros-costo'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

// Reasigna el centro de costo de un ingreso (y, coherentemente, el titular de
// los fondos: si el centro es "no propio" → 'vehimotors'; si vuelve a un centro
// propio → 'propio'). Solo dirección/administración.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { ingresoId, centroId } = await req.json().catch(() => ({}))
  if (!ingresoId) return NextResponse.json({ error: 'Falta ingresoId' }, { status: 400 })

  const centro = (typeof centroId === 'string' && centroId.trim()) ? centroId.trim() : null
  const update: Record<string, unknown> = {
    centro_costo_id: centro,
    updated_at: new Date().toISOString(),
  }
  // Mantener coherente el titular de fondos con el centro.
  if (centro && CENTROS_NO_PROPIOS.has(centro)) update.titular_fondos = 'vehimotors'
  else if (centro) update.titular_fondos = 'propio'

  const admin = await createAdminClient()
  const { error } = await admin.from('ingresos').update(update).eq('id', ingresoId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
