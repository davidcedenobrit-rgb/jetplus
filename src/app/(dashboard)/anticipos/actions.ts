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

export type ShowroomOpt = { id: string; marca: string; modelo: string; version: string | null; color: string | null; placa: string | null }

// Carros del showroom disponibles para reservar (en agencia o ya reservados).
export async function listarShowroomDisponible(q: string): Promise<ShowroomOpt[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const admin = await createAdminClient()
  let sel = admin.from('vehiculos_showroom')
    .select('id, marca, modelo, version, color, placa')
    .in('estado', ['en_agencia', 'reservado'])
  const query = q.trim().replace(/[%,()*]/g, ' ')
  if (query.length >= 2) {
    const like = `%${query}%`
    sel = sel.or(`marca.ilike.${like},modelo.ilike.${like},placa.ilike.${like}`)
  }
  const { data } = await sel.order('marca').limit(20)
  return (data ?? []) as ShowroomOpt[]
}

export type ReservaVehiculo = { marca: string; modelo: string; placa: string | null; color: string | null; showroom_id: string | null }

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
  comprobantes?: { url: string; nombre: string }[]
  reservaVehiculo?: ReservaVehiculo | null
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
    reserva_vehiculo: p.reservaVehiculo && p.reservaVehiculo.modelo ? p.reservaVehiculo : null,
    estado: 'disponible',
    registrado_por: user.id,
  }).select('id').single()

  if (error || !data) return { error: 'No se pudo registrar el anticipo' }

  // Comprobante(s) del pago (ya subidos a storage por el cliente).
  const comps = (p.comprobantes ?? []).filter(c => c?.url)
  if (comps.length) {
    await admin.from('archivos').insert(
      comps.map(c => ({ tipo: 'comprobante', url: c.url, nombre: c.nombre, anticipo_id: data.id, subido_por: user.id }))
    )
  }
  return { ok: true, anticipoId: data.id }
}

export type AnticipoDisponible = {
  id: string; monto: number; moneda: string; monto_usd: number; saldo_usd: number
  metodo_pago: string | null; referencia: string | null; fecha_pago: string; concepto: string | null
}

// Anticipos con saldo disponible de un cliente (para asociar a proforma/venta).
export async function listarAnticiposCliente(clienteId: string): Promise<AnticipoDisponible[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !clienteId) return []
  const admin = await createAdminClient()
  const { data } = await admin
    .from('anticipos')
    .select('id, monto, moneda, monto_usd, saldo_usd, metodo_pago, referencia, fecha_pago, concepto')
    .eq('cliente_id', clienteId)
    .in('estado', ['disponible', 'parcial'])
    .gt('saldo_usd', 0.009)
    .order('fecha_pago')
  return (data ?? []) as AnticipoDisponible[]
}

// Aplica los anticipos a una venta: por cada uno crea un INGRESO (ligado al
// vehículo) por el monto aplicado, reduce su saldo y actualiza su estado. El
// total aplicado se topa en `topeInicial` (el inicial que le toca al cliente).
export async function aplicarAnticiposAVenta(p: {
  anticipoIds: string[]; vehiculoId: string; clienteId: string; placa: string | null
  vehiculoDesc: string; fecha: string; topeInicial: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }
  const ids = (p.anticipoIds ?? []).filter(Boolean)
  if (ids.length === 0) return { ok: true, totalAplicado: 0 }

  const admin = await createAdminClient()
  const { data: ants } = await admin
    .from('anticipos')
    .select('id, saldo_usd')
    .in('id', ids)
    .eq('cliente_id', p.clienteId)
    .in('estado', ['disponible', 'parcial'])
    .order('fecha_pago')

  let restante = Number.isFinite(p.topeInicial) ? Math.max(0, p.topeInicial) : Number.POSITIVE_INFINITY
  let totalAplicado = 0
  for (const a of ants ?? []) {
    if (restante <= 0.009) break
    const saldo = Number(a.saldo_usd) || 0
    if (saldo <= 0) continue
    const aplica = Math.round(Math.min(saldo, restante) * 100) / 100
    if (aplica <= 0) continue
    const { error: insErr } = await admin.from('ingresos').insert({
      cliente_id: p.clienteId,
      vehiculo_id: p.vehiculoId,
      placa: p.placa || null,
      concepto: `Anticipo aplicado a inicial — ${p.vehiculoDesc}`,
      monto: aplica,
      moneda: 'USD',
      metodo_pago: 'Anticipo',
      fecha_pago: p.fecha,
      estado: 'registrado',
      anticipo_id: a.id,
      registrado_por: user.id,
    })
    if (insErr) continue
    const nuevoSaldo = Math.round((saldo - aplica) * 100) / 100
    await admin.from('anticipos').update({
      saldo_usd: nuevoSaldo,
      estado: nuevoSaldo <= 0.009 ? 'aplicado' : 'parcial',
      updated_at: new Date().toISOString(),
    }).eq('id', a.id)
    totalAplicado = Math.round((totalAplicado + aplica) * 100) / 100
    restante = Math.round((restante - aplica) * 100) / 100
  }
  return { ok: true, totalAplicado }
}

// Asocia INGRESOS ya registrados (no anticipos) a una venta: los liga al
// vehículo para que cuenten como inicial pagado, sin crear ni recobrar nada.
export async function asociarIngresosAVenta(ingresoIds: string[], vehiculoId: string, placa: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }
  const ids = (ingresoIds ?? []).filter(Boolean)
  if (ids.length === 0) return { ok: true }
  const admin = await createAdminClient()
  const { error } = await admin.from('ingresos')
    .update({ vehiculo_id: vehiculoId, placa: placa || null })
    .in('id', ids)
  if (error) return { error: 'No se pudieron asociar los ingresos' }
  return { ok: true }
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
