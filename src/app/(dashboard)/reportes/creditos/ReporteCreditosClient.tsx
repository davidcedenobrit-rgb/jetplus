'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, CreditCard, FileDown } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const MODALIDAD: { key: string; label: string; planes: string[] }[] = [
  { key: 'todas', label: 'Todas', planes: [] },
  { key: 'la_oriental', label: 'Crédito La Oriental', planes: ['inicial_la_oriental', 'cuota_especial'] },
  { key: 'motor', label: 'Vehimotors', planes: ['financiamiento_vehimotors'] },
  { key: 'ac500', label: 'Asegúrate 500', planes: ['asegurate_500'] },
]
const PLAN_LABEL: Record<string, string> = {
  inicial_la_oriental: 'La Oriental', cuota_especial: 'Cuota especial',
  financiamiento_vehimotors: 'Vehimotors', asegurate_500: 'Asegúrate 500',
}
const FACTOR_MES: Record<string, number> = { mensual: 1, quincenal: 2, semanal: 4, catorcenal: 2 }

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: unknown[] | null }>): Promise<T[]> {
  const PAGE = 1000; let out: T[] = []
  for (let i = 0; ; i++) {
    const { data } = await build(i * PAGE, i * PAGE + PAGE - 1)
    if (!data || data.length === 0) break
    out = out.concat(data as T[]); if (data.length < PAGE) break
  }
  return out
}
const fmt = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
function csv(nombre: string, headers: string[], rows: (string | number)[][]) {
  const c = [headers, ...rows].map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob(['﻿' + c], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = `${nombre}.csv`; a.click(); URL.revokeObjectURL(url)
}

export default function ReporteCreditosClient() {
  const supabase = createClient()
  const now = new Date()
  const [anio, setAnio] = useState(now.getFullYear())
  const [mes, setMes] = useState(0) // 0 = todo el año
  const [modalidad, setModalidad] = useState('todas')
  const [loading, setLoading] = useState(true)
  const [creditos, setCreditos] = useState<any[]>([])
  const [enMora, setEnMora] = useState<Set<string>>(new Set())

  const cargar = useCallback(async () => {
    setLoading(true)
    const [cred, venc] = await Promise.all([
      fetchAll<any>((f, t) => supabase.from('creditos')
        .select('id, plan_tipo, monto_financiado, saldo, num_cuotas, frecuencia_pago, fecha_inicio, estado, clientes(nombre), placa').range(f, t)),
      fetchAll<any>((f, t) => supabase.from('cuotas').select('credito_id').eq('estado', 'vencida').range(f, t)),
    ])
    setCreditos(cred)
    setEnMora(new Set(venc.map(c => c.credito_id).filter(Boolean)))
    setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const planesSel = MODALIDAD.find(m => m.key === modalidad)?.planes ?? []
  const filtrados = useMemo(() => creditos.filter(c => {
    const f = String(c.fecha_inicio ?? '')
    const y = Number(f.slice(0, 4)); const m = Number(f.slice(5, 7))
    if (y !== anio) return false
    if (mes !== 0 && m !== mes) return false
    if (modalidad !== 'todas' && !planesSel.includes(c.plan_tipo)) return false
    return true
  }), [creditos, anio, mes, modalidad])

  const cuotaMensual = (c: any) => {
    const n = Number(c.num_cuotas || 0)
    if (n <= 0) return 0
    const factor = FACTOR_MES[String(c.frecuencia_pago || 'mensual')] ?? 1
    return (Number(c.monto_financiado || 0) / n) * factor
  }

  const datos = useMemo(() => {
    const activos = filtrados.filter(c => c.estado === 'activo')
    const alDia = activos.filter(c => !enMora.has(c.id)).length
    let financiado = 0, saldo = 0, cobroMensual = 0
    const porMod: Record<string, { n: number; mensual: number; saldo: number }> = {}
    for (const c of filtrados) {
      financiado += Number(c.monto_financiado || 0)
      if (c.estado === 'activo') { saldo += Number(c.saldo || 0); cobroMensual += cuotaMensual(c) }
      const mod = PLAN_LABEL[c.plan_tipo] ?? 'Otro'
      ;(porMod[mod] ??= { n: 0, mensual: 0, saldo: 0 })
      porMod[mod].n++
      if (c.estado === 'activo') { porMod[mod].mensual += cuotaMensual(c); porMod[mod].saldo += Number(c.saldo || 0) }
    }
    return {
      n: filtrados.length, activos: activos.length, financiado, saldo, cobroMensual,
      alDia, pctAlDia: activos.length ? Math.round((alDia / activos.length) * 100) : 100,
      porMod: Object.entries(porMod).sort((a, b) => b[1].mensual - a[1].mensual),
    }
  }, [filtrados, enMora])

  const anios = useMemo(() => {
    const s = new Set<number>(creditos.map(c => Number(String(c.fecha_inicio ?? '').slice(0, 4))).filter(Boolean))
    s.add(now.getFullYear()); return Array.from(s).sort((a, b) => b - a)
  }, [creditos])

  const periodo = mes === 0 ? `${anio}` : `${MESES[mes - 1]} ${anio}`

  return (
    <div className="p-4 lg:p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/reportes" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"><ArrowLeft size={18} className="text-oriental-gray" /></Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center"><CreditCard size={20} className="text-oriental-red" /></div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Reporte de créditos</h1>
            <p className="text-oriental-gray text-sm">Otorgados en {periodo} · cobro mensual proyectado (USD)</p>
          </div>
        </div>
      </div>

      <div className="card p-4 mb-6 flex flex-wrap items-end gap-3">
        <div><label className="label">Año (otorgamiento)</label>
          <select className="select" value={anio} onChange={e => setAnio(Number(e.target.value))}>{anios.map(y => <option key={y} value={y}>{y}</option>)}</select>
        </div>
        <div><label className="label">Mes</label>
          <select className="select" value={mes} onChange={e => setMes(Number(e.target.value))}><option value={0}>Todo el año</option>{MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select>
        </div>
        <div><label className="label">Modalidad</label>
          <select className="select" value={modalidad} onChange={e => setModalidad(e.target.value)}>{MODALIDAD.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}</select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="card p-4"><p className="text-[11px] uppercase tracking-wider font-semibold text-oriental-gray mb-1">Créditos otorgados</p><p className="text-2xl font-black text-oriental-black">{datos.n}</p><p className="text-[11px] text-oriental-gray">{datos.activos} activos</p></div>
        <div className="card p-4"><p className="text-[11px] uppercase tracking-wider font-semibold text-oriental-gray mb-1">Cobro mensual proyectado</p><p className="text-2xl font-black text-green-700">${fmt(datos.cobroMensual)}</p></div>
        <div className="card p-4"><p className="text-[11px] uppercase tracking-wider font-semibold text-oriental-gray mb-1">Saldo por cobrar</p><p className="text-2xl font-black text-oriental-black">${fmt(datos.saldo)}</p></div>
        <div className="card p-4"><p className="text-[11px] uppercase tracking-wider font-semibold text-oriental-gray mb-1">Al día</p><p className={`text-2xl font-black ${datos.pctAlDia >= 90 ? 'text-green-700' : datos.pctAlDia >= 70 ? 'text-amber-600' : 'text-oriental-red'}`}>{datos.pctAlDia}%</p><p className="text-[11px] text-oriental-gray">{datos.alDia} de {datos.activos} activos</p></div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-oriental-gray text-sm">Cargando…</div>
      ) : datos.n === 0 ? (
        <div className="card p-12 text-center text-oriental-gray text-sm">Sin créditos otorgados en {periodo}.</div>
      ) : (
        <div className="space-y-5">
          {/* Por modalidad */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-oriental-black text-sm">Por modalidad</h2>
              <button onClick={() => csv(`creditos_modalidad_${periodo}`, ['Modalidad', 'Créditos', 'Cobro mensual USD', 'Saldo USD'], datos.porMod.map(([k, x]) => [k, x.n, x.mensual.toFixed(2), x.saldo.toFixed(2)]))} className="text-xs font-semibold text-oriental-gray border border-gray-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 hover:bg-gray-50"><FileDown size={13} /> CSV</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>{['Modalidad', 'Créditos', 'Cobro mensual', 'Saldo'].map((h, i) => <th key={i} className={`px-3 py-2 text-[11px] font-semibold text-oriental-gray ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {datos.porMod.map(([k, x]) => (
                    <tr key={k} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-oriental-black">{k}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{x.n}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-green-700">${fmt(x.mensual)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">${fmt(x.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Listado */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-oriental-black text-sm">Créditos del período ({filtrados.length})</h2>
              <button onClick={() => csv(`creditos_${periodo}`, ['Cliente', 'Placa', 'Modalidad', 'Otorgado', 'Financiado USD', 'Cuota mensual USD', 'Saldo USD', 'Estado'],
                filtrados.map(c => [c.clientes?.nombre ?? '—', c.placa ?? '', PLAN_LABEL[c.plan_tipo] ?? 'Otro', String(c.fecha_inicio ?? '').slice(0, 10), Number(c.monto_financiado || 0).toFixed(2), cuotaMensual(c).toFixed(2), Number(c.saldo || 0).toFixed(2), c.estado === 'pagado' ? 'Pagado' : (enMora.has(c.id) ? 'En mora' : 'Al día')]))} className="text-xs font-semibold text-oriental-gray border border-gray-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 hover:bg-gray-50"><FileDown size={13} /> CSV</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>{['Cliente', 'Modalidad', 'Otorgado', 'Cuota mensual', 'Saldo', 'Estado'].map((h, i) => <th key={i} className={`px-3 py-2 text-[11px] font-semibold text-oriental-gray ${i <= 1 ? 'text-left' : 'text-right'}`}>{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {filtrados.map(c => {
                    const estado = c.estado === 'pagado' ? 'Pagado' : (enMora.has(c.id) ? 'En mora' : 'Al día')
                    const cls = estado === 'Pagado' ? 'bg-blue-100 text-blue-700' : estado === 'En mora' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    return (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-oriental-black truncate max-w-[180px]">{c.clientes?.nombre ?? '—'}</td>
                        <td className="px-3 py-2 text-oriental-gray">{PLAN_LABEL[c.plan_tipo] ?? 'Otro'}</td>
                        <td className="px-3 py-2 text-right text-oriental-gray text-xs">{String(c.fecha_inicio ?? '').slice(0, 10)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">${fmt(cuotaMensual(c))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">${fmt(Number(c.saldo || 0))}</td>
                        <td className="px-3 py-2 text-right"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{estado}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      <p className="text-[11px] text-oriental-gray mt-4">
        Cobro mensual proyectado = suma de la cuota mensual de los créditos activos (cuota = monto financiado ÷ número de cuotas, ajustado a mensual según la frecuencia).
        &quot;Al día&quot; = créditos activos sin cuotas vencidas. Montos en USD.
      </p>
    </div>
  )
}
