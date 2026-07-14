'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIAS_EGRESO_LABEL } from '@/lib/utils'
import { ArrowLeft, TrendingUp, TrendingDown, Scale, Building2, Printer } from 'lucide-react'
import Link from 'next/link'

type MovIngreso = { monto: number; moneda: string; tasa_cambio: number | null; monto_bs: number | null; fecha_pago: string; estado: string }
type MovEgreso = {
  monto: number; moneda: string; tasa_cambio: number | null; monto_bs: number | null
  fecha_egreso: string; estado: string; categoria: string
  centro_costo_id: string | null; area_responsable: string | null; tipo_movimiento: string | null
}
type CentroCosto = { id: string; nombre: string }

const ESTADOS_EXCLUIDOS = new Set(['anulado', 'rechazado'])

function usd(monto: number, moneda: string, tasa: number | null): number {
  if (moneda === 'VES') return tasa && tasa > 0 ? monto / tasa : 0
  return monto
}

function fmt(n: number): string {
  return n.toLocaleString('es-VE', {
    minimumFractionDigits: Math.round(Math.abs(n) * 100) % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

function fmtMes(mes: string): string {
  const [y, m] = mes.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-VE', { month: 'short', year: 'numeric' })
}

// Trae todas las filas respetando el límite de 1000 de Supabase
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const PAGE = 1000
  let out: T[] = []
  for (let i = 0; ; i++) {
    const { data } = await build(i * PAGE, i * PAGE + PAGE - 1)
    if (!data || data.length === 0) break
    out = out.concat(data)
    if (data.length < PAGE) break
  }
  return out
}

export default function BalancePage() {
  const supabase = createClient()

  const hoy = new Date().toISOString().split('T')[0]
  const primerDiaAnio = hoy.slice(0, 4) + '-01-01'

  const [fechaDesde, setFechaDesde] = useState(primerDiaAnio)
  const [fechaHasta, setFechaHasta] = useState(hoy)
  const [centros, setCentros] = useState<CentroCosto[]>([])
  const [ingresos, setIngresos] = useState<MovIngreso[]>([])
  const [egresos, setEgresos] = useState<MovEgreso[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('centros_costo').select('id, nombre').eq('activo', true).order('orden')
      .then(({ data }) => { if (data) setCentros(data) })
  }, [])

  const cargar = useCallback(async () => {
    setLoading(true)
    const [ing, egr] = await Promise.all([
      fetchAll<MovIngreso>((from, to) => supabase
        .from('ingresos')
        .select('monto, moneda, tasa_cambio, monto_bs, fecha_pago, estado')
        .gte('fecha_pago', fechaDesde).lte('fecha_pago', fechaHasta)
        .range(from, to)),
      fetchAll<MovEgreso>((from, to) => supabase
        .from('egresos')
        .select('monto, moneda, tasa_cambio, monto_bs, fecha_egreso, estado, categoria, centro_costo_id, area_responsable, tipo_movimiento')
        .gte('fecha_egreso', fechaDesde).lte('fecha_egreso', fechaHasta)
        .range(from, to)),
    ])
    setIngresos(ing.filter(i => !ESTADOS_EXCLUIDOS.has(i.estado)))
    setEgresos(egr.filter(e => !ESTADOS_EXCLUIDOS.has(e.estado)))
    setLoading(false)
  }, [fechaDesde, fechaHasta])

  useEffect(() => { cargar() }, [cargar])

  // ── Totales ────────────────────────────────────────────────────────────────
  const totalIngresos = ingresos.reduce((s, i) => s + usd(i.monto, i.moneda, i.tasa_cambio), 0)
  const totalEgresos = egresos.reduce((s, e) => s + usd(e.monto, e.moneda, e.tasa_cambio), 0)
  const totalGasto = egresos.filter(e => e.tipo_movimiento !== 'inversion').reduce((s, e) => s + usd(e.monto, e.moneda, e.tasa_cambio), 0)
  const totalInversion = egresos.filter(e => e.tipo_movimiento === 'inversion').reduce((s, e) => s + usd(e.monto, e.moneda, e.tasa_cambio), 0)
  const resultado = totalIngresos - totalEgresos

  const centroNombre = (e: MovEgreso): string => {
    if (e.centro_costo_id) return centros.find(c => c.id === e.centro_costo_id)?.nombre ?? e.centro_costo_id
    return e.area_responsable?.trim() || 'Sin centro de costo'
  }

  // ── Egresos por centro de costo ──────────────────────────────────────────
  const porCentro: Record<string, { total: number; gasto: number; inversion: number }> = {}
  for (const e of egresos) {
    const k = centroNombre(e)
    if (!porCentro[k]) porCentro[k] = { total: 0, gasto: 0, inversion: 0 }
    const m = usd(e.monto, e.moneda, e.tasa_cambio)
    porCentro[k].total += m
    if (e.tipo_movimiento === 'inversion') porCentro[k].inversion += m
    else porCentro[k].gasto += m
  }
  const centrosOrden = Object.entries(porCentro).sort((a, b) => b[1].total - a[1].total)

  // ── Por mes (ingresos vs egresos) ─────────────────────────────────────────
  const porMes: Record<string, { ing: number; egr: number }> = {}
  for (const i of ingresos) {
    const k = i.fecha_pago.slice(0, 7)
    if (!porMes[k]) porMes[k] = { ing: 0, egr: 0 }
    porMes[k].ing += usd(i.monto, i.moneda, i.tasa_cambio)
  }
  for (const e of egresos) {
    const k = e.fecha_egreso.slice(0, 7)
    if (!porMes[k]) porMes[k] = { ing: 0, egr: 0 }
    porMes[k].egr += usd(e.monto, e.moneda, e.tasa_cambio)
  }
  const mesesOrden = Object.entries(porMes).sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <div className="p-4 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-oriental-black">Balance</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Ingresos vs egresos — se alimenta solo de los movimientos registrados</p>
        </div>
        <button onClick={() => window.print()} disabled={loading} className="btn-secondary flex items-center gap-2 no-print">
          <Printer size={16} /> Imprimir
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-6 no-print">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Desde</label>
            <input type="date" className="input" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" className="input" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
          </div>
          <div className="col-span-2 flex items-end gap-2">
            <button
              onClick={() => { setFechaDesde(hoy.slice(0, 7) + '-01'); setFechaHasta(hoy) }}
              className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-oriental-gray hover:bg-gray-50"
            >Este mes</button>
            <button
              onClick={() => { setFechaDesde(hoy.slice(0, 4) + '-01-01'); setFechaHasta(hoy) }}
              className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-oriental-gray hover:bg-gray-50"
            >Este año</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-oriental-gray text-sm">Cargando balance...</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="card p-5">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <TrendingUp size={16} />
                <p className="text-xs uppercase tracking-wider font-semibold">Ingresos</p>
              </div>
              <p className="text-2xl font-bold text-oriental-black">${fmt(totalIngresos)}</p>
              <p className="text-[11px] text-oriental-gray mt-1">{ingresos.length} movimientos</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2 text-oriental-red mb-1">
                <TrendingDown size={16} />
                <p className="text-xs uppercase tracking-wider font-semibold">Egresos</p>
              </div>
              <p className="text-2xl font-bold text-oriental-black">${fmt(totalEgresos)}</p>
              <p className="text-[11px] text-oriental-gray mt-1">
                Gasto ${fmt(totalGasto)} · Inversión ${fmt(totalInversion)}
              </p>
            </div>
            <div className={`card p-5 ${resultado >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className={`flex items-center gap-2 mb-1 ${resultado >= 0 ? 'text-green-700' : 'text-oriental-red'}`}>
                <Scale size={16} />
                <p className="text-xs uppercase tracking-wider font-semibold">Resultado</p>
              </div>
              <p className={`text-2xl font-bold ${resultado >= 0 ? 'text-green-800' : 'text-oriental-red'}`}>
                {resultado < 0 ? '-' : ''}${fmt(Math.abs(resultado))}
              </p>
              <p className="text-[11px] text-oriental-gray mt-1">Ingresos − Egresos</p>
            </div>
          </div>

          {/* Egresos por centro de costo */}
          <div className="card overflow-hidden mb-6">
            <div className="px-4 py-3 bg-oriental-bg border-b border-gray-200 flex items-center gap-2">
              <Building2 size={15} className="text-oriental-gray" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-oriental-black">Egresos por centro de costo</h2>
            </div>
            {centrosOrden.length === 0 ? (
              <p className="px-4 py-6 text-sm text-oriental-gray text-center">Sin egresos en el período</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Centro de costo</th>
                      <th className="text-right px-4 py-2 font-medium text-oriental-gray text-xs">Gasto</th>
                      <th className="text-right px-4 py-2 font-medium text-oriental-gray text-xs">Inversión</th>
                      <th className="text-right px-4 py-2 font-medium text-oriental-gray text-xs">Total</th>
                      <th className="text-right px-4 py-2 font-medium text-oriental-gray text-xs">% del total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {centrosOrden.map(([nombre, v]) => (
                      <tr key={nombre} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-semibold text-oriental-black">{nombre}</td>
                        <td className="px-4 py-2.5 text-right text-oriental-gray">${fmt(v.gasto)}</td>
                        <td className="px-4 py-2.5 text-right text-oriental-gray">${fmt(v.inversion)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-oriental-black">${fmt(v.total)}</td>
                        <td className="px-4 py-2.5 text-right text-oriental-gray text-xs">
                          {totalEgresos > 0 ? Math.round((v.total / totalEgresos) * 100) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-oriental-black text-white">
                      <td className="px-4 py-2.5 font-bold text-sm">Total egresos</td>
                      <td className="px-4 py-2.5 text-right font-semibold">${fmt(totalGasto)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">${fmt(totalInversion)}</td>
                      <td className="px-4 py-2.5 text-right font-bold">${fmt(totalEgresos)}</td>
                      <td className="px-4 py-2.5 text-right">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Por mes */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 bg-oriental-bg border-b border-gray-200">
              <h2 className="text-xs font-bold uppercase tracking-wider text-oriental-black">Ingresos vs egresos por mes</h2>
            </div>
            {mesesOrden.length === 0 ? (
              <p className="px-4 py-6 text-sm text-oriental-gray text-center">Sin movimientos en el período</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Mes</th>
                      <th className="text-right px-4 py-2 font-medium text-oriental-gray text-xs">Ingresos</th>
                      <th className="text-right px-4 py-2 font-medium text-oriental-gray text-xs">Egresos</th>
                      <th className="text-right px-4 py-2 font-medium text-oriental-gray text-xs">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {mesesOrden.map(([mes, v]) => {
                      const r = v.ing - v.egr
                      return (
                        <tr key={mes} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-semibold text-oriental-black capitalize">{fmtMes(mes)}</td>
                          <td className="px-4 py-2.5 text-right text-green-700">${fmt(v.ing)}</td>
                          <td className="px-4 py-2.5 text-right text-oriental-red">${fmt(v.egr)}</td>
                          <td className={`px-4 py-2.5 text-right font-bold ${r >= 0 ? 'text-green-800' : 'text-oriental-red'}`}>
                            {r < 0 ? '-' : ''}${fmt(Math.abs(r))}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-[11px] text-oriental-gray mt-4">
            Los montos en bolívares se convierten a USD con la tasa registrada en cada movimiento. Se excluyen anulados y rechazados.
          </p>
        </>
      )}
    </div>
  )
}
