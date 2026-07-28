'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// Dirección: puede aprobar / rechazar / pedir corrección / marcar pagado.
const DIR = ['jose', 'admin', 'director', 'mary', 'leysdem']

async function guard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const }
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!DIR.includes(rol)) return { error: 'Sin permisos' as const }
  return { user, admin: await createAdminClient() }
}

function done(id: string) { revalidatePath(`/egresos/${id}`); revalidatePath('/egresos'); return { ok: true as const } }

export async function aprobarEgreso(id: string) {
  const g = await guard(); if ('error' in g) return g
  const { error } = await g.admin.from('egresos').update({
    estado: 'aprobado', aprobado_por: g.user.id, fecha_aprobacion: new Date().toISOString(),
    motivo_revision: null,
  }).eq('id', id).in('estado', ['pendiente_aprobacion', 'correccion_requerida'])
  return error ? { error: error.message } : done(id)
}

export async function rechazarEgreso(id: string, motivo: string) {
  const g = await guard(); if ('error' in g) return g
  if (!motivo.trim()) return { error: 'Indica el motivo del rechazo' }
  const { error } = await g.admin.from('egresos').update({
    estado: 'rechazado', motivo_revision: motivo.trim(), revisado_por: g.user.id, revisado_at: new Date().toISOString(),
  }).eq('id', id).in('estado', ['pendiente_aprobacion', 'correccion_requerida'])
  return error ? { error: error.message } : done(id)
}

export async function solicitarCorreccionEgreso(id: string, motivo: string) {
  const g = await guard(); if ('error' in g) return g
  if (!motivo.trim()) return { error: 'Indica qué debe corregirse' }
  const { error } = await g.admin.from('egresos').update({
    estado: 'correccion_requerida', motivo_revision: motivo.trim(), revisado_por: g.user.id, revisado_at: new Date().toISOString(),
  }).eq('id', id).eq('estado', 'pendiente_aprobacion')
  return error ? { error: error.message } : done(id)
}

// Reenviar a aprobación tras corregir. Lo puede hacer dirección o quien lo registró.
export async function reenviarEgreso(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const }
  const rol = (user.app_metadata?.rol as string) ?? ''
  const admin = await createAdminClient()
  const { data: e } = await admin.from('egresos').select('registrado_por, estado').eq('id', id).maybeSingle()
  if (!e) return { error: 'Egreso no encontrado' as const }
  if (!DIR.includes(rol) && e.registrado_por !== user.id) return { error: 'Sin permisos' as const }
  if (e.estado !== 'correccion_requerida') return { error: 'El egreso no está en corrección' as const }
  const { error } = await admin.from('egresos').update({ estado: 'pendiente_aprobacion', motivo_revision: null }).eq('id', id)
  return error ? { error: error.message } : done(id)
}

export async function marcarPagadoEgreso(id: string, pago: { fecha: string; referencia: string }) {
  const g = await guard(); if ('error' in g) return g
  const fecha = pago.fecha || new Date().toISOString().slice(0, 10)
  const { error } = await g.admin.from('egresos').update({
    estado: 'pagado', pago_fecha: fecha, pago_referencia: pago.referencia?.trim() || null,
    pagado_por: g.user.id, pagado_at: new Date().toISOString(),
  }).eq('id', id).eq('estado', 'aprobado')
  return error ? { error: error.message } : done(id)
}
