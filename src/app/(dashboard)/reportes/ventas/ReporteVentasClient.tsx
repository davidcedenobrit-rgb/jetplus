'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, ShoppingBag, FileDown } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const MODALIDAD: Record<string, string> = {
  contado: 'Contado',
  financiamiento_vehimotors: 'Crédito del motor',
  inicial_la_oriental: 'Crédito La Oriental',
  asegurate_500: 'Asegúrate 500',
  cuota_especial: 'Cuota especial',
  otro: 'Otro / sin especificar',
}

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
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function csv(nombre: string, headers: string[], rows: (string | number)[][]) {
  const c = [headers, ...rows].map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob(['﻿' + c], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = `${nombre}.csv`; a.click(); URL.revokeObjectURL(url)
}

export default function ReporteVentasClient() {
  const supabase = createClient()
  const now = new Date()
  const [anio, setAnio] = useState(now.getFullYear())
  const [mes, setMes] = useState<number>(now.getMonth() + 1) // 0 = todo el año
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<any[]>([])

  const cargar = useCallback(async () => {
    setLoading(true)
    const [vehiculos, creditos, divisiones] = await Promise.all([
      fetchAll<any>((f, t) => supabase.from('vehiculos').select('id, marca, modelo, tipo_compra, fecha_venta, precio_total, estado').not('fecha_venta', 'is', null).range(f, t)),
      fetchAll<any>((f, t) => supabase.from('creditos').select('vehiculo_id, plan_tipo').range(f, t)),
      fetchAll<any>((f, t) => supabase.from('ventas_division_contable').select('vehiculo_id, vendedora, monto_proforma').range(f, t)),
    ])
    const credMap: Record<string, string> = {}
    for (const c of creditos) if (c.vehiculo_id && !credMap[c.vehiculo_id]) credMap[c.vehiculo_id] = c.plan_tipo
    const divMap: Record<string, any> = {}
    for (const d of divisiones) if (d.vehiculo_id) divMap[d.vehiculo_id] = d

    const armadas = vehiculos.map(v => {
      const plan = credMap[v.id]
      const modalidad = plan ? (MODALIDAD[plan] ? plan : 'otro')
        : (v.tipo_compra === 'contado' ? 'contado' : 'otro')
      const div = divMap[v.id]
      return {
        id: v.id, marca: v.marca ?? '—', modelo: v.modelo ?? '—',
        fecha: String(v.fecha_venta).slice(0, 10),
        modalidad, vendedora: div?.vendedora || 'Sin asignar',
        monto: Number(div?.monto_proforma ?? v.precio_total ?? 0),
      }
    })
    setRows(armadas); setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const filtradas = useMemo(() => rows.filter(r => {
    const y = Number(r.fecha.slice(0, 4)); const m = Number(r.fecha.slice(5, 7))
    return y === anio && (mes === 0 || m === mes)
  }), [rows, anio, mes])

  const anios = useMemo(() => {
    const s = new Set<number>(rows.map(r => Number(r.fecha.slice(0, 4))))
    s.add(now.getFullYear()); return Array.from(s).sort((a, b) => b - a)
  }, [rows])

  const agg = (key: (r: any) => string) => {
    const m: Record<string, { n: number; monto: number }> = {}
    for (const r of filtradas) { (m[key(r)] ??= { n: 0, monto: 0 }); m[key(r)].n++; m[key(r)].monto += r.monto }
    return Object.entries(m).sort((a, b) => b[1].monto - a[1].monto)
  }
  const porMarcaModelo = useMemo(() => agg(r => `${r.marca} ${r.modelo}`), [filtradas])
  const porModalidad = useMemo(() => agg(r => MODALIDAD[r.modalidad] ?? r.modalidad), [filtradas])
  const porVendedora = useMemo(() => agg(r => r.vendedora), [filtradas])
  const totalMonto = filtradas.reduce((s, r) => s + r.monto, 0)

  const periodo = mes === 0 ? `${anio}` : `${MESES[mes - 1]} ${anio}`

  return (
    <div className="p-4 lg:p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/reportes" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"><ArrowLeft size={18} className="text-oriental-gray" /></Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center"><ShoppingBag size={20} className="text-oriental-red" /></div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Reporte de ventas</h1>
            <p className="text-oriental-gray text-sm">Por marca/modelo, modalidad y vendedora — {periodo}</p>
          </div>
        </div>
      </div>

      <div className="card p-4 mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Año</label>
          <select className="select" value={anio} onChange={e => setAnio(Number(e.target.value))}>
            {anios.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Mes</label>
          <select className="select" value={mes} onChange={e => setMes(Number(e.target.value))}>
            <option value={0}>Todo el año</option>
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card p-4"><p className="text-[11px] uppercase tracking-wider font-semibold text-oriental-gray mb-1">Vehículos vendidos</p><p className="text-2xl font-black text-oriental-black">{filtradas.length}</p></div>
        <div className="card p-4"><p className="text-[11px] uppercase tracking-wider font-semibold text-oriental-gray mb-1">Monto total (proforma)</p><p className="text-2xl font-black text-green-700">${fmt(totalMonto)}</p></div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-oriental-gray text-sm">Cargando…</div>
      ) : filtradas.length === 0 ? (
        <div className="card p-12 text-center text-oriental-gray text-sm">Sin ventas en {periodo}.</div>
      ) : (
        <div className="space-y-5">
          <Bloque titulo="Por marca y modelo" headers={['Marca / Modelo', 'Unid.', 'Monto']} rows={porMarcaModelo}
            onCsv={() => csv(`ventas_marca_${periodo}`, ['Marca/Modelo', 'Unidades', 'Monto USD'], porMarcaModelo.map(([k, x]) => [k, x.n, x.monto.toFixed(2)]))} />
          <Bloque titulo="Por modalidad de venta" headers={['Modalidad', 'Unid.', 'Monto']} rows={porModalidad}
            onCsv={() => csv(`ventas_modalidad_${periodo}`, ['Modalidad', 'Unidades', 'Monto USD'], porModalidad.map(([k, x]) => [k, x.n, x.monto.toFixed(2)]))} />
          <Bloque titulo="Por vendedora" headers={['Vendedora', 'Unid.', 'Monto']} rows={porVendedora}
            onCsv={() => csv(`ventas_vendedora_${periodo}`, ['Vendedora', 'Unidades', 'Monto USD'], porVendedora.map(([k, x]) => [k, x.n, x.monto.toFixed(2)]))} />
        </div>
      )}
    </div>
  )
}

function Bloque({ titulo, headers, rows, onCsv }: { titulo: string; headers: string[]; rows: [string, { n: number; monto: number }][]; onCsv: () => void }) {
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold text-oriental-black text-sm">{titulo}</h2>
        <button onClick={onCsv} className="text-xs font-semibold text-oriental-gray border border-gray-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 hover:bg-gray-50"><FileDown size={13} /> CSV</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>{headers.map((h, i) => <th key={i} className={`px-3 py-2 text-[11px] font-semibold text-oriental-gray ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(([k, x]) => (
              <tr key={k} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-oriental-black">{k}</td>
                <td className="px-3 py-2 text-right tabular-nums">{x.n}</td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold">${fmt(x.monto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
