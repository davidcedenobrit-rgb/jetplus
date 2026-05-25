import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatCurrency, formatDate, ESTADOS_RECIBO_LABEL } from '@/lib/utils'
import { Plus, Search } from 'lucide-react'

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
    pendiente_aprobacion: 'bg-yellow-100 text-yellow-800',
    aprobado: 'bg-green-100 text-green-800',
    rechazado: 'bg-red-100 text-red-800',
    correccion_requerida: 'bg-orange-100 text-orange-800',
    enviado_carla: 'bg-purple-100 text-purple-800',
    listo_depositar: 'bg-cyan-100 text-cyan-800',
    enviado_deposito: 'bg-blue-100 text-blue-800',
    depositado: 'bg-emerald-100 text-emerald-800',
    entregado_carla: 'bg-teal-100 text-teal-800',
    reportado_vehimotors: 'bg-indigo-100 text-indigo-800',
    anulado: 'bg-gray-200 text-gray-400',
  }

  const filtros = ['', 'pendiente_aprobacion', 'aprobado', 'listo_depositar', 'depositado', 'entregado_carla', 'rechazado']

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Ingresos</h1>
          <p className="text-oriental-gray text-sm mt-1">{ingresos?.length ?? 0} registros</p>
        </div>
        <Link href="/ingresos/nuevo" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Registrar ingreso
        </Link>
      </div>

      {/* Filtros rápidos */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filtros.map(estado => (
          <Link
            key={estado}
            href={estado ? `/ingresos?estado=${estado}` : '/ingresos'}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              params.estado === estado || (!params.estado && !estado)
                ? 'bg-oriental-black text-white border-oriental-black'
                : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
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
            <thead className="bg-oriental-bg border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Recibo</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Placa</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Concepto</th>
                <th className="text-right px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Monto</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Fecha</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ingresos?.map(ingreso => (
                <tr key={ingreso.id} className="hover:bg-oriental-bg/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-oriental-gray">{ingreso.numero_recibo}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-oriental-black">{(ingreso as any).clientes?.nombre}</p>
                    <p className="text-xs text-oriental-gray">{(ingreso as any).clientes?.cedula_rif}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{ingreso.placa ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{ingreso.concepto}</td>
                  <td className="px-4 py-3 text-right font-bold text-oriental-black">
                    {formatCurrency(ingreso.monto)}
                  </td>
                  <td className="px-4 py-3 text-oriental-gray">{formatDate(ingreso.fecha_pago)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${estadoColors[ingreso.estado] ?? 'bg-gray-100 text-gray-700'}`}>
                      {ESTADOS_RECIBO_LABEL[ingreso.estado]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/ingresos/${ingreso.id}`} className="text-oriental-red hover:text-oriental-red-dark font-medium text-xs">
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))}
              {(!ingresos || ingresos.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Search size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-oriental-gray text-sm">No hay ingresos registrados</p>
                    <Link href="/ingresos/nuevo" className="text-oriental-red text-sm font-medium hover:underline mt-1 inline-block">
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
