'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

export type ClienteBusca = { id: string; nombre: string; cedula_rif: string | null; telefono: string | null }

export async function buscarClientesAnticipo(q: string): Promise<ClienteBusca[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const query = q.trim().replace(/[%,()*]/g, ' ')
  if (query.length < 2) return []
  const admin = await createAdminClient()
  const like = `%${query}%`
  const { data } = await admin
    .from('clientes')
    .select('id, nombre, cedula_rif, telefono')
    .or(`nombre.ilike.${like},cedula_rif.ilike.${like}`)
    .order('nombre')
    .limit(15)
  return (data ?? []) as ClienteBusca[]
}

export type CrearAnticipoPayload = {
  clienteId: string
  monto: number
  moneda: 'USD' | 'VES' | 'USDT'
  tasaCambio: number | null
  metodoPago: string | null
  bancoEmisor: string | null
  bancoReceptor: string | null
  referencia: string | null
  fechaPago: string
  concepto: string | null
  observaciones: string | null
}

export async function crearAnticipo(p: CrearAnticipoPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  if (!p.clienteId) return { error: 'Selecciona el cliente' }
  const monto = Number(p.monto)
  if (!Number.isFinite(monto) || monto <= 0) return { error: 'El monto debe ser mayor a 0' }
  if (!p.fechaPago) return { error: 'Indica la fecha del pago' }

  // Equivalente en USD: en VES se divide por la tasa del día.
  const esVes = p.moneda === 'VES'
  const tasa = Number(p.tasaCambio) || 0
  if (esVes && tasa <= 0) return { error: 'Un anticipo en bolívares requiere la tasa del día.' }
  const montoUsd = esVes ? Math.round((monto / tasa) * 100) / 100 : Math.round(monto * 100) / 100
  if (montoUsd <= 0) return { error: 'El equivalente en USD debe ser mayor a 0' }

  const admin = await createAdminClient()
  const { data, error } = await admin.from('anticipos').insert({
    cliente_id: p.clienteId,
    monto,
    moneda: p.moneda,
    tasa_cambio: esVes ? tasa : null,
    monto_bs: esVes ? monto : null,
    monto_usd: montoUsd,
    saldo_usd: montoUsd,
    metodo_pago: p.metodoPago?.trim() || null,
    banco_emisor: p.bancoEmisor?.trim() || null,
    banco_receptor: p.bancoReceptor?.trim() || null,
    referencia: p.referencia?.trim() || null,
    fecha_pago: p.fechaPago,
    concepto: p.concepto?.trim() || null,
    observaciones: p.observaciones?.trim() || null,
    estado: 'disponible',
    registrado_por: user.id,
  }).select('id').single()

  if (error || !data) return { error: 'No se pudo registrar el anticipo' }
  return { ok: true, anticipoId: data.id }
}

const ROLES_ANULAR = ['jose', 'admin', 'director', 'mary', 'leysdem']

export async function anularAnticipo(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES_ANULAR.includes(rol)) return { error: 'Sin permiso para anular' }

  const admin = await createAdminClient()
  const { data: ant } = await admin.from('anticipos').select('estado, monto_usd, saldo_usd').eq('id', id).maybeSingle()
  if (!ant) return { error: 'Anticipo no encontrado' }
  // Solo se anula si no se ha aplicado nada (saldo completo).
  if (Number(ant.saldo_usd) < Number(ant.monto_usd) - 0.01) {
    return { error: 'Este anticipo ya tiene montos asociados; no se puede anular.' }
  }
  const { error } = await admin.from('anticipos').update({ estado: 'anulado', saldo_usd: 0, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return { error: 'No se pudo anular' }
  return { ok: true }
}
