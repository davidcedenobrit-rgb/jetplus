import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Search, Car } from 'lucide-react'

export default async function VehiculosPage({
  searchParams,
}: {
  searchParams: Promise<{ marca?: string; placa?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('vehiculos')
    .select('*, clientes(nombre, cedula_rif)')
    .order('created_at', { ascending: false })

  if (params.marca) query = query.eq('marca', params.marca)
  if (params.placa) query = query.ilike('placa', `%${params.placa}%`)

  const { data: vehiculos } = await query

  const estadoColors: Record<string, string> = {
    activo: 'bg-green-100 text-green-800',
    entregado: 'bg-blue-100 text-blue-800',
    en_transito: 'bg-yellow-100 text-yellow-800',
    reservado: 'bg-purple-100 text-purple-800',
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Vehículos</h1>
          <p className="text-oriental-gray text-sm mt-1">{vehiculos?.length ?? 0} unidades</p>
        </div>
        <Link href="/vehiculos/nuevo" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo vehículo
        </Link>
      </div>

      {/* Filtros por marca */}
      <div className="flex gap-2 mb-6">
        {[
          { value: '', label: 'Todas' },
          { value: 'MG', label: 'MG' },
          { value: 'MAXUS', label: 'MAXUS' },
        ].map(f => (
          <Link
            key={f.value}
            href={f.value ? `/vehiculos?marca=${f.value}` : '/vehiculos'}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              params.marca === f.value || (!params.marca && !f.value)
                ? 'bg-oriental-black text-white border-oriental-black'
                : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-oriental-bg border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Placa</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Vehículo</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Tipo compra</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {vehiculos?.map(v => (
                <tr key={v.id} className="hover:bg-oriental-bg/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-bold bg-gray-100 text-oriental-black px-2 py-1 rounded">
                      {v.placa ?? 'Sin placa'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-oriental-black">{v.marca} {v.modelo}</p>
                    <p className="text-xs text-oriental-gray">{[v.version, v.anio, v.color].filter(Boolean).join(' · ')}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-oriental-black">{(v as any).clientes?.nombre}</p>
                    <p className="text-xs text-oriental-gray">{(v as any).clientes?.cedula_rif}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="capitalize text-oriental-gray text-sm">{v.tipo_compra}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${estadoColors[v.estado] ?? 'bg-gray-100 text-gray-700'}`}>
                      {v.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/vehiculos/${v.id}`} className="text-oriental-red hover:text-oriental-red-dark font-medium text-xs">
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))}
              {(!vehiculos || vehiculos.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <Car size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-oriental-gray text-sm">No hay vehículos registrados</p>
                    <Link href="/vehiculos/nuevo" className="text-oriental-red text-sm font-medium hover:underline mt-1 inline-block">
                      Registrar el primero
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
