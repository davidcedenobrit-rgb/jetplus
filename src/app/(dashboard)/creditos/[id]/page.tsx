import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, CreditCard, User, Car, Calendar, CheckCircle2, Clock, AlertCircle, Edit3 } from 'lucide-react'
import DeleteButton from '@/components/DeleteButton'

export default async function CreditoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: credito } = await supabase
    .from('creditos')
    .select('*, clientes(id, nombre, cedula_rif, telefono), vehiculos(id, marca, modelo, placa, color, anio)')
    .eq('id', id)
    .single()

  if (!credito) notFound()

  const cliente = (credito as any).clientes
  const vehiculo = (credito as any).vehiculos

  const { data: cuotas } = await supabase
    .from('cuotas')
    .select('*')
    .eq('credito_id', id)
    .order('numero_cuota')

  const porcentajePagado = credito.monto_financiado > 0
    ? ((credito.monto_financiado - credito.saldo) / credito.monto_financiado) * 100
    : 0

  const cuotasPagadas = cuotas?.filter(c => c.estado === 'pagada').length ?? 0
  const cuotasPendientes = cuotas?.filter(c => c.estado === 'pendiente').length ?? 0
  const cuotasVencidas = cuotas?.filter(c => c.estado === 'vencida').length ?? 0

  const estadoColors: Record<string, string> = {
    activo: 'bg-green-100 text-green-800',
    pagado: 'bg-blue-100 text-blue-800',
    mora: 'bg-red-100 text-red-800',
    cancelado: 'bg-gray-200 text-gray-400',
  }

  const cuotaEstadoColors: Record<string, string> = {
    pagada: 'bg-green-100 text-green-800',
    pendiente: 'bg-yellow-100 text-yellow-800',
    vencida: 'bg-red-100 text-red-800',
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/creditos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-oriental-black">Crédito</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${estadoColors[credito.estado] ?? 'bg-gray-100 text-gray-700'}`}>
              {credito.estado}
            </span>
          </div>
          <p className="text-oriental-gray text-sm mt-0.5">{cliente?.nombre} · {credito.placa ?? 'Sin placa'}</p>
        </div>
        <Link
          href={`/creditos/${id}/editar`}
          className="flex items-center gap-2 px-4 py-2 bg-oriental-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Edit3 size={15} />
          Editar
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Info */}
        <div className="space-y-6">
          {/* Resumen financiero */}
          <div className="card p-6">
            <div className="w-14 h-14 bg-oriental-red/10 rounded-full flex items-center justify-center mb-4">
              <CreditCard size={24} className="text-oriental-red" />
            </div>
            <h2 className="font-bold text-oriental-black mb-4">Resumen</h2>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-oriental-gray">Monto financiado</span>
                <span className="font-bold text-oriental-black">{formatCurrency(credito.monto_financiado, credito.moneda)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-oriental-gray">Inicial</span>
                <span className="font-medium text-oriental-black">{formatCurrency(credito.inicial, credito.moneda)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-oriental-gray">Saldo pendiente</span>
                <span className="font-bold text-oriental-red">{formatCurrency(credito.saldo, credito.moneda)}</span>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-xs text-oriental-gray mb-1">
                <span>Progreso</span>
                <span>{porcentajePagado.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, porcentajePagado)}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-green-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-green-700">{cuotasPagadas}</p>
                <p className="text-[10px] text-green-600">Pagadas</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-yellow-700">{cuotasPendientes}</p>
                <p className="text-[10px] text-yellow-600">Pendientes</p>
              </div>
              <div className="bg-red-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-red-700">{cuotasVencidas}</p>
                <p className="text-[10px] text-red-600">Vencidas</p>
              </div>
            </div>
          </div>

          {/* Cliente */}
          {cliente && (
            <div className="card p-6">
              <h2 className="font-bold text-oriental-black mb-3 flex items-center gap-2">
                <User size={16} className="text-oriental-gray" /> Cliente
              </h2>
              <Link href={`/clientes/${cliente.id}`} className="block p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-all">
                <p className="font-semibold text-oriental-black">{cliente.nombre}</p>
                <p className="text-xs text-oriental-gray">{cliente.cedula_rif}</p>
              </Link>
            </div>
          )}

          {/* Vehículo */}
          {vehiculo && (
            <div className="card p-6">
              <h2 className="font-bold text-oriental-black mb-3 flex items-center gap-2">
                <Car size={16} className="text-oriental-gray" /> Vehículo
              </h2>
              <Link href={`/vehiculos/${vehiculo.id}`} className="block p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-all">
                <p className="font-semibold text-oriental-black">{vehiculo.marca} {vehiculo.modelo}</p>
                <p className="text-xs text-oriental-gray">{vehiculo.anio} · {vehiculo.color} · <span className="font-mono font-bold">{vehiculo.placa ?? '—'}</span></p>
              </Link>
            </div>
          )}

          <DeleteButton table="creditos" id={id} redirectTo="/creditos" label="Eliminar crédito" />
        </div>

        {/* Right: Cuotas */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h2 className="font-bold text-oriental-black mb-4 flex items-center gap-2 flex-wrap">
              <Calendar size={18} className="text-oriental-gray" />
              Plan de cuotas
              <span className="text-xs text-oriental-gray font-normal ml-1">({credito.num_cuotas} cuotas · {credito.frecuencia_pago})</span>
              {credito.plan_tipo === 'inicial_la_oriental' && (
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-semibold">Crédito Inicial — La Oriental</span>
              )}
              {credito.plan_tipo === 'financiamiento_vehimotors' && (
                <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-semibold">Financiamiento Vehimotors</span>
              )}
            </h2>

            {cuotas && cuotas.length > 0 ? (() => {
              // Etiqueta del tipo derivada del plan_tipo del crédito o del campo concepto de la cuota
              const planLabel =
                credito.plan_tipo === 'inicial_la_oriental' ? 'La Oriental' :
                credito.plan_tipo === 'financiamiento_vehimotors' ? 'Vehimotors' :
                credito.plan_tipo === 'cuota_especial' ? 'Cuota Especial' : null
              const planBadgeColor =
                credito.plan_tipo === 'inicial_la_oriental' ? 'bg-purple-50 text-purple-700' :
                credito.plan_tipo === 'financiamiento_vehimotors' ? 'bg-indigo-50 text-indigo-700' :
                credito.plan_tipo === 'cuota_especial' ? 'bg-teal-50 text-teal-700' :
                'bg-gray-100 text-gray-500'
              const getConcepto = (cuota: any) => cuota.concepto ?? planLabel
              const getBadgeColor = (cuota: any) => {
                const c = cuota.concepto ?? ''
                if (c.toLowerCase().includes('oriental') || credito.plan_tipo === 'inicial_la_oriental') return 'bg-purple-50 text-purple-700'
                if (c.toLowerCase().includes('vehimotors') || credito.plan_tipo === 'financiamiento_vehimotors') return 'bg-indigo-50 text-indigo-700'
                if (c.toLowerCase().includes('especial') || credito.plan_tipo === 'cuota_especial') return 'bg-teal-50 text-teal-700'
                return planBadgeColor
              }

              return (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-oriental-bg border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">N°</th>
                      <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Tipo</th>
                      <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Vencimiento</th>
                      <th className="text-right px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Monto</th>
                      <th className="text-right px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Mora</th>
                      <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Fecha pago</th>
                      <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {cuotas.map((cuota: any) => (
                      <tr key={cuota.id} className="hover:bg-oriental-bg/50 transition-colors">
                        <td className="px-3 py-2.5 font-bold text-oriental-black">{cuota.numero_cuota}</td>
                        <td className="px-3 py-2.5">
                          {getConcepto(cuota)
                            ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getBadgeColor(cuota)}`}>{getConcepto(cuota)}</span>
                            : <span className="text-xs text-gray-300 italic">Sin clasificar</span>
                          }
                        </td>
                        <td className="px-3 py-2.5 text-oriental-gray">{formatDate(cuota.fecha_vencimiento)}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-oriental-black">{formatCurrency(cuota.monto, credito.moneda)}</td>
                        <td className="px-3 py-2.5 text-right">
                          {cuota.mora > 0 ? (
                            <span className="text-oriental-red font-semibold">{formatCurrency(cuota.mora, credito.moneda)}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-oriental-gray">{cuota.fecha_pago ? formatDate(cuota.fecha_pago) : '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${cuotaEstadoColors[cuota.estado] ?? 'bg-gray-100 text-gray-700'}`}>
                            {cuota.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )
            })() : (
              <p className="text-oriental-gray text-sm py-8 text-center">No hay cuotas generadas para este crédito</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
