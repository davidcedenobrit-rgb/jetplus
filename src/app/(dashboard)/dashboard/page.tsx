import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import { formatCurrency } from '@/lib/utils'
import {
  TrendingUp, TrendingDown, Wallet, Clock, AlertCircle, Store, Lock, Wrench, CheckCircle2,
  HandCoins, CalendarClock, Banknote, FileText, Bell, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

/* eslint-disable @typescript-eslint/no-explicit-any */

const CANAL_LABELS: Record<string, string> = {
  efectivo: 'Efectivo', personal_jose: 'Cta. José', personal_carla: 'Cta. Carla',
  personal_mary: 'Cta. Mary', personal_leysdem: 'Cta. Leysdem', zelle: 'Zelle', usdt: 'USDT', otro: 'Otro',
}
const ROL_LABELS: Record<string, string> = { jose: 'José Rojas', carla: 'Carla', mary: 'Mary', leysdem: 'Leysdem' }

export default async function DashboardPage() {
  const supabase = await createClient()

  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0]
  const hoyStr = hoy.toISOString().split('T')[0]
  const nombreMes = hoy.toLocaleDateString('es-VE', { month: 'long' })

  const CANALES_CUSTODIA = ['efectivo', 'personal_jose', 'personal_carla', 'personal_mary', 'personal_leysdem', 'zelle', 'usdt', 'otro']

  const [
    ingresosMes,
    egresosMes,
    pendientesAprobacion,
    pendientesEgresos,
    showroomTodos,
    enCustodia,
    custodiosData,
    cotizacionesMes,
    creditosActivos,
  ] = await Promise.all([
    fetchAllRows<any>((f, t) => supabase.from('ingresos').select('monto, moneda, tasa_cambio').gte('fecha_pago', inicioMes).eq('estado', 'aprobado').range(f, t)),
    fetchAllRows<any>((f, t) => supabase.from('egresos').select('monto, moneda, tasa_cambio').gte('fecha_egreso', inicioMes).eq('estado', 'aprobado').range(f, t)),
    fetchAllRows<any>((f, t) => supabase.from('ingresos').select('id').eq('estado', 'pendiente_aprobacion').range(f, t)),
    fetchAllRows<any>((f, t) => supabase.from('egresos').select('id').eq('estado', 'pendiente_aprobacion').range(f, t)),
    fetchAllRows<any>((f, t) => supabase.from('vehiculos_showroom').select('estado, reserva_vence, marca, modelo, placa').neq('estado', 'vendido').range(f, t)),
    fetchAllRows<any>((f, t) => supabase.from('ingresos').select('monto, moneda, tasa_cambio, canal_destino, custodio_id, custodio_externo')
      .in('canal_destino', CANALES_CUSTODIA).in('estado', ['aprobado', 'enviado_carla', 'entregado_carla'])
      .or('custodio_id.not.is.null,custodio_externo.not.is.null').range(f, t)),
    fetchAllRows<any>((f, t) => supabase.from('usuarios').select('id, nombre, rol').range(f, t)),
    fetchAllRows<any>((f, t) => supabase.from('cotizaciones').select('estado').gte('fecha', inicioMes).range(f, t)),
    fetchAllRows<any>((f, t) => supabase.from('creditos').select('id').neq('estado', 'pagado').range(f, t)),
  ])

  const toUSD = (m: any): number => {
    const monto = Number(m?.monto ?? 0)
    if (m?.moneda === 'VES') { const tasa = Number(m?.tasa_cambio ?? 0); return tasa > 0 ? monto / tasa : 0 }
    return monto
  }
  const totalIngresos = ingresosMes?.reduce((s, i) => s + toUSD(i), 0) ?? 0
  const totalEgresos = egresosMes?.reduce((s, e) => s + toUSD(e), 0) ?? 0
  const balance = totalIngresos - totalEgresos

  // ── Cobranza: cuotas no pagadas con vencimiento hasta fin de mes (mora + mes) ──
  const creditoIds = (creditosActivos ?? []).map(c => c.id)
  let moraMonto = 0, pendMesMonto = 0
  const moraCreditos = new Set<string>()
  if (creditoIds.length > 0) {
    const PAGE = 1000
    let from = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data: cuotas } = await supabase
        .from('cuotas')
        .select('credito_id, monto, monto_pagado, fecha_vencimiento')
        .neq('estado', 'pagado')
        .lte('fecha_vencimiento', finMes)
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1)
      if (!cuotas || cuotas.length === 0) break
      for (const q of cuotas as any[]) {
        const pend = Number(q.monto ?? 0) - Number(q.monto_pagado ?? 0)
        if (pend <= 0.01) continue
        const fv = q.fecha_vencimiento as string | null
        if (!fv) continue
        if (fv < hoyStr) { moraMonto += pend; moraCreditos.add(q.credito_id) }
        if (fv >= inicioMes && fv <= finMes) pendMesMonto += pend
      }
      if (cuotas.length < PAGE) break
      from += PAGE
    }
  }

  // ── Efectivo en piso por custodio ──
  const custodiosMap = new Map<string, { id: string; nombre: string; rol: string; total: number; canales: Map<string, number> }>()
  for (const u of custodiosData ?? []) custodiosMap.set(u.id, { id: u.id, nombre: u.nombre, rol: u.rol, total: 0, canales: new Map() })
  const externosMap = new Map<string, { nombre: string; total: number }>()
  for (const ing of enCustodia ?? []) {
    const usd = toUSD(ing)
    if (ing.custodio_id) {
      const c = custodiosMap.get(ing.custodio_id); if (!c) continue
      c.total += usd; c.canales.set(ing.canal_destino, (c.canales.get(ing.canal_destino) ?? 0) + usd)
    } else if (ing.custodio_externo) {
      const e = externosMap.get(ing.custodio_externo) ?? { nombre: ing.custodio_externo, total: 0 }
      e.total += usd; externosMap.set(ing.custodio_externo, e)
    }
  }
  const custodios = Array.from(custodiosMap.values()).filter(c => c.total > 0.01).sort((a, b) => b.total - a.total)
  const externos = Array.from(externosMap.values()).filter(e => e.total > 0.01).sort((a, b) => b.total - a.total)
  const totalEfectivoPiso = custodios.reduce((s, c) => s + c.total, 0) + externos.reduce((s, e) => s + e.total, 0)

  // ── Cotizaciones del mes ──
  const totalCotMes = cotizacionesMes?.length ?? 0
  const sinRespuestaMes = cotizacionesMes?.filter(c => c.estado === 'sin_respuesta').length ?? 0
  const aceptadasMes = cotizacionesMes?.filter(c => c.estado === 'aceptada').length ?? 0

  // ── Showroom ──
  const swDisponibles = showroomTodos?.filter(v => v.estado === 'en_agencia') ?? []
  const swReservados = showroomTodos?.filter(v => v.estado === 'reservado') ?? []
  const swTaller = showroomTodos?.filter(v => ['llegada', 'por_enviar_pdi', 'en_taller'].includes(v.estado)) ?? []
  const swVencidasHoy = swReservados.filter(v => v.reserva_vence && v.reserva_vence < hoyStr)

  // ── Alertas (solo las que tienen algo) ──
  const alertas = [
    { n: pendientesAprobacion?.length ?? 0, label: 'Ingresos por aprobar', href: '/ingresos?estado=pendiente_aprobacion' },
    { n: pendientesEgresos?.length ?? 0, label: 'Egresos por aprobar', href: '/egresos?estado=pendiente_aprobacion' },
    { n: moraCreditos.size, label: 'Créditos en mora', href: '/creditos?estado=mora' },
    { n: sinRespuestaMes, label: 'Cotizaciones sin respuesta', href: '/gestion-ventas?tab=historial' },
    { n: swVencidasHoy.length, label: 'Reservas vencidas', href: '/showroom?tab=reservado' },
  ].filter(a => a.n > 0)

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-oriental-black">Centro de Mando</h1>
        <p className="text-oriental-gray text-sm mt-1">
          {hoy.toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* ── Alertas ── */}
      {alertas.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={15} className="text-oriental-red" />
            <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider">Requiere atención</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {alertas.map(a => (
              <Link key={a.label} href={a.href}
                className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 hover:bg-red-100 transition-colors">
                <span className="text-2xl font-black text-oriental-red leading-none">{a.n}</span>
                <span className="text-[11px] font-semibold text-red-700 leading-tight">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Resumen financiero + cobranza ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label={`Cobrado en ${nombreMes}`} value={formatCurrency(totalIngresos)} icon={TrendingUp} color="text-green-600" bg="bg-green-50" href="/ingresos" />
        <StatCard label={`Egresos en ${nombreMes}`} value={formatCurrency(totalEgresos)} icon={TrendingDown} color="text-oriental-red" bg="bg-red-50" href="/egresos" />
        <StatCard label="Balance neto" value={formatCurrency(balance)} icon={Wallet} color={balance >= 0 ? 'text-oriental-black' : 'text-oriental-red'} bg="bg-gray-100" />
        <StatCard label={`Pendiente por cobrar · ${nombreMes}`} value={formatCurrency(pendMesMonto)} icon={CalendarClock} color="text-amber-600" bg="bg-amber-50" href="/creditos" />
        <StatCard label={`En mora (${moraCreditos.size} crédito${moraCreditos.size !== 1 ? 's' : ''})`} value={formatCurrency(moraMonto)} icon={AlertCircle} color="text-oriental-red" bg="bg-red-50" href="/creditos?estado=mora" />
      </div>

      {/* ── Efectivo en piso por custodio ── */}
      {custodios.length > 0 || externos.length > 0 ? (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider flex items-center gap-2">
              <Banknote size={15} className="text-oriental-red" /> Efectivo en la calle
            </h2>
            <Link href="/carla" className="text-xs text-oriental-red font-semibold hover:underline flex items-center gap-1">
              Ver panel <ArrowRight size={12} />
            </Link>
          </div>
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2 text-oriental-gray">
                <HandCoins size={15} />
                <span className="text-[11px] font-bold uppercase tracking-wide">Total sin depositar</span>
              </div>
              <span className="text-lg font-black text-oriental-black">{formatCurrency(totalEfectivoPiso)}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {custodios.map(c => (
                <Link key={c.id} href={`/carla/${c.id}`} className="rounded-xl border border-gray-200 bg-white p-3 hover:border-oriental-red hover:shadow-md transition-all">
                  <p className="text-[10px] font-bold text-oriental-gray uppercase tracking-wide mb-1">{ROL_LABELS[c.rol] ?? c.nombre}</p>
                  <p className="text-lg font-black text-oriental-black">{formatCurrency(c.total)}</p>
                  <div className="space-y-0.5 mt-2 pt-2 border-t border-gray-100">
                    {Array.from(c.canales.entries()).map(([canal, monto]) => (
                      <div key={canal} className="flex justify-between text-[10px]">
                        <span className="text-oriental-gray">{CANAL_LABELS[canal] ?? canal}</span>
                        <span className="font-semibold text-oriental-black">{formatCurrency(monto)}</span>
                      </div>
                    ))}
                  </div>
                </Link>
              ))}
              {externos.map(e => (
                <div key={`ext-${e.nombre}`} className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wide mb-1 truncate">{e.nombre}</p>
                  <p className="text-lg font-black text-oriental-black">{formatCurrency(e.total)}</p>
                  <p className="text-[9px] text-amber-600 mt-2">Custodio externo</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Cotizaciones del mes ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider flex items-center gap-2">
            <FileText size={15} className="text-oriental-red" /> Cotizaciones · {nombreMes}
          </h2>
          <Link href="/gestion-ventas?tab=historial" className="text-xs text-oriental-red font-semibold hover:underline flex items-center gap-1">
            Historial de clientes <ArrowRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Generadas este mes" value={String(totalCotMes)} icon={FileText} color="text-oriental-black" bg="bg-gray-100" />
          <StatCard label="Sin respuesta" value={String(sinRespuestaMes)} icon={Clock} color="text-amber-600" bg="bg-amber-50" href="/gestion-ventas?tab=historial" />
          <StatCard label="Aceptadas" value={String(aceptadasMes)} icon={CheckCircle2} color="text-green-600" bg="bg-green-50" />
        </div>
      </div>

      {/* ── Showroom ── */}
      {(showroomTodos?.length ?? 0) > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider flex items-center gap-2">
              <Store size={15} className="text-oriental-red" /> Inventario Showroom · Vehimotors
            </h2>
            <Link href="/showroom" className="text-xs text-oriental-red font-semibold hover:underline">Ver todos →</Link>
          </div>

          {swVencidasHoy.length > 0 && (
            <div className="mb-3 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-700">
                  {swVencidasHoy.length} reserva{swVencidasHoy.length > 1 ? 's' : ''} vencida{swVencidasHoy.length > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  {swVencidasHoy.map(v => `${v.marca} ${v.modelo}${v.placa ? ` (${v.placa})` : ''}`).join(' · ')} — Se liberarán automáticamente esta noche
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ShowroomCard href="/showroom?tab=en_agencia" icon={CheckCircle2} iconBg="bg-green-50" iconColor="text-green-600" label="Disponibles" value={swDisponibles.length} valueColor="text-green-700"
              sub={swDisponibles.length > 0 ? swDisponibles.slice(0, 2).map(v => v.modelo).join(' · ') + (swDisponibles.length > 2 ? ` +${swDisponibles.length - 2}` : '') : ''} />
            <ShowroomCard href="/showroom?tab=reservado" icon={Lock} iconBg="bg-purple-50" iconColor="text-purple-600" label="Reservados" value={swReservados.length} valueColor="text-purple-700"
              sub={swVencidasHoy.length > 0 ? `⚠ ${swVencidasHoy.length} vencida${swVencidasHoy.length > 1 ? 's' : ''}` : ''} subRed={swVencidasHoy.length > 0} />
            <ShowroomCard href="/showroom?tab=en_taller" icon={Wrench} iconBg="bg-orange-50" iconColor="text-orange-500" label="En proceso / Taller" value={swTaller.length} valueColor="text-orange-600"
              sub={swTaller.length > 0 ? swTaller.slice(0, 2).map(v => v.modelo).join(' · ') + (swTaller.length > 2 ? ` +${swTaller.length - 2}` : '') : ''} />
          </div>
        </div>
      )}

      {/* ── Accesos rápidos ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickCard title="Registrar ingreso" desc="Nuevo pago de cliente" href="/ingresos/nuevo" color="bg-oriental-red" />
        <QuickCard title="Registrar egreso" desc="Nuevo gasto operativo" href="/egresos/nuevo" color="bg-oriental-black" />
        <QuickCard title="Generar cotización" desc="Nueva cotización de venta" href="/gestion-ventas?tab=generar" color="bg-gray-700" />
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color, bg, href }: { label: string; value: string; icon: any; color: string; bg: string; href?: string }) {
  const inner = (
    <div className={`card p-5 h-full ${href ? 'hover:shadow-md transition-shadow' : ''}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
          <Icon size={16} className={color} />
        </div>
      </div>
      <p className="text-xs text-oriental-gray mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

function ShowroomCard({ href, icon: Icon, iconBg, iconColor, label, value, valueColor, sub, subRed }: { href: string; icon: any; iconBg: string; iconColor: string; label: string; value: number; valueColor: string; sub?: string; subRed?: boolean }) {
  return (
    <Link href={href} className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center`}>
          <Icon size={18} className={iconColor} />
        </div>
        <p className="text-xs text-oriental-gray font-medium">{label}</p>
      </div>
      <p className={`text-3xl font-black ${valueColor}`}>{value}</p>
      {sub && <p className={`text-[11px] mt-1 truncate ${subRed ? 'text-red-500 font-semibold' : 'text-oriental-gray'}`}>{sub}</p>}
    </Link>
  )
}

function QuickCard({ title, desc, href, color }: { title: string; desc: string; href: string; color: string }) {
  return (
    <a href={href} className={`${color} rounded-xl p-6 text-white hover:opacity-90 transition-opacity`}>
      <p className="font-semibold text-lg">{title}</p>
      <p className="text-sm opacity-75 mt-1">{desc}</p>
    </a>
  )
}
