'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, BarChart3, ShoppingCart, CalendarDays, FileDown, TrendingUp, TrendingDown } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

// Categorías de egreso que cuentan como "compras".
const COMPRA_CATS: Record<string, string> = {
  vehimotors: 'Vehículos (Vehimotors)',
  cr_avanza_motors: 'Vehículos (Avanza Motors)',
  repuestos: 'Repuestos',
  costos_repuestos: 'Repuestos (costos)',
  proveedores: 'Proveedores',
}

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: unknown[] | null }>): Promise<T[]> {
  const PAGE = 1000; let out: T[] = []
  for (let i = 0; ; i++) {
    const { data } = await build(i * PAGE, i * PAGE + PAGE - 1)
    if (!data || data.length === 0) break
    out = out.concat(data as T[])
    if (data.length < PAGE) break
  }
  return out
}

const usd = (m: number, moneda: string, tasa: number | null) => moneda === 'VES' ? (tasa && tasa > 0 ? m / tasa : 0) : m
const fmt = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Remanente directiva — misma fórmula que el hub de ventas.
function remanenteDe(v: any): number {
  const ingresoBruto = Number(v.monto_proforma || 0) - Number(v.pago_vehimotors || 0)
  const directivaBruta = ingresoBruto - Number(v.comision_monto || 0)
  const egresosDir = Number(v.poliza_carro || 0) + Number(v.poliza_vida || 0) + Number(v.obsequio_clientes || 0) + Number(v.alfombras || 0)
  return directivaBruta - egresosDir
}

