'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Coins, TrendingUp, AlertTriangle, FileDown, Search, FileText, Sheet } from 'lucide-react'
import Link from 'next/link'
import { cuotaEsPropia } from '@/lib/centros-costo'

type Cuota = { credito_id: string; monto: number; monto_pagado: number | null; estado: string; numero_cuota: number | null }
type ClienteRel = { nombre: string; cedula_rif: string | null }
type Credito = {
  id: string; placa: string | null; moneda: string | null; estado: string; plan_tipo: string | null
  monto_financiado: number | null; clientes: ClienteRel | ClienteRel[] | null
}

const POR_COBRAR = new Set(['pendiente', 'vencida', 'abono_parcial'])

const planLabel = (t: string | null): string =>
  t === 'inicial_la_oriental' ? 'La Oriental' :
  t === 'financiamiento_vehimotors' ? 'Vehimotors' :
  t === 'cuota_especial' ? 'Cuota Especial' :
  t === 'asegurate_500' ? 'Asegúrate $500' :
  t === 'credito_40_60' ? '40/60' : 'Crédito'

function primerCliente(c: Credito): ClienteRel | null {
  if (!c.clientes) return null
  return Array.isArray(c.clientes) ? (c.clientes[0] ?? null) : c.clientes
}
function fmt(n: number): string {
  return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
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

export default function CobranzaClient() {
  const supabase = createClient()
  const [creditos, setCreditos] = useState<Credito[]>([])
  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<'con_saldo' | 'vencidos' | 'todos'>('con_saldo')
  const [titular, setTitular] = useState<'todas' | 'oriental' | 'vehimotors'>('todas')

  const cargar = useCallback(async () => {
    setLoading(true)
    const [cre, cuo] = await Promise.all([
      fetchAll<Credito>((f, t) => supabase.from('creditos')
        .select('id, placa, moneda, estado, plan_tipo, monto_financiado, clientes(nombre, cedula_rif)')
        .range(f, t)),
      fetchAll<Cuota>((f, t) => supabase.from('cuotas')
        .select('credito_id, monto, monto_pagado, estado, numero_cuota')
        .range(f, t)),
    ])
    setCreditos(cre)
    setCuotas(cuo)
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // plan_tipo por crédito, para clasificar cada cuota como propia o de Vehimotors
  const planById = useMemo(() => {
    const m: Record<string, string | null> = {}
    for (const c of creditos) m[c.id] = c.plan_tipo
    return m
  }, [creditos])

  const porCredito = useMemo(() => {
    const map: Record<string, { total: number; porCobrar: number; vencido: number; cuotasPend: number; porCobrarProp: number; porCobrarVeh: number; vencidoProp: number; vencidoVeh: number }> = {}
    for (const q of cuotas) {
      const m = (map[q.credito_id] ??= { total: 0, porCobrar: 0, vencido: 0, cuotasPend: 0, porCobrarProp: 0, porCobrarVeh: 0, vencidoProp: 0, vencidoVeh: 0 })
      const monto = Number(q.monto)
      const pagado = Number(q.monto_pagado ?? 0)
      m.total += monto
      if (POR_COBRAR.has(q.estado)) {
        const saldo = Math.max(0, monto - pagado)
        const propia = cuotaEsPropia(planById[q.credito_id], q.numero_cuota)
        m.porCobrar += saldo
        if (propia) m.porCobrarProp += saldo; else m.porCobrarVeh += saldo
        if (saldo > 0) m.cuotasPend += 1
        if (q.estado === 'vencida') {
          m.vencido += saldo
          if (propia) m.vencidoProp += saldo; else m.vencidoVeh += saldo
        }
      }
    }
    return map
  }, [cuotas, planById])

  const filas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return creditos
      .map(c => {
        const agg = porCredito[c.id] ?? { total: 0, porCobrar: 0, vencido: 0, cuotasPend: 0, porCobrarProp: 0, porCobrarVeh: 0, vencidoProp: 0, vencidoVeh: 0 }
        const total = agg.total || Number(c.monto_financiado ?? 0)
        const cobrado = Math.max(0, total - agg.porCobrar)
        const pct = total > 0 ? Math.round((cobrado / total) * 100) : 0
        const cli = primerCliente(c)
        // Monto por cobrar/vencido según el titular seleccionado
        const porCobrar = titular === 'oriental' ? agg.porCobrarProp : titular === 'vehimotors' ? agg.porCobrarVeh : agg.porCobrar
        const vencido = titular === 'oriental' ? agg.vencidoProp : titular === 'vehimotors' ? agg.vencidoVeh : agg.vencido
        return {
          id: c.id, cliente: cli?.nombre ?? 'Sin cliente', cedula: cli?.cedula_rif ?? '',
          placa: c.placa, plan: c.plan_tipo, estado: c.estado,
          total, cobrado, porCobrar, vencido, cuotasPend: agg.cuotasPend, pct,
        }
      })
      .filter(r => {
        if (filtro === 'con_saldo' && r.porCobrar <= 0.01) return false
        if (filtro === 'vencidos' && r.vencido <= 0.01) return false
        if (q) {
          const hay = r.cliente.toLowerCase().includes(q) || (r.cedula ?? '').toLowerCase().includes(q) || (r.placa ?? '').toLowerCase().includes(q)
          if (!hay) return false
        }
        return true
      })
      .sort((a, b) => b.vencido - a.vencido || b.porCobrar - a.porCobrar)
  }, [creditos, porCredito, busqueda, filtro, titular])

  const tot = useMemo(() => filas.reduce((s, r) => ({
    total: s.total + r.total, cobrado: s.cobrado + r.cobrado, porCobrar: s.porCobrar + r.porCobrar, vencido: s.vencido + r.vencido,
  }), { total: 0, cobrado: 0, porCobrar: 0, vencido: 0 }), [filas])

  // Separación global por titular (independiente del filtro), para los KPIs
  const split = useMemo(() => {
    let orientalPC = 0, vehPC = 0, orientalV = 0, vehV = 0
    for (const k in porCredito) {
      const a = porCredito[k]
      orientalPC += a.porCobrarProp; vehPC += a.porCobrarVeh
      orientalV += a.vencidoProp; vehV += a.vencidoVeh
    }
    return { orientalPC, vehPC, orientalV, vehV }
  }, [porCredito])

  function exportarCsv() {
    const rows = filas.map(r => [r.cliente, r.cedula, r.placa ?? '', planLabel(r.plan), r.total.toFixed(2), r.cobrado.toFixed(2), r.porCobrar.toFixed(2), r.vencido.toFixed(2), `${r.pct}%`])
    const head = ['Cliente', 'Cédula/RIF', 'Placa', 'Plan', 'Financiado', 'Cobrado', 'Por cobrar', 'Vencido', '% Avance']
    const csv = [head, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = `cartera-cobranza.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const [exportando, setExportando] = useState<'pdf' | 'excel' | null>(null)
  async function exportar(tipo: 'pdf' | 'excel') {
    const titularLbl = titular === 'oriental' ? 'La Oriental' : titular === 'vehimotors' ? 'Vehimotors' : 'Ambos'
    const filtroLbl = filtro === 'con_saldo' ? 'Con saldo' : filtro === 'vencidos' ? 'Vencidos' : 'Todos'
    const payload = {
      subtitulo: `${filtroLbl} · ${titularLbl}`,
      tot, split,
      filas: filas.map(r => ({ cliente: r.cliente, cedula: r.cedula ?? '', placa: r.placa ?? '', planLbl: planLabel(r.plan), total: r.total, cobrado: r.cobrado, porCobrar: r.porCobrar, vencido: r.vencido, cuotasPend: r.cuotasPend, pct: r.pct })),
    }
    setExportando(tipo)
    try {
      const res = await fetch(`/api/cobranza/${tipo}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `cartera-cobranza.${tipo === 'excel' ? 'xlsx' : 'pdf'}`; a.click()
      URL.revokeObjectURL(url)
    } finally { setExportando(null) }
  }

  const pctGlobal = tot.total > 0 ? Math.round((tot.cobrado / tot.total) * 100) : 0

  return (
    <div className="p-4 lg:p-8 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"><ArrowLeft size={18} className="text-oriental-gray" /></Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center"><Coins size={20} className="text-oriental-red" /></div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Cartera de cobranza</h1>
            <p className="text-oriental-gray text-sm">Por crédito: financiado, cobrado, por cobrar y vencido</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="card p-4">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-oriental-gray">Cartera (financiado)</p>
          <p className="text-xl font-black text-oriental-black">${fmt(tot.total)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-green-700 mb-0.5"><TrendingUp size={14} /><p className="text-[11px] uppercase tracking-wider font-semibold">Cobrado</p></div>
          <p className="text-xl font-black text-oriental-black">${fmt(tot.cobrado)}</p>
          <p className="text-[11px] text-oriental-gray">{pctGlobal}% de la cartera</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-oriental-gray">Por cobrar</p>
          <p className="text-sm font-black text-green-800">La Oriental ${fmt(split.orientalPC)}</p>
          <p className="text-sm font-black text-amber-700">Vehimotors ${fmt(split.vehPC)}</p>
        </div>
        <div className="card p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-1.5 text-oriental-red mb-0.5"><AlertTriangle size={14} /><p className="text-[11px] uppercase tracking-wider font-semibold">Vencido</p></div>
          <p className="text-sm font-black text-oriental-red">La Oriental ${fmt(split.orientalV)}</p>
          <p className="text-sm font-black text-amber-700">Vehimotors ${fmt(split.vehV)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray" />
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por cliente, cédula o placa…" className="input pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {([['todas', 'Ambos'], ['oriental', 'La Oriental'], ['vehimotors', 'Vehimotors']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setTitular(v)} className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${titular === v ? (v === 'vehimotors' ? 'bg-amber-600 text-white border-amber-600' : v === 'oriental' ? 'bg-green-700 text-white border-green-700' : 'bg-oriental-black text-white border-oriental-black') : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'}`}>{l}</button>
          ))}
          <span className="w-px bg-gray-200 mx-0.5" />
          {([['con_saldo', 'Con saldo'], ['vencidos', 'Vencidos'], ['todos', 'Todos']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFiltro(v)} className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${filtro === v ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'}`}>{l}</button>
          ))}
          <button onClick={() => exportar('pdf')} disabled={filas.length === 0 || exportando !== null} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-oriental-red/30 text-oriental-red hover:bg-red-50 disabled:opacity-50"><FileText size={14} /> {exportando === 'pdf' ? 'Generando…' : 'PDF'}</button>
          <button onClick={() => exportar('excel')} disabled={filas.length === 0 || exportando !== null} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50"><Sheet size={14} /> {exportando === 'excel' ? 'Generando…' : 'Excel'}</button>
          <button onClick={exportarCsv} disabled={filas.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-oriental-gray hover:bg-gray-50 disabled:opacity-50"><FileDown size={14} /> CSV</button>
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
                  <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Placa</th>
                  <th className="text-right px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Financiado</th>
                  <th className="text-right px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Cobrado</th>
                  <th className="text-right px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Por cobrar</th>
                  <th className="text-right px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Vencido</th>
                  <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Avance</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filas.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-10 text-center text-oriental-gray">Sin créditos en esta vista.</td></tr>
                ) : filas.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-oriental-black">{r.cliente}</p>
                      <p className="text-[11px] text-oriental-gray">{planLabel(r.plan)}{r.cuotasPend > 0 ? ` · ${r.cuotasPend} cuota${r.cuotasPend !== 1 ? 's' : ''} pend.` : ''}</p>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-oriental-gray">{r.placa ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-oriental-gray">${fmt(r.total)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-green-700">${fmt(r.cobrado)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-oriental-black">${fmt(r.porCobrar)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-oriental-red">{r.vencido > 0 ? `$${fmt(r.vencido)}` : '—'}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${r.pct}%` }} />
                        </div>
                        <span className="text-[11px] text-oriental-gray tabular-nums">{r.pct}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><Link href={`/creditos/${r.id}`} className="text-oriental-red hover:underline text-xs font-medium">Ver</Link></td>
                  </tr>
                ))}
              </tbody>
              {filas.length > 0 && (
                <tfoot>
                  <tr className="bg-oriental-black text-white">
                    <td className="px-3 py-2.5 font-bold" colSpan={2}>Total ({filas.length})</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold">${fmt(tot.total)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold">${fmt(tot.cobrado)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold">${fmt(tot.porCobrar)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold">${fmt(tot.vencido)}</td>
                    <td className="px-3 py-2.5" colSpan={2}>{pctGlobal}% cobrado</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      <p className="text-[11px] text-oriental-gray mt-4">
        Cobrado = financiado − saldo pendiente de cuotas. &quot;Por cobrar&quot; incluye cuotas pendientes, vencidas y con abono parcial. Montos en la moneda del crédito (mayoría USD).
        Las cuotas se separan por titular: <span className="font-semibold">La Oriental</span> (inicial, reserva $500, cuota especial) y <span className="font-semibold">Vehimotors</span> (financiamiento Vehimotors y mensuales del plan Asegúrate $500, que son fondos de terceros). El filtro de arriba cambia qué titular se muestra en la tabla.
      </p>
    </div>
  )
}
