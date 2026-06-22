import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, Car, User, Calendar, Hash, CreditCard, TrendingUp, ExternalLink, CheckCircle2, Clock, AlertCircle, CircleDot } from 'lucide-react'
import DeleteButton from '@/components/DeleteButton'
import VehiculoDocumentos from './VehiculoDocumentos'
import DesvincularCliente from './DesvincularCliente'
import VincularCliente from './VincularCliente'
import EditarVehiculo from './EditarVehiculo'
import ShowroomDocumentos from '../../showroom/[id]/ShowroomDocumentos'

export default async function VehiculoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: vehiculo } = await supabase
    .from('vehiculos')
    .select('*, clientes(id, nombre, cedula_rif, telefono)')
    .eq('id', id)
    .single()

  if (!vehiculo) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const rol = user?.user_metadata?.rol as string ?? ''
  const puedeEditar = ['jose', 'admin', 'director', 'mary', 'leysdem'].includes(rol)

  const cliente = (vehiculo as any).clientes

  const { data: ingresos } = await supabase
    .from('ingresos')
    .select('id, numero_recibo, concepto, monto, moneda, fecha_pago, estado')
    .eq('vehiculo_id', id)
    .order('fecha_pago', { ascending: false })
    .limit(20)

  const { data: archivos } = await supabase
    .from('archivos')
    .select('id, tipo, url, nombre, created_at')
    .eq('vehiculo_id', id)
    .order('created_at', { ascending: true })

  // Vehículo de showroom vinculado (si vino de preventa) — para mostrar sus documentos aquí también
  const { data: showroomVinculado } = await supabase
    .from('vehiculos_showroom')
    .select('id')
    .eq('vehiculo_id', id)
    .maybeSingle()

  let archivosPreventa: { id: string; tipo: string; url: string; nombre: string | null; created_at: string }[] = []
  if (showroomVinculado) {
    const { data } = await supabase
      .from('archivos')
      .select('id, tipo, url, nombre, created_at')
      .eq('showroom_vehiculo_id', showroomVinculado.id)
      .order('created_at', { ascending: true })
    archivosPreventa = data ?? []
  }

  // Créditos del vehículo para el resumen financiero
  const { data: creditos } = await supabase
    .from('creditos')
    .select('*')
    .eq('vehiculo_id', id)
    .order('plan_tipo')

  let cuotasResumen: any[] = []
  // El acuerdo se consulta siempre por vehiculo_id, independiente de si hay crédito
  const [acuerdoRes] = await Promise.all([
    supabase
      .from('acuerdos_inicial')
      .select('id, monto_acordado, monto_pagado, estado, fecha_limite, credito_id')
      .eq('vehiculo_id', id)
      .not('estado', 'in', '("completado","cancelado")')
      .limit(1)
      .maybeSingle(),
  ])
  const acuerdoActivo: any = acuerdoRes.data ?? null

  if (creditos && creditos.length > 0) {
    const creditoIds = creditos.map((c: any) => c.id)
    const { data: cuotas } = await supabase
      .from('cuotas')
      .select('id, estado, monto, monto_pagado, credito_id')
      .in('credito_id', creditoIds)
    cuotasResumen = cuotas ?? []
  }

  // Calcular métricas financieras desde cuotas pendientes (incluye el inicial ya pagado)
  const totalFinanciado = (creditos ?? []).reduce((s: number, c: any) => s + Number(c.monto_financiado ?? 0), 0)
  const totalSaldo = cuotasResumen.reduce((s: number, c: any) => {
    if (c.estado === 'pendiente' || c.estado === 'vencida') return s + Number(c.monto)
    if (c.estado === 'abono_parcial') return s + Math.max(0, Number(c.monto) - Number(c.monto_pagado ?? 0))
    return s
  }, 0)
  const totalPagado = Math.max(0, totalFinanciado - totalSaldo)
  const porcentajePagado = totalFinanciado > 0 ? Math.round((totalPagado / totalFinanciado) * 100) : 0

  // Saldo por crédito calculado desde sus cuotas pendientes (para el Desglose)
  const saldoPorCredito = (creditoId: string, montoFinanciado: number) => {
    const pendiente = cuotasResumen
      .filter((q: any) => q.credito_id === creditoId)
      .reduce((s: number, q: any) => {
        if (q.estado === 'pendiente' || q.estado === 'vencida') return s + Number(q.monto)
        if (q.estado === 'abono_parcial') return s + Math.max(0, Number(q.monto) - Number(q.monto_pagado ?? 0))
        return s
      }, 0)
    return pendiente
  }

  const cuotasPagadas = cuotasResumen.filter((c: any) => c.estado === 'pagada').length
  const cuotasPendientes = cuotasResumen.filter((c: any) => c.estado === 'pendiente').length
  const cuotasVencidas = cuotasResumen.filter((c: any) => c.estado === 'vencida').length
  const cuotasAbono = cuotasResumen.filter((c: any) => c.estado === 'abono_parcial').length
  const montoVencido = cuotasResumen
    .filter((c: any) => c.estado === 'vencida')
    .reduce((s: number, c: any) => s + Math.max(0, Number(c.monto ?? 0) - Number(c.monto_pagado ?? 0)), 0)
  const primerCreditoId = creditos?.[0]?.id ?? null

  const planLabel = (tipo: string | null) =>
    tipo === 'inicial_la_oriental' ? 'La Oriental' :
    tipo === 'financiamiento_vehimotors' ? 'Vehimotors' :
    tipo === 'cuota_especial' ? 'Cuota Especial' :
    tipo === 'asegurate_500' ? 'Asegúrate $500' :
    tipo === 'credito_40_60' ? '40/60 Vehimotors' : 'Crédito'

  const planBadge = (tipo: string | null) =>
    tipo === 'inicial_la_oriental' ? 'bg-purple-100 text-purple-700' :
    tipo === 'financiamiento_vehimotors' ? 'bg-indigo-100 text-indigo-700' :
    tipo === 'cuota_especial' ? 'bg-teal-100 text-teal-700' :
    tipo === 'asegurate_500' ? 'bg-yellow-100 text-yellow-700' :
    tipo === 'credito_40_60' ? 'bg-orange-100 text-orange-700' :
    'bg-gray-100 text-gray-500'

  const estadoColors: Record<string, string> = {
    activo: 'bg-green-100 text-green-800',
    entregado: 'bg-blue-100 text-blue-800',
    en_transito: 'bg-yellow-100 text-yellow-800',
    reservado: 'bg-purple-100 text-purple-800',
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/vehiculos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-oriental-black">{vehiculo.marca} {vehiculo.modelo}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${estadoColors[vehiculo.estado] ?? 'bg-gray-100 text-gray-700'}`}>
              {vehiculo.estado}
            </span>
          </div>
          <p className="text-oriental-gray text-sm mt-0.5">{[vehiculo.version, vehiculo.anio, vehiculo.color].filter(Boolean).join(' · ')}</p>
        </div>
      </div>

      {/* ⚠ Alerta: Inicial incompleta — no tramitar */}
      {acuerdoActivo && (() => {
        const acordado = Number(acuerdoActivo.monto_acordado)
        const pagado   = Number(acuerdoActivo.monto_pagado ?? 0)
        const pendiente = Math.max(0, acordado - pagado)
        const pct = acordado > 0 ? Math.min(100, (pagado / acordado) * 100) : 0
        if (pendiente <= 0.01) return null
        return (
          <div className="mb-6 rounded-2xl border-2 border-red-300 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle size={22} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-red-700 text-base">Inicial incompleta — No tramitar</p>
                <p className="text-sm text-red-600 mt-0.5">
                  El cliente tiene un acuerdo de pago pendiente. No se puede iniciar ningún trámite vehicular hasta que cancele el saldo del inicial.
                </p>
                <div className="mt-3 flex flex-wrap gap-6 text-sm">
                  <div>
                    <p className="text-xs text-red-400 uppercase tracking-wide">Acordado</p>
                    <p className="font-bold text-red-800">{formatCurrency(acordado, 'USD')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-red-400 uppercase tracking-wide">Pagado</p>
                    <p className="font-bold text-green-700">{formatCurrency(pagado, 'USD')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-red-400 uppercase tracking-wide">Pendiente</p>
                    <p className="font-extrabold text-red-700 text-lg">{formatCurrency(pendiente, 'USD')}</p>
                  </div>
                </div>
                <div className="mt-2 w-full bg-red-100 rounded-full h-2.5">
                  <div className="bg-red-500 h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                {acuerdoActivo.fecha_limite && (
                  <p className="text-xs text-red-600 mt-2">
                    Fecha límite del acuerdo: <strong>{formatDate(acuerdoActivo.fecha_limite)}</strong>
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/ingresos/nuevo?acuerdo=${acuerdoActivo.id}&cliente=${vehiculo.cliente_id ?? ''}&vehiculo=${id}&placa=${vehiculo.placa ?? ''}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Registrar pago
                  </Link>
                  {acuerdoActivo.credito_id && (
                    <Link
                      href={`/creditos/${acuerdoActivo.credito_id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:underline"
                    >
                      Ver acuerdo completo <ExternalLink size={11} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info */}
        <div className="space-y-6">
          <div className="card p-6">
            <div className="w-14 h-14 bg-oriental-red/10 rounded-full flex items-center justify-center mb-4">
              <Car size={24} className="text-oriental-red" />
            </div>
            <h2 className="font-bold text-oriental-black mb-4">Datos del vehículo</h2>
            <div className="space-y-3">
              <InfoRow icon={Hash} label="Placa" value={vehiculo.placa ?? 'Sin placa'} mono />
              <InfoRow icon={Hash} label="VIN / Chasis" value={vehiculo.vin ?? '—'} mono />
              <InfoRow icon={Hash} label="Serial motor" value={vehiculo.serial_motor ?? '—'} mono />
              <InfoRow icon={Hash} label="Proforma Vehimotors" value={(vehiculo as any).proforma_vehimotors ?? '—'} mono />
              {/* Tipo compra + plan de crédito */}
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <CreditCard size={14} className="text-oriental-gray flex-shrink-0" />
                <span className="text-oriental-gray">Tipo compra:</span>
                <span className="text-oriental-black font-medium capitalize">
                  {vehiculo.tipo_compra === 'asegurate_500' ? 'Asegúrate $500' :
                   vehiculo.tipo_compra === 'credito_40_60' ? '40/60 Vehimotors' :
                   vehiculo.tipo_compra}
                </span>
                {(creditos ?? []).map((c: any) => c.plan_tipo).filter(Boolean).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).map((tipo: string) => (
                  <span key={tipo} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${planBadge(tipo)}`}>
                    {planLabel(tipo)}
                  </span>
                ))}
              </div>
              <InfoRow icon={Calendar} label="Entrega" value={vehiculo.fecha_entrega ? formatDate(vehiculo.fecha_entrega) : 'Pendiente'} />
            </div>
            {puedeEditar && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
                <Link
                  href={`/creditos/nuevo?vehiculo_id=${id}`}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-oriental-red text-white text-xs font-bold hover:bg-oriental-red-dark transition-colors"
                >
                  <CreditCard size={13} /> Crear crédito
                </Link>
                <EditarVehiculo
                  vehiculoId={id}
                  vehiculo={{
                    marca: vehiculo.marca,
                    modelo: vehiculo.modelo,
                    version: vehiculo.version,
                    anio: vehiculo.anio,
                    color: vehiculo.color,
                    placa: vehiculo.placa,
                    vin: vehiculo.vin,
                    serial_motor: vehiculo.serial_motor,
                    proforma_vehimotors: (vehiculo as any).proforma_vehimotors ?? null,
                    tipo_compra: vehiculo.tipo_compra,
                    estado: vehiculo.estado,
                    fecha_entrega: vehiculo.fecha_entrega,
                    observaciones: vehiculo.observaciones,
                  }}
                />
              </div>
            )}
          </div>

          {/* Vincular cliente — cuando no tiene propietario */}
          {!cliente && (
            <div className="card p-6">
              <h2 className="font-bold text-oriental-black mb-3 flex items-center gap-2">
                <User size={16} className="text-oriental-gray" /> Propietario
              </h2>
              <p className="text-xs text-oriental-gray mb-3">Sin cliente asignado</p>
              <VincularCliente vehiculoId={id} />
            </div>
          )}

          {/* Propietario */}
          {cliente && (
            <div className="card p-6">
              <h2 className="font-bold text-oriental-black mb-3 flex items-center gap-2">
                <User size={16} className="text-oriental-gray" /> Propietario
              </h2>
              <Link href={`/clientes/${cliente.id}`} className="block p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-oriental-bg/50 transition-all mb-3">
                <p className="font-semibold text-oriental-black">{cliente.nombre}</p>
                <p className="text-xs text-oriental-gray">{cliente.cedula_rif}</p>
                {cliente.telefono && <p className="text-xs text-oriental-gray mt-1">{cliente.telefono}</p>}
              </Link>
              {puedeEditar && <DesvincularCliente vehiculoId={id} />}
            </div>
          )}

          {vehiculo.observaciones && (
            <div className="card p-6">
              <p className="text-xs text-oriental-gray uppercase tracking-wider font-semibold mb-2">Observaciones</p>
              <p className="text-sm text-gray-700">{vehiculo.observaciones}</p>
            </div>
          )}

          {/* Resumen financiero */}
          {creditos && creditos.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-oriental-black flex items-center gap-2">
                  <CreditCard size={16} className="text-oriental-gray" /> Financiamiento
                </h2>
                {primerCreditoId && (
                  <Link
                    href={`/creditos/${primerCreditoId}`}
                    className="flex items-center gap-1.5 text-xs font-semibold text-oriental-red hover:underline"
                  >
                    Ver detalle <ExternalLink size={12} />
                  </Link>
                )}
              </div>

              {/* Montos */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-oriental-gray">Total financiado</span>
                  <span className="font-semibold text-oriental-black">{formatCurrency(totalFinanciado, 'USD')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-oriental-gray">Ya pagado</span>
                  <span className="font-semibold text-green-700">{formatCurrency(totalPagado, 'USD')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-oriental-gray">Saldo pendiente</span>
                  <span className="font-bold text-oriental-red">{formatCurrency(totalSaldo, 'USD')}</span>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="mb-4">
                <div className="flex justify-between text-[11px] text-oriental-gray mb-1">
                  <span>Progreso</span>
                  <span className="font-semibold text-oriental-black">{porcentajePagado}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${porcentajePagado}%` }}
                  />
                </div>
              </div>

              {/* ⚠ Alerta cuotas vencidas */}
              {cuotasVencidas > 0 && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
                    <p className="text-sm font-bold text-red-700">Cuotas vencidas</p>
                  </div>
                  <div className="space-y-2">
                    {(creditos ?? []).map((c: any) => {
                      const vencCred = cuotasResumen.filter((q: any) => q.credito_id === c.id && q.estado === 'vencida')
                      if (vencCred.length === 0) return null
                      const montoVencCred = vencCred.reduce((s: number, q: any) =>
                        s + Math.max(0, Number(q.monto ?? 0) - Number(q.monto_pagado ?? 0)), 0)
                      return (
                        <div key={c.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${planBadge(c.plan_tipo)}`}>
                              {planLabel(c.plan_tipo)}
                            </span>
                            <span className="text-xs text-red-600">{vencCred.length} cuota{vencCred.length !== 1 ? 's' : ''} vencida{vencCred.length !== 1 ? 's' : ''}</span>
                          </div>
                          <span className="text-sm font-extrabold text-red-700">{formatCurrency(montoVencCred, 'USD')}</span>
                        </div>
                      )
                    })}
                  </div>
                  {(creditos ?? []).filter((c: any) => cuotasResumen.some((q: any) => q.credito_id === c.id && q.estado === 'vencida')).length > 1 && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-red-200">
                      <span className="text-xs font-semibold text-red-600">Total vencido</span>
                      <span className="text-sm font-extrabold text-red-700">{formatCurrency(montoVencido, 'USD')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Contadores de cuotas */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
                  <CheckCircle2 size={13} className="text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-green-800">{cuotasPagadas}</p>
                    <p className="text-[10px] text-green-600">Pagadas</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-yellow-50 rounded-lg px-3 py-2">
                  <Clock size={13} className="text-yellow-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-yellow-800">{cuotasPendientes}</p>
                    <p className="text-[10px] text-yellow-600">Pendientes</p>
                  </div>
                </div>
                {cuotasVencidas > 0 && (
                  <div className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-2">
                    <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-red-700">{cuotasVencidas}</p>
                      <p className="text-[10px] text-red-500">Vencidas</p>
                    </div>
                  </div>
                )}
                {cuotasAbono > 0 && (
                  <div className="flex items-center gap-2 bg-orange-50 rounded-lg px-3 py-2">
                    <CircleDot size={13} className="text-orange-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-orange-700">{cuotasAbono}</p>
                      <p className="text-[10px] text-orange-500">Abono parcial</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Desglose por financiamiento */}
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <p className="text-[10px] font-bold text-oriental-gray uppercase tracking-wider mb-2">Desglose</p>
                {creditos.map((c: any) => {
                  const cuotasCred = cuotasResumen.filter((q: any) => q.credito_id === c.id)
                  const pagadasCred = cuotasCred.filter((q: any) => q.estado === 'pagada').length
                  return (
                    <Link
                      key={c.id}
                      href={`/creditos/${c.id}`}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-oriental-bg/50 transition-all group"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${planBadge(c.plan_tipo)}`}>
                          {planLabel(c.plan_tipo)}
                        </span>
                        <span className="text-[11px] text-oriental-gray">{pagadasCred}/{cuotasCred.length} cuotas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-oriental-red">{formatCurrency(saldoPorCredito(c.id, c.monto_financiado), 'USD')}</span>
                        <ExternalLink size={11} className="text-gray-300 group-hover:text-oriental-gray transition-colors" />
                      </div>
                    </Link>
                  )
                })}
              </div>

              {/* Botón ir al detalle completo */}
              {primerCreditoId && (
                <Link
                  href={`/creditos/${primerCreditoId}`}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-oriental-black text-white text-xs font-semibold rounded-xl hover:bg-gray-800 transition-colors"
                >
                  Ver detalle completo <ExternalLink size={13} />
                </Link>
              )}
            </div>
          )}

          <DeleteButton table="vehiculos" id={id} redirectTo="/vehiculos" label="Eliminar vehículo" />
        </div>

        {/* Columna derecha: documentos + ingresos */}
        <div className="lg:col-span-2 space-y-6">

          {/* Documentos de preventa (showroom) — solo si el vehículo viene de showroom */}
          {showroomVinculado && (
            <ShowroomDocumentos
              showroomId={showroomVinculado.id}
              archivosIniciales={archivosPreventa}
            />
          )}

          {/* Documentos */}
          <VehiculoDocumentos
            vehiculoId={id}
            archivosIniciales={archivos ?? []}
          />

          {/* Ingresos asociados */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-oriental-black flex items-center gap-2">
                <TrendingUp size={18} className="text-oriental-gray" /> Ingresos del vehículo
              </h2>
              <Link href="/ingresos/nuevo" className="text-oriental-red text-xs font-semibold hover:underline">+ Registrar</Link>
            </div>
            {ingresos && ingresos.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-oriental-bg border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Recibo</th>
                      <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Concepto</th>
                      <th className="text-right px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Monto</th>
                      <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {ingresos.map(ing => (
                      <tr key={ing.id} className="hover:bg-oriental-bg/50 transition-colors">
                        <td className="px-3 py-2.5">
                          <Link href={`/ingresos/${ing.id}`} className="font-mono text-xs text-oriental-red hover:underline">{ing.numero_recibo}</Link>
                        </td>
                        <td className="px-3 py-2.5 text-oriental-black">{ing.concepto}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-oriental-black">{formatCurrency(ing.monto, ing.moneda)}</td>
                        <td className="px-3 py-2.5 text-oriental-gray">{formatDate(ing.fecha_pago)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-oriental-gray text-sm py-8 text-center">Sin ingresos asociados a este vehículo</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value, mono, capitalize: cap }: { icon: any; label: string; value: string; mono?: boolean; capitalize?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon size={14} className="text-oriental-gray flex-shrink-0" />
      <span className="text-oriental-gray">{label}:</span>
      <span className={`text-oriental-black font-medium ${mono ? 'font-mono' : ''} ${cap ? 'capitalize' : ''}`}>{value}</span>
    </div>
  )
}
