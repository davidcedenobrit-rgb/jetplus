export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

// Cotizaciones del plan Asegúrate $500 candidatas a convertirse en proforma.
export async function GET() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const supabase = await createAdminClient()
  const { data: cots, error } = await supabase
    .from('cotizaciones')
    .select('id, numero, fecha, cliente_nombre, cliente_ci_rif, cliente_cedula, cliente_rif, cliente_correo, cliente_telefono, cliente_direccion, marca, modelo, color, ac500_meses, estado')
    .eq('plan', 'ac500')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (cots ?? []).map(c => c.id)
  const conProforma = new Set<string>()
  if (ids.length) {
    const { data: pfs } = await supabase.from('precompra_proformas').select('cotizacion_id').in('cotizacion_id', ids)
    for (const p of pfs ?? []) if (p.cotizacion_id) conProforma.add(p.cotizacion_id)
  }
  return NextResponse.json((cots ?? []).map(c => ({ ...c, tiene_proforma: conProforma.has(c.id) })))
}
