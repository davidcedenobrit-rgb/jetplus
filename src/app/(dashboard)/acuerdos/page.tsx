import { createClient } from '@/lib/supabase/server'
import { formatDate, formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { Handshake, PlusCircle, CheckCircle2, Clock, AlertCircle, Car, User, CreditCard } from 'lucide-react'

export default async function AcuerdosPagoPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const rol = user?.app_metadata?.rol as string ?? ''

  const { data: acuerdos } = await supabase
    .from('acuerdos_inicial')
    .select(`
      id, estado, monto_acordado, monto_pagado, fecha_limite, observaciones, created_at,
      credito_id, vehiculo_id, cliente_id,
      clientes(id, nombre, cedula_rif, telefono),
      vehiculos(id, marca, modelo, placa, color, anio)
    `)
    .order('created_at', { ascending: false })

  const hoy = new Date().toISOString().split('T')[0]

  const pendientes  = (acuerdos ?? []).filter(a => a.estado === 'pendiente')
  const completados = (acuerdos ?? []).filter(a => a.estado === 'completado')
  const cancelados  = (acuerdos ?? []).filter(a => a.estado === 'cancelado')

  const totalAcordado  = pendientes.reduce((s, a) => s + Number(a.monto_acordado), 0)
  const totalPagado    = pendientes.reduce((s, a) => s + Number(a.monto_pagado ?? 0), 0)
  const totalPendiente = Math.max(0, totalAcordado - totalPagado)
  const vencidos = pendientes.filter(a => a.fecha_limite && a.fecha_limite < hoy).length

  function AcuerdoCard({ a }: { a: any }) {
    const cliente = a.clientes
    const vehiculo = a.vehiculos
    const acordado  = Number(a.monto_acordado)
    const pagado    = Number(a.monto_pagado ?? 0)
    const pendiente = Math.max(0, acordado - pagado)
    const pct       = acordado > 0 ? Math.min(100, (pagado / acordado) * 100) : 0
    const vencido   = a.fecha_limite && a.fecha_limite < hoy && a.estado === 'pendiente'
    const completado = a.estado === 'completado'
    const cancelado  = a.estado === 'cancelado'

    const borderColor = completado ? 'border-green-200' : vencido ? 'border-red-200' : cancelado ? 'border-gray-200' : 'border-blue-200'
    const bgColor     = completado ? 'bg-green-50/30' : vencido ? 'bg-red-50/30' : cancelado ? 'bg-gray-50' : 'bg-white'

    const pagoUrl = a.vehiculo_id
      ? `/ingresos/nuevo?acuerdo=${a.id}&cliente=${a.cliente_id}&vehiculo=${a.vehiculo_id}&placa=${vehiculo?.placa ?? ''}`
      : `/ingresos/nuevo?acuerdo=${a.id}&cliente=${a.cliente_id}`

    return (
      <div className={`card border-2 ${borderColor} ${bgColor} p-5 relative`}>
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/acuerdos/${a.id}`} className="absolute inset-0 rounded-xl" aria-label="Ver detalle" />
            {/* Estado badge */}
            {completado && (
              <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                <CheckCircle2 size={11} /> Completado
              </span>
            )}
            {!completado && !cancelado && !vencido && (
              <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                <Clock size={11} /> En curso
              </span>
            )}
            {vencido && (
              <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                <AlertCircle size={11} /> Vencido
              </span>
            )}
            {cancelado && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">
                Cancelado
              </span>
            )}
            <span className="text-[11px] text-oriental-gray">{formatDate(a.created_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            {a.vehiculo_id && (
              <Link href={`/vehiculos/${a.vehiculo_id}`}
                className="text-[11px] text-oriental-gray hover:text-oriental-black font-semibold flex items-center gap-1">
                <Car size={11} /> Ver vehículo
              </Link>
            )}
            {a.credito_id && (
              <Link href={`/creditos/${a.credito_id}`}
                className="text-[11px] text-oriental-gray hover:text-oriental-black font-semibold flex items-center gap-1">
                <CreditCard size={11} /> Ver crédito
              </Link>
            )}
          </div>
        </div>

        {/* Cliente + Vehículo */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <User size={14} className="text-oriental-gray flex-shrink-0" />
            {cliente ? (
              <Link href={`/clientes/${cliente.id}`} className="font-semibold text-oriental-black hover:underline">
                {cliente.nombre}
                <span className="text-xs text-oriental-gray font-normal ml-1">{cliente.cedula_rif}</span>
              </Link>
            ) : (
              <span className="text-oriental-gray text-xs">Sin cliente</span>
            )}
          </div>
          {vehiculo ? (
            <div className="flex items-center gap-2 text-sm">
              <Car size={14} className="text-oriental-gray flex-shrink-0" />
              <span className="text-oriental-black font-medium">
                {vehiculo.marca} {vehiculo.modelo}
                {vehiculo.placa && <span className="ml-1 font-mono text-xs text-oriental-gray">{vehiculo.placa}</span>}
              </span>
            </div>
          ) : (
            <span className="text-xs text-oriental-gray flex items-center gap-1"><Car size={11} /> Sin vehículo registrado</span>
          )}
        </div>

        {/* Montos + barra */}
        <div className="flex flex-wrap gap-6 mb-3 text-sm">
          <div>
            <p className="text-[10px] text-oriental-gray uppercase tracking-wide">Acordado</p>
            <p className="font-extrabold text-oriental-black text-lg">{formatCurrency(acordado, 'USD')}</p>
          </div>
          <div>
            <p className="text-[10px] text-oriental-gray uppercase tracking-wide">Pagado</p>
            <p className="font-bold text-green-700 text-lg">{formatCurrency(pagado, 'USD')}</p>
          </div>
          <div>
            <p className="text-[10px] text-oriental-gray uppercase tracking-wide">Pendiente</p>
            <p className={`font-extrabold text-lg ${pendiente > 0 ? 'text-oriental-red' : 'text-green-600'}`}>
              {formatCurrency(pendiente, 'USD')}
            </p>
          </div>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
          <div
            className={`h-2.5 rounded-full transition-all ${completado ? 'bg-green-500' : vencido ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] text-oriental-gray mb-1">{pct.toFixed(0)}% completado</p>

        {a.fecha_limite && (
          <p className={`text-xs mb-3 ${vencido ? 'text-red-600 font-semibold' : 'text-oriental-gray'}`}>
            Fecha límite: <strong>{formatDate(a.fecha_limite)}</strong>
            {vencido && ' — VENCIDO'}
          </p>
        )}
        {a.observaciones && (
          <p className="text-xs text-oriental-gray italic mb-3">"{a.observaciones}"</p>
        )}

        {/* Acciones */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
          {!completado && !cancelado && (
            <Link href={pagoUrl}
              className="flex items-center gap-1.5 px-4 py-2 bg-oriental-red hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors">
              <PlusCircle size={13} /> Registrar pago
            </Link>
          )}
          {completado && !a.credito_id && a.vehiculo_id && (
            <Link href={`/creditos/nuevo?vehiculo_id=${a.vehiculo_id}`}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors">
              <CreditCard size={13} /> Crear crédito
            </Link>
          )}
          {completado && a.credito_id && (
            <Link href={`/creditos/${a.credito_id}`}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors">
              <CreditCard size={13} /> Ver crédito
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-11 h-11 bg-oriental-red/10 rounded-xl flex items-center justify-center">
          <Handshake size={22} className="text-oriental-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Acuerdos de Pago</h1>
          <p className="text-oriental-gray text-sm">Seguimiento de iniciales pendientes antes de crear crédito</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-4">
          <p className="text-xs text-oriental-gray uppercase tracking-wide mb-1">En curso</p>
          <p className="text-2xl font-extrabold text-blue-700">{pendientes.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-oriental-gray uppercase tracking-wide mb-1">Monto pendiente</p>
          <p className="text-lg font-extrabold text-oriental-red">{formatCurrency(totalPendiente, 'USD')}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-oriental-gray uppercase tracking-wide mb-1">Vencidos</p>
          <p className={`text-2xl font-extrabold ${vencidos > 0 ? 'text-red-600' : 'text-gray-400'}`}>{vencidos}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-oriental-gray uppercase tracking-wide mb-1">Completados</p>
          <p className="text-2xl font-extrabold text-green-600">{completados.length}</p>
        </div>
      </div>

      {/* Acuerdos en curso */}
      {pendientes.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock size={14} className="text-blue-500" /> En curso ({pendientes.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pendientes.map(a => <AcuerdoCard key={a.id} a={a} />)}
          </div>
        </section>
      )}

      {/* Completados */}
      {completados.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-green-500" /> Completados ({completados.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {completados.map(a => <AcuerdoCard key={a.id} a={a} />)}
          </div>
        </section>
      )}

      {/* Cancelados */}
      {cancelados.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-oriental-gray uppercase tracking-wider mb-4">
            Cancelados ({cancelados.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {cancelados.map(a => <AcuerdoCard key={a.id} a={a} />)}
          </div>
        </section>
      )}

      {(acuerdos ?? []).length === 0 && (
        <div className="text-center py-20 text-oriental-gray">
          <Handshake size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Sin acuerdos de pago</p>
          <p className="text-sm mt-1">Los acuerdos se crean al registrar un vehículo con inicial acordada.</p>
        </div>
      )}
    </div>
  )
}
