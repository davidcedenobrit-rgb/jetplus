export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director']

// Lista de concesionarios activos para el selector de cotización.
export async function GET() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = user.app_metadata?.rol as string
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('concesionarios')
    .select('id, nombre, prefijo, es_principal, activo, orden')
    .eq('activo', true)
    .order('orden')

  return NextResponse.json(data ?? [])
}
