export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem', 'carla']

// Unidades del showroom disponibles (en_agencia) para reservar en una proforma.
// Si se pasa ?cotizacionId, se marcan las que coinciden con marca/modelo cotizado.
export async function GET(req: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const url = new URL(req.url)
  const cotizacionId = url.searchParams.get('cotizacionId')
  const supabase = await createAdminClient()

  let marca = '', modelo = ''
  if (cotizacionId) {
    const { data: cot } = await supabase.from('cotizaciones').select('marca, modelo').eq('id', cotizacionId).maybeSingle()
    marca = String(cot?.marca ?? '').toUpperCase()
    modelo = String(cot?.modelo ?? '').toUpperCase()
  }

  const rows = await fetchAllRows<any>((from, to) => supabase
    .from('vehiculos_showroom')
    .select('id, marca, modelo, version, color, placa, anio, estado')
    .eq('estado', 'en_agencia')
    .order('marca', { ascending: true })
    .order('modelo', { ascending: true })
    .range(from, to))

  const coincide = (v: any) => {
    if (!marca && !modelo) return false
    const m = `${v.marca ?? ''} ${v.modelo ?? ''}`.toUpperCase()
    return (!!modelo && m.includes(modelo)) || (!!marca && (v.marca ?? '').toUpperCase() === marca && !!modelo && m.includes(modelo.split(' ')[0]))
  }

  const unidades = (rows ?? []).map((v: any) => ({
    id: v.id,
    label: [v.marca, v.modelo, v.version, v.color, v.placa ? `· ${v.placa}` : '', v.anio ? `(${v.anio})` : '']
      .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(),
    coincide: coincide(v),
  }))
  // Las que coinciden con el modelo cotizado, primero.
  unidades.sort((a: { coincide: boolean }, b: { coincide: boolean }) => (b.coincide ? 1 : 0) - (a.coincide ? 1 : 0))

  return NextResponse.json(unidades)
}
