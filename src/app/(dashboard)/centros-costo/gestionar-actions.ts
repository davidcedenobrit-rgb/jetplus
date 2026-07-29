'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const ROLES = ['jose', 'admin', 'director']

// Clave especial de Rojas para desbloquear el reparto (hash SHA-256 con sal).
const CLAVE_SALT = 'la-oriental-reparto-v1'
function hashClave(clave: string): string {
  return createHash('sha256').update(CLAVE_SALT + clave).digest('hex')
}

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

// Estado del candado del reparto (para la UI).
export async function estadoReparto() {
  const g = await guarded(); if ('error' in g) return g
  const { data: cfg } = await g.svc.from('reparto_config').select('bloqueado_hasta, clave_hash').eq('id', 1).single()
  const bloqueado = !!(cfg?.bloqueado_hasta && new Date(cfg.bloqueado_hasta) > new Date())
  return { ok: true as const, bloqueadoHasta: (cfg?.bloqueado_hasta as string | null) ?? null, bloqueado, tieneClave: !!cfg?.clave_hash }
}

// Guarda el reparto de gastos comunes (% por centro de ingreso). Debe sumar 100.
// Si hay clave configurada y el reparto está bloqueado (dentro del mes), exige
// la clave de Rojas. Al guardar, vuelve a bloquear por un mes.
export async function guardarReparto(rows: { centro_costo_id: string; porcentaje: number }[], clave?: string) {
  const g = await guarded(); if ('error' in g) return g
  const limpio = (rows ?? []).map(r => ({
    centro_costo_id: String(r.centro_costo_id),
    porcentaje: Math.max(0, Math.round(Number(r.porcentaje) * 100) / 100),
  })).filter(r => r.centro_costo_id)
  const suma = limpio.reduce((s, r) => s + r.porcentaje, 0)
  if (Math.abs(suma - 100) > 0.01) return { error: `Los porcentajes deben sumar 100% (suman ${suma.toFixed(2)}%)` }

  const { data: cfg } = await g.svc.from('reparto_config').select('bloqueado_hasta, clave_hash').eq('id', 1).single()
  const ahora = new Date()
  const tieneClave = !!cfg?.clave_hash
  const bloqueado = !!(cfg?.bloqueado_hasta && new Date(cfg.bloqueado_hasta) > ahora)
  if (tieneClave && bloqueado) {
    if (!clave || hashClave(clave) !== cfg!.clave_hash) {
      const hasta = new Date(cfg!.bloqueado_hasta as string).toLocaleDateString('es-VE')
      return { error: `El reparto está bloqueado hasta el ${hasta}. Ingresa la clave de Rojas para modificarlo.` }
    }
  }

  const now = ahora.toISOString()
  const { error } = await g.svc.from('reparto_gastos_comunes')
    .upsert(limpio.map(r => ({ ...r, updated_at: now })), { onConflict: 'centro_costo_id' })
  if (error) return { error: error.message }

  // Vuelve a bloquear por un mes (solo tiene efecto si hay clave para desbloquear).
  if (tieneClave) {
    const hasta = new Date(ahora); hasta.setMonth(hasta.getMonth() + 1)
    await g.svc.from('reparto_config').update({ bloqueado_hasta: hasta.toISOString(), updated_at: now }).eq('id', 1)
  }
  return { ok: true }
}

// Configura o cambia la clave especial de Rojas. Si ya existe, exige la actual.
export async function configurarClaveReparto(nueva: string, actual?: string) {
  const g = await guarded(); if ('error' in g) return g
  const n = (nueva ?? '').trim()
  if (n.length < 4) return { error: 'La clave debe tener al menos 4 caracteres' }
  const { data: cfg } = await g.svc.from('reparto_config').select('clave_hash').eq('id', 1).single()
  if (cfg?.clave_hash) {
    if (!actual || hashClave(actual) !== cfg.clave_hash) return { error: 'La clave actual no es correcta' }
  }
  const { error } = await g.svc.from('reparto_config')
    .update({ clave_hash: hashClave(n), updated_at: new Date().toISOString() }).eq('id', 1)
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
