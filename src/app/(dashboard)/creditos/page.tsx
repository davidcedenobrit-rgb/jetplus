import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CreditCard, Plus } from 'lucide-react'

export default async function CreditosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('creditos')
    .select('*, clientes(nombre, cedula_rif)')
    .order('created_at', { ascending: false })

  if (params.estado) query = query.eq('estado', params.estado)

  const { data: creditos } = await query

  const estadoColors: Record<string, string> = {
    activo: 'bg-green-100 text-green-800',
    pagado: 'bg-blue-100 text-blue-800',
    mora: 'bg-red-100 text-red-800',
    cancelado: 'bg-gray-200 text-gray-400',
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Créditos</h1>
          <p className="text-oriental-gray text-sm mt-1">{creditos?.length ?? 0} créditos</p>
        </div>
        <Link href="/creditos/nuevo" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Nuevo crédito
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        {[
          { value: '', label: 'Todos' },
          { value: 'activo', label: 'Activos' },
          { value: 'mora', label: 'En mora' },
          { value: 'pagado', label: 'Pagados' },
        ].map(f => (
          <Link
            key={f.value}
            href={f.value ? `/creditos?estado=${f.value}` : '/creditos'}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              params.estado === f.value || (!params.estado && !f.value)
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
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Placa</th>
                <th className="text-right px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Financiado</th>
                <th className="text-right px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Saldo</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Cuotas</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Inicio</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {creditos?.map(credito => {
                const porcentajePagado = credito.monto_financiado > 0
                  ? ((credito.monto_financiado - credito.saldo) / credito.monto_financiado) * 100
                  : 0

                return (
                  <tr key={credito.id} className="hover:bg-oriental-bg/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-oriental-black">{(credito as any).clientes?.nombre}</p>
                      <p className="text-xs text-oriental-gray">{(credito as any).clientes?.cedula_rif}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded font-bold">{credito.placa ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-oriental-black">
                      {formatCurrency(credito.monto_financiado, credito.moneda)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-bold text-oriental-red">{formatCurrency(credito.saldo, credito.moneda)}</p>
                      <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                        <div className="bg-green-500 h-1 rounded-full" style={{ width: `${Math.min(100, porcentajePagado)}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-oriental-gray">{credito.num_cuotas} cuotas</td>
                    <td className="px-4 py-3 text-oriental-gray">{formatDate(credito.fecha_inicio)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${estadoColors[credito.estado] ?? 'bg-gray-100 text-gray-700'}`}>
                        {credito.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/creditos/${credito.id}`} className="text-oriental-red hover:text-oriental-red-dark font-medium text-xs">
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {(!creditos || creditos.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <CreditCard size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-oriental-gray text-sm">No hay créditos registrados</p>
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
