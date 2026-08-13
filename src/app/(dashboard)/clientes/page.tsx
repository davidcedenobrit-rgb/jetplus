import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import Link from 'next/link'
import { Plus, Users } from 'lucide-react'
import ClientesLista, { type ClienteLite } from './ClientesLista'

const ROLES_DIRECCION = ['jose', 'admin', 'director']

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const esDireccion = ROLES_DIRECCION.includes((user?.app_metadata?.rol as string) ?? '')

  // Se cargan todos los clientes activos una sola vez; la búsqueda y el filtro
  // se hacen al instante en el navegador (sin recargar la página).
  const rows = await fetchAllRows<any>((from, to) => supabase
    .from('clientes')
    .select('id, nombre, cedula_rif, telefono, tipo, vehiculos(id)')
    .eq('activo', true)
    .order('nombre')
    .range(from, to))

  const clientes: ClienteLite[] = (rows ?? []).map((c: any) => ({
    id: c.id,
    nombre: c.nombre ?? '',
    cedula_rif: c.cedula_rif ?? '',
    telefono: c.telefono ?? null,
    tipo: c.tipo ?? 'natural',
    vehiculos: Array.isArray(c.vehiculos) ? c.vehiculos.length : 0,
  }))

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Clientes</h1>
          <p className="text-oriental-gray text-sm mt-1">{clientes.length} clientes activos</p>
        </div>
        <div className="flex items-center gap-2">
          {esDireccion && (
            <Link href="/clientes/asignar-vendedora" className="btn-secondary flex items-center gap-2">
              <Users size={16} /> Repartir clientes
            </Link>
          )}
          <Link href="/clientes/nuevo" className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Nuevo cliente
          </Link>
        </div>
      </div>

      <ClientesLista clientes={clientes} initialQ={params.q ?? ''} initialTipo={params.tipo ?? ''} />
    </div>
  )
}
