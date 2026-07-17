'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Coins, TrendingUp, TrendingDown, FileDown } from 'lucide-react'
import Link from 'next/link'

type Mov = { monto: number; moneda: string; tasa_cambio: number | null; fecha: string }

function usd(m: number, moneda: string, t: number | null): number { return moneda === 'VES' ? (t && t > 0 ? m / t : 0) : m }
function fmt(n: number): string { return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function nombreMes(k: string) { const [y, m] = k.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('es-VE', { month: 'long', year: 'numeric' }) }
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const PAGE = 1000; let out: T[] = []
  for (let i = 0; ; i++) { const { data } = await build(i * PAGE, i * PAGE + PAGE - 1); if (!data || data.length === 0) break; out = out.concat(data); if (data.length < PAGE) break }
  return out
}

export default function FlujoCajaClient() {
  const supabase = createClient()
  const hoy = new Date().toISOString().split('T')[0]
  const inicioAnio = hoy.slice(0, 4) + '-01-01'
  const [desde, setDesde] = useState(inicioAnio)
  const [hasta, setHasta] = useState(hoy)
  const [entradas, setEntradas] = useState<Mov[]>([])
  const [salidas, setSalidas] = useState<Mov[]>([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    const [ing, egr] = await Promise.all([
      fetchAll<Record<string, unknown>>((f, t) => supabase.from('ingresos')
        .select('monto, moneda, tasa_cambio, fecha_pago').neq('estado', 'anulado').neq('estado', 'rechazado')
        .gte('fecha_pago', desde).lte('fecha_pago', hasta).range(f, t)),
      fetchAll<Record<string, unknown>>((f, t) => supabase.from('egresos')
        .select('monto, moneda, tasa_cambio, fecha_egreso').neq('estado', 'anulado').neq('estado', 'rechazado')
        .gte('fecha_egreso', desde).lte('fecha_egreso', hasta).range(f, t)),
    ])
    setEntradas(ing.map(r => ({ monto: Number(r.monto ?? 0), moneda: String(r.moneda ?? 'USD'), tasa_cambio: r.tasa_cambio != null ? Number(r.tasa_cambio) : null, fecha: String(r.fecha_pago ?? '') })))
    setSalidas(egr.map(r => ({ monto: Number(r.monto ?? 0), moneda: String(r.moneda ?? 'USD'), tasa_cambio: r.tasa_cambio != null ? Number(r.tasa_cambio) : null, fecha: String(r.fecha_egreso ?? '') })))
    setLoading(false)
  }, [desde, hasta])

  useEffect(() => { cargar() }, [cargar])

  const data = useMemo(() => {
    const meses = new Set<string>()
    const entMes: Record<string, number> = {}
    const salMes: Record<string, number> = {}
    for (const m of entradas) { const k = m.fecha.slice(0, 7); if (!k) continue; meses.add(k); entMes[k] = (entMes[k] ?? 0) + usd(m.monto, m.moneda, m.tasa_cambio) }
    for (const m of salidas) { const k = m.fecha.slice(0, 7); if (!k) continue; meses.add(k); salMes[k] = (salMes[k] ?? 0) + usd(m.monto, m.moneda, m.tasa_cambio) }
    const orden = Array.from(meses).sort()
    let acum = 0
    const filas = orden.map(k => {
      const ent = entMes[k] ?? 0, sal = salMes[k] ?? 0, neto = ent - sal
      acum += neto
      return { mes: k, ent, sal, neto, acum }
    })
    const totEnt = filas.reduce((s, f) => s + f.ent, 0)
    const totSal = filas.reduce((s, f) => s + f.sal, 0)
    return { filas, totEnt, totSal, neto: totEnt - totSal }
  }, [entradas, salidas])

  function exportarCsv() {
    const rows = data.filas.map(f => [nombreMes(f.mes), f.ent.toFixed(2), f.sal.toFixed(2), f.neto.toFixed(2), f.acum.toFixed(2)])
    const csv = [['Mes', 'Entradas', 'Salidas', 'Flujo neto', 'Acumulado'], ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = `flujo-caja-${desde}_${hasta}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"><ArrowLeft size={18} className="text-oriental-gray" /></Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center"><Coins size={20} className="text-oriental-red" /></div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Flujo de caja</h1>
            <p className="text-oriental-gray text-sm">Entradas y salidas reales de efectivo por mes (en USD)</p>
          </div>
        </div>
      </div>

      <div className="card p-4 mb-6 flex flex-wrap items-end gap-3">
        <div><label className="label">Desde</label><input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="input" /></div>
        <div><label className="label">Hasta</label><input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="input" /></div>
        <button onClick={exportarCsv} disabled={data.filas.length === 0} className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-oriental-gray hover:bg-gray-50 disabled:opacity-50"><FileDown size={15} /> CSV</button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-green-700 mb-0.5"><TrendingUp size={15} /><p className="text-[11px] uppercase tracking-wider font-semibold">Entradas</p></div>
          <p className="text-xl font-black text-oriental-black">${fmt(data.totEnt)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-oriental-red mb-0.5"><TrendingDown size={15} /><p className="text-[11px] uppercase tracking-wider font-semibold">Salidas</p></div>
          <p className="text-xl font-black text-oriental-black">${fmt(data.totSal)}</p>
        </div>
        <div className={`card p-4 ${data.neto >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-[11px] uppercase tracking-wider font-semibold text-oriental-gray">Flujo neto</p>
          <p className={`text-xl font-black ${data.neto >= 0 ? 'text-green-800' : 'text-oriental-red'}`}>{data.neto < 0 ? '−' : ''}${fmt(Math.abs(data.neto))}</p>
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
                  <th className="text-left px-4 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Mes</th>
                  <th className="text-right px-4 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Entradas</th>
                  <th className="text-right px-4 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Salidas</th>
                  <th className="text-right px-4 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Flujo neto</th>
                  <th className="text-right px-4 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Acumulado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.filas.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-oriental-gray">Sin movimientos en el período.</td></tr>
                ) : data.filas.map(f => (
                  <tr key={f.mes} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-semibold text-oriental-black capitalize">{nombreMes(f.mes)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-green-700">${fmt(f.ent)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-oriental-red">${fmt(f.sal)}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums font-bold ${f.neto >= 0 ? 'text-oriental-black' : 'text-oriental-red'}`}>{f.neto < 0 ? '−' : ''}${fmt(Math.abs(f.neto))}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${f.acum >= 0 ? 'text-oriental-gray' : 'text-oriental-red'}`}>{f.acum < 0 ? '−' : ''}${fmt(Math.abs(f.acum))}</td>
                  </tr>
                ))}
              </tbody>
              {data.filas.length > 0 && (
                <tfoot>
                  <tr className="bg-oriental-black text-white">
                    <td className="px-4 py-2.5 font-bold">Total</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold">${fmt(data.totEnt)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold">${fmt(data.totSal)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold">{data.neto < 0 ? '−' : ''}${fmt(Math.abs(data.neto))}</td>
                    <td className="px-4 py-2.5"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      <p className="text-[11px] text-oriental-gray mt-4">
        Flujo de caja = movimiento real de efectivo. Entradas = todos los ingresos cobrados (incluye custodia de terceros, porque es dinero que entró); Salidas = todos los egresos pagados. Es caja, no resultado: no descuenta IVA. VES a USD con la tasa de cada registro. Excluye anulados y rechazados.
      </p>
    </div>
  )
}
