'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// Conciliar y administrar cuentas: dirección + administradoras (Mary, Leysdem)
const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

// Cliente service-role real (RLS bypass) — se usa SOLO tras autorizar por rol,
// porque ingresos/egresos tienen RLS y el admin client corre como el usuario.
function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export interface Cuenta {
  id: string
  nombre: string
  tipo: string
  moneda: string
  custodio: string | null
  banco: string | null
  orden: number
  activo: boolean
}

async function guard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' as const }
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return { error: 'Sin permiso' as const }
  return { ok: true as const, user }
}

const CUENTA_COLS = 'id, nombre, tipo, moneda, custodio, banco, orden, activo'

export async function listarCuentas(soloActivas = true): Promise<{ cuentas: Cuenta[]; error?: string }> {
  const g = await guard()
  if ('error' in g) return { cuentas: [], error: g.error }
  const admin = await createAdminClient()
  let q = admin.from('cuentas').select(CUENTA_COLS).order('orden').order('nombre')
  if (soloActivas) q = q.eq('activo', true)
  const { data } = await q
  return { cuentas: (data ?? []) as Cuenta[] }
}

type CuentaInput = {
  nombre: string
  tipo: string
  moneda: string
  custodio: string | null
  banco: string | null
  orden?: number
}

export async function guardarCuenta(id: string | null, input: CuentaInput): Promise<{ ok?: boolean; error?: string }> {
  const g = await guard()
  if ('error' in g) return { error: g.error }
  if (!input.nombre?.trim()) return { error: 'El nombre es requerido' }
  if (!['banco', 'usdt', 'efectivo', 'otro'].includes(input.tipo)) return { error: 'Tipo inválido' }
  if (!['USD', 'VES', 'USDT'].includes(input.moneda)) return { error: 'Moneda inválida' }
  const clean = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null)
  const row = {
    nombre: input.nombre.trim(),
    tipo: input.tipo,
    moneda: input.moneda,
    custodio: clean(input.custodio),
    banco: clean(input.banco),
    orden: Number.isFinite(input.orden) ? Number(input.orden) : 0,
  }
  const admin = await createAdminClient()
  const { error } = id
    ? await admin.from('cuentas').update(row).eq('id', id)
    : await admin.from('cuentas').insert({ ...row, activo: true })
  if (error) return { error: 'Error al guardar la cuenta' }
  revalidatePath('/movimientos')
  revalidatePath('/movimientos/cuentas')
  return { ok: true }
}

export async function desactivarCuenta(id: string): Promise<{ ok?: boolean; error?: string }> {
  const g = await guard()
  if ('error' in g) return { error: g.error }
  const admin = await createAdminClient()
  const { error } = await admin.from('cuentas').update({ activo: false }).eq('id', id)
  if (error) return { error: 'Error al desactivar' }
  revalidatePath('/movimientos/cuentas')
  return { ok: true }
}

// ── Conciliar / asignar cuenta a un movimiento (ingreso o egreso) ──
function tabla(tipo: string) {
  if (tipo === 'ingreso') return 'ingresos'
  if (tipo === 'egreso') return 'egresos'
  return null
}

export async function conciliarMovimiento(
  tipo: 'ingreso' | 'egreso', id: string, conciliado: boolean
): Promise<{ ok?: boolean; error?: string }> {
  const g = await guard()
  if ('error' in g) return { error: g.error }
  const t = tabla(tipo)
  if (!t) return { error: 'Tipo inválido' }
  const svc = serviceClient()
  const { error } = await svc.from(t).update({
    conciliado,
    conciliado_por: conciliado ? (g.user.email ?? null) : null,
    conciliado_at: conciliado ? new Date().toISOString() : null,
  }).eq('id', id)
  if (error) return { error: 'Error al conciliar' }
  revalidatePath('/movimientos')
  return { ok: true }
}

export async function asignarCuenta(
  tipo: 'ingreso' | 'egreso', id: string, cuentaId: string | null
): Promise<{ ok?: boolean; error?: string }> {
  const g = await guard()
  if ('error' in g) return { error: g.error }
  const t = tabla(tipo)
  if (!t) return { error: 'Tipo inválido' }
  const svc = serviceClient()
  const { error } = await svc.from(t).update({ cuenta_id: cuentaId }).eq('id', id)
  if (error) return { error: 'Error al asignar la cuenta' }
  revalidatePath('/movimientos')
  return { ok: true }
}
