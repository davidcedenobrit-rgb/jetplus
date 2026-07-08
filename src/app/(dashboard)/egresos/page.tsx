import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatCurrency, formatDate, ESTADOS_EGRESO_LABEL, CATEGORIAS_EGRESO_LABEL } from '@/lib/utils'
import { Plus, Search, FileBarChart2 } from 'lucide-react'

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
    pendiente_aprobacion: 'bg-yellow-100 text-yellow-800',
    aprobado: 'bg-green-100 text-green-800',
    rechazado: 'bg-red-100 text-red-800',
    correccion_requerida: 'bg-orange-100 text-orange-800',
    pagado: 'bg-blue-100 text-blue-800',
    reportado_carla: 'bg-purple-100 text-purple-800',
    reportado_vehimotors: 'bg-indigo-100 text-indigo-800',
    anulado: 'bg-gray-200 text-gray-400',
  }

  const filtros = ['', 'pendiente_aprobacion', 'aprobado', 'pagado', 'rechazado']

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Egresos</h1>
          <p className="text-oriental-gray text-sm mt-1">{egresos?.length ?? 0} registros</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/egresos/reporte" className="btn-secondary flex items-center gap-2">
            <FileBarChart2 size={16} /> Reporte
          </Link>
          <Link href="/egresos/nuevo" className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Registrar egreso
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filtros.map(estado => (
          <Link
            key={estado}
            href={estado ? `/egresos?estado=${estado}` : '/egresos'}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              params.estado === estado || (!params.estado && !estado)
                ? 'bg-oriental-black text-white border-oriental-black'
                : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
            }`}
          >
            {estado ? ESTADOS_EGRESO_LABEL[estado] : 'Todos'}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-oriental-bg border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">N° Egreso</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Categoría</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Concepto</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Beneficiario</th>
                <th className="text-right px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Monto</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Fecha pago</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Emisión</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {egresos?.map(egreso => (
                <tr key={egreso.id} className="hover:bg-oriental-bg/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-oriental-gray">{egreso.numero_egreso}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {CATEGORIAS_EGRESO_LABEL[egreso.categoria]}
                  </td>
                  <td className="px-4 py-3 text-oriental-black">{egreso.concepto}</td>
                  <td className="px-4 py-3 text-oriental-gray">{egreso.beneficiario ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-bold text-oriental-black">{formatCurrency(egreso.monto, egreso.moneda)}</p>
                    {egreso.tasa_cambio && egreso.moneda === 'VES' && (
                      <p className="text-[11px] text-gray-400 font-mono">
                        ≈ USD {(Number(egreso.monto) / Number(egreso.tasa_cambio)).toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(Number(egreso.monto) / Number(egreso.tasa_cambio))*100)%100===0?0:2, maximumFractionDigits: 2 })}
                      </p>
                    )}
                    {egreso.monto_bs && egreso.moneda === 'USD' && (
                      <p className="text-[11px] text-gray-400 font-mono">
                        Bs {Number(egreso.monto_bs).toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(Number(egreso.monto_bs))*100)%100===0?0:2, maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-oriental-gray text-xs">{formatDate(egreso.fecha_egreso)}</td>
                  <td className="px-4 py-3 text-oriental-gray text-xs">
                    {egreso.fecha_registro ? new Date(egreso.fecha_registro).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${estadoColors[egreso.estado] ?? 'bg-gray-100 text-gray-700'}`}>
                      {ESTADOS_EGRESO_LABEL[egreso.estado]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/egresos/${egreso.id}`} className="text-oriental-red hover:text-oriental-red-dark font-medium text-xs">
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))}
              {(!egresos || egresos.length === 0) && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <Search size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-oriental-gray text-sm">No hay egresos registrados</p>
                    <Link href="/egresos/nuevo" className="text-oriental-red text-sm font-medium hover:underline mt-1 inline-block">
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
