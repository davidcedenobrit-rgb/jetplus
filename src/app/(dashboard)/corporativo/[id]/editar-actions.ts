'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem', 'carla']

export type EmpleadoEdit = {
  nombre: string
  cedula: string | null
  telefono: string | null
  correo: string | null
  correo_empresa: string | null
  fecha_ingreso: string | null
  fecha_nacimiento: string | null
  direccion: string | null
  cargo: string | null
  departamento: string | null
  reporta_a: string | null
  tipo_contrato: string | null
  salario: number | null
  salario_moneda: string | null
  salario_frecuencia: string | null
  cuenta_banco: string | null
  contacto_emergencia_nombre: string | null
  contacto_emergencia_telefono: string | null
}

export async function actualizarEmpleado(id: string, data: EmpleadoEdit): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return { error: 'Sin permiso' }

  if (!data.nombre?.trim()) return { error: 'El nombre es requerido' }

  const clean = (v: string | null | undefined) => (v && String(v).trim() ? String(v).trim() : null)
  const cleanDate = (v: string | null | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)

  const admin = await createAdminClient()
  const { error } = await admin.from('empleados').update({
    nombre: data.nombre.trim(),
    cedula: clean(data.cedula),
    telefono: clean(data.telefono),
    correo: clean(data.correo),
    correo_empresa: clean(data.correo_empresa),
    fecha_ingreso: cleanDate(data.fecha_ingreso),
    fecha_nacimiento: cleanDate(data.fecha_nacimiento),
    direccion: clean(data.direccion),
    cargo: clean(data.cargo),
    departamento: clean(data.departamento),
    reporta_a: clean(data.reporta_a),
    tipo_contrato: clean(data.tipo_contrato),
    salario: data.salario != null && data.salario > 0 ? data.salario : null,
    salario_moneda: clean(data.salario_moneda),
    salario_frecuencia: clean(data.salario_frecuencia),
    cuenta_banco: clean(data.cuenta_banco),
    contacto_emergencia_nombre: clean(data.contacto_emergencia_nombre),
    contacto_emergencia_telefono: clean(data.contacto_emergencia_telefono),
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return { error: 'Error al guardar la ficha' }
  revalidatePath(`/corporativo/${id}`)
  return { ok: true }
}
