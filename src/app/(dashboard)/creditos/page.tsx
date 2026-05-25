import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CreditCard, Plus } from 'lucide-react'

const planBadge = (tipo: string | null) =>
  tipo === 'inicial_la_oriental' ? 'bg-purple-100 text-purple-700' :
  tipo === 'financiamiento_vehimotors' ? 'bg-indigo-100 text-indigo-700' :
  tipo === 'cuota_especial' ? 'bg-teal-100 text-teal-700' :
  'bg-gray-100 text-gray-500'

const planLabel = (tipo: string | null) =>
  tipo === 'inicial_la_oriental' ? 'La Oriental' :
  tipo === 'financiamiento_vehimotors' ? 'Vehimotors' :
  tipo === 'cuota_especial' ? 'Cuota Especial' : 'Sin clasificar'

export default async function CreditosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // Traer todos los créditos con info de cliente
  let query = supabase
    .from('creditos')
    .select('*, clientes(nombre, cedula_rif)')
    .order('created_at', { ascending: false })

  if (params.estado) query = query.eq('estado', params.estado)

  const { data: creditos } = await query

  // Agrupar por vehiculo_id (un vehículo puede tener varios créditos)
  const grupos = new Map<string, typeof creditos>()
  for (const c of creditos ?? []) {
    const key = c.vehiculo_id ?? c.id // fallback si no tiene vehiculo
    if (!grupos.has(key)) grupos.set(key, [])
    grupos.get(key)!.push(c)
  }

  const vehiculos = Array.from(grupos.values())

  const estadoColors: Record<string, string> = {
    activo: 'bg-green-100 text-green-800',
    pagado: 'bg-blue-100 text-blue-800',
    mora: 'bg-red-100 text-red-800',
    cancelado: 'bg-gray-200 text-gray-400',
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Créditos</h1>
          <p className="text-oriental-gray text-sm mt-1">
            {vehiculos.length} {vehiculos.length === 1 ? 'vehículo' : 'vehículos'} financiados
            {creditos && creditos.length !== vehiculos.length && (
              <span className="text-oriental-gray/60"> · {creditos.length} créditos</span>
            )}
          </p>
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
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Financiamiento</th>
                <th className="text-right px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Total financiado</th>
                <th className="text-right px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Saldo total</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Cuotas</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vehiculos.map(grupo => {
                const primero = grupo![0]
                const cliente = (primero as any).clientes

                // Totales consolidados del grupo
                const totalFinanciado = grupo!.reduce((s, c) => s + Number(c.monto_financiado), 0)
                const totalSaldo = grupo!.reduce((s, c) => s + Number(c.saldo), 0)
                const totalCuotas = grupo!.reduce((s, c) => s + Number(c.num_cuotas), 0)
                const porcentajePagado = totalFinanciado > 0
                  ? ((totalFinanciado - totalSaldo) / totalFinanciado) * 100 : 0

                // Estado general: mora > activo > pagado
                const estadoGeneral = grupo!.some(c => c.estado === 'mora') ? 'mora'
                  : grupo!.every(c => c.estado === 'pagado') ? 'pagado'
                  : 'activo'

                // Tipos de financiamiento únicos
                const tipos = [...new Set(grupo!.map(c => c.plan_tipo))]

                // Link al primer crédito (la vista unificada muestra todos)
                const detailLink = `/creditos/${primero.id}`

                return (
                  <tr key={primero.vehiculo_id ?? primero.id} className="hover:bg-oriental-bg/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-oriental-black">{cliente?.nombre}</p>
                      <p className="text-xs text-oriental-gray">{cliente?.cedula_rif}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded font-bold">{primero.placa ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {tipos.map(tipo => (
                          <span key={tipo} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${planBadge(tipo)}`}>
                            {planLabel(tipo)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-oriental-black">
                      {formatCurrency(totalFinanciado, primero.moneda)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-bold text-oriental-red">{formatCurrency(totalSaldo, primero.moneda)}</p>
                      <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                        <div className="bg-green-500 h-1 rounded-full" style={{ width: `${Math.min(100, porcentajePagado)}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-oriental-gray">{totalCuotas} cuotas</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${estadoColors[estadoGeneral] ?? 'bg-gray-100 text-gray-700'}`}>
                        {estadoGeneral}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={detailLink} className="text-oriental-red hover:text-oriental-red-dark font-medium text-xs">
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {vehiculos.length === 0 && (
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
