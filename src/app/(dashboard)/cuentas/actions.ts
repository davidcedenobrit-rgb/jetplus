'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function guard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' as const }
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return { error: 'Sin permiso' as const }
  return { ok: true as const, user }
}

const clean = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null)

export type CxPInput = {
  beneficiario: string
  proveedorId: string | null
  concepto: string
  categoria: string | null
  centroCostoId: string | null
  monto: number
  moneda: string
  tasaCambio: number | null
  fechaLimite: string | null
  notas: string | null
  facturaUrl: string | null
}

export async function crearCuentaPorPagar(input: CxPInput): Promise<{ ok?: boolean; error?: string }> {
  const g = await guard()
  if ('error' in g) return { error: g.error }
  if (!input.beneficiario?.trim()) return { error: 'El beneficiario es requerido' }
  if (!input.concepto?.trim()) return { error: 'El concepto es requerido' }
  if (!(input.monto > 0)) return { error: 'El monto debe ser mayor a 0' }
  if (input.moneda === 'VES' && !(input.tasaCambio && input.tasaCambio > 0)) {
    return { error: 'Un monto en bolívares requiere la tasa del día' }
  }
  const { error } = await svc().from('cuentas_por_pagar').insert({
    beneficiario: input.beneficiario.trim(),
    proveedor_id: input.proveedorId || null,
    concepto: input.concepto.trim(),
    categoria: input.categoria || null,
    centro_costo_id: input.centroCostoId || null,
    monto: input.monto,
    moneda: input.moneda,
    tasa_cambio: input.tasaCambio ?? null,
    fecha_limite: clean(input.fechaLimite),
    notas: clean(input.notas),
    factura_url: clean(input.facturaUrl),
    estado: 'pendiente',
    registrado_por: g.user.id,
  })
  if (error) return { error: 'Error al guardar la cuenta por pagar' }
  revalidatePath('/cuentas')
  return { ok: true }
}

export type PagoInput = {
  fechaPago: string
  metodoPago: string | null
  bancoOrigen: string | null
  referencia: string | null
}

// Marca la obligación como pagada y genera el egreso correspondiente,
// para que el gasto quede registrado en el sistema (movimientos, reportes).
export async function marcarPagada(id: string, pago: PagoInput): Promise<{ ok?: boolean; error?: string }> {
  const g = await guard()
  if ('error' in g) return { error: g.error }
  const s = svc()

  const { data: cxp } = await s.from('cuentas_por_pagar')
    .select('*').eq('id', id).single()
  if (!cxp) return { error: 'Cuenta por pagar no encontrada' }
  if (cxp.estado !== 'pendiente') return { error: 'Esta cuenta ya no está pendiente' }

  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(pago.fechaPago) ? pago.fechaPago : new Date().toISOString().slice(0, 10)
  const montoBs = cxp.moneda === 'VES' ? Number(cxp.monto)
    : (cxp.tasa_cambio ? Number(cxp.monto) * Number(cxp.tasa_cambio) : null)

  const { data: egreso, error: egErr } = await s.from('egresos').insert({
    categoria: cxp.categoria ?? 'proveedores',
    concepto: cxp.concepto,
    monto: cxp.monto,
    moneda: cxp.moneda,
    tasa_cambio: cxp.tasa_cambio ?? null,
    monto_bs: montoBs,
    metodo_pago: clean(pago.metodoPago),
    banco_origen: clean(pago.bancoOrigen),
    referencia: clean(pago.referencia),
    beneficiario: cxp.beneficiario,
    proveedor_id: cxp.proveedor_id ?? null,
    centro_costo_id: cxp.centro_costo_id ?? null,
    area_responsable: 'Cuentas por pagar',
    tipo_movimiento: 'gasto',
    fecha_egreso: fecha,
    estado: 'pagado',
    registrado_por: g.user.id,
  }).select('id').single()

  if (egErr || !egreso) return { error: `No se pudo generar el egreso: ${egErr?.message ?? 'error'}` }

  const { error: upErr } = await s.from('cuentas_por_pagar').update({
    estado: 'pagada',
    egreso_id: egreso.id,
    pagada_at: new Date().toISOString(),
    pagada_por: g.user.email ?? null,
    updated_at: new Date().toISOString(),
  }).eq('id', id)
  if (upErr) return { error: 'Se creó el egreso pero no se pudo cerrar la cuenta' }

  revalidatePath('/cuentas')
  revalidatePath('/egresos')
  return { ok: true }
}

export async function anularCuentaPorPagar(id: string): Promise<{ ok?: boolean; error?: string }> {
  const g = await guard()
  if ('error' in g) return { error: g.error }
  const { error } = await svc().from('cuentas_por_pagar')
    .update({ estado: 'anulada', updated_at: new Date().toISOString() })
    .eq('id', id).eq('estado', 'pendiente')
  if (error) return { error: 'Error al anular' }
  revalidatePath('/cuentas')
  return { ok: true }
}
