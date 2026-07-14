export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director']

// Lista de concesionarios. Por defecto solo activos (para el selector);
// con ?all=1 devuelve todos con sus datos completos (para el panel).
export async function GET(req: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = user.app_metadata?.rol as string
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const all = new URL(req.url).searchParams.get('all') === '1'
  const supabase = await createAdminClient()

  if (all) {
    const { data } = await supabase
      .from('concesionarios')
      .select('id, nombre, rif, direccion, telefono, correo, logo_url, prefijo, es_principal, activo, orden, secuencia')
      .order('orden')
    return NextResponse.json(data ?? [])
  }

  const { data } = await supabase
    .from('concesionarios')
    .select('id, nombre, prefijo, es_principal, activo, orden')
    .eq('activo', true)
    .order('orden')
  return NextResponse.json(data ?? [])
}
