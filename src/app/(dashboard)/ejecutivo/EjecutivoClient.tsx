'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, LayoutDashboard, TrendingUp, TrendingDown, Scale, Coins, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import Link from 'next/link'

type Ing = { monto: number; moneda: string; tasa_cambio: number | null; fecha_pago: string; estado: string; titular_fondos: string | null; iva_aplica: boolean | null; base_imponible: number | null; centro_costo_id: string | null }
type Egr = { monto: number; moneda: string; tasa_cambio: number | null; fecha_egreso: string; estado: string; tipo_movimiento: string | null; centro_costo_id: string | null; area_responsable: string | null; iva_aplica: boolean | null; base_imponible: number | null }
type Cuo = { monto: number; monto_pagado: number | null; estado: string }
type CentroCosto = { id: string; nombre: string }

const EXCL = new Set(['anulado', 'rechazado'])
const POR_COBRAR = new Set(['pendiente', 'vencida', 'abono_parcial'])

function usd(m: number, moneda: string, t: number | null): number { return moneda === 'VES' ? (t && t > 0 ? m / t : 0) : m }
function fmt(n: number): string { return n.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }
function fmt2(n: number): string { return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const PAGE = 1000; let out: T[] = []
  for (let i = 0; ; i++) { const { data } = await build(i * PAGE, i * PAGE + PAGE - 1); if (!data || data.length === 0) break; out = out.concat(data); if (data.length < PAGE) break }
  return out
}
function mesKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
function nombreMes(k: string) { const [y, m] = k.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('es-VE', { month: 'short', year: '2-digit' }) }

