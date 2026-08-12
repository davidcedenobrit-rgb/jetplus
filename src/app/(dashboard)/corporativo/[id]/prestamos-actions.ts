'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem', 'carla']

export type Abono = { id: string; monto: number; fecha: string; nota: string | null }
export type Prestamo = {
  id: string
  empleado_id: string
  monto: number
  moneda: string
  tasa_cambio: number | null
  motivo: string | null
  fecha: string
  egreso_id: string | null
  abonos: Abono[]
  saldo: number
}

async function guard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' as const }
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return { error: 'Sin permiso' as const }
  return { user }
}

export async function listarPrestamos(empleadoId: string): Promise<{ prestamos: Prestamo[] }> {
  const g = await guard()
  if ('error' in g) return { prestamos: [] }
  const admin = await createAdminClient()
  const { data } = await admin
    .from('prestamos_empleados')
    .select('id, empleado_id, monto, moneda, tasa_cambio, motivo, fecha, egreso_id, prestamos_abonos(id, monto, fecha, nota)')
    .eq('empleado_id', empleadoId)
    .order('fecha', { ascending: false })

  const prestamos: Prestamo[] = (data ?? []).map((p: any) => {
    const abonos: Abono[] = (p.prestamos_abonos ?? []).sort((a: Abono, b: Abono) => b.fecha.localeCompare(a.fecha))
    const abonado = abonos.reduce((s, a) => s + Number(a.monto), 0)
    return { ...p, abonos, saldo: Math.max(0, Number(p.monto) - abonado) }
  })
  return { prestamos }
}

export async function crearPrestamo(input: {
  empleadoId: string
  empleadoNombre: string
  monto: number
  moneda: 'USD' | 'VES'
  tasa?: number | null
  motivo?: string | null
  fecha: string
  registrarEgreso: boolean
}): Promise<{ ok?: boolean; error?: string }> {
  const g = await guard()
  if ('error' in g) return { error: g.error }

  if (!(input.monto > 0)) return { error: 'Monto inválido' }
  const moneda = input.moneda === 'VES' ? 'VES' : 'USD'
  const tasa = Number(input.tasa)
  if (moneda === 'VES' && !(tasa > 0)) return { error: 'Para préstamos en Bs ingresa la tasa del día (Bs/$)' }
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(input.fecha) ? input.fecha : new Date().toISOString().slice(0, 10)

  const admin = await createAdminClient()

  let egresoId: string | null = null
  if (input.registrarEgreso) {
    const year = new Date().getFullYear()
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    const numero_egreso = `JPLUS-EGR-${year}-${String(buf[0] % 1_000_000).padStart(6, '0')}`
    const { data: eg } = await admin.from('egresos').insert({
      numero_egreso,
      categoria: 'cuentas_cobrar',
      concepto: `Préstamo a empleado — ${input.empleadoNombre}`,
      descripcion: input.motivo?.trim() || null,
      monto: input.monto,
      moneda,
      tasa_cambio: moneda === 'VES' ? tasa : null,
      beneficiario: input.empleadoNombre,
      centro_costo_id: 'administracion',
      area_responsable: 'Administración',
      tipo_movimiento: 'gasto',
      fecha_egreso: fecha,
      estado: 'registrado',
      registrado_por: g.user.id,
    }).select('id').single()
    egresoId = eg?.id ?? null
  }

  const { error } = await admin.from('prestamos_empleados').insert({
    empleado_id: input.empleadoId,
    monto: input.monto,
    moneda,
    tasa_cambio: moneda === 'VES' ? tasa : null,
    motivo: input.motivo?.trim() || null,
    fecha,
    egreso_id: egresoId,
    registrado_por: g.user.id,
  })
  if (error) return { error: 'Error al registrar el préstamo' }

  revalidatePath(`/corporativo/${input.empleadoId}`)
  if (egresoId) revalidatePath('/egresos')
  return { ok: true }
}

export async function abonarPrestamo(input: {
  prestamoId: string
  empleadoId: string
  monto: number
  fecha: string
  nota?: string | null
}): Promise<{ ok?: boolean; error?: string }> {
  const g = await guard()
  if ('error' in g) return { error: g.error }
  if (!(input.monto > 0)) return { error: 'Monto inválido' }
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(input.fecha) ? input.fecha : new Date().toISOString().slice(0, 10)

  const admin = await createAdminClient()
  const { error } = await admin.from('prestamos_abonos').insert({
    prestamo_id: input.prestamoId,
    monto: input.monto,
    fecha,
    nota: input.nota?.trim() || null,
    registrado_por: g.user.id,
  })
  if (error) return { error: 'Error al registrar el abono' }
  revalidatePath(`/corporativo/${input.empleadoId}`)
  return { ok: true }
}

export async function eliminarPrestamo(prestamoId: string, empleadoId: string): Promise<{ ok?: boolean; error?: string }> {
  const g = await guard()
  if ('error' in g) return { error: g.error }
  const admin = await createAdminClient()
  const { error } = await admin.from('prestamos_empleados').delete().eq('id', prestamoId)
  if (error) return { error: 'Error al eliminar' }
  revalidatePath(`/corporativo/${empleadoId}`)
  return { ok: true }
}
