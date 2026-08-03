'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, ShoppingBag, FileDown } from 'lucide-react'
import ExportBar from '@/components/ExportBar'
import type { ReportePayload } from '@/lib/reporte-tipos'

/* eslint-disable @typescript-eslint/no-explicit-any */

const MODALIDAD: Record<string, string> = {
  contado: 'Contado',
  financiamiento_vehimotors: 'Vehimotors',
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
      fetchAll<any>((f, t) => supabase.from('vehiculos').select('id, marca, modelo, placa, tipo_compra, fecha_entrega, created_at, precio_total, estado, cliente_id, clientes(nombre, cedula_rif)').range(f, t)),
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
      // Venta nueva = tiene división contable definida o es Asegúrate 500;
      // el resto son ventas antiguas (carga de crédito de clientes previos).
      const esNueva = !!div || plan === 'asegurate_500'
      return {
        id: v.id, marca: v.marca ?? '—', modelo: v.modelo ?? '—',
        placa: v.placa || '—',
        cliente: v.clientes?.nombre ?? '—',
        cedula: v.clientes?.cedula_rif ?? '',
        fecha: String(v.fecha_entrega ?? v.created_at ?? '').slice(0, 10),
        modalidad, esNueva, vendedora: div?.vendedora || 'Sin asignar',
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
  const porTipo = useMemo(() => agg(r => r.esNueva ? 'Venta nueva' : 'Crédito viejo (cargado)'), [filtradas])
  const detalle = useMemo(() => filtradas.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)), [filtradas])
  const totalMonto = filtradas.reduce((s, r) => s + r.monto, 0)

  const periodo = mes === 0 ? `${anio}` : `${MESES[mes - 1]} ${anio}`

  const buildPayload = (): ReportePayload => ({
    titulo: 'Reporte de ventas', periodo,
    kpis: [{ label: 'Vehículos vendidos', value: String(filtradas.length) }, { label: 'Monto total (proforma)', value: `$${fmt(totalMonto)}` }],
    secciones: [
      { titulo: 'Por tipo (nueva / antigua)', headers: ['Tipo', 'Unidades', 'Monto USD'], rows: porTipo.map(([k, x]) => [k, x.n, `$${fmt(x.monto)}`]) },
      { titulo: 'Por modalidad de venta', headers: ['Modalidad', 'Unidades', 'Monto USD'], rows: porModalidad.map(([k, x]) => [k, x.n, `$${fmt(x.monto)}`]) },
      { titulo: 'Por marca y modelo', headers: ['Marca / Modelo', 'Unidades', 'Monto USD'], rows: porMarcaModelo.map(([k, x]) => [k, x.n, `$${fmt(x.monto)}`]) },
      { titulo: 'Por vendedora', headers: ['Vendedora', 'Unidades', 'Monto USD'], rows: porVendedora.map(([k, x]) => [k, x.n, `$${fmt(x.monto)}`]) },
      { titulo: 'Detalle de ventas', headers: ['Vehículo', 'Placa', 'Cliente', 'Fecha', 'Vendedora', 'Tipo', 'Modalidad', 'Monto USD'], rows: detalle.map(r => [`${r.marca} ${r.modelo}`, r.placa, r.cedula ? `${r.cliente} (${r.cedula})` : r.cliente, r.fecha, r.vendedora, r.esNueva ? 'Venta nueva' : 'Crédito viejo', MODALIDAD[r.modalidad] ?? r.modalidad, `$${fmt(r.monto)}`]) },
    ],
  })

  return (
    <div className="p-4 lg:p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/reportes" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"><ArrowLeft size={18} className="text-oriental-gray" /></Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center"><ShoppingBag size={20} className="text-oriental-red" /></div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Reporte de ventas</h1>
            <p className="text-oriental-gray text-sm">Detalle con cliente y placa · venta nueva vs crédito viejo — {periodo}</p>
          </div>
        </div>
        <ExportBar build={buildPayload} />
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
          <Bloque titulo="Por tipo de venta (nueva / antigua)" headers={['Tipo', 'Unid.', 'Monto']} rows={porTipo}
            onCsv={() => csv(`ventas_tipo_${periodo}`, ['Tipo', 'Unidades', 'Monto USD'], porTipo.map(([k, x]) => [k, x.n, x.monto.toFixed(2)]))} />
          <Bloque titulo="Por modalidad de venta" headers={['Modalidad', 'Unid.', 'Monto']} rows={porModalidad}
            onCsv={() => csv(`ventas_modalidad_${periodo}`, ['Modalidad', 'Unidades', 'Monto USD'], porModalidad.map(([k, x]) => [k, x.n, x.monto.toFixed(2)]))} />
          <Bloque titulo="Por marca y modelo" headers={['Marca / Modelo', 'Unid.', 'Monto']} rows={porMarcaModelo}
            onCsv={() => csv(`ventas_marca_${periodo}`, ['Marca/Modelo', 'Unidades', 'Monto USD'], porMarcaModelo.map(([k, x]) => [k, x.n, x.monto.toFixed(2)]))} />
          <Bloque titulo="Por vendedora" headers={['Vendedora', 'Unid.', 'Monto']} rows={porVendedora}
            onCsv={() => csv(`ventas_vendedora_${periodo}`, ['Vendedora', 'Unidades', 'Monto USD'], porVendedora.map(([k, x]) => [k, x.n, x.monto.toFixed(2)]))} />

          {/* Detalle de cada venta */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-oriental-black text-sm">Detalle de ventas ({detalle.length})</h2>
              <button onClick={() => csv(`ventas_detalle_${periodo}`, ['Vehículo', 'Placa', 'Cliente', 'Cédula/RIF', 'Fecha', 'Vendedora', 'Tipo', 'Modalidad', 'Monto USD'], detalle.map(r => [`${r.marca} ${r.modelo}`, r.placa, r.cliente, r.cedula, r.fecha, r.vendedora, r.esNueva ? 'Venta nueva' : 'Crédito viejo', MODALIDAD[r.modalidad] ?? r.modalidad, r.monto.toFixed(2)]))}
                className="text-xs font-semibold text-oriental-gray border border-gray-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 hover:bg-gray-50"><FileDown size={13} /> CSV</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  {['Vehículo', 'Placa', 'Cliente', 'Fecha', 'Vendedora', 'Tipo', 'Modalidad', 'Monto'].map((h, i) => (
                    <th key={i} className={`px-3 py-2 text-[11px] font-semibold text-oriental-gray ${i === 7 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {detalle.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-oriental-black font-medium whitespace-nowrap">{r.marca} {r.modelo}</td>
                      <td className="px-3 py-2 text-oriental-gray text-xs font-mono whitespace-nowrap">{r.placa}</td>
                      <td className="px-3 py-2 text-oriental-black">
                        {r.cliente}
                        {r.cedula ? <span className="text-gray-400 text-xs block">{r.cedula}</span> : null}
                      </td>
                      <td className="px-3 py-2 text-oriental-gray text-xs whitespace-nowrap">{r.fecha}</td>
                      <td className="px-3 py-2 text-oriental-gray">{r.vendedora}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${r.esNueva ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{r.esNueva ? 'Venta nueva' : 'Crédito viejo'}</span>
                      </td>
                      <td className="px-3 py-2 text-oriental-gray text-xs">{MODALIDAD[r.modalidad] ?? r.modalidad}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">${fmt(r.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
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
