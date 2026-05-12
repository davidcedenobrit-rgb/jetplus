import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Ingresos del mes
  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]

  const [{ data: ingresosMes }, { data: egresosMes }, { data: pendientesAprobacion }, { data: pendientesEgresos }] =
    await Promise.all([
      supabase.from('ingresos').select('monto').gte('fecha_pago', inicioMes).eq('estado', 'aprobado'),
      supabase.from('egresos').select('monto').gte('fecha_egreso', inicioMes).eq('estado', 'aprobado'),
      supabase.from('ingresos').select('id').eq('estado', 'pendiente_aprobacion'),
      supabase.from('egresos').select('id').eq('estado', 'pendiente_aprobacion'),
    ])

  const totalIngresos = ingresosMes?.reduce((s, i) => s + Number(i.monto), 0) ?? 0
  const totalEgresos = egresosMes?.reduce((s, e) => s + Number(e.monto), 0) ?? 0
  const balance = totalIngresos - totalEgresos

  const stats = [
    { label: 'Ingresos del mes', value: formatCurrency(totalIngresos), color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-100' },
    { label: 'Egresos del mes', value: formatCurrency(totalEgresos), color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-100' },
    { label: 'Balance neto', value: formatCurrency(balance), color: balance >= 0 ? 'text-blue-700' : 'text-red-700', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'Ingresos por aprobar', value: String(pendientesAprobacion?.length ?? 0), color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-100' },
    { label: 'Egresos por aprobar', value: String(pendientesEgresos?.length ?? 0), color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-100' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          {hoy.toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {stats.map(stat => (
          <div key={stat.label} className={`card p-5 border ${stat.border} ${stat.bg}`}>
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickCard title="Registrar ingreso" desc="Nuevo pago de cliente" href="/ingresos/nuevo" color="bg-brand-600" />
        <QuickCard title="Registrar egreso" desc="Nuevo gasto operativo" href="/egresos/nuevo" color="bg-navy-600" />
        <QuickCard title="Ver bandeja" desc="Aprobar pendientes" href="/ingresos?estado=pendiente_aprobacion" color="bg-gold-600" />
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
