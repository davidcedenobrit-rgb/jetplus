import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'

export default async function ReportesPage() {
  const supabase = await createClient()

  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]
  const inicioAnio = new Date(hoy.getFullYear(), 0, 1).toISOString().split('T')[0]

  const [{ data: ingresosAnio }, { data: egresosAnio }, { data: porCategoria }] = await Promise.all([
    supabase.from('ingresos').select('monto, fecha_pago, moneda, estado').gte('fecha_pago', inicioAnio),
    supabase.from('egresos').select('monto, fecha_egreso, moneda, estado').gte('fecha_egreso', inicioAnio),
    supabase.from('egresos').select('categoria, monto').eq('estado', 'aprobado'),
  ])

  const totalIngAnio = ingresosAnio?.filter(i => i.estado === 'aprobado').reduce((s, i) => s + Number(i.monto), 0) ?? 0
  const totalEgrAnio = egresosAnio?.filter(e => e.estado === 'aprobado').reduce((s, e) => s + Number(e.monto), 0) ?? 0

  // Egresos por categoría
  const catMap: Record<string, number> = {}
  porCategoria?.forEach(e => {
    catMap[e.categoria] = (catMap[e.categoria] ?? 0) + Number(e.monto)
  })
  const catSorted = Object.entries(catMap).sort((a, b) => b[1] - a[1])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-gray-500 text-sm mt-1">Año {hoy.getFullYear()}</p>
      </div>

      {/* Balance anual */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-6 border-l-4 border-green-500">
          <p className="text-sm text-gray-500 mb-1">Total ingresos {hoy.getFullYear()}</p>
          <p className="text-3xl font-bold text-green-700">{formatCurrency(totalIngAnio)}</p>
        </div>
        <div className="card p-6 border-l-4 border-red-400">
          <p className="text-sm text-gray-500 mb-1">Total egresos {hoy.getFullYear()}</p>
          <p className="text-3xl font-bold text-red-600">{formatCurrency(totalEgrAnio)}</p>
        </div>
        <div className="card p-6 border-l-4 border-blue-500">
          <p className="text-sm text-gray-500 mb-1">Balance neto {hoy.getFullYear()}</p>
          <p className={`text-3xl font-bold ${totalIngAnio - totalEgrAnio >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
            {formatCurrency(totalIngAnio - totalEgrAnio)}
          </p>
        </div>
      </div>

      {/* Egresos por categoría */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Egresos aprobados por categoría</h2>
        <div className="space-y-3">
          {catSorted.map(([cat, total]) => (
            <div key={cat} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-48 capitalize">{cat.replace(/_/g, ' ')}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div
                  className="bg-brand-600 h-2 rounded-full"
                  style={{ width: `${Math.min(100, (total / (catSorted[0]?.[1] || 1)) * 100)}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900 w-28 text-right">{formatCurrency(total)}</span>
            </div>
          ))}
          {catSorted.length === 0 && (
            <p className="text-gray-400 text-sm">Sin datos de egresos aprobados</p>
          )}
        </div>
      </div>
    </div>
  )
}
