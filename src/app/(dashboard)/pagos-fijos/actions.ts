'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export type Frecuencia = 'semanal' | 'quincenal' | 'mensual' | 'trimestral' | 'anual'

export type PagoFijo = {
  id: string
  concepto: string
  monto: number
  moneda: string
  frecuencia: string
  dia_pago: number | null
  centro_costo_id: string | null
  categoria: string | null
  proveedor_id: string | null
  beneficiario: string | null
  proximo_pago: string | null
  activo: boolean
  notas: string | null
  ultimo_pago_at: string | null
}

const COLS = 'id, concepto, monto, moneda, frecuencia, dia_pago, centro_costo_id, categoria, proveedor_id, beneficiario, proximo_pago, activo, notas, ultimo_pago_at'

function siguienteFecha(desde: Date, frecuencia: string): Date {
  const d = new Date(desde)
  switch (frecuencia) {
    case 'semanal':    d.setDate(d.getDate() + 7); break
    case 'quincenal':  d.setDate(d.getDate() + 15); break
    case 'trimestral': d.setMonth(d.getMonth() + 3); break
    case 'anual':      d.setFullYear(d.getFullYear() + 1); break
    case 'mensual':
    default:           d.setMonth(d.getMonth() + 1); break
  }
  return d
}

export async function listarPagosFijos(): Promise<{ pagos: PagoFijo[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { pagos: [] }

  const admin = await createAdminClient()
  const { data } = await admin.from('pagos_fijos').select(COLS).order('activo', { ascending: false }).order('proximo_pago', { nullsFirst: false })
  return { pagos: (data ?? []) as PagoFijo[] }
}

export async function crearPagoFijo(input: {
  concepto: string
  monto: number
  moneda: string
  frecuencia: Frecuencia
  dia_pago?: number | null
  centro_costo_id?: string | null
  categoria?: string | null
  proveedor_id?: string | null
  beneficiario?: string | null
  proximo_pago?: string | null
  notas?: string | null
}): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const concepto = input.concepto?.trim()
  if (!concepto) return { error: 'El concepto es requerido' }
  if (!(input.monto > 0)) return { error: 'El monto debe ser mayor a 0' }

  const admin = await createAdminClient()
  const { error } = await admin.from('pagos_fijos').insert({
    concepto,
    monto:           input.monto,
    moneda:          input.moneda || 'USD',
    frecuencia:      input.frecuencia || 'mensual',
    dia_pago:        input.dia_pago ?? null,
    centro_costo_id: input.centro_costo_id?.trim() || null,
    categoria:       input.categoria?.trim() || null,
    proveedor_id:    input.proveedor_id?.trim() || null,
    beneficiario:    input.beneficiario?.trim() || null,
    proximo_pago:    input.proximo_pago || null,
    notas:           input.notas?.trim() || null,
    registrado_por:  user.id,
  })
  if (error) return { error: 'Error al crear el pago fijo' }
  revalidatePath('/pagos-fijos')
  return { ok: true }
}

export async function togglePagoFijo(id: string, activo: boolean): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const admin = await createAdminClient()
  const { error } = await admin.from('pagos_fijos').update({ activo }).eq('id', id)
  if (error) return { error: 'Error al actualizar' }
  revalidatePath('/pagos-fijos')
  return { ok: true }
}

export async function eliminarPagoFijo(id: string): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const admin = await createAdminClient()
  const { error } = await admin.from('pagos_fijos').delete().eq('id', id)
  if (error) return { error: 'Error al eliminar' }
  revalidatePath('/pagos-fijos')
  return { ok: true }
}

// Genera el egreso del período a partir del pago fijo y adelanta el próximo pago.
export async function registrarEgresoDePagoFijo(id: string): Promise<{ ok?: boolean; error?: string; egresoId?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const admin = await createAdminClient()
  const { data: pf } = await admin.from('pagos_fijos').select('*').eq('id', id).single()
  if (!pf) return { error: 'Pago fijo no encontrado' }

  const hoy = new Date().toISOString().split('T')[0]

  const year = new Date().getFullYear()
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  const seq = String(buf[0] % 1_000_000).padStart(6, '0')
  const numero_egreso = `LOA-EGR-${year}-${seq}`

  const { data: inserted, error: insErr } = await admin.from('egresos').insert({
    numero_egreso,
    categoria:        pf.categoria ?? 'otros',
    concepto:         pf.concepto,
    descripcion:      `Pago fijo (${pf.frecuencia})`,
    monto:            pf.monto,
    moneda:           pf.moneda ?? 'USD',
    beneficiario:     pf.beneficiario ?? null,
    centro_costo_id:  null, // gasto común: no va a un solo centro, se reparte por %
    es_comun:         true,
    proveedor_id:     pf.proveedor_id ?? null,
    tipo_movimiento:  'gasto',
    fecha_egreso:     hoy,
    estado:           'pendiente_aprobacion',
    registrado_por:   user.id,
  }).select('id').single()

  if (insErr || !inserted) return { error: 'Error al generar el egreso' }

  // Adelantar el próximo pago desde la fecha programada (o desde hoy si no había)
  const base = pf.proximo_pago ? new Date(pf.proximo_pago + 'T00:00:00') : new Date(hoy + 'T00:00:00')
  const siguiente = siguienteFecha(base, pf.frecuencia).toISOString().split('T')[0]

  await admin.from('pagos_fijos').update({
    proximo_pago:    siguiente,
    ultimo_egreso_id: inserted.id,
    ultimo_pago_at:  new Date().toISOString(),
  }).eq('id', id)

  revalidatePath('/pagos-fijos')
  revalidatePath('/egresos')
  return { ok: true, egresoId: inserted.id }
}
