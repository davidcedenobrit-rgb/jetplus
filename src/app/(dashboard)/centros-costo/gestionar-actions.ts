'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const ROLES = ['jose', 'admin', 'director']

async function guarded() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const }
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return { error: 'Sin permisos' as const }
  const svc = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  return { svc }
}

function slug(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'centro'
}

export async function crearCentro(nombre: string) {
  const g = await guarded(); if ('error' in g) return g
  const n = nombre.trim()
  if (!n) return { error: 'El nombre no puede estar vacío' }
  const base = slug(n)
  const { data: existentes } = await g.svc.from('centros_costo').select('id, orden')
  const ids = new Set((existentes ?? []).map(c => c.id))
  let id = base, i = 2
  while (ids.has(id)) { id = `${base}_${i++}` }
  const maxOrden = Math.max(0, ...(existentes ?? []).map(c => Number(c.orden) || 0))
  const { error } = await g.svc.from('centros_costo').insert({ id, nombre: n, activo: true, orden: maxOrden + 1 })
  return error ? { error: error.message } : { ok: true }
}

export async function renombrarCentro(id: string, nombre: string) {
  const g = await guarded(); if ('error' in g) return g
  const n = nombre.trim()
  if (!n) return { error: 'El nombre no puede estar vacío' }
  const { error } = await g.svc.from('centros_costo').update({ nombre: n }).eq('id', id)
  return error ? { error: error.message } : { ok: true }
}

export async function toggleCentro(id: string, activo: boolean) {
  const g = await guarded(); if ('error' in g) return g
  const { error } = await g.svc.from('centros_costo').update({ activo }).eq('id', id)
  return error ? { error: error.message } : { ok: true }
}

// Guarda el reparto de gastos comunes (% por centro de ingreso). Debe sumar 100.
export async function guardarReparto(rows: { centro_costo_id: string; porcentaje: number }[]) {
  const g = await guarded(); if ('error' in g) return g
  const limpio = (rows ?? []).map(r => ({
    centro_costo_id: String(r.centro_costo_id),
    porcentaje: Math.max(0, Math.round(Number(r.porcentaje) * 100) / 100),
  })).filter(r => r.centro_costo_id)
  const suma = limpio.reduce((s, r) => s + r.porcentaje, 0)
  if (Math.abs(suma - 100) > 0.01) return { error: `Los porcentajes deben sumar 100% (suman ${suma.toFixed(2)}%)` }
  const now = new Date().toISOString()
  const { error } = await g.svc.from('reparto_gastos_comunes')
    .upsert(limpio.map(r => ({ ...r, updated_at: now })), { onConflict: 'centro_costo_id' })
  return error ? { error: error.message } : { ok: true }
}

export async function moverCentro(id: string, direccion: 'arriba' | 'abajo') {
  const g = await guarded(); if ('error' in g) return g
  const { data: lista } = await g.svc.from('centros_costo').select('id, orden').order('orden')
  const l = lista ?? []
  const i = l.findIndex(c => c.id === id)
  if (i < 0) return { error: 'Centro no encontrado' }
  const j = direccion === 'arriba' ? i - 1 : i + 1
  if (j < 0 || j >= l.length) return { ok: true }
  const a = l[i], b = l[j]
  await g.svc.from('centros_costo').update({ orden: b.orden }).eq('id', a.id)
  await g.svc.from('centros_costo').update({ orden: a.orden }).eq('id', b.id)
  return { ok: true }
}
