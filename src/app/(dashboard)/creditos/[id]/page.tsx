import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, CreditCard, User, Car, Calendar, Edit3, CheckCircle2, CircleDot, PlusCircle } from 'lucide-react'
import DeleteButton from '@/components/DeleteButton'
import RevertirCuotaButton from './RevertirCuotaButton'
import PrintButton from './PrintButton'
import BitacoraButton from './BitacoraButton'
import RecordatorioWhatsApp from '@/components/RecordatorioWhatsApp'
import { getNombreRemitente } from '@/lib/remitente'

const ROL_DIRECTOR = ['jose', 'admin', 'director', 'mary', 'leysdem']

const planLabel = (tipo: string | null) =>
  tipo === 'inicial_la_oriental' ? 'La Oriental' :
  tipo === 'financiamiento_vehimotors' ? 'Vehimotors' :
  tipo === 'cuota_especial' ? 'Cuota Especial Vehimotors' : 'Sin clasificar'

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

  // Ventana de 7 días para estado "Por cobrar"
  const hoyDate = new Date()
  const en7Date = new Date(hoyDate); en7Date.setDate(hoyDate.getDate() + 7)
  const en7Str  = en7Date.toISOString().split('T')[0]

  // Detectar rol del usuario actual
  const { data: { user: authUser } } = await supabase.auth.getUser()
  const { data: usuarioData } = authUser
    ? await supabase.from('usuarios').select('rol').eq('id', authUser.id).single()
    : { data: null }
  const esDirector = usuarioData ? ROL_DIRECTOR.includes(usuarioData.rol) : false
  const remitente = getNombreRemitente(authUser?.email, authUser?.user_metadata?.rol)

  // Cargar el crédito principal (para obtener vehiculo_id y cliente)
  const { data: credito } = await supabase
    .from('creditos')
    .select('*, clientes(id, nombre, cedula_rif, telefono, whatsapp), vehiculos(id, marca, modelo, placa, color, anio)')
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

  const cuotasPagadas    = cuotasEnriquecidas.filter(c => c.estado === 'pagada').length
  const cuotasPendientes = cuotasEnriquecidas.filter(c => c.estado === 'pendiente').length
  const cuotasVencidas   = cuotasEnriquecidas.filter(c => c.estado === 'vencida').length
  const cuotasAbono      = cuotasEnriquecidas.filter(c => c.estado === 'abono_parcial').length
  // Desglose de pendientes: por cobrar (≤7 días) vs. al día (>7 días)
  const cuotasPorCobrar  = cuotasEnriquecidas.filter(c => c.estado === 'pendiente' && c.fecha_vencimiento <= en7Str).length
  const cuotasAlDia      = cuotasEnriquecidas.filter(c => c.estado === 'pendiente' && c.fecha_vencimiento >  en7Str).length

  // Estado general del vehículo (si alguno en mora → mora, si todos pagados → pagado)
  const estadoGeneral = creditos.some((c: any) => c.estado === 'mora') ? 'mora'
    : creditos.every((c: any) => c.estado === 'pagado') ? 'pagado'
    : 'activo'

  const esVehiculoConMultiplesCreditos = creditos.length > 1

  const fechaImpresion = new Date().toLocaleDateString('es-VE', {
    day: '2-digit', month: 'long', year: 'numeric'
  })

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
        <div className="flex items-center gap-2 flex-wrap">
          <PrintButton />
          {cliente?.id && (
            <BitacoraButton clienteId={cliente.id} nombre={cliente.nombre ?? ''} />
          )}
          {vehiculo?.placa && (
            <Link
              href={`/ingresos/nuevo?placa=${encodeURIComponent(vehiculo.placa)}`}
              className="flex items-center gap-2 px-4 py-2 bg-oriental-red text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
              <PlusCircle size={15} />
              Registrar ingreso
            </Link>
          )}
          <Link
            href={`/creditos/${id}/editar`}
            className="flex items-center gap-2 px-4 py-2 bg-oriental-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Edit3 size={15} />
            Editar
          </Link>
        </div>
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
                <span className="text-oriental-gray">Saldo pendiente</span>
                <span className="font-bold text-oriental-red">{formatCurrency(totalSaldo, credito.moneda)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-oriental-gray">Ya pagado</span>
                <span className="font-bold text-green-600">{formatCurrency(Math.max(0, totalFinanciado - totalSaldo), credito.moneda)}</span>
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

            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="bg-green-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-green-700">{cuotasPagadas}</p>
                <p className="text-[10px] text-green-600">Pagadas</p>
              </div>
              <div className="bg-red-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-red-700">{cuotasVencidas}</p>
                <p className="text-[10px] text-red-600">Vencidas</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-yellow-700">{cuotasPorCobrar}</p>
                <p className="text-[10px] text-yellow-600">Por cobrar</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-gray-500">{cuotasAlDia}</p>
                <p className="text-[10px] text-gray-400">Al día</p>
              </div>
              {cuotasAbono > 0 && (
                <div className="bg-orange-50 rounded-lg p-2 text-center col-span-2">
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
              <Link href={`/clientes/${cliente.id}`} className="block p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-all mb-3">
                <p className="font-semibold text-oriental-black">{cliente.nombre}</p>
                <p className="text-xs text-oriental-gray">{cliente.cedula_rif}</p>
              </Link>

              {/* Botón recordatorio WhatsApp */}
              {cliente.whatsapp && (cuotasVencidas > 0 || cuotasPorCobrar > 0) && (() => {
                const hoyStr = new Date().toISOString().split('T')[0]
                const vencidas = cuotasEnriquecidas
                  .filter((c: any) => c.estado === 'vencida')
                  .reduce((acc: any[], c: any) => {
                    const cred = creditos.find((cr: any) => cr.id === c.credito_id)
                    const label = `${vehiculo?.marca ?? ''} ${vehiculo?.modelo ?? ''}${vehiculo?.placa ? ` · ${vehiculo.placa}` : ''} (${planLabel(cred?.plan_tipo)})`
                    const existing = acc.find(a => a.vehiculoLabel === label)
                    const monto = Math.max(0, Number(c.monto) - Number(c.monto_pagado ?? 0))
                    if (existing) { existing.monto += monto; existing.cantidad++ }
                    else acc.push({ vehiculoLabel: label, cantidad: 1, monto, moneda: cred?.moneda ?? 'USD' })
                    return acc
                  }, [])

                const proximas = cuotasEnriquecidas
                  .filter((c: any) => c.estado === 'pendiente' && c.fecha_vencimiento >= hoyStr && c.fecha_vencimiento <= en7Str)
                  .map((c: any) => {
                    const cred = creditos.find((cr: any) => cr.id === c.credito_id)
                    return {
                      vehiculoLabel: `${vehiculo?.marca ?? ''} ${vehiculo?.modelo ?? ''}${vehiculo?.placa ? ` · ${vehiculo.placa}` : ''} (${planLabel(cred?.plan_tipo)})`,
                      monto: Math.max(0, Number(c.monto) - Number(c.monto_pagado ?? 0)),
                      moneda: cred?.moneda ?? 'USD',
                      fecha: c.fecha_vencimiento,
                    }
                  })

                return (
                  <RecordatorioWhatsApp
                    clienteNombre={cliente.nombre}
                    whatsapp={cliente.whatsapp}
                    cuotasVencidas={vencidas}
                    cuotasProximas={proximas}
                    remitente={remitente}
                  />
                )
              })()}
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
                      const esPorCobrar   = esPendiente && cuota.fecha_vencimiento <= en7Str
                      const esAlDia       = esPendiente && cuota.fecha_vencimiento >  en7Str

                      const rowBg = esPagada    ? 'bg-green-50/50'
                                  : esAbono     ? 'bg-amber-50/60'
                                  : esVencida   ? 'bg-red-50/40'
                                  : esPorCobrar ? 'bg-yellow-50/40'
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
                            <div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                              <CheckCircle2 size={12} className="text-green-600" />
                              Pagado
                            </span>
                            {esDirector && (
                              <RevertirCuotaButton
                                cuotaId={cuota.id}
                                creditoId={cuota.credito_id}
                                numeroCuota={cuota.numero_cuota}
                                montoPagado={Number(cuota.monto_pagado ?? cuota.monto)}
                                planLabel={cuota.concepto ?? planLabel(cuota._plan_tipo)}
                              />
                            )}
                            </div>
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
                              {esDirector && (
                                <RevertirCuotaButton
                                  cuotaId={cuota.id}
                                  creditoId={cuota.credito_id}
                                  numeroCuota={cuota.numero_cuota}
                                  montoPagado={Number(cuota.monto_pagado ?? 0)}
                                  planLabel={cuota.concepto ?? planLabel(cuota._plan_tipo)}
                                  esAbono={true}
                                />
                              )}
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
                          ) : esPorCobrar ? (
                            <div className="space-y-1.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                                Por cobrar
                              </span>
                              <Link href={pagoUrl} className="flex items-center gap-1 text-[11px] text-oriental-red hover:text-oriental-black font-medium transition-colors">
                                <PlusCircle size={11} />
                                Registrar pago
                              </Link>
                            </div>
                          ) : esAlDia ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                              Al día
                            </span>
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

      {/* ═══════════════════════════════════════════════════════════════
          ESTADO DE CUENTA — Solo visible al imprimir
      ════════════════════════════════════════════════════════════════ */}
      <div id="estado-cuenta-imprimible" className="hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#111', background: 'white', padding: '0' }}>

        {/* ── Encabezado empresa ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '3px solid #E8001D', paddingBottom: '14px', marginBottom: '18px' }}>
          <div>
            <img src="/logo-la-oriental.jpg" alt="La Oriental Automotors" style={{ height: '56px', objectFit: 'contain', display: 'block' }} />
            <p style={{ fontSize: '10px', color: '#666', marginTop: '6px', lineHeight: '1.6' }}>
              Av. Ugarte Pelayo c/c Av. Bicentenario, Edif. El Parque, Local Nro. 1<br />
              Maturín, Estado Monagas — Venezuela<br />
              RIF: J-505692143
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '22px', fontWeight: '800', color: '#111', letterSpacing: '-0.5px' }}>Estado de Cuenta</p>
            <p style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>Generado el {fechaImpresion}</p>
            {credito.placa && (
              <p style={{ fontSize: '12px', fontWeight: '700', color: '#E8001D', marginTop: '4px', fontFamily: 'monospace' }}>Placa: {credito.placa}</p>
            )}
          </div>
        </div>

        {/* ── Cliente + Vehículo ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
          <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '12px 14px', border: '1px solid #eee' }}>
            <p style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#888', marginBottom: '6px' }}>Cliente</p>
            <p style={{ fontSize: '14px', fontWeight: '700', color: '#111' }}>{cliente?.nombre ?? '—'}</p>
            <p style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>C.I. / RIF: {cliente?.cedula_rif ?? '—'}</p>
            {cliente?.telefono && <p style={{ fontSize: '11px', color: '#555' }}>Tel: {cliente.telefono}</p>}
          </div>
          <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '12px 14px', border: '1px solid #eee' }}>
            <p style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#888', marginBottom: '6px' }}>Vehículo</p>
            <p style={{ fontSize: '14px', fontWeight: '700', color: '#111' }}>{vehiculo?.marca} {vehiculo?.modelo}</p>
            <p style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
              {[vehiculo?.anio, vehiculo?.color, vehiculo?.placa ? `Placa: ${vehiculo.placa}` : null].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        {/* ── Resumen financiero ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
          <div style={{ background: '#111', borderRadius: '8px', padding: '12px 14px', textAlign: 'center' }}>
            <p style={{ fontSize: '9px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>Total financiado</p>
            <p style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>{formatCurrency(totalFinanciado, credito.moneda)}</p>
          </div>
          <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '12px 14px', textAlign: 'center', border: '1px solid #d1fae5' }}>
            <p style={{ fontSize: '9px', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>Ya pagado</p>
            <p style={{ fontSize: '16px', fontWeight: '800', color: '#15803d' }}>{formatCurrency(totalFinanciado - totalSaldo, credito.moneda)}</p>
          </div>
          <div style={{ background: '#fff1f2', borderRadius: '8px', padding: '12px 14px', textAlign: 'center', border: '1px solid #fecdd3' }}>
            <p style={{ fontSize: '9px', color: '#e11d48', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>Saldo pendiente</p>
            <p style={{ fontSize: '16px', fontWeight: '800', color: '#E8001D' }}>{formatCurrency(totalSaldo, credito.moneda)}</p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#888', marginBottom: '4px' }}>
            <span>Progreso general</span>
            <span style={{ fontWeight: '700', color: '#111' }}>{porcentajePagado.toFixed(0)}%</span>
          </div>
          <div style={{ height: '7px', background: '#e5e7eb', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, porcentajePagado)}%`, background: '#22c55e', borderRadius: '99px' }} />
          </div>
        </div>

        {/* Contadores cuotas */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
          {[
            { count: cuotasPagadas,   label: 'Pagadas',       bg: '#f0fdf4', color: '#15803d', border: '#d1fae5' },
            { count: cuotasVencidas,  label: 'Vencidas',      bg: '#fff1f2', color: '#be123c', border: '#fecdd3' },
            { count: cuotasPorCobrar, label: 'Por cobrar',    bg: '#fefce8', color: '#a16207', border: '#fef08a' },
            { count: cuotasAlDia,     label: 'Al día',        bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
            { count: cuotasAbono,     label: 'Abono parcial', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
          ].filter(item => item.count > 0 || item.label === 'Pagadas' || item.label === 'Vencidas').map(item => (
            <div key={item.label} style={{ background: item.bg, border: `1px solid ${item.border}`, borderRadius: '8px', padding: '8px 14px', minWidth: '90px', textAlign: 'center' }}>
              <p style={{ fontSize: '18px', fontWeight: '800', color: item.color }}>{item.count}</p>
              <p style={{ fontSize: '9px', color: item.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</p>
            </div>
          ))}
        </div>

        {/* ── Tabla de cuotas ── */}
        <p style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#888', marginBottom: '8px' }}>
          Plan de cuotas — {cuotasEnriquecidas.length} cuotas en total
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr style={{ background: '#111', color: '#fff' }}>
              {['N°', 'Financiamiento', 'Vencimiento', 'Monto', 'Abonado', 'Faltante', 'Fecha Pago', 'Estado'].map(h => (
                <th key={h} style={{ padding: '7px 8px', textAlign: 'left', fontWeight: '700', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cuotasEnriquecidas.map((cuota: any, idx: number) => {
              const montoPagado = Number(cuota.monto_pagado ?? 0)
              const montoTotal  = Number(cuota.monto)
              const faltante    = Math.max(0, montoTotal - montoPagado)
              const esPagada       = cuota.estado === 'pagada'
              const esAbono        = cuota.estado === 'abono_parcial'
              const esVencida      = cuota.estado === 'vencida'
              const esPorCobrarPr  = cuota.estado === 'pendiente' && cuota.fecha_vencimiento <= en7Str
              const esAlDiaPr      = cuota.estado === 'pendiente' && cuota.fecha_vencimiento >  en7Str

              const rowBg = esPagada      ? '#f0fdf4'
                          : esAbono       ? '#fff7ed'
                          : esVencida     ? '#fff1f2'
                          : esPorCobrarPr ? '#fefce8'
                          : idx % 2 === 0 ? '#ffffff' : '#f9fafb'

              const estadoStyle = esPagada      ? { background: '#dcfce7', color: '#15803d' }
                                : esAbono       ? { background: '#ffedd5', color: '#c2410c' }
                                : esVencida     ? { background: '#fee2e2', color: '#b91c1c' }
                                : esPorCobrarPr ? { background: '#fef9c3', color: '#a16207' }
                                : { background: '#f3f4f6', color: '#6b7280' }

              const planTipo = cuota._plan_tipo
              const planBgColor = planTipo === 'inicial_la_oriental' ? '#f3e8ff'
                                : planTipo === 'financiamiento_vehimotors' ? '#e0e7ff'
                                : '#f0fdfa'
              const planTextColor = planTipo === 'inicial_la_oriental' ? '#7e22ce'
                                  : planTipo === 'financiamiento_vehimotors' ? '#3730a3'
                                  : '#0f766e'

              return (
                <tr key={cuota.id} style={{ background: rowBg }}>
                  <td style={{ padding: '6px 8px', color: '#666', borderBottom: '1px solid #f3f4f6' }}>{cuota.numero_cuota}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ background: planBgColor, color: planTextColor, padding: '2px 7px', borderRadius: '99px', fontSize: '9px', fontWeight: '700' }}>
                      {cuota.concepto ?? planLabel(planTipo)}
                    </span>
                  </td>
                  <td style={{ padding: '6px 8px', color: esVencida ? '#b91c1c' : '#555', fontWeight: esVencida ? '700' : '400', borderBottom: '1px solid #f3f4f6' }}>
                    {formatDate(cuota.fecha_vencimiento)}
                  </td>
                  <td style={{ padding: '6px 8px', fontWeight: '700', color: '#111', borderBottom: '1px solid #f3f4f6' }}>
                    {formatCurrency(montoTotal, credito.moneda)}
                  </td>
                  <td style={{ padding: '6px 8px', color: montoPagado > 0 ? '#15803d' : '#ccc', borderBottom: '1px solid #f3f4f6' }}>
                    {montoPagado > 0 ? formatCurrency(montoPagado, credito.moneda) : '—'}
                  </td>
                  <td style={{ padding: '6px 8px', fontWeight: faltante > 0 ? '700' : '400', color: faltante > 0 ? '#E8001D' : '#22c55e', borderBottom: '1px solid #f3f4f6' }}>
                    {faltante > 0 ? formatCurrency(faltante, credito.moneda) : '✓'}
                  </td>
                  <td style={{ padding: '6px 8px', color: '#555', borderBottom: '1px solid #f3f4f6' }}>
                    {cuota.fecha_pago ? formatDate(cuota.fecha_pago) : '—'}
                  </td>
                  <td style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ ...estadoStyle, padding: '2px 8px', borderRadius: '99px', fontSize: '9px', fontWeight: '700' }}>
                      {cuota.estado === 'pagada' ? 'Pagada'
                       : cuota.estado === 'abono_parcial' ? 'Abono parcial'
                       : cuota.estado === 'vencida' ? 'Vencida'
                       : cuota.fecha_vencimiento <= en7Str ? 'Por cobrar'
                       : 'Al día'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* ── Sello y firma ── */}
        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
          {/* Firma */}
          <div style={{ flex: 1 }}>
            <div style={{ borderTop: '1px solid #111', width: '220px', paddingTop: '6px', marginTop: '40px' }}>
              <p style={{ fontSize: '10px', color: '#555', fontWeight: '600' }}>Firma Autorizada</p>
              <p style={{ fontSize: '9px', color: '#888' }}>La Oriental Automotors S.C.A.</p>
            </div>
          </div>
          {/* Sello */}
          <div style={{ position: 'relative', width: '110px', height: '110px', flexShrink: 0 }}>
            <img
              src="/sello-la-oriental.jpeg"
              alt="Sello La Oriental"
              style={{ width: '110px', height: '110px', objectFit: 'contain', mixBlendMode: 'multiply', opacity: 0.85 }}
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ marginTop: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '10px', textAlign: 'center' }}>
          <p style={{ fontSize: '9px', color: '#aaa' }}>
            La Oriental Automotors S.C.A. · RIF: J-505692143 · Maturín, Venezuela · Documento generado el {fechaImpresion}
          </p>
        </div>

      </div>
    </div>
  )
}
