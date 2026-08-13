import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import AsignarVendedoraClient from './AsignarVendedoraClient'

export const dynamic = 'force-dynamic'

const ROLES = ['jose', 'admin', 'director']

function normNombre(s: string) {
  return (s ?? '').trim().toLowerCase()
}

export default async function AsignarVendedoraPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) redirect('/dashboard')

  const [clientesRows, vendedorasRes, ventasRes] = await Promise.all([
    fetchAllRows<{ id: string; nombre: string; cedula_rif: string; telefono: string | null; vendedor_codigo: string | null; tipo: string }>(
      (from, to) => supabase.from('clientes').select('id, nombre, cedula_rif, telefono, vendedor_codigo, tipo').eq('activo', true).order('nombre').range(from, to)
    ),
    supabase.from('vendedoras').select('codigo, nombre').order('nombre'),
    supabase.from('ventas_division_contable').select('cliente_id, vendedora').not('cliente_id', 'is', null).not('vendedora', 'is', null),
  ])

  const vendedoras = vendedorasRes.data ?? []
  const nombreACodigo = new Map(vendedoras.map(v => [normNombre(v.nombre), v.codigo]))

  // Sugerencia: si el cliente tiene un vehículo vendido con vendedora registrada
  // en la división contable, se propone esa vendedora (resolviendo su nombre a
  // un código real). Se toma la primera coincidencia por cliente.
  const sugerencias: Record<string, string> = {}
  for (const row of (ventasRes.data ?? [])) {
    const clienteId = row.cliente_id as string | null
    const vendedoraNombre = row.vendedora as string | null
    if (!clienteId || !vendedoraNombre || sugerencias[clienteId]) continue
    const codigo = nombreACodigo.get(normNombre(vendedoraNombre))
    if (codigo) sugerencias[clienteId] = codigo
  }

  return <AsignarVendedoraClient clientes={clientesRows} vendedoras={vendedoras} sugerencias={sugerencias} />
}
