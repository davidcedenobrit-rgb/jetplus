import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatCurrency, formatDate, ESTADOS_RECIBO_LABEL } from '@/lib/utils'
import { Plus } from 'lucide-react'

export default async function IngresosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; placa?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('ingresos')
    .select('*, clientes(nombre, cedula_rif)')
    .order('fecha_registro', { ascending: false })
    .limit(100)

  if (params.estado) query = query.eq('estado', params.estado)
  if (params.placa) query = query.ilike('placa', `%${params.placa}%`)

  const { data: ingresos } = await query

  const estadoColors: Record<string, string> = {
    registrado: 'bg-gray-100 text-gray-700',
    pendiente_aprobacion: 'bg-yellow-100 text-yellow-700',
    aprobado: 'bg-green-100 text-green-700',
    rechazado: 'bg-red-100 text-red-700',
    correccion_requerida: 'bg-orange-100 text-orange-700',
    depositado: 'bg-blue-100 text-blue-700',
    anulado: 'bg-gray-200 text-gray-400',
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ingresos</h1>
          <p className="text-gray-500 text-sm mt-1">{ingresos?.length ?? 0} registros</p>
        </div>
        <Link href="/ingresos/nuevo" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Registrar ingreso
        </Link>
      </div>

      {/* Filtros rápidos */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['', 'pendiente_aprobacion', 'aprobado', 'listo_depositar', 'rechazado'].map(estado => (
          <Link
            key={estado}
            href={estado ? `/ingresos?estado=${estado}` : '/ingresos'}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              params.estado === estado || (!params.estado && !estado)
                ? 'bg-navy-600 text-white border-navy-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {estado ? ESTADOS_RECIBO_LABEL[estado] : 'Todos'}
          </Link>
        ))}
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Recibo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Placa</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Concepto</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Monto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ingresos?.map(ingreso => (
                <tr key={ingreso.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{ingreso.numero_recibo}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{(ingreso as any).clientes?.nombre}</p>
                    <p className="text-xs text-gray-400">{(ingreso as any).clientes?.cedula_rif}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{ingreso.placa ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{ingreso.concepto}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(ingreso.monto)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(ingreso.fecha_pago)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${estadoColors[ingreso.estado] ?? 'bg-gray-100 text-gray-700'}`}>
                      {ESTADOS_RECIBO_LABEL[ingreso.estado]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/ingresos/${ingreso.id}`} className="text-brand-600 hover:underline text-xs">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
              {(!ingresos || ingresos.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No hay ingresos registrados
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