export default function EjecutivoClient() {
  const supabase = createClient()
  const [ingresos, setIngresos] = useState<Ing[]>([])
  const [egresos, setEgresos] = useState<Egr[]>([])
  const [cuotas, setCuotas] = useState<Cuo[]>([])
  const [centros, setCentros] = useState<CentroCosto[]>([])
  const [loading, setLoading] = useState(true)

  const desde6 = useMemo(() => { const d = new Date(); d.setMonth(d.getMonth() - 5); d.setDate(1); return d.toISOString().slice(0, 10) }, [])

  useEffect(() => {
    supabase.from('centros_costo').select('id, nombre').eq('activo', true).order('orden').then(({ data }) => setCentros((data as CentroCosto[]) ?? []))
  }, [])

  const cargar = useCallback(async () => {
    setLoading(true)
    const [ing, egr, cuo] = await Promise.all([
      fetchAll<Ing>((f, t) => supabase.from('ingresos').select('monto, moneda, tasa_cambio, fecha_pago, estado, titular_fondos, iva_aplica, base_imponible, centro_costo_id').gte('fecha_pago', desde6).range(f, t)),
      fetchAll<Egr>((f, t) => supabase.from('egresos').select('monto, moneda, tasa_cambio, fecha_egreso, estado, tipo_movimiento, centro_costo_id, area_responsable, iva_aplica, base_imponible').gte('fecha_egreso', desde6).range(f, t)),
      fetchAll<Cuo>((f, t) => supabase.from('cuotas').select('monto, monto_pagado, estado').range(f, t)),
    ])
    setIngresos(ing.filter(i => !EXCL.has(i.estado)))
    setEgresos(egr.filter(e => !EXCL.has(e.estado)))
    setCuotas(cuo.filter(c => POR_COBRAR.has(c.estado)))
    setLoading(false)
  }, [desde6])

  useEffect(() => { cargar() }, [cargar])

  const esPropio = (i: Ing) => (i.titular_fondos ?? 'propio') === 'propio'
  const netoIng = (i: Ing) => usd(i.iva_aplica && i.base_imponible ? Number(i.base_imponible) : i.monto, i.moneda, i.tasa_cambio)
  const netoEgr = (e: Egr) => usd(e.iva_aplica && e.base_imponible ? Number(e.base_imponible) : e.monto, e.moneda, e.tasa_cambio)
  const centroNombre = useCallback((id: string | null, area?: string | null) => id ? (centros.find(c => c.id === id)?.nombre ?? id) : (area?.trim() || 'Sin centro'), [centros])

  const d = useMemo(() => {
    const meses: string[] = []
    { const c = new Date(); c.setDate(1); for (let i = 5; i >= 0; i--) { const x = new Date(c); x.setMonth(c.getMonth() - i); meses.push(mesKey(x)) } }
    const cur = meses[meses.length - 1], prev = meses[meses.length - 2]

    const porMes: Record<string, { ing: number; egr: number }> = {}
    for (const k of meses) porMes[k] = { ing: 0, egr: 0 }
    for (const i of ingresos) { if (!esPropio(i)) continue; const k = i.fecha_pago?.slice(0, 7); if (porMes[k]) porMes[k].ing += netoIng(i) }
    for (const e of egresos) { if (e.tipo_movimiento === 'inversion') continue; const k = e.fecha_egreso?.slice(0, 7); if (porMes[k]) porMes[k].egr += netoEgr(e) }

    const ingCur = porMes[cur]?.ing ?? 0, egrCur = porMes[cur]?.egr ?? 0, resCur = ingCur - egrCur
    const ingPrev = porMes[prev]?.ing ?? 0, egrPrev = porMes[prev]?.egr ?? 0, resPrev = ingPrev - egrPrev
    const custodiaCur = ingresos.filter(i => !esPropio(i) && i.fecha_pago?.slice(0, 7) === cur).reduce((s, i) => s + usd(i.monto, i.moneda, i.tasa_cambio), 0)

    // Cartera (todas las cuotas por cobrar)
    let porCobrar = 0, vencido = 0
    for (const c of cuotas) { const saldo = Math.max(0, Number(c.monto) - Number(c.monto_pagado ?? 0)); porCobrar += saldo; if (c.estado === 'vencida') vencido += saldo }

    // Top centros de costo del mes actual (resultado)
    const cc: Record<string, { ing: number; egr: number }> = {}
    for (const i of ingresos) { if (!esPropio(i) || i.fecha_pago?.slice(0, 7) !== cur) continue; const k = centroNombre(i.centro_costo_id); (cc[k] ??= { ing: 0, egr: 0 }).ing += netoIng(i) }
    for (const e of egresos) { if (e.tipo_movimiento === 'inversion' || e.fecha_egreso?.slice(0, 7) !== cur) continue; const k = centroNombre(e.centro_costo_id, e.area_responsable); (cc[k] ??= { ing: 0, egr: 0 }).egr += netoEgr(e) }
    const centrosRows = Object.entries(cc).map(([n, v]) => ({ nombre: n, res: v.ing - v.egr, ing: v.ing, egr: v.egr })).sort((a, b) => b.res - a.res)

    const maxMes = Math.max(1, ...meses.map(k => Math.max(porMes[k].ing, porMes[k].egr)))
    return { meses, porMes, cur, ingCur, egrCur, resCur, ingPrev, egrPrev, resPrev, custodiaCur, porCobrar, vencido, centrosRows, maxMes }
  }, [ingresos, egresos, cuotas, centroNombre])

  function delta(cur: number, prev: number) {
    if (prev === 0) return null
    return Math.round(((cur - prev) / Math.abs(prev)) * 100)
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"><ArrowLeft size={18} className="text-oriental-gray" /></Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center"><LayoutDashboard size={20} className="text-oriental-red" /></div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Panel ejecutivo</h1>
            <p className="text-oriental-gray text-sm">Resumen financiero del mes · {nombreMes(d.cur)} · valores en USD</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-oriental-gray text-sm">Cargando…</div>
      ) : (
        <>
          {/* KPIs del mes */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Kpi label="Ingreso propio (mes)" value={`$${fmt(d.ingCur)}`} icon={<TrendingUp size={15} />} tone="pos" delta={delta(d.ingCur, d.ingPrev)} />
            <Kpi label="Egresos operativos" value={`$${fmt(d.egrCur)}`} icon={<TrendingDown size={15} />} tone="neg" delta={delta(d.egrCur, d.egrPrev)} invert />
            <Kpi label="Resultado del mes" value={`${d.resCur < 0 ? '−' : ''}$${fmt(Math.abs(d.resCur))}`} icon={<Scale size={15} />} tone={d.resCur >= 0 ? 'pos' : 'neg'} delta={delta(d.resCur, d.resPrev)} highlight />
            <Kpi label="En custodia (mes)" value={`$${fmt(d.custodiaCur)}`} icon={<Coins size={15} />} tone="warn" />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Kpi label="Por cobrar (cartera)" value={`$${fmt2(d.porCobrar)}`} icon={<Coins size={15} />} tone="neutral" />
            <Kpi label="Vencido por cobrar" value={`$${fmt2(d.vencido)}`} icon={<AlertTriangle size={15} />} tone="neg" highlight={d.vencido > 0} />
          </div>

          {/* Tendencia 6 meses */}
          <div className="card p-5 mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-oriental-black mb-4">Ingreso propio vs. egresos — últimos 6 meses</h2>
            <div className="flex items-end justify-between gap-3 h-40">
              {d.meses.map(k => {
                const v = d.porMes[k]
                return (
                  <div key={k} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex items-end justify-center gap-1 h-32">
                      <div className="w-1/2 bg-green-500 rounded-t" style={{ height: `${(v.ing / d.maxMes) * 100}%` }} title={`Ingreso: $${fmt(v.ing)}`} />
                      <div className="w-1/2 bg-oriental-red rounded-t" style={{ height: `${(v.egr / d.maxMes) * 100}%` }} title={`Egreso: $${fmt(v.egr)}`} />
                    </div>
                    <span className="text-[10px] text-oriental-gray capitalize">{nombreMes(k)}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-[11px] text-oriental-gray">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-500" /> Ingreso propio</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-oriental-red" /> Egresos</span>
            </div>
          </div>

          {/* Resultado por centro de costo (mes) */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 bg-oriental-bg border-b border-gray-200"><h2 className="text-xs font-bold uppercase tracking-wider text-oriental-black">Resultado por centro de costo — {nombreMes(d.cur)}</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100"><tr>
                  <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Centro</th>
                  <th className="text-right px-4 py-2 font-medium text-oriental-gray text-xs">Ingresos</th>
                  <th className="text-right px-4 py-2 font-medium text-oriental-gray text-xs">Egresos</th>
                  <th className="text-right px-4 py-2 font-medium text-oriental-gray text-xs">Resultado</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {d.centrosRows.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-oriental-gray">Sin movimientos este mes.</td></tr>
                  ) : d.centrosRows.map(r => (
                    <tr key={r.nombre}>
                      <td className="px-4 py-2 font-semibold text-oriental-black">{r.nombre}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-green-700">${fmt2(r.ing)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-oriental-red">${fmt2(r.egr)}</td>
                      <td className={`px-4 py-2 text-right tabular-nums font-bold ${r.res >= 0 ? 'text-oriental-black' : 'text-oriental-red'}`}>{r.res < 0 ? '−' : ''}${fmt2(Math.abs(r.res))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[11px] text-oriental-gray mt-4">Ingreso propio y egresos netos de IVA; la custodia de terceros y las inversiones no entran en el resultado. Δ vs. mes anterior. Cartera = cuotas por cobrar (todas). VES a USD con la tasa de cada registro.</p>
        </>
      )}
    </div>
  )
}

function Kpi({ label, value, icon, tone, delta, invert, highlight }: { label: string; value: string; icon: React.ReactNode; tone: 'pos' | 'neg' | 'warn' | 'neutral'; delta?: number | null; invert?: boolean; highlight?: boolean }) {
  const toneCls = tone === 'pos' ? 'text-green-700' : tone === 'neg' ? 'text-oriental-red' : tone === 'warn' ? 'text-amber-700' : 'text-oriental-gray'
  const dPos = delta != null && (invert ? delta < 0 : delta > 0)
  return (
    <div className={`card p-4 ${highlight ? 'border-oriental-red/30' : ''}`}>
      <div className={`flex items-center gap-1.5 mb-1 ${toneCls}`}>{icon}<p className="text-[11px] uppercase tracking-wider font-semibold">{label}</p></div>
      <p className="text-xl font-black text-oriental-black">{value}</p>
      {delta != null && (
        <p className={`text-[11px] mt-0.5 flex items-center gap-0.5 ${dPos ? 'text-green-700' : 'text-oriental-red'}`}>
          {delta >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(delta)}% vs. mes anterior
        </p>
      )}
    </div>
  )
}
