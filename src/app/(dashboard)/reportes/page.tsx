'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, CATEGORIAS_EGRESO_LABEL } from '@/lib/utils'
import { TrendingUp, TrendingDown, Wallet, BarChart2, Filter } from 'lucide-react'

export default function ReportesPage() {
  const supabase = createClient()
  const hoy = new Date()

  const [fechaDesde, setFechaDesde] = useState(`${hoy.getFullYear()}-01-01`)
  const [fechaHasta, setFechaHasta] = useState(hoy.toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)

  const [totalIngresos, setTotalIngresos] = useState(0)
  const [totalEgresos, setTotalEgresos] = useState(0)
  const [cntIngAprobados, setCntIngAprobados] = useState(0)
  const [cntEgrAprobados, setCntEgrAprobados] = useState(0)
  const [cntIngPendientes, setCntIngPendientes] = useState(0)
  const [cntEgrPendientes, setCntEgrPendientes] = useState(0)
  const [catMap, setCatMap] = useState<[string, number][]>([])
  const [mesesIngresos, setMesesIngresos] = useState<Record<string, number>>({})
  const [mesesEgresos, setMesesEgresos] = useState<Record<string, number>>({})

  const cargar = useCallback(async () => {
    setLoading(true)
    const [{ data: ingData }, { data: egrData }, { data: porCat }] = await Promise.all([
      supabase.from('ingresos').select('monto, fecha_pago, moneda, estado').gte('fecha_pago', fechaDesde).lte('fecha_pago', fechaHasta),
      supabase.from('egresos').select('monto, fecha_egreso, moneda, estado').gte('fecha_egreso', fechaDesde).lte('fecha_egreso', fechaHasta),
      supabase.from('egresos').select('categoria, monto').eq('estado', 'aprobado').gte('fecha_egreso', fechaDesde).lte('fecha_egreso', fechaHasta),
    ])

    const ingAprobados = ingData?.filter(i => i.estado === 'aprobado') ?? []
    const egrAprobados = egrData?.filter(e => e.estado === 'aprobado') ?? []

    setTotalIngresos(ingAprobados.reduce((s, i) => s + Number(i.monto), 0))
    setTotalEgresos(egrAprobados.reduce((s, e) => s + Number(e.monto), 0))
    setCntIngAprobados(ingAprobados.length)
    setCntEgrAprobados(egrAprobados.length)
    setCntIngPendientes(ingData?.filter(i => i.estado === 'pendiente_aprobacion').length ?? 0)
    setCntEgrPendientes(egrData?.filter(e => e.estado === 'pendiente_aprobacion').length ?? 0)

    const cats: Record<string, number> = {}
    porCat?.forEach(e => { cats[e.categoria] = (cats[e.categoria] ?? 0) + Number(e.monto) })
    setCatMap(Object.entries(cats).sort((a, b) => b[1] - a[1]))

    const mi: Record<string, number> = {}
    const me: Record<string, number> = {}
    ingAprobados.forEach(i => {
      const mes = new Date(i.fecha_pago).toLocaleDateString('es-VE', { month: 'short', year: '2-digit' })
      mi[mes] = (mi[mes] ?? 0) + Number(i.monto)
    })
    egrAprobados.forEach(e => {
      const mes = new Date(e.fecha_egreso).toLocaleDateString('es-VE', { month: 'short', year: '2-digit' })
      me[mes] = (me[mes] ?? 0) + Number(e.monto)
    })
    setMesesIngresos(mi)
    setMesesEgresos(me)
    setLoading(false)
  }, [fechaDesde, fechaHasta])

  useEffect(() => { cargar() }, [cargar])

  const balance = totalIngresos - totalEgresos

  // Presets
  function setPreset(tipo: 'hoy' | 'semana' | 'mes' | 'anio') {
    const h = new Date()
    if (tipo === 'hoy') { setFechaDesde(h.toISOString().split('T')[0]); setFechaHasta(h.toISOString().split('T')[0]) }
    else if (tipo === 'semana') { const d = new Date(h); d.setDate(h.getDate() - 7); setFechaDesde(d.toISOString().split('T')[0]); setFechaHasta(h.toISOString().split('T')[0]) }
    else if (tipo === 'mes') { const d = new Date(h.getFullYear(), h.getMonth(), 1); setFechaDesde(d.toISOString().split('T')[0]); setFechaHasta(h.toISOString().split('T')[0]) }
    else { setFechaDesde(`${h.getFullYear()}-01-01`); setFechaHasta(h.toISOString().split('T')[0]) }
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-oriental-black">Reportes</h1>
      </div>

      {/* Filtros de fecha */}
      <div className="card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-oriental-gray" />
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider">Rango de fechas</h2>
        </div>
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="label">Desde</label>
            <input type="date" className="input" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" className="input" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
          </div>
          <button onClick={cargar} className="btn-primary px-5 py-2.5">Aplicar</button>
          <div className="flex gap-2">
            {[
              { key: 'hoy' as const, label: 'Hoy' },
              { key: 'semana' as const, label: '7 días' },
              { key: 'mes' as const, label: 'Este mes' },
              { key: 'anio' as const, label: 'Este año' },
            ].map(p => (
              <button key={p.key} onClick={() => setPreset(p.key)}
                className="px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-oriental-gray hover:border-gray-400 hover:bg-gray-50 transition-colors">
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-oriental-gray">Cargando datos...</div>
      ) : (
        <>
          {/* Balance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="card p-6 border-l-4 border-green-500">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-green-600" />
                <p className="text-sm text-oriental-gray">Total ingresos</p>
              </div>
              <p className="text-3xl font-bold text-green-700">{formatCurrency(totalIngresos)}</p>
            </div>
            <div className="card p-6 border-l-4 border-oriental-red">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={16} className="text-oriental-red" />
                <p className="text-sm text-oriental-gray">Total egresos</p>
              </div>
              <p className="text-3xl font-bold text-oriental-red">{formatCurrency(totalEgresos)}</p>
            </div>
            <div className="card p-6 border-l-4 border-oriental-black">
              <div className="flex items-center gap-2 mb-2">
                <Wallet size={16} className="text-oriental-black" />
                <p className="text-sm text-oriental-gray">Balance neto</p>
              </div>
              <p className={`text-3xl font-bold ${balance >= 0 ? 'text-oriental-black' : 'text-oriental-red'}`}>
                {formatCurrency(balance)}
              </p>
            </div>
          </div>

          {/* Indicadores */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-oriental-black">{cntIngAprobados}</p>
              <p className="text-xs text-oriental-gray">Ingresos aprobados</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-oriental-black">{cntEgrAprobados}</p>
              <p className="text-xs text-oriental-gray">Egresos aprobados</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{cntIngPendientes}</p>
              <p className="text-xs text-oriental-gray">Ingresos pendientes</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{cntEgrPendientes}</p>
              <p className="text-xs text-oriental-gray">Egresos pendientes</p>
            </div>
          </div>

          {/* Egresos por categoría */}
          <div className="card p-6 mb-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart2 size={18} className="text-oriental-gray" />
              <h2 className="font-bold text-oriental-black">Egresos aprobados por categoría</h2>
            </div>
            <div className="space-y-3">
              {catMap.map(([cat, total]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-sm text-oriental-gray w-52 truncate">{CATEGORIAS_EGRESO_LABEL[cat] ?? cat}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                    <div className="bg-oriental-red h-2.5 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (total / (catMap[0]?.[1] || 1)) * 100)}%` }} />
                  </div>
                  <span className="text-sm font-bold text-oriental-black w-32 text-right">{formatCurrency(total)}</span>
                </div>
              ))}
              {catMap.length === 0 && (
                <p className="text-oriental-gray text-sm text-center py-4">Sin egresos aprobados en este período</p>
              )}
            </div>
          </div>

          {/* Ingresos por mes */}
          {Object.keys(mesesIngresos).length > 0 && (
            <div className="card p-6">
              <h2 className="font-bold text-oriental-black mb-4">Ingresos aprobados por mes</h2>
              <div className="space-y-3">
                {Object.entries(mesesIngresos).map(([mes, total]) => (
                  <div key={mes} className="flex items-center gap-3">
                    <span className="text-sm text-oriental-gray w-24">{mes}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                      <div className="bg-green-500 h-2.5 rounded-full"
                        style={{ width: `${Math.min(100, (total / Math.max(...Object.values(mesesIngresos))) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-bold text-green-700 w-32 text-right">{formatCurrency(total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
