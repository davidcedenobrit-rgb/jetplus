import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, User } from 'lucide-react'

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: clientes } = await supabase
    .from('clientes')
    .select('*, vehiculos(id)')
    .eq('activo', true)
    .order('nombre')

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">{clientes?.length ?? 0} clientes activos</p>
        </div>
        <Link href="/clientes/nuevo" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo cliente
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clientes?.map(cliente => (
          <Link key={cliente.id} href={`/clientes/${cliente.id}`}>
            <div className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-brand-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{cliente.nombre}</p>
                  <p className="text-sm text-gray-500">{cliente.cedula_rif}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>{cliente.telefono ?? '—'}</span>
                    <span>·</span>
                    <span>{(cliente as any).vehiculos?.length ?? 0} vehículo(s)</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
        {(!clientes || clientes.length === 0) && (
          <div className="col-span-3 text-center py-16 text-gray-400">
            No hay clientes registrados
          </div>
        )}
      </div>
    </div>
  )
}
