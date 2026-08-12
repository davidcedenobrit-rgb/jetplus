export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { listaConcesionariosExternos } from '@/lib/concesionarios-externos'

// Empuja los planes "Asegúrate con $500" (ac500_vehiculos) de Jetplus a los
// concesionarios aliados. Igual que /api/catalogo/sincronizar pero para AC500.
// Se dispara automáticamente cuando Rojas edita un plan (con { id }) y también
// desde el botón "Sincronizar a aliados" (sin id = todo el AC500).
const ROLES = ['jose', 'admin', 'director']
const EXCLUIR = new Set(['created_at', 'updated_at'])

export async function POST(req: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const soloId = typeof body?.id === 'string' && body.id.trim() ? body.id.trim() : null

  const aliados = listaConcesionariosExternos()
  if (aliados.length === 0) {
    // Auto-sync sin aliados configurados: no es error para el usuario.
    if (soloId) return NextResponse.json({ ok: true, sinAliados: true, resultados: [] })
    return NextResponse.json({ error: 'No hay concesionarios aliados configurados (faltan sus llaves de conexión).' }, { status: 400 })
  }

  const origenDb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  let origenQuery = origenDb.from('ac500_vehiculos').select('*').order('orden')
  if (soloId) origenQuery = origenDb.from('ac500_vehiculos').select('*').eq('id', soloId)
  const { data: origen, error: origenErr } = await origenQuery
  if (origenErr || !origen) {
    return NextResponse.json({ error: `No se pudo leer el AC500 de Jetplus: ${origenErr?.message ?? 'desconocido'}` }, { status: 500 })
  }

  const resultados: Array<{ aliado: string; actualizados: number; insertados: number; error?: string }> = []

  for (const a of aliados) {
    const cli = createServiceClient(a.url, a.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    try {
      const { data: destino, error: destErr } = await cli.from('ac500_vehiculos').select('id')
      if (destErr) throw new Error(destErr.message)
      const idsDestino = new Set<string>((destino ?? []).map((d: { id: string }) => d.id))

      let actualizados = 0
      let insertados = 0
      for (const v of origen) {
        const fila: Record<string, unknown> = {}
        for (const [k, val] of Object.entries(v)) if (!EXCLUIR.has(k)) fila[k] = val
        if (idsDestino.has(v.id)) {
          const { error } = await cli.from('ac500_vehiculos').update(fila).eq('id', v.id)
          if (error) throw new Error(`update ${v.id}: ${error.message}`)
          actualizados++
        } else {
          const { error } = await cli.from('ac500_vehiculos').insert([fila])
          if (error) throw new Error(`insert ${v.id}: ${error.message}`)
          insertados++
        }
      }
      resultados.push({ aliado: a.label, actualizados, insertados })
    } catch (e) {
      resultados.push({ aliado: a.label, actualizados: 0, insertados: 0, error: (e as Error).message })
    }
  }

  return NextResponse.json({ ok: true, totalOrigen: origen.length, resultados })
}
