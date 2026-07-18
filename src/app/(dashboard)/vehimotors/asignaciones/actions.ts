'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

async function guard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const }
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return { error: 'Sin permisos' as const }
  const svc = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  return { svc, email: user.email ?? rol }
}

export type CrearVinculacionInput = {
  vehiculoId: string
  numeroSa: string
  montoProforma: number | null
  moneda: string
}

export async function crearVinculacion(input: CrearVinculacionInput) {
  const g = await guard(); if ('error' in g) return g
  const { svc, email } = g

  const { data: veh } = await svc.from('vehiculos')
    .select('id, cliente_id, tipo_compra')
    .eq('id', input.vehiculoId).single()
  if (!veh) return { error: 'Vehículo no encontrado' }
  if (!veh.cliente_id) return { error: 'El vehículo no tiene cliente asignado' }

  // Evitar duplicar una vinculación activa del mismo vehículo
  const { data: existente } = await svc.from('vinculaciones')
    .select('id').eq('vehiculo_id', input.vehiculoId).neq('estado', 'anulado').limit(1)
  if (existente && existente.length) return { error: 'Este vehículo ya tiene una asignación en curso' }

  const { data: vinc, error } = await svc.from('vinculaciones').insert({
    vehiculo_id: input.vehiculoId,
    cliente_id: veh.cliente_id,
    numero_sa: input.numeroSa.trim() || null,
    tipo_venta: veh.tipo_compra ?? null,
    monto_proforma: input.montoProforma,
    moneda: input.moneda,
    estado: 'asignado',
    creado_por: email,
  }).select('id').single()
  if (error || !vinc) return { error: error?.message ?? 'No se pudo crear la asignación' }

  // Guardar el N° SA en el vehículo
  if (input.numeroSa.trim()) {
    await svc.from('vehiculos').update({ numero_sa: input.numeroSa.trim() }).eq('id', input.vehiculoId)
  }

  await svc.from('vinculaciones_historial').insert({
    vinculacion_id: vinc.id, estado_nuevo: 'asignado', usuario_email: email, notas: 'Cliente asignado',
  })

  return { ok: true, vinculacionId: vinc.id }
}

const SIGUIENTE: Record<string, string> = {
  asignado: 'en_facturacion',
  en_facturacion: 'factura_recibida',
  factura_recibida: 'completado',
}

export async function avanzarFase(vinculacionId: string, notas?: string) {
  const g = await guard(); if ('error' in g) return g
  const { svc, email } = g

  const { data: v } = await svc.from('vinculaciones').select('id, estado').eq('id', vinculacionId).single()
  if (!v) return { error: 'Asignación no encontrada' }
  const nuevo = SIGUIENTE[v.estado]
  if (!nuevo) return { error: 'Ya está en la última fase' }

  const patch: Record<string, unknown> = { estado: nuevo, updated_at: new Date().toISOString() }
  if (nuevo === 'factura_recibida') patch.facturado_at = new Date().toISOString()

  const { error } = await svc.from('vinculaciones').update(patch).eq('id', vinculacionId)
  if (error) return { error: error.message }

  await svc.from('vinculaciones_historial').insert({
    vinculacion_id: vinculacionId, estado_nuevo: nuevo, usuario_email: email, notas: notas?.trim() || null,
  })
  return { ok: true, estado: nuevo }
}

export async function anularVinculacion(vinculacionId: string, motivo: string) {
  const g = await guard(); if ('error' in g) return g
  const { svc, email } = g
  const { error } = await svc.from('vinculaciones').update({ estado: 'anulado', updated_at: new Date().toISOString() }).eq('id', vinculacionId)
  if (error) return { error: error.message }
  await svc.from('vinculaciones_historial').insert({
    vinculacion_id: vinculacionId, estado_nuevo: 'anulado', usuario_email: email, notas: motivo?.trim() || 'Anulada',
  })
  return { ok: true }
}
