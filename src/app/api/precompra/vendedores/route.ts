export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

// Lista de empleados activos para elegir el vendedor de una proforma.
// Se ordenan primero los de cargo comercial (venta/vendedor/asesor/ejecutivo).
export async function GET() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const supabase = await createAdminClient()
  const rows = await fetchAllRows<any>((from, to) => supabase
    .from('empleados')
    .select('id, nombre, cargo, activo')
    .order('nombre', { ascending: true })
    .range(from, to))

  const activos = (rows ?? []).filter((e: any) => e.activo !== false)
  const esComercial = (c?: string) => /vend|venta|comercial|ejecutiv|asesor/i.test(c ?? '')
  activos.sort((a: any, b: any) => (esComercial(b.cargo) ? 1 : 0) - (esComercial(a.cargo) ? 1 : 0))

  return NextResponse.json(activos.map((e: any) => ({ id: e.id, nombre: e.nombre, cargo: e.cargo ?? '' })))
}
