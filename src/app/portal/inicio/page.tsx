import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Car, CreditCard, Wrench, Calendar, ChevronRight, DollarSign, AlertCircle, FileText } from 'lucide-react'
import BottomNav from '../BottomNav'
import PortalHeader from '../PortalHeader'

function fmtMoney(n: number) {
  return n.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(n)*100)%100===0?0:2, maximumFractionDigits: 2 })
}

function fmtFecha(s: string | null) {
  if (!s) return '—'
  try { return new Date(s + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return s }
}

export default async function InicioPortalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.rol !== 'cliente') redirect('/portal/login')

  const admin = await createAdminClient()

  const { data: cuenta } = await admin
    .from('cliente_cuentas')
    .select('cliente_id, clientes(id, nombre, cedula_rif, telefono, correo)')
    .eq('user_id', user.id)
    .single()

  if (!cuenta) redirect('/portal/login')

  const cliente = (cuenta as any).clientes
  const nombre = cliente?.nombre ?? 'Cliente'
  const primerNombre = nombre.split(' ')[0]

  // Vehículo principal (más reciente)
  const { data: vehiculos } = await admin
    .from('vehiculos')
    .select('id, marca, modelo, placa, color, anio, cliente_id')
    .eq('cliente_id', cuenta.cliente_id)
    .order('created_at', { ascending: false })
    .limit(3)

  // Próxima cuota (créditos activos)
  const hoyStr = new Date().toISOString().split('T')[0]
  const { data: creditos } = await admin
    .from('creditos')
    .select('id, plan_tipo, vehiculo_id, saldo')
    .eq('cliente_id', cuenta.cliente_id)
    .eq('estado', 'activo')

  const creditoIds = (creditos ?? []).map(c => c.id)

  let proximaCuota: { monto: number; fecha_vencimiento: string; numero_cuota: number } | null = null
  let totalSaldo = 0
  if (creditoIds.length > 0) {
    const { data: cuotas } = await admin
      .from('cuotas')
      .select('numero_cuota, monto, monto_pagado, fecha_vencimiento, estado, credito_id')
      .in('credito_id', creditoIds)
      .in('estado', ['pendiente', 'vencida', 'abono_parcial'])
      .order('fecha_vencimiento', { ascending: true })
      .limit(50)

    for (const c of cuotas ?? []) {
      const restante = Math.max(0, Number(c.monto) - Number(c.monto_pagado ?? 0))
      totalSaldo += restante
      if (!proximaCuota && restante > 0) {
        proximaCuota = {
          monto: restante,
          fecha_vencimiento: c.fecha_vencimiento,
          numero_cuota: c.numero_cuota,
        }
      }
    }
  }

  // Próximo servicio (basado en último servicio del vehículo principal)
  const vehiculoPrincipal = vehiculos?.[0]
  let ultimoServicio: { fecha_servicio: string; km: number } | null = null
  if (vehiculoPrincipal?.id) {
    const { data: servicios } = await admin
      .from('servicios_vehiculo')
      .select('fecha_servicio, km')
      .eq('vehiculo_id', vehiculoPrincipal.id)
      .order('fecha_servicio', { ascending: false })
      .limit(1)
    ultimoServicio = servicios?.[0] ?? null
  }

  // Sincroniza cotizaciones vencidas antes de contar pendientes
  await admin.rpc('marcar_cotizaciones_vencidas')

  // Cotizaciones pendientes de respuesta
  const { count: cotizacionesPendientes } = await admin
    .from('cotizaciones')
    .select('id', { count: 'exact', head: true })
    .eq('cliente_id', cuenta.cliente_id)
    .eq('estado', 'sin_respuesta')

  const cuotaVencida = proximaCuota && proximaCuota.fecha_vencimiento < hoyStr

  return (
    <div>
      <PortalHeader />

      {/* Saludo */}
      <div className="px-5 pt-5 pb-3">
        <p className="text-xs font-semibold text-oriental-gray uppercase tracking-widest">Hola,</p>
        <h1 className="text-2xl font-black text-oriental-black leading-tight">{primerNombre}</h1>
      </div>

      {/* Card vehículo principal */}
      {vehiculoPrincipal && (
        <div className="mx-5 mb-4 bg-gradient-to-br from-oriental-black to-gray-800 rounded-2xl p-5 text-white shadow-xl">
          <div className="flex items-center gap-1.5 mb-2">
            <Car size={13} className="text-red-300" />
            <p className="text-[10px] font-bold text-red-300 uppercase tracking-widest">Mi vehículo</p>
          </div>
          <p className="text-xl font-black">{vehiculoPrincipal.marca} {vehiculoPrincipal.modelo}</p>
          <p className="text-sm text-gray-300 mt-0.5">
            {vehiculoPrincipal.anio ?? ''} {vehiculoPrincipal.color ? `· ${vehiculoPrincipal.color}` : ''}
          </p>
          {vehiculoPrincipal.placa && (
            <div className="inline-block mt-3 px-3 py-1 bg-white/10 rounded-lg border border-white/20 font-mono text-sm font-bold">
              {vehiculoPrincipal.placa}
            </div>
          )}
        </div>
      )}

      {/* Cotizaciones pendientes de respuesta */}
      {cotizacionesPendientes && cotizacionesPendientes > 0 && (
        <div className="mx-5 mb-4">
          <Link
            href="/portal/cotizaciones"
            className="block bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <FileText size={14} className="text-blue-700" />
              <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Cotización pendiente</p>
            </div>
            <p className="text-lg font-black text-blue-900">
              {cotizacionesPendientes} cotización{cotizacionesPendientes !== 1 ? 'es' : ''} espera{cotizacionesPendientes === 1 ? '' : 'n'} su respuesta
            </p>
            <p className="text-xs text-blue-700 mt-0.5">Toque para ver el detalle y responder →</p>
          </Link>
        </div>
      )}

      {/* Próxima cuota */}
      {proximaCuota && (
        <div className="mx-5 mb-4">
          <div className={`rounded-2xl p-4 border-2 ${
            cuotaVencida
              ? 'bg-red-50 border-red-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {cuotaVencida ? (
                <>
                  <AlertCircle size={14} className="text-red-700" />
                  <p className="text-[10px] font-black text-red-800 uppercase tracking-widest">Cuota vencida</p>
                </>
              ) : (
                <>
                  <Calendar size={14} className="text-amber-700" />
                  <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Próxima cuota</p>
                </>
              )}
            </div>
            <p className={`text-2xl font-black ${cuotaVencida ? 'text-red-900' : 'text-amber-900'}`}>
              ${fmtMoney(proximaCuota.monto)}
            </p>
            <p className={`text-xs ${cuotaVencida ? 'text-red-700' : 'text-amber-700'} mt-0.5`}>
              Cuota N.° {proximaCuota.numero_cuota} · vence {fmtFecha(proximaCuota.fecha_vencimiento)}
            </p>
            <div className="flex gap-2 mt-3">
              <Link
                href="/portal/pagos/nuevo"
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold ${cuotaVencida ? 'bg-red-700 text-white hover:bg-red-800' : 'bg-amber-700 text-white hover:bg-amber-800'}`}
              >
                Reportar pago
              </Link>
              <Link
                href="/portal/credito"
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold border ${cuotaVencida ? 'border-red-300 text-red-800' : 'border-amber-300 text-amber-800'}`}
              >
                Detalle <ChevronRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Resumen rápido */}
      <div className="mx-5 grid grid-cols-2 gap-3 mb-4">
        <StatCard
          icon={CreditCard}
          label="Saldo pendiente"
          value={totalSaldo > 0 ? `$${fmtMoney(totalSaldo)}` : 'Al día'}
          colorClass={totalSaldo > 0 ? 'text-oriental-black' : 'text-green-700'}
          href="/portal/credito"
        />
        <StatCard
          icon={Wrench}
          label="Último servicio"
          value={ultimoServicio ? fmtFecha(ultimoServicio.fecha_servicio) : 'Sin registro'}
          colorClass="text-oriental-black"
          href={vehiculoPrincipal ? `/portal/vehiculos/${vehiculoPrincipal.id}` : '/portal/vehiculos'}
        />
      </div>

      {/* Otros vehículos */}
      {vehiculos && vehiculos.length > 1 && (
        <div className="mx-5 mb-5">
          <p className="text-[10px] font-black text-oriental-gray uppercase tracking-widest mb-2">Otros vehículos</p>
          <div className="space-y-2">
            {vehiculos.slice(1).map(v => (
              <Link
                key={v.id}
                href={`/portal/vehiculos/${v.id}`}
                className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:border-oriental-red transition-colors"
              >
                <div>
                  <p className="text-sm font-bold text-oriental-black">{v.marca} {v.modelo}</p>
                  {v.placa && <p className="text-[11px] font-mono text-oriental-gray">{v.placa}</p>}
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Contacto */}
      <div className="mx-5 mb-5 bg-gray-50 rounded-2xl p-4 text-center">
        <p className="text-xs text-oriental-gray mb-2">¿Necesita ayuda?</p>
        <a
          href="https://wa.me/584248705174?text=Hola%2C%20soy%20cliente%20de%20Jetplus"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700"
        >
          <DollarSign size={14} /> Contactar por WhatsApp
        </a>
      </div>

      <BottomNav />
    </div>
  )
}

function StatCard({ icon: Icon, label, value, colorClass, href }: { icon: any; label: string; value: string; colorClass: string; href: string }) {
  return (
    <Link href={href} className="block p-4 bg-white border border-gray-100 rounded-2xl hover:border-oriental-red transition-colors">
      <Icon size={16} className="text-oriental-red mb-2" />
      <p className="text-[10px] font-bold text-oriental-gray uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-black ${colorClass} mt-0.5 leading-tight`}>{value}</p>
    </Link>
  )
}
