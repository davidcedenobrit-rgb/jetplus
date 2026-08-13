'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director']

async function requiereDireccion() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) throw new Error('Sin permisos')
}

export async function asignarVendedora(clienteIds: string[], codigo: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await requiereDireccion()
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
  const ids = (clienteIds ?? []).filter(id => typeof id === 'string' && id.trim())
  const cod = String(codigo ?? '').trim().toUpperCase()
  if (!ids.length) return { ok: false, error: 'Selecciona al menos un cliente' }
  if (!/^[A-Z]\d{3}$/.test(cod)) return { ok: false, error: 'Código inválido' }

  const admin = await createAdminClient()
  const { data: vendedora } = await admin.from('vendedoras').select('codigo').eq('codigo', cod).maybeSingle()
  if (!vendedora) return { ok: false, error: 'Esa vendedora no existe' }

  const { error } = await admin.from('clientes').update({ vendedor_codigo: cod }).in('id', ids)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
