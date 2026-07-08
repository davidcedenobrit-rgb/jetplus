import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, Handshake, User, Car, PlusCircle, CreditCard, CheckCircle2, Clock, AlertCircle, TrendingUp } from 'lucide-react'
import EditarAcuerdo from './EditarAcuerdo'
import EliminarAcuerdo from './EliminarAcuerdo'
import LetrasCambioButton from '@/components/LetrasCambioButton'

export default async function AcuerdoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: acuerdo } = await supabase
    .from('acuerdos_inicial')
    .select(`
      *,
      clientes(id, nombre, cedula_rif, telefono),
      vehiculos(id, marca, modelo, placa, color, anio)
    `)
    .eq('id', id)
    .single()

  if (!acuerdo) notFound()

  const hoy = new Date().toISOString().split('T')[0]

  // Ingresos vinculados a este acuerdo
  const { data: ingresos } = await supabase
    .from('ingresos')
    .select('id, numero_recibo, concepto, monto, moneda, metodo_pago, fecha_pago, banco_emisor, referencia, estado, monto_bs, tasa_cambio')
    .eq('acuerdo_inicial_id', id)
    .order('fecha_pago', { ascending: false })

  const cliente  = (acuerdo as any).clientes
  const vehiculo = (acuerdo as any).vehiculos
  const acordado  = Number(acuerdo.monto_acordado)
  const pagado    = Number(acuerdo.monto_pagado ?? 0)
  const pendiente = Math.max(0, acordado - pagado)
  const pct       = acordado > 0 ? Math.min(100, (pagado / acordado) * 100) : 0
  const vencido   = acuerdo.fecha_limite && acuerdo.fecha_limite < hoy && acuerdo.estado === 'pendiente'
  const completado = acuerdo.estado === 'completado'

  const pagoUrl = acuerdo.vehiculo_id
    ? `/ingresos/nuevo?acuerdo=${id}&cliente=${acuerdo.cliente_id}&vehiculo=${acuerdo.vehiculo_id}&placa=${vehiculo?.placa ?? ''}`
    : `/ingresos/nuevo?acuerdo=${id}&cliente=${acuerdo.cliente_id}`

  const borderColor = completado ? 'border-green-300' : vencido ? 'border-red-300' : 'border-blue-300'
  const bgColor     = completado ? 'bg-green-50/20' : vencido ? 'bg-red-50/20' : 'bg-blue-50/10'

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/acuerdos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-oriental-black flex items-center gap-2">
              <Handshake size={22} className="text-oriental-red" /> Acuerdo de Pago
            </h1>
            {completado && (
              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                <CheckCircle2 size={12} /> Completado
              </span>
            )}
            {!completado && !vencido && (
              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                <Clock size={12} /> En curso
              </span>
            )}
            {vencido && (
              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                <AlertCircle size={12} /> Vencido
              </span>
            )}
          </div>
          <p className="text-oriental-gray text-sm mt-0.5">Registrado el {formatDate(acuerdo.created_at)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <EliminarAcuerdo acuerdoId={id} />
          <EditarAcuerdo acuerdo={{
            id: acuerdo.id,
            monto_acordado: acordado,
            fecha_limite: acuerdo.fecha_limite,
            observaciones: acuerdo.observaciones,
          }} />
          <LetrasCambioButton
            origen="acuerdo"
            entidadId={id}
            montoAcordado={acordado}
            fechaLimite={acuerdo.fecha_limite ?? null}
          />
          {!completado && (
            <Link href={pagoUrl}
              className="flex items-center gap-2 px-4 py-2 bg-oriental-red hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors">
              <PlusCircle size={15} /> Registrar pago
            </Link>
          )}
          {completado && !acuerdo.credito_id && acuerdo.vehiculo_id && (
            <Link href={`/creditos/nuevo?vehiculo_id=${acuerdo.vehiculo_id}`}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors">
              <CreditCard size={15} /> Crear crédito
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda */}
        <div className="space-y-5">

          {/* Progreso */}
          <div className={`card border-2 ${borderColor} ${bgColor} p-6`}>
            <h2 className="font-bold text-oriental-black mb-4 text-sm uppercase tracking-wider">Progreso del acuerdo</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-oriental-gray">Acordado</span>
                <span className="font-extrabold text-oriental-black text-lg">{formatCurrency(acordado, 'USD')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-oriental-gray">Pagado</span>
                <span className="font-bold text-green-700 text-lg">{formatCurrency(pagado, 'USD')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-oriental-gray">Pendiente</span>
                <span className={`font-extrabold text-lg ${pendiente > 0 ? 'text-oriental-red' : 'text-green-600'}`}>
                  {formatCurrency(pendiente, 'USD')}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-oriental-gray mb-1">
                <span>Progreso</span>
                <span className="font-semibold">{pct.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${completado ? 'bg-green-500' : vencido ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            {acuerdo.fecha_limite && (
              <p className={`text-xs mt-3 ${vencido ? 'text-red-600 font-semibold' : 'text-oriental-gray'}`}>
                Fecha límite: <strong>{formatDate(acuerdo.fecha_limite)}</strong>
                {vencido && ' — VENCIDO'}
              </p>
            )}
            {acuerdo.observaciones && (
              <p className="text-xs text-oriental-gray italic mt-2 pt-2 border-t border-gray-100">"{acuerdo.observaciones}"</p>
            )}
          </div>

          {/* Cliente */}
          {cliente && (
            <div className="card p-5">
              <h2 className="font-bold text-oriental-black mb-3 flex items-center gap-2 text-sm">
                <User size={14} className="text-oriental-gray" /> Cliente
              </h2>
              <Link href={`/clientes/${cliente.id}`} className="block p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-oriental-bg/50 transition-all">
                <p className="font-semibold text-oriental-black">{cliente.nombre}</p>
                <p className="text-xs text-oriental-gray">{cliente.cedula_rif}</p>
                {cliente.telefono && <p className="text-xs text-oriental-gray mt-0.5">{cliente.telefono}</p>}
              </Link>
            </div>
          )}

          {/* Vehículo */}
          {vehiculo ? (
            <div className="card p-5">
              <h2 className="font-bold text-oriental-black mb-3 flex items-center gap-2 text-sm">
                <Car size={14} className="text-oriental-gray" /> Vehículo
              </h2>
              <Link href={`/vehiculos/${acuerdo.vehiculo_id}`} className="block p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-oriental-bg/50 transition-all">
                <p className="font-semibold text-oriental-black">{vehiculo.marca} {vehiculo.modelo}</p>
                <p className="text-xs text-oriental-gray">
                  {[vehiculo.anio, vehiculo.color, vehiculo.placa].filter(Boolean).join(' · ')}
                </p>
              </Link>
            </div>
          ) : (
            <div className="card p-5">
              <h2 className="font-bold text-oriental-black mb-2 flex items-center gap-2 text-sm">
                <Car size={14} className="text-oriental-gray" /> Vehículo
              </h2>
              <p className="text-xs text-oriental-gray">Sin vehículo registrado aún.</p>
            </div>
          )}

          {/* Crédito vinculado */}
          {acuerdo.credito_id && (
            <div className="card p-5">
              <h2 className="font-bold text-oriental-black mb-3 flex items-center gap-2 text-sm">
                <CreditCard size={14} className="text-oriental-gray" /> Crédito
              </h2>
              <Link href={`/creditos/${acuerdo.credito_id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-green-200 bg-green-50 text-sm font-semibold text-green-700 hover:bg-green-100 transition-colors">
                <CreditCard size={13} /> Ver detalle del crédito
              </Link>
            </div>
          )}

          {completado && !acuerdo.credito_id && acuerdo.vehiculo_id && (
            <div className="card p-5 border-2 border-green-300 bg-green-50/30">
              <p className="text-sm font-bold text-green-700 mb-2">✓ Inicial completada</p>
              <p className="text-xs text-green-600 mb-3">El cliente pagó el inicial acordado. Ya puedes crear el crédito con las cuotas de Vehimotors.</p>
              <Link href={`/creditos/nuevo?vehiculo_id=${acuerdo.vehiculo_id}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-colors">
                <CreditCard size={14} /> Crear crédito
              </Link>
            </div>
          )}
        </div>

        {/* Columna derecha — ingresos */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-oriental-black flex items-center gap-2">
                <TrendingUp size={16} className="text-oriental-gray" /> Pagos registrados
                <span className="text-xs text-oriental-gray font-normal">({(ingresos ?? []).length})</span>
              </h2>
              {!completado && (
                <Link href={pagoUrl}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-oriental-red hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors">
                  <PlusCircle size={12} /> Nuevo pago
                </Link>
              )}
            </div>

            {(ingresos ?? []).length === 0 ? (
              <div className="text-center py-12 text-oriental-gray">
                <TrendingUp size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin pagos registrados aún.</p>
                {!completado && (
                  <Link href={pagoUrl} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-oriental-red hover:underline">
                    <PlusCircle size={13} /> Registrar primer pago
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {(ingresos ?? []).map((ing: any) => (
                  <div key={ing.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-oriental-bg/30 transition-all">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-oriental-black text-base">{formatCurrency(ing.monto, ing.moneda)}</span>
                        {ing.monto_bs && (
                          <span className="text-xs text-orange-600 font-semibold">
                            = Bs.S {Number(ing.monto_bs).toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(Number(ing.monto_bs))*100)%100===0?0:2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{ing.metodo_pago}</span>
                        {ing.estado === 'anulado' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Anulado</span>
                        )}
                      </div>
                      <p className="text-xs text-oriental-gray">
                        {formatDate(ing.fecha_pago)}
                        {ing.banco_emisor && ` · ${ing.banco_emisor}`}
                        {ing.referencia && ` · Ref: ${ing.referencia}`}
                        {ing.tasa_cambio && ` · Tasa: ${Number(ing.tasa_cambio).toFixed(4)} Bs/$`}
                      </p>
                      {ing.concepto && <p className="text-xs text-oriental-gray mt-0.5">{ing.concepto}</p>}
                    </div>
                    <Link href={`/ingresos/${ing.id}`} className="ml-3 text-xs font-mono font-bold text-oriental-red hover:underline flex-shrink-0">
                      {ing.numero_recibo}
                    </Link>
                  </div>
                ))}

                {/* Total pagado */}
                <div className="flex justify-between items-center pt-3 border-t border-gray-200 mt-2">
                  <span className="text-sm font-semibold text-oriental-gray">Total registrado</span>
                  <span className="font-extrabold text-green-700 text-lg">{formatCurrency(pagado, 'USD')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
