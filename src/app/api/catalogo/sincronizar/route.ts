export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { listaConcesionariosExternos } from '@/lib/concesionarios-externos'

// Solo Rojas / admin pueden empujar el catálogo a los aliados.
const ROLES = ['jose', 'admin', 'director']

// Campos que NO se copian al aliado:
//  · id / created_at / updated_at → técnicos, cada base maneja los suyos.
//  · stock → inventario físico PROPIO de cada concesionario (no se pisa).
const EXCLUIR = new Set(['id', 'created_at', 'updated_at', 'stock'])

// Llave natural para emparejar el mismo carro entre bases (los id son distintos).
function norm(s: unknown) {
  return String(s ?? '').trim().replace(/\s+/g, ' ').toUpperCase()
}
function llave(v: { brand?: unknown; model?: unknown }) {
  return `${norm(v.brand)}|${norm(v.model)}`
}

export async function POST() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const aliados = listaConcesionariosExternos()
  if (aliados.length === 0) {
    return NextResponse.json({ error: 'No hay concesionarios aliados configurados (faltan sus llaves de conexión).' }, { status: 400 })
  }

  // Catálogo fuente = La Oriental (service role directo, sin cookies).
  const origenDb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  const { data: origen, error: origenErr } = await origenDb
    .from('catalogo_ventas')
    .select('*')
    .order('orden')
  if (origenErr || !origen) {
    return NextResponse.json({ error: `No se pudo leer el catálogo de La Oriental: ${origenErr?.message ?? 'desconocido'}` }, { status: 500 })
  }

  const origenLlaves = new Set(origen.map(llave))
  const resultados: Array<{ aliado: string; actualizados: number; insertados: number; extras: string[]; error?: string }> = []

  for (const a of aliados) {
    const cli = createServiceClient(a.url, a.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    try {
      const { data: destino, error: destErr } = await cli
        .from('catalogo_ventas')
        .select('id, brand, model')
      if (destErr) throw new Error(destErr.message)

      const mapa = new Map<string, string>((destino ?? []).map((d: { id: string; brand: string; model: string }) => [llave(d), d.id]))

      let actualizados = 0
      let insertados = 0
      for (const v of origen) {
        // Copia todos los campos de precios/specs, menos los excluidos.
        const fila: Record<string, unknown> = {}
        for (const [k, val] of Object.entries(v)) if (!EXCLUIR.has(k)) fila[k] = val

        const existenteId = mapa.get(llave(v))
        if (existenteId) {
          const { error } = await cli.from('catalogo_ventas').update(fila).eq('id', existenteId)
          if (error) throw new Error(`update ${v.brand} ${v.model}: ${error.message}`)
          actualizados++
        } else {
          // Carro nuevo en el aliado: entra con stock 0 (aún no tiene inventario).
          const { error } = await cli.from('catalogo_ventas').insert([{ ...fila, stock: 0 }])
          if (error) throw new Error(`insert ${v.brand} ${v.model}: ${error.message}`)
          insertados++
        }
      }

      // Carros que el aliado tiene y La Oriental no (no se borran; se reportan).
      const extras = (destino ?? [])
        .filter((d: { brand: string; model: string }) => !origenLlaves.has(llave(d)))
        .map((d: { brand: string; model: string }) => `${d.brand} ${d.model}`)

      resultados.push({ aliado: a.label, actualizados, insertados, extras })
    } catch (e) {
      resultados.push({ aliado: a.label, actualizados: 0, insertados: 0, extras: [], error: (e as Error).message })
    }
  }

  return NextResponse.json({ ok: true, totalOrigen: origen.length, resultados })
}
