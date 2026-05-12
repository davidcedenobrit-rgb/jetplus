import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatCurrency, formatDate, ESTADOS_EGRESO_LABEL, CATEGORIAS_EGRESO_LABEL } from '@/lib/utils'
import { Plus } from 'lucide-react'

export default async function EgresosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('egresos')
    .select('*')
    .order('fecha_registro', { ascending: false })
    .limit(100)

  if (params.estado) query = query.eq('estado', params.estado)

  const { data: egresos } = await query

  const estadoColors: Record<string, string> = {
    registrado: 'bg-gray-100 text-gray-700',
    pendiente_aprobacion: 'bg-yellow-100 text-yellow-700',
    aprobado: 'bg-green-100 text-green-700',
    rechazado: 'bg-red-100 text-red-700',
    pagado: 'bg-blue-100 text-blue-700',
    anulado: 'bg-gray-200 text-gray-400',
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Egresos</h1>
          <p className="text-gray-500 text-sm mt-1">{egresos?.length ?? 0} registros</p>
        </div>
        <Link href="/egresos/nuevo" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Registrar egreso
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['', 'pendiente_aprobacion', 'aprobado', 'pagado', 'rechazado'].map(estado => (
          <Link
            key={estado}
            href={estado ? `/egresos?estado=${estado}` : '/egresos'}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              params.estado === estado || (!params.estado && !estado)
                ? 'bg-navy-600 text-white border-navy-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {estado ? ESTADOS_EGRESO_LABEL[estado] : 'Todos'}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">N° Egreso</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Categoría</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Concepto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Beneficiario</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Monto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {egresos?.map(egreso => (
                <tr key={egreso.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{egreso.numero_egreso}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs">
                    {CATEGORIAS_EGRESO_LABEL[egreso.categoria]}
                  </td>
                  <td className="px-4 py-3 text-gray-900">{egreso.concepto}</td>
                  <td className="px-4 py-3 text-gray-500">{egreso.beneficiario ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(egreso.monto)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(egreso.fecha_egreso)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${estadoColors[egreso.estado] ?? 'bg-gray-100 text-gray-700'}`}>
                      {ESTADOS_EGRESO_LABEL[egreso.estado]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/egresos/${egreso.id}`} className="text-brand-600 hover:underline text-xs">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
              {(!egresos || egresos.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No hay egresos registrados
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
