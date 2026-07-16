'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Building2, Search, X, CheckCircle2, Clock, AlertTriangle, XCircle } from 'lucide-react'

export interface FilaVM {
  id: string
  numero: string | null
  cliente: string | null
  placa: string | null
  monto: number
  moneda: string
  fecha: string | null
  metodo: string | null
  estadoReporte: string   // sin_reportar | enviado | confirmado | rechazado
}

const ESTADO: Record<string, { label: string; cls: string; icon: any }> = {
  sin_reportar: { label: 'Sin reportar', cls: 'bg-amber-100 text-amber-800', icon: AlertTriangle },
  enviado:      { label: 'Reportado — esperando', cls: 'bg-blue-100 text-blue-800', icon: Clock },
  confirmado:   { label: 'Confirmado por VM', cls: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  rechazado:    { label: 'Rechazado', cls: 'bg-red-100 text-red-700', icon: XCircle },
}

function fmt(m: number, cur: string) {
  const s = m.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return cur === 'VES' ? `Bs. ${s}` : cur === 'USDT' ? `USDT ${s}` : `$${s}`
}

export default function ConciliacionVMClient({ filas }: { filas: FilaVM[] }) {
  const [busqueda, setBusqueda] = useState('')
  const [fEstado, setFEstado] = useState('')

  // Resumen por moneda
  const resumen = useMemo(() => {
    const m: Record<string, { total: number; reportado: number; confirmado: number; sinReportar: number }> = {}
    for (const f of filas) {
      if (!m[f.moneda]) m[f.moneda] = { total: 0, reportado: 0, confirmado: 0, sinReportar: 0 }
      const r = m[f.moneda]
      r.total += f.monto
      if (f.estadoReporte === 'confirmado') r.confirmado += f.monto
      if (f.estadoReporte === 'enviado' || f.estadoReporte === 'confirmado') r.reportado += f.monto
      if (f.estadoReporte === 'sin_reportar') r.sinReportar += f.monto
    }
    return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filas])

  const conteos = useMemo(() => {
    const c: Record<string, number> = { sin_reportar: 0, enviado: 0, confirmado: 0, rechazado: 0 }
    for (const f of filas) c[f.estadoReporte] = (c[f.estadoReporte] ?? 0) + 1
    return c
  }, [filas])

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return filas.filter(f => {
      if (fEstado && f.estadoReporte !== fEstado) return false
      if (q && !(f.cliente ?? '').toLowerCase().includes(q)
            && !(f.numero ?? '').toLowerCase().includes(q)
            && !(f.placa ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [filas, busqueda, fEstado])

  const fmtFecha = (d: string | null) =>
    d ? new Date(d + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/vehimotors" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black flex items-center gap-2">
            <Building2 size={22} className="text-oriental-red" /> Conciliación Vehimotors
          </h1>
          <p className="text-oriental-gray text-sm">Pagos que el cliente hizo directo a Vehimotors · se concilian con el reporte a VM</p>
        </div>
      </div>

      {/* Resumen por moneda */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {resumen.map(([mon, r]) => (
          <div key={mon} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-oriental-black">Pagado directo a VM</p>
              <span className="text-[10px] font-bold text-oriental-gray bg-gray-100 px-1.5 py-0.5 rounded">{mon}</span>
            </div>
            <p className="text-xl font-black text-oriental-black mb-3">{fmt(r.total, mon)}</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-green-700 font-semibold">✅ Confirmado por VM</span><span className="font-bold text-oriental-black">{fmt(r.confirmado, mon)}</span></div>
              <div className="flex justify-between"><span className="text-blue-700 font-semibold">🕓 Reportado</span><span className="font-bold text-oriental-black">{fmt(r.reportado, mon)}</span></div>
              <div className="flex justify-between"><span className="text-amber-700 font-semibold">⚠ Sin reportar</span><span className="font-bold text-amber-800">{fmt(r.sinReportar, mon)}</span></div>
            </div>
          </div>
        ))}
        {resumen.length === 0 && (
          <div className="card p-8 text-center text-oriental-gray text-sm sm:col-span-2 lg:col-span-3">
            No hay pagos directos a Vehimotors registrados.
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray" />
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por cliente, número o placa…" className="input pl-9" />
          </div>
          {(busqueda || fEstado) && (
            <button onClick={() => { setBusqueda(''); setFEstado('') }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-oriental-gray hover:bg-gray-50 text-xs font-semibold whitespace-nowrap">
              <X size={13} /> Limpiar
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { v: '', label: `Todos (${filas.length})` },
            { v: 'sin_reportar', label: `Sin reportar (${conteos.sin_reportar})` },
            { v: 'enviado', label: `Reportados (${conteos.enviado})` },
            { v: 'confirmado', label: `Confirmados (${conteos.confirmado})` },
            { v: 'rechazado', label: `Rechazados (${conteos.rechazado})` },
          ].map(f => (
            <button key={f.v || 'todos'} onClick={() => setFEstado(f.v)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${fEstado === f.v ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {filtradas.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 size={30} className="mx-auto text-gray-300 mb-3" />
          <p className="text-oriental-gray text-sm">Sin pagos con estos filtros.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2.5 text-[11px] font-medium text-oriental-gray">Fecha</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-medium text-oriental-gray">Cliente</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-medium text-oriental-gray">Recibo</th>
                  <th className="text-right px-3 py-2.5 text-[11px] font-medium text-oriental-gray">Monto</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-medium text-oriental-gray">Conciliación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtradas.map(f => {
                  const est = ESTADO[f.estadoReporte] ?? ESTADO.sin_reportar
                  const Icon = est.icon
                  return (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs text-oriental-gray">{fmtFecha(f.fecha)}</td>
                      <td className="px-3 py-2.5">
                        <p className="text-sm font-semibold text-oriental-black">{f.cliente ?? '—'}</p>
                        <p className="text-[11px] text-oriental-gray">{[f.placa, f.metodo].filter(Boolean).join(' · ') || '—'}</p>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-oriental-black">{f.numero ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-oriental-black whitespace-nowrap">{fmt(f.monto, f.moneda)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${est.cls}`}>
                            <Icon size={11} /> {est.label}
                          </span>
                          {f.estadoReporte === 'sin_reportar' && (
                            <Link href={`/ingresos/${f.id}`} className="text-[11px] font-semibold text-oriental-red hover:underline whitespace-nowrap">Reportar →</Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
