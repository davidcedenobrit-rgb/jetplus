'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

// Busca un cliente por cédula/RIF; si no existe, lo crea. Devuelve su id.
// Sirve para que un "Otro cliente" de repuestos quede registrado y buscable.
export async function buscarOCrearClienteExterno(input: {
  nombre: string
  cedula_rif: string
  telefono?: string | null
}): Promise<{ clienteId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const nombre = input.nombre?.trim()
  // Se normaliza (mayúsculas, sin espacios) para que "v12345678", "V12345678" y
  // "V-12345678 " se traten igual y no se dupliquen clientes en busca-o-crea.
  const cedula = input.cedula_rif?.trim().toUpperCase().replace(/\s+/g, '')
  if (!nombre) return { error: 'El nombre es requerido' }
  if (!cedula) return { error: 'La cédula/RIF es requerida' }

  const admin = await createAdminClient()

  // ¿Ya existe por cédula? (cedula_rif es UNIQUE)
  const { data: existente } = await admin
    .from('clientes')
    .select('id')
    .eq('cedula_rif', cedula)
    .maybeSingle()

  if (existente?.id) return { clienteId: existente.id }

  const { data: creado, error } = await admin
    .from('clientes')
    .insert({
      nombre,
      cedula_rif: cedula,
      telefono: input.telefono?.trim() || null,
      tipo: 'natural',
      activo: true,
    })
    .select('id')
    .single()

  if (error || !creado) return { error: 'Error al registrar el cliente' }
  return { clienteId: creado.id }
}
