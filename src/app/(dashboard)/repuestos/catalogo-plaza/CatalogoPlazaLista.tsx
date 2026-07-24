'use client'

import { useMemo, useState } from 'react'
import { Search, TrendingUp, TrendingDown, AlertTriangle, Phone, MapPin } from 'lucide-react'
import type { FilaCatalogo } from './page'

const ALERTA_PCT = 15 // % de subida que dispara alerta

const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const fmt = (n: number) => Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtFecha = (d: string | null) => {
  if (!d) return '—'
  try { return new Date(d + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}

export default function CatalogoPlazaLista({ filas }: { filas: FilaCatalogo[] }) {
  const [q, setQ] = useState('')

  const filtradas = useMemo(() => {
    const nq = norm(q.trim())
    if (!nq) return filas
    return filas.filter(f => norm(f.repuesto).includes(nq) || norm(f.proveedor).includes(nq))
  }, [filas, q])

  const alertas = filas.filter(f => f.pct != null && f.pct >= ALERTA_PCT).length
  const repuestosDistintos = new Set(filas.map(f => norm(f.repuesto))).size

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="card p-4">
          <p className="text-[11px] text-oriental-gray uppercase tracking-wider mb-1">Compras registradas</p>
          <p className="text-2xl font-bold text-oriental-black">{filas.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] text-oriental-gray uppercase tracking-wider mb-1">Repuestos distintos</p>
          <p className="text-2xl font-bold text-oriental-black">{repuestosDistintos}</p>
        </div>
        <div className={`card p-4 ${alertas > 0 ? 'border-red-200 bg-red-50/40' : ''}`}>
          <p className="text-[11px] uppercase tracking-wider mb-1 text-red-600">Alertas de subida (≥{ALERTA_PCT}%)</p>
          <p className="text-2xl font-bold text-red-600">{alertas}</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por repuesto o proveedor…"
          className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oriental-red" />
      </div>

      {filtradas.length === 0 ? (
        <div className="card p-12 text-center text-oriental-gray">
          <p className="text-sm">No hay compras en plaza que coincidan.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-oriental-gray text-xs">Fecha</th>
                  <th className="text-left px-4 py-2.5 font-medium text-oriental-gray text-xs">Repuesto</th>
                  <th className="text-left px-4 py-2.5 font-medium text-oriental-gray text-xs">Proveedor</th>
                  <th className="text-right px-4 py-2.5 font-medium text-oriental-gray text-xs">Precio (USD)</th>
                  <th className="text-left px-4 py-2.5 font-medium text-oriental-gray text-xs">Comparativa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtradas.map(f => {
                  const subio = f.pct != null && f.pct > 0.01
                  const bajo = f.pct != null && f.pct < -0.01
                  const alerta = f.pct != null && f.pct >= ALERTA_PCT
                  return (
                    <tr key={f.key} className={`hover:bg-gray-50 ${alerta ? 'bg-red-50/50' : ''}`}>
                      <td className="px-4 py-2.5 text-oriental-gray text-xs whitespace-nowrap">{fmtFecha(f.fecha)}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-oriental-black">{f.repuesto}</p>
                        {f.cantidad > 1 && <p className="text-[11px] text-gray-400">Cant.: {f.cantidad}</p>}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-oriental-black text-xs font-medium">{f.proveedor}</p>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          {f.telefono && <span className="text-[11px] text-gray-500 flex items-center gap-1"><Phone size={10} /> {f.telefono}</span>}
                          {f.direccion && <span className="text-[11px] text-gray-400 flex items-center gap-1"><MapPin size={10} /> {f.direccion}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-oriental-black whitespace-nowrap">${fmt(f.precioUsd)}</td>
                      <td className="px-4 py-2.5">
                        {f.pct == null ? (
                          <span className="text-[11px] text-gray-400">Primera compra</span>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 text-xs font-bold ${subio ? 'text-red-600' : bajo ? 'text-green-700' : 'text-gray-500'}`}>
                              {subio ? <TrendingUp size={13} /> : bajo ? <TrendingDown size={13} /> : null}
                              {f.pct > 0 ? '+' : ''}{fmt(f.pct)}%
                            </span>
                            <span className="text-[11px] text-gray-400">vs ${fmt(f.prevPrecio ?? 0)} ({fmtFecha(f.prevFecha)})</span>
                            {alerta && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                <AlertTriangle size={10} /> Subió {fmt(f.pct)}%
                              </span>
                            )}
                          </div>
                        )}
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