function csv(nombre: string, headers: string[], rows: (string | number)[][]) {
  const c = [headers, ...rows].map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob(['﻿' + c], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = `${nombre}.csv`; a.click(); URL.revokeObjectURL(url)
}

export default function ConsolidadosClient() {
  const supabase = createClient()
  const hoy = new Date().toISOString().slice(0, 10)
  const primerDia = hoy.slice(0, 7) + '-01'
  const [desde, setDesde] = useState(primerDia)
  const [hasta, setHasta] = useState(hoy)
  const [loading, setLoading] = useState(true)
  const [ventas, setVentas] = useState<any[]>([])
  const [compras, setCompras] = useState<any[]>([])
  const [eventos, setEventos] = useState<any[]>([])

  const cargar = useCallback(async () => {
    setLoading(true)
    const [div, egr, evt] = await Promise.all([
      fetchAll<any>((f, t) => supabase.from('ventas_division_contable')
        .select('*, vehiculos(marca, modelo, placa, fecha_venta, created_at)').range(f, t)),
      fetchAll<any>((f, t) => supabase.from('egresos')
        .select('monto, moneda, tasa_cambio, categoria, beneficiario, fecha_egreso, estado')
        .in('categoria', Object.keys(COMPRA_CATS)).neq('estado', 'anulado').neq('estado', 'rechazado')
        .gte('fecha_egreso', desde).lte('fecha_egreso', hasta).range(f, t)),
      fetchAll<any>((f, t) => supabase.from('eventos_calendario')
        .select('titulo, fecha, tipo, estado').gte('fecha', desde).lte('fecha', hasta).order('fecha').range(f, t)),
    ])
    // Fecha de la venta: fecha_venta del vehículo, o created_at como respaldo.
    const dentro = (v: any) => {
      const fv = v.vehiculos?.fecha_venta ?? v.vehiculos?.created_at ?? v.created_at
      const d = String(fv ?? '').slice(0, 10)
      return d >= desde && d <= hasta
    }
    setVentas(div.filter(dentro))
    setCompras(egr)
    setEventos(evt)
    setLoading(false)
  }, [desde, hasta])
  useEffect(() => { cargar() }, [cargar])

  // ── Ventas
  const v = useMemo(() => {
    let proforma = 0, vm = 0, comision = 0, directiva = 0
    const porMarca: Record<string, { n: number; monto: number }> = {}
    const porVend: Record<string, { n: number; monto: number; rem: number }> = {}
    for (const x of ventas) {
      const mp = Number(x.monto_proforma || 0)
      proforma += mp; vm += Number(x.pago_vehimotors || 0); comision += Number(x.comision_monto || 0); directiva += remanenteDe(x)
      const marca = x.vehiculos?.marca ?? '—'
      ;(porMarca[marca] ??= { n: 0, monto: 0 }); porMarca[marca].n++; porMarca[marca].monto += mp
      const vend = x.vendedora || '—'
      ;(porVend[vend] ??= { n: 0, monto: 0, rem: 0 }); porVend[vend].n++; porVend[vend].monto += mp; porVend[vend].rem += remanenteDe(x)
    }
    return { n: ventas.length, proforma, vm, comision, directiva,
      marca: Object.entries(porMarca).sort((a, b) => b[1].monto - a[1].monto),
      vend: Object.entries(porVend).sort((a, b) => b[1].monto - a[1].monto) }
  }, [ventas])

  // ── Compras
  const c = useMemo(() => {
    let total = 0
    const porCat: Record<string, number> = {}
    const porProv: Record<string, number> = {}
    for (const e of compras) {
      const m = usd(Number(e.monto || 0), String(e.moneda || 'USD'), e.tasa_cambio != null ? Number(e.tasa_cambio) : null)
      total += m
      porCat[e.categoria] = (porCat[e.categoria] ?? 0) + m
      const p = e.beneficiario || '—'; porProv[p] = (porProv[p] ?? 0) + m
    }
    return { total,
      cat: Object.entries(porCat).sort((a, b) => b[1] - a[1]),
      prov: Object.entries(porProv).sort((a, b) => b[1] - a[1]).slice(0, 10) }
  }, [compras])

  // ── Eventos
  const ev = useMemo(() => {
    const realizados = eventos.filter(e => e.estado === 'realizado').length
    const programados = eventos.filter(e => e.estado !== 'realizado' && e.estado !== 'cancelado').length
    return { total: eventos.length, realizados, programados, lista: eventos }
  }, [eventos])

  const margen = v.proforma - c.total

  return (
    <div className="p-4 lg:p-8 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/base-datos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"><ArrowLeft size={18} className="text-oriental-gray" /></Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center"><BarChart3 size={20} className="text-oriental-red" /></div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Consolidados</h1>
            <p className="text-oriental-gray text-sm">Ventas, compras y eventos del período (USD)</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-6 flex flex-wrap items-end gap-3">
        <div><label className="label">Desde</label><input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="input" /></div>
        <div><label className="label">Hasta</label><input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="input" /></div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="card p-4"><div className="flex items-center gap-1.5 text-green-700 mb-1"><TrendingUp size={15} /><p className="text-[11px] uppercase tracking-wider font-semibold">Ventas (proforma)</p></div><p className="text-xl font-black text-oriental-black">${fmt(v.proforma)}</p><p className="text-[11px] text-oriental-gray">{v.n} vehículo{v.n !== 1 ? 's' : ''}</p></div>
        <div className="card p-4"><div className="flex items-center gap-1.5 text-oriental-red mb-1"><TrendingDown size={15} /><p className="text-[11px] uppercase tracking-wider font-semibold">Compras</p></div><p className="text-xl font-black text-oriental-black">${fmt(c.total)}</p><p className="text-[11px] text-oriental-gray">{compras.length} egreso{compras.length !== 1 ? 's' : ''}</p></div>
        <div className="card p-4"><p className="text-[11px] uppercase tracking-wider font-semibold text-oriental-gray mb-1">Margen (ventas − compras)</p><p className={`text-xl font-black ${margen >= 0 ? 'text-green-700' : 'text-oriental-red'}`}>${fmt(margen)}</p></div>
        <div className="card p-4"><p className="text-[11px] uppercase tracking-wider font-semibold text-oriental-gray mb-1">Remanente directiva</p><p className="text-xl font-black text-green-700">${fmt(v.directiva)}</p></div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-oriental-gray text-sm">Cargando…</div>
      ) : (
        <div className="space-y-6">
          {/* VENTAS */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-oriental-black flex items-center gap-2"><TrendingUp size={17} className="text-green-700" /> Ventas</h2>
              <button onClick={() => csv(`ventas_${desde}_${hasta}`, ['Marca', 'Unidades', 'Monto proforma USD'], v.marca.map(([m, x]) => [m, x.n, x.monto.toFixed(2)]))} className="text-xs font-semibold text-oriental-gray border border-gray-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 hover:bg-gray-50"><FileDown size={13} /> CSV</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
              <Kpi label="Vehículos vendidos" value={String(v.n)} />
              <Kpi label="Monto proforma" value={`$${fmt(v.proforma)}`} />
              <Kpi label="Pago a Vehimotors" value={`$${fmt(v.vm)}`} rojo />
              <Kpi label="Comisiones" value={`$${fmt(v.comision)}`} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Tabla titulo="Por marca" headers={['Marca', 'Unid.', 'Monto']} rows={v.marca.map(([m, x]) => [m, String(x.n), `$${fmt(x.monto)}`])} />
              <Tabla titulo="Por vendedora" headers={['Vendedora', 'Unid.', 'Remanente']} rows={v.vend.map(([m, x]) => [m, String(x.n), `$${fmt(x.rem)}`])} />
            </div>
          </section>

          {/* COMPRAS */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-oriental-black flex items-center gap-2"><ShoppingCart size={17} className="text-oriental-red" /> Compras</h2>
              <button onClick={() => csv(`compras_${desde}_${hasta}`, ['Categoría', 'Total USD'], c.cat.map(([k, m]) => [COMPRA_CATS[k] ?? k, m.toFixed(2)]))} className="text-xs font-semibold text-oriental-gray border border-gray-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 hover:bg-gray-50"><FileDown size={13} /> CSV</button>
            </div>
            <p className="text-2xl font-black text-oriental-black mb-4">${fmt(c.total)} <span className="text-xs font-normal text-oriental-gray">total comprado</span></p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Tabla titulo="Por tipo" headers={['Categoría', 'Total']} rows={c.cat.map(([k, m]) => [COMPRA_CATS[k] ?? k, `$${fmt(m)}`])} />
              <Tabla titulo="Top proveedores" headers={['Proveedor', 'Total']} rows={c.prov.map(([p, m]) => [p, `$${fmt(m)}`])} />
            </div>
          </section>

          {/* EVENTOS */}
          <section className="card p-5">
            <h2 className="font-bold text-oriental-black flex items-center gap-2 mb-3"><CalendarDays size={17} className="text-purple-600" /> Eventos</h2>
            <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
              <Kpi label="Total" value={String(ev.total)} />
              <Kpi label="Realizados" value={String(ev.realizados)} />
              <Kpi label="Programados" value={String(ev.programados)} />
            </div>
            {ev.lista.length === 0 ? (
              <p className="text-sm text-oriental-gray">Sin eventos en el período.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {ev.lista.slice(0, 15).map((e, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 text-sm">
                    <span className="text-[11px] text-oriental-gray w-20 flex-shrink-0">{new Date(e.fecha + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })}</span>
                    <span className="text-oriental-black flex-1">{e.titulo}</span>
                    {e.tipo && <span className="text-[10px] font-semibold text-oriental-gray bg-gray-100 px-2 py-0.5 rounded-full">{e.tipo}</span>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <p className="text-[11px] text-oriental-gray mt-4">
        Montos en USD (los egresos en Bs se convierten con la tasa de cada registro). Ventas: vehículos con fecha de venta en el período.
        Compras: egresos de categorías de compra (Vehimotors, Avanza, repuestos, proveedores), sin anulados ni rechazados.
      </p>
    </div>
  )
}

function Kpi({ label, value, rojo }: { label: string; value: string; rojo?: boolean }) {
  return <div className="rounded-lg bg-gray-50 p-3"><p className="text-[10px] uppercase tracking-wider text-oriental-gray font-semibold">{label}</p><p className={`text-lg font-bold ${rojo ? 'text-oriental-red' : 'text-oriental-black'}`}>{value}</p></div>
}

function Tabla({ titulo, headers, rows }: { titulo: string; headers: string[]; rows: string[][] }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-oriental-gray mb-1.5">{titulo}</p>
      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>{headers.map((h, i) => <th key={i} className={`px-3 py-1.5 text-[11px] font-semibold text-oriental-gray ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-50">
            {rows.length === 0 ? <tr><td colSpan={headers.length} className="px-3 py-3 text-center text-oriental-gray text-xs">Sin datos.</td></tr>
              : rows.map((r, i) => <tr key={i}>{r.map((cel, j) => <td key={j} className={`px-3 py-1.5 ${j === 0 ? 'text-left text-oriental-black' : 'text-right tabular-nums'}`}>{cel}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
