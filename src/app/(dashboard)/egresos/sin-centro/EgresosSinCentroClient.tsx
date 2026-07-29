'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Check, Loader2, Sparkles } from 'lucide-react'
import type { FilaEgresoSinCentro } from './page'

const fmt = (n: number) => Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const fmtFecha = (d: string | null) => {
  if (!d) return '—'
  try { return new Date(d + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }) } catch { return d }
}
const COMUN = '__comun__'

export default function EgresosSinCentroClient({ filas, centros }: { filas: FilaEgresoSinCentro[]; centros: { id: string; nombre: string }[] }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string>('')
  const [hechos, setHechos] = useState<Set<string>>(new Set())
  const [bulk, setBulk] = useState(false)

  const nombreCentro = (id: string | null) => id === COMUN ? 'Gasto común' : (centros.find(c => c.id === id)?.nombre ?? id ?? '—')

  const visibles = useMemo(() => {
    const nq = norm(q.trim())
    const base = filas.filter(f => !hechos.has(f.id))
    if (!nq) return base
    return base.filter(f => norm(f.numero).includes(nq) || norm(f.beneficiario).includes(nq) || norm(f.etiqueta).includes(nq))
  }, [filas, q, hechos])

  const totalUsd = visibles.reduce((s, f) => s + f.montoUsd, 0)

  async function enviar(id: string, centroId: string): Promise<boolean> {
    const r = await fetch('/api/egresos/recalificar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ egresoId: id, centroId }),
    })
    return r.ok
  }

  async function aplicar(f: FilaEgresoSinCentro) {
    const centroId = sel[f.id] ?? f.sugerido ?? ''
    if (!centroId) return
    setSaving(f.id)
    try { if (await enviar(f.id, centroId)) { setHechos(prev => new Set(prev).add(f.id)); router.refresh() } }
    finally { setSaving('') }
  }

  const conSugerencia = visibles.filter(f => (sel[f.id] ?? f.sugerido))
  async function aplicarTodas() {
    if (!conSugerencia.length) return
    setBulk(true)
    const ok = new Set<string>()
    try {
      for (const f of conSugerencia) {
        const centroId = sel[f.id] ?? f.sugerido ?? ''
        if (!centroId) continue
        if (await enviar(f.id, centroId)) ok.add(f.id)
      }
      if (ok.size) { setHechos(prev => new Set([...prev, ...ok])); router.refresh() }
    } finally { setBulk(false) }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="card p-4">
          <p className="text-[11px] text-oriental-gray uppercase tracking-wider mb-1">Sin centro (pendientes)</p>
          <p className="text-2xl font-bold text-oriental-black">{visibles.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] text-oriental-gray uppercase tracking-wider mb-1">Monto (USD)</p>
          <p className="text-2xl font-bold text-oriental-black">${fmt(totalUsd)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] text-oriental-gray uppercase tracking-wider mb-1">Clasificados en esta sesión</p>
          <p className="text-2xl font-bold text-green-600">{hechos.size}</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por número, beneficiario o categoría…"
          className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oriental-red" />
      </div>

      {conSugerencia.length > 0 && (
        <div className="flex items-center justify-between mb-4 rounded-xl border border-oriental-red/20 bg-oriental-red/5 px-4 py-3">
          <p className="text-xs text-oriental-black flex items-center gap-1.5">
            <Sparkles size={14} className="text-oriental-red" />
            <b>{conSugerencia.length}</b> con centro sugerido listo para aplicar
          </p>
          <button onClick={aplicarTodas} disabled={bulk}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-oriental-red text-white text-xs font-bold hover:bg-oriental-red/90 disabled:opacity-50">
            {bulk ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Aplicar todas las sugerencias
          </button>
        </div>
      )}

      {visibles.length === 0 ? (
        <div className="card p-12 text-center text-oriental-gray">
          <Check size={28} className="mx-auto text-green-400 mb-2" />
          <p className="text-sm">No quedan egresos sin centro de costo.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2.5 font-medium text-oriental-gray text-xs">N°</th>
                  <th className="text-left px-3 py-2.5 font-medium text-oriental-gray text-xs">Beneficiario</th>
                  <th className="text-left px-3 py-2.5 font-medium text-oriental-gray text-xs">Categoría</th>
                  <th className="text-right px-3 py-2.5 font-medium text-oriental-gray text-xs">Monto</th>
                  <th className="text-left px-3 py-2.5 font-medium text-oriental-gray text-xs">Centro de costo</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visibles.map(f => {
                  const elegido = sel[f.id] ?? f.sugerido ?? ''
                  return (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <p className="font-mono text-[11px] text-oriental-gray">{f.numero}</p>
                        <p className="text-[10px] text-gray-400">{fmtFecha(f.fecha)}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-oriental-black text-xs font-medium">{f.beneficiario}</p>
                        {f.concepto && <p className="text-[10px] text-gray-400 truncate max-w-[180px]">{f.concepto}</p>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{f.categoria ?? '—'}</span>
                        {f.sugerido && (
                          <p className="text-[10px] text-oriental-red mt-0.5 flex items-center gap-1"><Sparkles size={9} /> Sugerido: {nombreCentro(f.sugerido)}</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-oriental-black whitespace-nowrap">${fmt(f.montoUsd)}</td>
                      <td className="px-3 py-2.5">
                        <select value={elegido} onChange={e => setSel(p => ({ ...p, [f.id]: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:border-oriental-red">
                          <option value="">— Elegir —</option>
                          <option value={COMUN}>Gasto común (se reparte por %)</option>
                          {centros.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => aplicar(f)} disabled={!elegido || saving === f.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 disabled:opacity-40 whitespace-nowrap">
                          {saving === f.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Aplicar
                        </button>
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
