export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { basesFederadas } from '@/lib/cotizacion-federada'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

function conTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>(res => setTimeout(() => res(fallback), ms))])
}

// AC500 de UNA base: cotizaciones ac500 + marca de cuáles ya tienen proforma.
async function ac500DeBase(db: SupabaseClient): Promise<any[]> {
  const { data: cots } = await db
    .from('cotizaciones')
    .select('id, numero, fecha, cliente_nombre, cliente_ci_rif, cliente_cedula, cliente_rif, cliente_correo, cliente_telefono, cliente_direccion, marca, modelo, color, ac500_meses, estado')
    .eq('plan', 'ac500')
    .order('created_at', { ascending: false })
    .limit(100)
  const lista = cots ?? []
  const ids = lista.map(c => c.id)
  const conProforma = new Set<string>()
  if (ids.length) {
    const { data: pfs } = await db.from('precompra_proformas').select('cotizacion_id').in('cotizacion_id', ids)
    for (const p of pfs ?? []) if (p.cotizacion_id) conProforma.add(p.cotizacion_id)
  }
  return lista.map(c => ({ ...c, tiene_proforma: conProforma.has(c.id) }))
}

// Cotizaciones del plan Asegúrate $500 candidatas a convertirse en proforma,
// federadas (base local + las de las otras sedes del grupo).
export async function GET() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const bases = await basesFederadas()
  const resultados = await Promise.all(
    bases.map(b => conTimeout(ac500DeBase(b.db).catch(() => []), b.externo ? 3500 : 4500, []))
  )
  const map = new Map<string, any>()
  for (const c of resultados.flat()) { const k = String(c?.id ?? ''); if (k && !map.has(k)) map.set(k, c) }
  const merged = Array.from(map.values())
    .sort((a, b) => String(b.fecha ?? '').localeCompare(String(a.fecha ?? '')))
  return NextResponse.json(merged)
}
