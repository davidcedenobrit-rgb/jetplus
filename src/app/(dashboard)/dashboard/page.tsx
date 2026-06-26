import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, Wallet, Clock, AlertCircle, Store, Car, Lock, Wrench, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]
  const hoyStr = hoy.toISOString().split('T')[0]

  const [
    { data: ingresosMes },
    { data: egresosMes },
    { data: pendientesAprobacion },
    { data: pendientesEgresos },
    { data: showroomTodos },
  ] = await Promise.all([
    supabase.from('ingresos').select('monto, moneda, tasa_cambio').gte('fecha_pago', inicioMes).eq('estado', 'aprobado'),
    supabase.from('egresos').select('monto, moneda, tasa_cambio').gte('fecha_egreso', inicioMes).eq('estado', 'aprobado'),
    supabase.from('ingresos').select('id').eq('estado', 'pendiente_aprobacion'),
    supabase.from('egresos').select('id').eq('estado', 'pendiente_aprobacion'),
    supabase.from('vehiculos_showroom').select('estado, reserva_vence, marca, modelo, placa').neq('estado', 'vendido'),
  ])

  const toUSD = (m: any): number => {
    const monto = Number(m.monto ?? 0)
    if (m.moneda === 'VES') {
      const tasa = Number(m.tasa_cambio ?? 0)
      return tasa > 0 ? monto / tasa : 0
    }
    return monto
  }
  const totalIngresos = ingresosMes?.reduce((s, i) => s + toUSD(i), 0) ?? 0
  const totalEgresos  = egresosMes?.reduce((s, e) => s + toUSD(e), 0) ?? 0
  const balance       = totalIngresos - totalEgresos

  // Showroom stats
  const swDisponibles = showroomTodos?.filter(v => v.estado === 'en_agencia') ?? []
  const swReservados  = showroomTodos?.filter(v => v.estado === 'reservado') ?? []
  const swTaller      = showroomTodos?.filter(v => ['llegada', 'por_enviar_pdi', 'en_taller'].includes(v.estado)) ?? []
  const swVencidasHoy = swReservados.filter(v => v.reserva_vence && v.reserva_vence < hoyStr)

  const stats = [
    { label: 'Ingresos del mes',    value: formatCurrency(totalIngresos), icon: TrendingUp,  color: 'text-green-600',        iconBg: 'bg-green-50' },
    { label: 'Egresos del mes',     value: formatCurrency(totalEgresos),  icon: TrendingDown, color: 'text-oriental-red',     iconBg: 'bg-red-50' },
    { label: 'Balance neto',        value: formatCurrency(balance),       icon: Wallet,       color: balance >= 0 ? 'text-oriental-black' : 'text-oriental-red', iconBg: 'bg-gray-100' },
    { label: 'Ingresos por aprobar',value: String(pendientesAprobacion?.length ?? 0), icon: Clock,        color: 'text-yellow-600', iconBg: 'bg-yellow-50' },
    { label: 'Egresos por aprobar', value: String(pendientesEgresos?.length ?? 0),    icon: AlertCircle,  color: 'text-orange-600', iconBg: 'bg-orange-50' },
  ]

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-oriental-black">Dashboard</h1>
        <p className="text-oriental-gray text-sm mt-1">
          {hoy.toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats financieras */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {stats.map(stat => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 ${stat.iconBg} rounded-lg flex items-center justify-center`}>
                <stat.icon size={16} className={stat.color} />
              </div>
            </div>
            <p className="text-xs text-oriental-gray mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Showroom summary */}
      {(showroomTodos?.length ?? 0) > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider flex items-center gap-2">
              <Store size={15} className="text-oriental-red" />
              Inventario Showroom · Vehimotors
            </h2>
            <Link href="/showroom" className="text-xs text-oriental-red font-semibold hover:underline">
              Ver todos →
            </Link>
          </div>

          {/* Alerta reservas vencidas */}
          {swVencidasHoy.length > 0 && (
            <div className="mb-3 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-700">
                  {swVencidasHoy.length} reserva{swVencidasHoy.length > 1 ? 's' : ''} vencida{swVencidasHoy.length > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  {swVencidasHoy.map(v => `${v.marca} ${v.modelo}${v.placa ? ` (${v.placa})` : ''}`).join(' · ')}
                  {' '}— Se liberarán automáticamente esta noche
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Disponibles */}
            <Link href="/showroom?tab=en_agencia" className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
                  <CheckCircle2 size={18} className="text-green-600" />
                </div>
                <p className="text-xs text-oriental-gray font-medium">Disponibles</p>
              </div>
              <p className="text-3xl font-black text-green-700">{swDisponibles.length}</p>
              {swDisponibles.length > 0 && (
                <p className="text-[11px] text-oriental-gray mt-1 truncate">
                  {swDisponibles.slice(0, 2).map(v => v.modelo).join(' · ')}
                  {swDisponibles.length > 2 && ` +${swDisponibles.length - 2}`}
                </p>
              )}
            </Link>

            {/* Reservados */}
            <Link href="/showroom?tab=reservado" className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center">
                  <Lock size={18} className="text-purple-600" />
                </div>
                <p className="text-xs text-oriental-gray font-medium">Reservados</p>
              </div>
              <p className="text-3xl font-black text-purple-700">{swReservados.length}</p>
              {swVencidasHoy.length > 0 && (
                <p className="text-[11px] text-red-500 font-semibold mt-1">
                  ⚠ {swVencidasHoy.length} vencida{swVencidasHoy.length > 1 ? 's' : ''}
                </p>
              )}
            </Link>

            {/* En proceso */}
            <Link href="/showroom?tab=en_taller" className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center">
                  <Wrench size={18} className="text-orange-500" />
                </div>
                <p className="text-xs text-oriental-gray font-medium">En proceso / Taller</p>
              </div>
              <p className="text-3xl font-black text-orange-600">{swTaller.length}</p>
              {swTaller.length > 0 && (
                <p className="text-[11px] text-oriental-gray mt-1 truncate">
                  {swTaller.slice(0, 2).map(v => v.modelo).join(' · ')}
                  {swTaller.length > 2 && ` +${swTaller.length - 2}`}
                </p>
              )}
            </Link>
          </div>
        </div>
      )}

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickCard title="Registrar ingreso" desc="Nuevo pago de cliente"   href="/ingresos/nuevo"                       color="bg-oriental-red" />
        <QuickCard title="Registrar egreso"  desc="Nuevo gasto operativo"   href="/egresos/nuevo"                        color="bg-oriental-black" />
        <QuickCard title="Ver bandeja"       desc="Aprobar pendientes"      href="/ingresos?estado=pendiente_aprobacion" color="bg-gray-700" />
      </div>
    </div>
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
