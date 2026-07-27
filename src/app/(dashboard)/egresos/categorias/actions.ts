'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const ROLES = ['jose', 'admin', 'director']

async function guarded() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const }
  const { data: usuario } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  if (!ROLES.includes(usuario?.rol ?? '')) return { error: 'Sin permisos' as const }
  const svc = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  return { svc }
}

function slug(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'categoria'
}

export async function crearCategoria(nombre: string) {
  const g = await guarded(); if ('error' in g) return g
  const n = nombre.trim()
  if (!n) return { error: 'El nombre no puede estar vacío' }
  // Genera una clave única a partir del nombre
  const base = slug(n)
  const { data: existentes } = await g.svc.from('categorias_egreso').select('clave, orden')
  const claves = new Set((existentes ?? []).map(c => c.clave))
  let clave = base, i = 2
  while (claves.has(clave)) { clave = `${base}_${i++}` }
  const maxOrden = Math.max(0, ...(existentes ?? []).map(c => Number(c.orden) || 0))
  const { error } = await g.svc.from('categorias_egreso').insert({ clave, nombre: n, activo: true, orden: maxOrden + 1 })
  return error ? { error: error.message } : { ok: true }
}

export async function renombrarCategoria(clave: string, nombre: string) {
  const g = await guarded(); if ('error' in g) return g
  const n = nombre.trim()
  if (!n) return { error: 'El nombre no puede estar vacío' }
  const { error } = await g.svc.from('categorias_egreso').update({ nombre: n }).eq('clave', clave)
  return error ? { error: error.message } : { ok: true }
}

export async function toggleCategoria(clave: string, activo: boolean) {
  const g = await guarded(); if ('error' in g) return g
  const { error } = await g.svc.from('categorias_egreso').update({ activo }).eq('clave', clave)
  return error ? { error: error.message } : { ok: true }
}

export async function moverCategoria(clave: string, direccion: 'arriba' | 'abajo') {
  const g = await guarded(); if ('error' in g) return g
  const { data: cats } = await g.svc.from('categorias_egreso').select('clave, orden').order('orden')
  const lista = cats ?? []
  const i = lista.findIndex(c => c.clave === clave)
  if (i < 0) return { error: 'Categoría no encontrada' }
  const j = direccion === 'arriba' ? i - 1 : i + 1
  if (j < 0 || j >= lista.length) return { ok: true }
  const a = lista[i], b = lista[j]
  await g.svc.from('categorias_egreso').update({ orden: b.orden }).eq('clave', a.clave)
  await g.svc.from('categorias_egreso').update({ orden: a.orden }).eq('clave', b.clave)
  return { ok: true }
}
