'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Scale, TrendingUp, TrendingDown, FileDown } from 'lucide-react'
import Link from 'next/link'

type Fila = {
  id: string
  numero: string
  fecha: string
  concepto: string
  contraparte: string
  base: number
  iva: number
  exento: number
  tasa: number | null
  total: number
  moneda: string
}

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

function fmt(n: number): string {
  return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function primerNombre(rel: unknown): string {
  if (!rel) return '—'
  const r = Array.isArray(rel) ? rel[0] : rel
  return (r as { nombre?: string })?.nombre ?? '—'
}

function mesActual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function LibroIvaClient() {
  const supabase = createClient()
  const [mes, setMes] = useState(mesActual())
  const [debito, setDebito] = useState<Fila[]>([])
  const [credito, setCredito] = useState<Fila[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'debito' | 'credito'>('debito')

  const cargar = useCallback(async () => {
    setLoading(true)
    const desde = `${mes}-01`
    const [y, m] = mes.split('-').map(Number)
    const finMes = new Date(y, m, 0).getDate()
    const hasta = `${mes}-${String(finMes).padStart(2, '0')}`

    const [ing, egr] = await Promise.all([
      fetchAll<Record<string, unknown>>((f, t) => supabase.from('ingresos')
        .select('id, numero_recibo, fecha_pago, concepto, base_imponible, iva_monto, monto_exento, iva_tasa, monto, moneda, clientes(nombre)')
        .eq('iva_aplica', true).neq('estado', 'anulado')
        .gte('fecha_pago', desde).lte('fecha_pago', hasta)
        .order('fecha_pago', { ascending: true }).range(f, t)),
      fetchAll<Record<string, unknown>>((f, t) => supabase.from('egresos')
        .select('id, numero_egreso, fecha_egreso, concepto, base_imponible, iva_monto, monto_exento, iva_tasa, monto, moneda, beneficiario')
        .eq('iva_aplica', true).neq('estado', 'anulado')
        .gte('fecha_egreso', desde).lte('fecha_egreso', hasta)
        .order('fecha_egreso', { ascending: true }).range(f, t)),
    ])

    setDebito(ing.map(r => ({
      id: String(r.id), numero: String(r.numero_recibo ?? ''), fecha: String(r.fecha_pago ?? ''),
      concepto: String(r.concepto ?? ''), contraparte: primerNombre(r.clientes),
      base: Number(r.base_imponible ?? 0), iva: Number(r.iva_monto ?? 0), exento: Number(r.monto_exento ?? 0), tasa: r.iva_tasa != null ? Number(r.iva_tasa) : null,
      total: Number(r.monto ?? 0), moneda: String(r.moneda ?? 'USD'),
    })))
    setCredito(egr.map(r => ({
      id: String(r.id), numero: String(r.numero_egreso ?? ''), fecha: String(r.fecha_egreso ?? ''),
      concepto: String(r.concepto ?? ''), contraparte: String(r.beneficiario ?? '—'),
      base: Number(r.base_imponible ?? 0), iva: Number(r.iva_monto ?? 0), exento: Number(r.monto_exento ?? 0), tasa: r.iva_tasa != null ? Number(r.iva_tasa) : null,
      total: Number(r.monto ?? 0), moneda: String(r.moneda ?? 'USD'),
    })))
    setLoading(false)
  }, [mes])

  useEffect(() => { cargar() }, [cargar])

  // Totales por moneda
  const totales = useMemo(() => {
    const acc = (filas: Fila[]) => {
      const m: Record<string, { base: number; iva: number }> = {}
      for (const f of filas) {
        m[f.moneda] ??= { base: 0, iva: 0 }
        m[f.moneda].base += f.base
        m[f.moneda].iva += f.iva
      }
      return m
    }
    return { debito: acc(debito), credito: acc(credito) }
  }, [debito, credito])

  const monedas = Array.from(new Set([...Object.keys(totales.debito), ...Object.keys(totales.credito)])).sort()
  const filas = tab === 'debito' ? debito : credito

  function exportarCsv() {
    const rows = filas.map(f => [f.fecha, f.numero, f.contraparte, f.concepto, f.moneda, f.base.toFixed(2), f.iva.toFixed(2), f.exento.toFixed(2), f.total.toFixed(2)])
    const head = ['Fecha', 'Documento', tab === 'debito' ? 'Cliente' : 'Beneficiario', 'Concepto', 'Moneda', 'Base', 'IVA', 'Exento', 'Total']
    const csv = [head, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = `libro-iva-${tab}-${mes}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"><ArrowLeft size={18} className="text-oriental-gray" /></Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center"><Scale size={20} className="text-oriental-red" /></div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Libro de IVA</h1>
            <p className="text-oriental-gray text-sm">Débito fiscal (ventas) y crédito fiscal (compras) del período</p>
          </div>
        </div>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)} className="input w-40" />
      </div>

      {/* Resumen por moneda */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {monedas.length === 0 && !loading && (
          <div className="card p-5 sm:col-span-2 text-center text-oriental-gray text-sm">Sin registros con IVA en este período.</div>
        )}
        {monedas.map(mon => {
          const d = totales.debito[mon] ?? { base: 0, iva: 0 }
          const c = totales.credito[mon] ?? { base: 0, iva: 0 }
          const aPagar = d.iva - c.iva
          return (
            <div key={mon} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-oriental-black">Resumen {mon}</h2>
                <span className="text-[11px] text-oriental-gray">{mes}</span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-oriental-gray">IVA débito (ventas)</span><span className="font-semibold text-green-700">{mon} {fmt(d.iva)}</span></div>
                <div className="flex justify-between"><span className="text-oriental-gray">IVA crédito (compras)</span><span className="font-semibold text-oriental-red">{mon} {fmt(c.iva)}</span></div>
                <div className="flex justify-between border-t border-gray-100 pt-1.5 mt-1.5">
                  <span className="font-bold text-oriental-black">{aPagar >= 0 ? 'IVA a pagar' : 'IVA a favor'}</span>
                  <span className={`font-black ${aPagar >= 0 ? 'text-oriental-black' : 'text-green-700'}`}>{mon} {fmt(Math.abs(aPagar))}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setTab('debito')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${tab === 'debito' ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'}`}>
          <TrendingUp size={15} /> Débito · ventas ({debito.length})
        </button>
        <button onClick={() => setTab('credito')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${tab === 'credito' ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'}`}>
          <TrendingDown size={15} /> Crédito · compras ({credito.length})
        </button>
        <button onClick={exportarCsv} disabled={filas.length === 0} className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-oriental-gray hover:bg-gray-50 disabled:opacity-50">
          <FileDown size={15} /> CSV
        </button>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-oriental-gray text-sm">Cargando…</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-oriental-bg border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Fecha</th>
                  <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Documento</th>
                  <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">{tab === 'debito' ? 'Cliente' : 'Beneficiario'}</th>
                  <th className="text-right px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Base</th>
                  <th className="text-right px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">IVA</th>
                  <th className="text-right px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Exento</th>
                  <th className="text-right px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filas.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-oriental-gray">Sin documentos con IVA en este período.</td></tr>
                ) : filas.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-oriental-gray whitespace-nowrap">{f.fecha}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-oriental-black">{f.numero}</td>
                    <td className="px-3 py-2 text-oriental-black">{f.contraparte}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{f.moneda} {fmt(f.base)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{f.moneda} {fmt(f.iva)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-oriental-gray">{f.exento > 0 ? `${f.moneda} ${fmt(f.exento)}` : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-oriental-gray">{f.moneda} {fmt(f.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[11px] text-oriental-gray mt-4">
        Se listan los ingresos (débito fiscal) y egresos (crédito fiscal) que se registraron marcando &quot;Incluye IVA&quot;. Totales separados por moneda;
        la conversión a Bs. para la declaración se hace con la tasa del período. IVA a pagar = débito − crédito.
      </p>
    </div>
  )
}
