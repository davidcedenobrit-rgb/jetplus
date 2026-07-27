'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Proveedor } from '../egresos/actions'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

const COLS = 'id, nombre, rif, correo, telefono, numero_cuenta, banco, direccion'

async function guard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' as const }
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return { error: 'Sin permiso' as const }
  return { ok: true as const }
}

type ProvInput = {
  nombre: string
  rif: string | null
  correo: string | null
  telefono: string | null
  numero_cuenta: string | null
  banco: string | null
  direccion: string | null
}

export async function listarProveedoresAdmin(): Promise<{ proveedores: Proveedor[]; error?: string }> {
  const g = await guard()
  if ('error' in g) return { proveedores: [], error: g.error }
  const admin = await createAdminClient()
  const { data } = await admin.from('proveedores').select(COLS).eq('activo', true).order('nombre')
  return { proveedores: (data ?? []) as Proveedor[] }
}

export async function guardarProveedor(id: string | null, input: ProvInput): Promise<{ ok?: boolean; error?: string }> {
  const g = await guard()
  if ('error' in g) return { error: g.error }
  if (!input.nombre?.trim()) return { error: 'El nombre es requerido' }
  const clean = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null)
  const row = {
    nombre: input.nombre.trim(),
    rif: clean(input.rif),
    correo: clean(input.correo),
    telefono: clean(input.telefono),
    numero_cuenta: clean(input.numero_cuenta),
    banco: clean(input.banco),
    direccion: clean(input.direccion),
  }
  const admin = await createAdminClient()
  const { error } = id
    ? await admin.from('proveedores').update(row).eq('id', id)
    : await admin.from('proveedores').insert({ ...row, activo: true })
  if (error) return { error: 'Error al guardar el proveedor' }
  revalidatePath('/proveedores')
  return { ok: true }
}

export async function desactivarProveedor(id: string): Promise<{ ok?: boolean; error?: string }> {
  const g = await guard()
  if ('error' in g) return { error: g.error }
  const admin = await createAdminClient()
  const { error } = await admin.from('proveedores').update({ activo: false }).eq('id', id)
  if (error) return { error: 'Error al desactivar' }
  revalidatePath('/proveedores')
  return { ok: true }
}
