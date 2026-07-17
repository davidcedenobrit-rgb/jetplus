'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, PieChart, TrendingUp, TrendingDown, FileDown } from 'lucide-react'
import Link from 'next/link'

type Mov = { monto: number; moneda: string; tasa: number | null; centro: string | null }
type CentroCosto = { id: string; nombre: string }

const SIN = 'Sin centro de costo'

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: unknown[] | null }>): Promise<T[]> {
  const PAGE = 1000
  let out: T[] = []
  for (let i = 0; ; i++) {
    const { data } = await build(i * PAGE, i * PAGE + PAGE - 1)
    if (!data || data.length === 0) break
    out = out.concat(data as T[])
    if (data.length < PAGE) break
  }
  return out
}

function usd(m: number, moneda: string, tasa: number | null): number {
  if (moneda === 'VES') return tasa && tasa > 0 ? m / tasa : 0
  return m // USD y USDT se toman a valor
}
function fmt(n: number): string {
  return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function CentrosCostoClient() {
  const supabase = createClient()
  const hoy = new Date().toISOString().split('T')[0]
  const primerDiaMes = hoy.slice(0, 7) + '-01'

  const [desde, setDesde] = useState(primerDiaMes)
  const [hasta, setHasta] = useState(hoy)
  const [centros, setCentros] = useState<CentroCosto[]>([])
  const [ingresos, setIngresos] = useState<Mov[]>([])
  const [egresos, setEgresos] = useState<Mov[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('centros_costo').select('id, nombre').eq('activo', true).order('orden')
      .then(({ data }) => setCentros((data as CentroCosto[]) ?? []))
  }, [])

  const cargar = useCallback(async () => {
    setLoading(true)
    const [ing, egr] = await Promise.all([
      fetchAll<Record<string, unknown>>((f, t) => supabase.from('ingresos')
        .select('monto, moneda, tasa_cambio, centro_costo_id')
        .neq('estado', 'anulado').neq('estado', 'rechazado')
        .gte('fecha_pago', desde).lte('fecha_pago', hasta).range(f, t)),
      fetchAll<Record<string, unknown>>((f, t) => supabase.from('egresos')
        .select('monto, moneda, tasa_cambio, centro_costo_id, area_responsable')
        .neq('estado', 'anulado').neq('estado', 'rechazado')
        .gte('fecha_egreso', desde).lte('fecha_egreso', hasta).range(f, t)),
    ])
    setIngresos(ing.map(r => ({ monto: Number(r.monto ?? 0), moneda: String(r.moneda ?? 'USD'), tasa: r.tasa_cambio != null ? Number(r.tasa_cambio) : null, centro: (r.centro_costo_id as string) ?? null })))
    setEgresos(egr.map(r => ({ monto: Number(r.monto ?? 0), moneda: String(r.moneda ?? 'USD'), tasa: r.tasa_cambio != null ? Number(r.tasa_cambio) : null, centro: (r.centro_costo_id as string) ?? (r.area_responsable as string) ?? null })))
    setLoading(false)
  }, [desde, hasta])

  useEffect(() => { cargar() }, [cargar])

  const nombreCentro = useCallback((id: string | null): string => {
    if (!id) return SIN
    return centros.find(c => c.id === id)?.nombre ?? id
  }, [centros])

  const filas = useMemo(() => {
    const m: Record<string, { ing: number; egr: number }> = {}
    for (const i of ingresos) {
      const k = nombreCentro(i.centro)
      ;(m[k] ??= { ing: 0, egr: 0 }).ing += usd(i.monto, i.moneda, i.tasa)
    }
    for (const e of egresos) {
      const k = nombreCentro(e.centro)
      ;(m[k] ??= { ing: 0, egr: 0 }).egr += usd(e.monto, e.moneda, e.tasa)
    }
    return Object.entries(m)
      .map(([centro, v]) => ({ centro, ...v, neto: v.ing - v.egr }))
      .sort((a, b) => b.neto - a.neto)
  }, [ingresos, egresos, nombreCentro])

  const tot = filas.reduce((s, f) => ({ ing: s.ing + f.ing, egr: s.egr + f.egr }), { ing: 0, egr: 0 })

  function exportarCsv() {
    const rows = filas.map(f => [f.centro, f.ing.toFixed(2), f.egr.toFixed(2), f.neto.toFixed(2)])
    const csv = [['Centro de costo', 'Ingresos USD', 'Egresos USD', 'Neto USD'], ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = `centros-costo-${desde}_${hasta}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"><ArrowLeft size={18} className="text-oriental-gray" /></Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center"><PieChart size={20} className="text-oriental-red" /></div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Centros de costo</h1>
            <p className="text-oriental-gray text-sm">Ingresos, egresos y neto por área (en USD)</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="input" />
        </div>
        <button onClick={exportarCsv} disabled={filas.length === 0} className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-oriental-gray hover:bg-gray-50 disabled:opacity-50">
          <FileDown size={15} /> CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-green-700 mb-1"><TrendingUp size={15} /><p className="text-[11px] uppercase tracking-wider font-semibold">Ingresos</p></div>
          <p className="text-xl font-black text-oriental-black">${fmt(tot.ing)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-oriental-red mb-1"><TrendingDown size={15} /><p className="text-[11px] uppercase tracking-wider font-semibold">Egresos</p></div>
          <p className="text-xl font-black text-oriental-black">${fmt(tot.egr)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-oriental-gray mb-1">Neto</p>
          <p className={`text-xl font-black ${tot.ing - tot.egr >= 0 ? 'text-green-700' : 'text-oriental-red'}`}>${fmt(tot.ing - tot.egr)}</p>
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-oriental-gray text-sm">Cargando…</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-oriental-bg border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Centro de costo</th>
                  <th className="text-right px-4 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Ingresos</th>
                  <th className="text-right px-4 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Egresos</th>
                  <th className="text-right px-4 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Neto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filas.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-oriental-gray">Sin movimientos en este período.</td></tr>
                ) : filas.map(f => (
                  <tr key={f.centro} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-semibold text-oriental-black">{f.centro}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-green-700">${fmt(f.ing)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-oriental-red">${fmt(f.egr)}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums font-bold ${f.neto >= 0 ? 'text-oriental-black' : 'text-oriental-red'}`}>${fmt(f.neto)}</td>
                  </tr>
                ))}
              </tbody>
              {filas.length > 0 && (
                <tfoot>
                  <tr className="bg-oriental-black text-white">
                    <td className="px-4 py-2.5 font-bold">Total</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold">${fmt(tot.ing)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold">${fmt(tot.egr)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold">${fmt(tot.ing - tot.egr)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      <p className="text-[11px] text-oriental-gray mt-4">
        Consolida ingresos y egresos por centro de costo en el período. Montos convertidos a USD (VES con la tasa de cada registro).
        Los registros sin centro de costo aparecen como &quot;{SIN}&quot;. Excluye anulados y rechazados.
      </p>
    </div>
  )
}
