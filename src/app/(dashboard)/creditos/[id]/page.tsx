import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, CreditCard, User, Car, Calendar, Edit3, CheckCircle2, CircleDot, PlusCircle } from 'lucide-react'
import DeleteButton from '@/components/DeleteButton'

const planLabel = (tipo: string | null) =>
  tipo === 'inicial_la_oriental' ? 'La Oriental' :
  tipo === 'financiamiento_vehimotors' ? 'Vehimotors' :
  tipo === 'cuota_especial' ? 'Cuota Especial' : 'Sin clasificar'

const planBadge = (tipo: string | null) =>
  tipo === 'inicial_la_oriental' ? 'bg-purple-100 text-purple-800' :
  tipo === 'financiamiento_vehimotors' ? 'bg-indigo-100 text-indigo-800' :
  tipo === 'cuota_especial' ? 'bg-teal-100 text-teal-800' :
  'bg-gray-100 text-gray-500'

const cuotaEstadoColors: Record<string, string> = {
  pagada: 'bg-green-100 text-green-800',
  pendiente: 'bg-yellow-100 text-yellow-800',
  vencida: 'bg-red-100 text-red-800',
  abono_parcial: 'bg-orange-100 text-orange-800',
}

const cuotaEstadoLabel: Record<string, string> = {
  pagada: 'Pagada',
  pendiente: 'Pendiente',
  vencida: 'Vencida',
  abono_parcial: 'Abono parcial',
}

const estadoColors: Record<string, string> = {
  activo: 'bg-green-100 text-green-800',
  pagado: 'bg-blue-100 text-blue-800',
  mora: 'bg-red-100 text-red-800',
  cancelado: 'bg-gray-200 text-gray-400',
}

