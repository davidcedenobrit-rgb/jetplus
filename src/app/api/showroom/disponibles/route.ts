export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import { resolverCotizacionDB } from '@/lib/cotizacion-federada'

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
  // El showroom a reservar es el de la SEDE de la cotización (no siempre la
  // local): se resuelve la base por la cotización para listar sus unidades.
  let supabase = await createAdminClient()

  let marca = '', modelo = ''
  if (cotizacionId) {
    const resuelta = await resolverCotizacionDB(cotizacionId)
    if (resuelta) {
      supabase = resuelta.db
      marca = String(resuelta.cot?.marca ?? '').toUpperCase()
      modelo = String(resuelta.cot?.modelo ?? '').toUpperCase()
    }
  }

  // Unidades disponibles (en_agencia) Y reservadas: Rojas puede reservar una que
  // ya esté reservada (reasignarla a esta proforma). Las vendidas no aparecen.
  const rows = await fetchAllRows<any>((from, to) => supabase
    .from('vehiculos_showroom')
    .select('id, marca, modelo, version, color, placa, anio, estado, reserva_notas')
    .in('estado', ['en_agencia', 'reservado'])
    .order('marca', { ascending: true })
    .order('modelo', { ascending: true })
    .range(from, to))

  const coincide = (v: any) => {
    if (!marca && !modelo) return false
    const m = `${v.marca ?? ''} ${v.modelo ?? ''}`.toUpperCase()
    return (!!modelo && m.includes(modelo)) || (!!marca && (v.marca ?? '').toUpperCase() === marca && !!modelo && m.includes(modelo.split(' ')[0]))
  }

  const unidades = (rows ?? []).map((v: any) => {
    const reservado = v.estado === 'reservado'
    const base = [v.marca, v.modelo, v.version, v.color, v.placa ? `· ${v.placa}` : '', v.anio ? `(${v.anio})` : '']
      .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
    return {
      id: v.id,
      label: reservado ? `${base} — RESERVADO${v.reserva_notas ? ` (${v.reserva_notas})` : ''}` : base,
      coincide: coincide(v),
      reservado,
    }
  })
  // Orden: primero las que coinciden con el modelo cotizado, luego disponibles
  // antes que reservadas.
  unidades.sort((a, b) =>
    (b.coincide ? 1 : 0) - (a.coincide ? 1 : 0) ||
    (a.reservado ? 1 : 0) - (b.reservado ? 1 : 0))

  return NextResponse.json(unidades)
}
