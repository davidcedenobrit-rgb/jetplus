import { createClient } from '@/lib/supabase/server'
import { formatCurrency, CATEGORIAS_EGRESO_LABEL } from '@/lib/utils'
import { TrendingUp, TrendingDown, Wallet, BarChart2 } from 'lucide-react'

export default async function ReportesPage() {
  const supabase = await createClient()

  const hoy = new Date()
  const inicioAnio = new Date(hoy.getFullYear(), 0, 1).toISOString().split('T')[0]

  const [{ data: ingresosAnio }, { data: egresosAnio }, { data: porCategoria }] = await Promise.all([
    supabase.from('ingresos').select('monto, fecha_pago, moneda, estado').gte('fecha_pago', inicioAnio),
    supabase.from('egresos').select('monto, fecha_egreso, moneda, estado').gte('fecha_egreso', inicioAnio),
    supabase.from('egresos').select('categoria, monto').eq('estado', 'aprobado'),
  ])

  const totalIngAnio = ingresosAnio?.filter(i => i.estado === 'aprobado').reduce((s, i) => s + Number(i.monto), 0) ?? 0
  const totalEgrAnio = egresosAnio?.filter(e => e.estado === 'aprobado').reduce((s, e) => s + Number(e.monto), 0) ?? 0
  const balance = totalIngAnio - totalEgrAnio

  const catMap: Record<string, number> = {}
  porCategoria?.forEach(e => {
    catMap[e.categoria] = (catMap[e.categoria] ?? 0) + Number(e.monto)
  })
  const catSorted = Object.entries(catMap).sort((a, b) => b[1] - a[1])

  // Ingresos por mes
  const mesesIngresos: Record<string, number> = {}
  const mesesEgresos: Record<string, number> = {}
  ingresosAnio?.filter(i => i.estado === 'aprobado').forEach(i => {
    const mes = new Date(i.fecha_pago).toLocaleDateString('es-VE', { month: 'short' })
    mesesIngresos[mes] = (mesesIngresos[mes] ?? 0) + Number(i.monto)
  })
  egresosAnio?.filter(e => e.estado === 'aprobado').forEach(e => {
    const mes = new Date(e.fecha_egreso).toLocaleDateString('es-VE', { month: 'short' })
    mesesEgresos[mes] = (mesesEgresos[mes] ?? 0) + Number(e.monto)
  })

  const pendientesIng = ingresosAnio?.filter(i => i.estado === 'pendiente_aprobacion').length ?? 0
  const pendientesEgr = egresosAnio?.filter(e => e.estado === 'pendiente_aprobacion').length ?? 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-oriental-black">Reportes</h1>
        <p className="text-oriental-gray text-sm mt-1">Año {hoy.getFullYear()}</p>
      </div>

      {/* Balance anual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card p-6 border-l-4 border-green-500">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-green-600" />
            <p className="text-sm text-oriental-gray">Total ingresos {hoy.getFullYear()}</p>
          </div>
          <p className="text-3xl font-bold text-green-700">{formatCurrency(totalIngAnio)}</p>
        </div>
        <div className="card p-6 border-l-4 border-oriental-red">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={16} className="text-oriental-red" />
            <p className="text-sm text-oriental-gray">Total egresos {hoy.getFullYear()}</p>
          </div>
          <p className="text-3xl font-bold text-oriental-red">{formatCurrency(totalEgrAnio)}</p>
        </div>
        <div className="card p-6 border-l-4 border-oriental-black">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={16} className="text-oriental-black" />
            <p className="text-sm text-oriental-gray">Balance neto {hoy.getFullYear()}</p>
          </div>
          <p className={`text-3xl font-bold ${balance >= 0 ? 'text-oriental-black' : 'text-oriental-red'}`}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      {/* Indicadores rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-oriental-black">{ingresosAnio?.filter(i => i.estado === 'aprobado').length ?? 0}</p>
          <p className="text-xs text-oriental-gray">Ingresos aprobados</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-oriental-black">{egresosAnio?.filter(e => e.estado === 'aprobado').length ?? 0}</p>
          <p className="text-xs text-oriental-gray">Egresos aprobados</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{pendientesIng}</p>
          <p className="text-xs text-oriental-gray">Ingresos pendientes</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{pendientesEgr}</p>
          <p className="text-xs text-oriental-gray">Egresos pendientes</p>
        </div>
      </div>

      {/* Egresos por categoría */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart2 size={18} className="text-oriental-gray" />
          <h2 className="font-bold text-oriental-black">Egresos aprobados por categoría</h2>
        </div>
        <div className="space-y-3">
          {catSorted.map(([cat, total]) => (
            <div key={cat} className="flex items-center gap-3">
              <span className="text-sm text-oriental-gray w-52 truncate">{CATEGORIAS_EGRESO_LABEL[cat] ?? cat}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-oriental-red h-2.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (total / (catSorted[0]?.[1] || 1)) * 100)}%` }}
                />
              </div>
              <span className="text-sm font-bold text-oriental-black w-32 text-right">{formatCurrency(total)}</span>
            </div>
          ))}
          {catSorted.length === 0 && (
            <p className="text-oriental-gray text-sm text-center py-4">Sin datos de egresos aprobados</p>
          )}
        </div>
      </div>
    </div>
  )
}