export default async function CreditoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Cargar el crédito principal (para obtener vehiculo_id y cliente)
  const { data: credito } = await supabase
    .from('creditos')
    .select('*, clientes(id, nombre, cedula_rif, telefono), vehiculos(id, marca, modelo, placa, color, anio)')
    .eq('id', id)
    .single()

  if (!credito) notFound()

  const cliente = (credito as any).clientes
  const vehiculo = (credito as any).vehiculos

  // Cargar TODOS los créditos del mismo vehículo
  const { data: todosCreditos } = await supabase
    .from('creditos')
    .select('*')
    .eq('vehiculo_id', credito.vehiculo_id)
    .order('plan_tipo') // La Oriental primero, luego Vehimotors

  const creditos = todosCreditos ?? [credito]

  // Cargar cuotas de TODOS los créditos del vehículo
  const creditoIds = creditos.map((c: any) => c.id)
  const { data: todasCuotas } = await supabase
    .from('cuotas')
    .select('*, credito_id')
    .in('credito_id', creditoIds)
    .order('fecha_vencimiento')

  // Enriquecer cada cuota con el plan_tipo de su crédito
  const cuotasEnriquecidas = (todasCuotas ?? []).map((cuota: any) => {
    const cred = creditos.find((c: any) => c.id === cuota.credito_id)
    return { ...cuota, _plan_tipo: cred?.plan_tipo ?? null }
  })

  // Cargar recibos vinculados a cada cuota (cuota_ingresos → ingresos)
  const cuotaIds = cuotasEnriquecidas.map((c: any) => c.id)
  const { data: cuotaRecibosRaw } = cuotaIds.length > 0
    ? await supabase
        .from('cuota_ingresos')
        .select('cuota_id, monto_aplicado, ingresos(id, numero_recibo, metodo_pago, estado, moneda)')
        .in('cuota_id', cuotaIds)
    : { data: [] }

  // Mapa: cuota_id → lista de recibos
  const recibosMap: Record<string, { ingreso_id: string; numero_recibo: string; metodo_pago: string; estado: string; monto_aplicado: number; moneda: string }[]> = {}
  for (const cr of cuotaRecibosRaw ?? []) {
    const ing = (cr as any).ingresos
    if (!ing) continue
    if (!recibosMap[cr.cuota_id]) recibosMap[cr.cuota_id] = []
    recibosMap[cr.cuota_id].push({
      ingreso_id: ing.id,
      numero_recibo: ing.numero_recibo,
      metodo_pago: ing.metodo_pago,
      estado: ing.estado,
      monto_aplicado: Number(cr.monto_aplicado),
      moneda: ing.moneda,
    })
  }

  // Resumen consolidado
  const totalFinanciado = creditos.reduce((s: number, c: any) => s + Number(c.monto_financiado), 0)
  const totalSaldo = creditos.reduce((s: number, c: any) => s + Number(c.saldo), 0)
  const totalInicial = creditos.reduce((s: number, c: any) => s + Number(c.inicial), 0)
  const porcentajePagado = totalFinanciado > 0
    ? ((totalFinanciado - totalSaldo) / totalFinanciado) * 100 : 0

  const cuotasPagadas = cuotasEnriquecidas.filter(c => c.estado === 'pagada').length
  const cuotasPendientes = cuotasEnriquecidas.filter(c => c.estado === 'pendiente').length
  const cuotasVencidas = cuotasEnriquecidas.filter(c => c.estado === 'vencida').length
  const cuotasAbono = cuotasEnriquecidas.filter(c => c.estado === 'abono_parcial').length

  // Estado general del vehículo (si alguno en mora → mora, si todos pagados → pagado)
  const estadoGeneral = creditos.some((c: any) => c.estado === 'mora') ? 'mora'
    : creditos.every((c: any) => c.estado === 'pagado') ? 'pagado'
    : 'activo'

  const esVehiculoConMultiplesCreditos = creditos.length > 1

  return (
    <div className="p-4 lg:p-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/creditos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-oriental-black">
              {esVehiculoConMultiplesCreditos ? 'Financiamiento del vehículo' : 'Crédito'}
            </h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${estadoColors[estadoGeneral] ?? 'bg-gray-100 text-gray-700'}`}>
              {estadoGeneral}
            </span>
            {creditos.map((c: any) => c.plan_tipo).filter(Boolean).map((tipo: string) => (
              <span key={tipo} className={`px-2 py-0.5 rounded-full text-xs font-semibold ${planBadge(tipo)}`}>
                {planLabel(tipo)}
              </span>
            ))}
          </div>
          <p className="text-oriental-gray text-sm mt-0.5">{cliente?.nombre} · {credito.placa ?? 'Sin placa'}</p>
        </div>
        {/* Botón editar apunta al crédito con que se navegó */}
        <Link
          href={`/creditos/${id}/editar`}
          className="flex items-center gap-2 px-4 py-2 bg-oriental-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Edit3 size={15} />
          Editar
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Columna izquierda */}
        <div className="space-y-6">

          {/* Resumen consolidado */}
          <div className="card p-6">
            <div className="w-14 h-14 bg-oriental-red/10 rounded-full flex items-center justify-center mb-4">
              <CreditCard size={24} className="text-oriental-red" />
            </div>
            <h2 className="font-bold text-oriental-black mb-4">Resumen total</h2>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-oriental-gray">Total financiado</span>
                <span className="font-bold text-oriental-black">{formatCurrency(totalFinanciado, credito.moneda)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-oriental-gray">Inicial pagada</span>
                <span className="font-medium text-oriental-black">{formatCurrency(totalInicial, credito.moneda)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-oriental-gray">Saldo pendiente</span>
                <span className="font-bold text-oriental-red">{formatCurrency(totalSaldo, credito.moneda)}</span>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-xs text-oriental-gray mb-1">
                <span>Progreso general</span>
                <span>{porcentajePagado.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, porcentajePagado)}%` }} />
              </div>
            </div>

            <div className={`grid gap-2 mt-4 ${cuotasAbono > 0 ? 'grid-cols-2' : 'grid-cols-3'}`}>
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
              {cuotasAbono > 0 && (
                <div className="bg-orange-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-orange-700">{cuotasAbono}</p>
                  <p className="text-[10px] text-orange-600">Abono parcial</p>
                </div>
              )}
            </div>
          </div>

          {/* Desglose por tipo de financiamiento */}
          {esVehiculoConMultiplesCreditos && (
            <div className="card p-6">
              <h2 className="font-bold text-oriental-black mb-3 text-sm uppercase tracking-wider">Desglose por financiamiento</h2>
              <div className="space-y-3">
                {creditos.map((c: any) => {
                  const cuotasCred = cuotasEnriquecidas.filter(q => q.credito_id === c.id)
                  const pagadas = cuotasCred.filter(q => q.estado === 'pagada').length
                  return (
                    <div key={c.id} className={`rounded-lg p-3 border ${c.id === id ? 'border-oriental-red/30 bg-oriental-red/5' : 'border-gray-100'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${planBadge(c.plan_tipo)}`}>
                          {planLabel(c.plan_tipo)}
                        </span>
                        <span className="text-xs text-oriental-gray">{pagadas}/{c.num_cuotas} cuotas</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-oriental-gray">Saldo</span>
                        <span className={`text-xs font-bold ${Number(c.saldo) > 0 ? 'text-oriental-red' : 'text-green-600'}`}>
                          {formatCurrency(c.saldo, c.moneda)}
                        </span>
                      </div>
                      <Link href={`/creditos/${c.id}`} className="text-[10px] text-oriental-gray hover:text-oriental-black mt-1 block">
                        Ver este crédito →
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

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

        {/* Tabla unificada de cuotas */}
        <div className="lg:col-span-3">
          <div className="card p-6">
            <h2 className="font-bold text-oriental-black mb-4 flex items-center gap-2 flex-wrap">
              <Calendar size={18} className="text-oriental-gray" />
              Plan de cuotas unificado
              <span className="text-xs text-oriental-gray font-normal">
                ({cuotasEnriquecidas.length} cuotas en total)
              </span>
            </h2>

            {cuotasEnriquecidas.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-oriental-bg border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider w-8">N°</th>
                      <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Financiamiento</th>
                      <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Vencimiento</th>
                      <th className="text-right px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Monto</th>
                      <th className="text-right px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Mora</th>
                      <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Fecha pago</th>
                      <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Estado</th>
                      <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Recibos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cuotasEnriquecidas.map((cuota: any) => {
                      const recibos = recibosMap[cuota.id] ?? []
                      const montoPagado = Number(cuota.monto_pagado ?? 0)
                      const montoTotal  = Number(cuota.monto)
                      const faltante    = Math.max(0, montoTotal - montoPagado)
                      const pct         = montoTotal > 0 ? Math.min(100, (montoPagado / montoTotal) * 100) : 0
                      const placaCuota  = vehiculo?.placa ?? ''
                      const pagoUrl     = placaCuota
                        ? `/ingresos/nuevo?placa=${encodeURIComponent(placaCuota)}&cuota_id=${cuota.id}&monto=${faltante.toFixed(2)}`
                        : `/ingresos/nuevo?cuota_id=${cuota.id}&monto=${faltante.toFixed(2)}`

                      const esPagada      = cuota.estado === 'pagada'
                      const esAbono       = cuota.estado === 'abono_parcial'
                      const esVencida     = cuota.estado === 'vencida'
                      const esPendiente   = cuota.estado === 'pendiente'

                      const rowBg = esPagada  ? 'bg-green-50/50'
                                  : esAbono   ? 'bg-amber-50/60'
                                  : esVencida ? 'bg-red-50/40'
                                  : 'hover:bg-oriental-bg/50'

                      return (
                      <tr key={cuota.id} className={`transition-colors ${rowBg}`}>
                        {/* N° */}
                        <td className="px-3 py-3 text-oriental-gray font-normal text-xs">{cuota.numero_cuota}</td>

                        {/* Financiamiento */}
                        <td className="px-3 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${planBadge(cuota._plan_tipo)}`}>
                            {cuota.concepto ?? planLabel(cuota._plan_tipo)}
                          </span>
                        </td>

                        {/* Vencimiento */}
                        <td className={`px-3 py-3 text-sm ${esVencida ? 'text-red-600 font-semibold' : 'text-oriental-gray'}`}>
                          {formatDate(cuota.fecha_vencimiento)}
                        </td>

                        {/* Monto */}
                        <td className="px-3 py-3 text-right">
                          <p className="font-semibold text-oriental-black text-sm">{formatCurrency(montoTotal, credito.moneda)}</p>
                          {esAbono && montoPagado > 0 && (
                            <div className="mt-1.5">
                              <div className="flex justify-between text-[10px] mb-0.5">
                                <span className="text-amber-600">Abonado {formatCurrency(montoPagado, credito.moneda)}</span>
                                <span className="text-amber-800 font-semibold">{pct.toFixed(0)}%</span>
                              </div>
                              <div className="w-full bg-amber-200 rounded-full h-1.5">
                                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <p className="text-[10px] text-amber-700 mt-0.5">Falta {formatCurrency(faltante, credito.moneda)}</p>
                            </div>
                          )}
                        </td>

                        {/* Mora */}
                        <td className="px-3 py-3 text-right">
                          {cuota.mora > 0
                            ? <span className="text-oriental-red font-semibold text-sm">{formatCurrency(cuota.mora, credito.moneda)}</span>
                            : <span className="text-gray-300">—</span>
                          }
                        </td>

                        {/* Fecha pago */}
                        <td className="px-3 py-3 text-oriental-gray text-sm">{cuota.fecha_pago ? formatDate(cuota.fecha_pago) : '—'}</td>

                        {/* Estado — badge visual + botón discreto de registrar */}
                        <td className="px-3 py-3">
                          {esPagada ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                              <CheckCircle2 size={12} className="text-green-600" />
                              Pagado
                            </span>
                          ) : esAbono ? (
                            <div className="space-y-1.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                <CircleDot size={12} className="text-amber-600" />
                                Abono parcial
                              </span>
                              <Link href={pagoUrl} className="flex items-center gap-1 text-[11px] text-oriental-red hover:text-oriental-black font-medium transition-colors">
                                <PlusCircle size={11} />
                                Registrar saldo
                              </Link>
                            </div>
                          ) : esVencida ? (
                            <div className="space-y-1.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                                Vencida
                              </span>
                              <Link href={pagoUrl} className="flex items-center gap-1 text-[11px] text-oriental-red hover:text-oriental-black font-medium transition-colors">
                                <PlusCircle size={11} />
                                Registrar pago
                              </Link>
                            </div>
                          ) : esPendiente ? (
                            <div className="space-y-1.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                                Pendiente
                              </span>
                              <Link href={pagoUrl} className="flex items-center gap-1 text-[11px] text-oriental-red hover:text-oriental-black font-medium transition-colors">
                                <PlusCircle size={11} />
                                Registrar pago
                              </Link>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                              {cuota.estado}
                            </span>
                          )}
                        </td>

                        {/* Recibos vinculados */}
                        <td className="px-3 py-3">
                          {recibos.length === 0 ? (
                            <span className="text-gray-300 text-xs">—</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {recibos.map(r => (
                                <Link
                                  key={r.ingreso_id}
                                  href={`/ingresos/${r.ingreso_id}`}
                                  className="inline-flex items-center gap-1 text-xs font-mono text-oriental-red hover:text-oriental-black hover:underline transition-colors"
                                  title={`${r.metodo_pago} · ${formatCurrency(r.monto_aplicado, r.moneda)}`}
                                >
                                  {r.numero_recibo}
                                  {r.estado === 'pendiente_aprobacion' && (
                                    <span className="text-[9px] text-yellow-600 font-sans not-italic">(pend.)</span>
                                  )}
                                </Link>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-oriental-gray text-sm py-8 text-center">No hay cuotas generadas para este vehículo</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
