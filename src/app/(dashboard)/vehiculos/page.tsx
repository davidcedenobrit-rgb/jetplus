import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function VehiculosPage() {
  const supabase = await createClient()
  const { data: vehiculos } = await supabase
    .from('vehiculos')
    .select('*, clientes(nombre, cedula_rif)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehículos</h1>
          <p className="text-gray-500 text-sm mt-1">{vehiculos?.length ?? 0} unidades</p>
        </div>
        <Link href="/vehiculos/nuevo" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo vehículo
        </Link>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Placa</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Vehículo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Tipo compra</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {vehiculos?.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-bold bg-navy-50 text-navy-600 px-2 py-1 rounded">
                      {v.placa ?? 'Sin placa'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{v.marca} {v.modelo}</p>
                    <p className="text-xs text-gray-400">{v.version} · {v.anio} · {v.color}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-900">{(v as any).clientes?.nombre}</p>
                    <p className="text-xs text-gray-400">{(v as any).clientes?.cedula_rif}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600">{v.tipo_compra}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 capitalize">
                      {v.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/vehiculos/${v.id}`} className="text-brand-600 hover:underline text-xs">Ver</Link>
                  </td>
                </tr>
              ))}
              {(!vehiculos || vehiculos.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No hay vehículos registrados
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
