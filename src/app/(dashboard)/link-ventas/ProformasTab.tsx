'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Search, ExternalLink, ShoppingCart, CheckCircle2, Pencil, Trash2, X, Loader2 } from 'lucide-react'

type Proforma = {
  id: string
  numero: string
  fecha_emision: string
  cliente_id: string | null
  credito_id: string | null
  vehiculo_id: string | null
  cotizacion_id: string | null
  cliente_snapshot: any
  vehiculo_snapshot: any
  precio_vehiculo: number | null
  monto_inicial: number | null
  monto_financiado: number | null
  num_cuotas: number | null
  created_at: string
}

const fmt = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtFecha = (s: string | null) => {
  if (!s) return '—'
  try { return new Date(s + (s.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return s }
}

// Normaliza para búsqueda sin acentos/mayúsculas.
const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function ProformasTab() {
  const router = useRouter()
  const [proformas, setProformas] = useState<Proforma[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [editando, setEditando] = useState<Proforma | null>(null)

  function cargar() {
    fetch('/api/proformas?limit=100')
      .then(r => r.json())
      .then((d) => { if (Array.isArray(d)) setProformas(d) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { cargar() }, [])

  async function liberarUnidad(proformaId: string) {
    if (!confirm('¿Liberar la unidad reservada? Volverá a estar disponible en el showroom.')) return
    const r = await fetch(`/api/proformas/${proformaId}/liberar-unidad`, { method: 'POST' })
    if (r.ok) cargar()
    else alert((await r.json().catch(() => ({}))).error ?? 'No se pudo liberar')
  }

  async function borrar(p: Proforma) {
    if (!confirm(`¿Borrar la proforma ${p.numero}? Esta acción no se puede deshacer${p.vehiculo_snapshot?.showroom_id ? ' y libera la unidad reservada' : ''}.`)) return
    const r = await fetch(`/api/proformas/${p.id}`, { method: 'DELETE' })
    if (r.ok) cargar()
    else alert((await r.json().catch(() => ({}))).error ?? 'No se pudo borrar')
  }

  const filtradas = useMemo(() => {
    const nq = norm(q.trim())
    if (!nq) return proformas
    return proformas.filter(p => {
      const nom = norm(p.cliente_snapshot?.nombre ?? '')
      const ci = norm(p.cliente_snapshot?.cedula_rif ?? '')
      const num = norm(p.numero)
      const mod = norm(`${p.vehiculo_snapshot?.marca ?? ''} ${p.vehiculo_snapshot?.modelo ?? ''}`)
      return nom.includes(nq) || ci.includes(nq) || num.includes(nq) || mod.includes(nq)
    })
  }, [proformas, q])

  return (
    <div>
      <div className="mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar por cliente, cédula, N° de proforma o modelo…"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oriental-red"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-center text-sm text-gray-400 py-10">Cargando proformas…</p>
      ) : filtradas.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-10">
          {q ? 'No hay proformas que coincidan con la búsqueda.' : 'Aún no hay proformas. Genera una desde una cotización aceptada.'}
        </p>
      ) : (
        <div className="space-y-2.5">
          {filtradas.map(p => {
            const esPreventa = !p.credito_id && !!p.cotizacion_id
            const vendida = !!p.vehiculo_id
            const cliente = p.cliente_snapshot?.nombre ?? '—'
            const ci = p.cliente_snapshot?.cedula_rif ?? ''
            const veh = `${p.vehiculo_snapshot?.marca ?? ''} ${p.vehiculo_snapshot?.modelo ?? ''}`.trim() || '—'
            return (
              <div key={p.id} className="border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-sm font-bold text-indigo-700">{p.numero}</span>
                    <span className="text-[10px] text-gray-400">{fmtFecha(p.fecha_emision)}</span>
                    {esPreventa && !vendida && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700">Pre-venta</span>
                    )}
                    {vendida && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-700 flex items-center gap-1">
                        <CheckCircle2 size={10} /> Venta registrada
                      </span>
                    )}
                    {!esPreventa && !vendida && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-600">Crédito</span>
                    )}
                  </div>
                  <p className="font-semibold text-oriental-black text-sm truncate">{cliente} {ci && <span className="text-gray-400 font-normal text-xs">· {ci}</span>}</p>
                  <p className="text-gray-500 text-xs">{veh} · Inicial ${fmt(p.monto_inicial)}{Number(p.monto_financiado) > 0 ? ` · Financiado $${fmt(p.monto_financiado)}` : ''}</p>
                  {p.vehiculo_snapshot?.showroom_id && !vendida && (
                    <p className="text-[11px] text-amber-700 font-semibold mt-0.5">🔒 Unidad reservada{p.vehiculo_snapshot?.placa ? `: ${p.vehiculo_snapshot.placa}` : ''}{p.vehiculo_snapshot?.color ? ` · ${p.vehiculo_snapshot.color}` : ''}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a href={`/api/proformas/${p.id}/pdf`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50">
                    <ExternalLink size={13} /> PDF
                  </a>
                  {vendida ? (
                    <button onClick={() => router.push(`/vehiculos/${p.vehiculo_id}`)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold">
                      Ver vehículo
                    </button>
                  ) : esPreventa ? (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setEditando(p)} title="Editar proforma"
                        className="flex items-center justify-center w-8 h-8 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => borrar(p)} title="Borrar proforma"
                        className="flex items-center justify-center w-8 h-8 border border-gray-200 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 size={13} />
                      </button>
                      {p.vehiculo_snapshot?.showroom_id && (
                        <button onClick={() => liberarUnidad(p.id)}
                          className="flex items-center gap-1 px-2.5 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-xs font-bold"
                          title="Liberar la unidad reservada">
                          Liberar
                        </button>
                      )}
                      <button onClick={() => { const sid = p.vehiculo_snapshot?.showroom_id; router.push(`/vehiculos/nuevo?proformaId=${p.id}${sid ? `&showroomId=${sid}` : ''}`) }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-oriental-red hover:bg-red-700 text-white rounded-lg text-xs font-bold">
                        <ShoppingCart size={13} /> Registrar venta
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editando && <EditProformaModal p={editando} onClose={() => setEditando(null)} onSaved={() => { setEditando(null); cargar() }} />}
    </div>
  )
}

function EditProformaModal({ p, onClose, onSaved }: { p: Proforma; onClose: () => void; onSaved: () => void }) {
  const [precio, setPrecio] = useState(String(p.precio_vehiculo ?? ''))
  const [inicial, setInicial] = useState(String(p.monto_inicial ?? ''))
  const [financiado, setFinanciado] = useState(String(p.monto_financiado ?? ''))
  const [meses, setMeses] = useState(String(p.num_cuotas ?? ''))
  const [condiciones, setCondiciones] = useState<string>((p as any).condiciones_personalizadas ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:border-oriental-red'

  async function guardar() {
    setSaving(true); setError('')
    const r = await fetch(`/api/proformas/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ precio, inicial, financiado, meses, condiciones }),
    })
    setSaving(false)
    if (r.ok) onSaved()
    else setError((await r.json().catch(() => ({}))).error ?? 'No se pudo guardar')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && onClose()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-oriental-black text-sm flex items-center gap-2"><Pencil size={15} className="text-indigo-600" /> Editar proforma</h3>
            <p className="text-xs text-gray-400 font-mono">{p.numero}</p>
          </div>
          <button onClick={() => !saving && onClose()} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-800">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[11px] font-semibold text-gray-500 mb-1">Precio ($)</label><input className={inp} inputMode="decimal" value={precio} onChange={e => setPrecio(e.target.value)} /></div>
            <div><label className="block text-[11px] font-semibold text-gray-500 mb-1">Inicial ($)</label><input className={inp} inputMode="decimal" value={inicial} onChange={e => setInicial(e.target.value)} /></div>
            <div><label className="block text-[11px] font-semibold text-gray-500 mb-1">Financiado ($)</label><input className={inp} inputMode="decimal" value={financiado} onChange={e => setFinanciado(e.target.value)} /></div>
            <div><label className="block text-[11px] font-semibold text-gray-500 mb-1">N° cuotas</label><input className={inp} inputMode="numeric" value={meses} onChange={e => setMeses(e.target.value)} /></div>
          </div>
          <div><label className="block text-[11px] font-semibold text-gray-500 mb-1">Condiciones de pago</label>
            <textarea className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:border-oriental-red" rows={3} value={condiciones} onChange={e => setCondiciones(e.target.value)} /></div>
          <p className="text-[10px] text-gray-400">Para reestructurar los abonos/cuotas en detalle, bórrala y genérala de nuevo desde la cotización.</p>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
            <button onClick={guardar} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-indigo-700 text-white text-sm font-semibold hover:bg-indigo-800 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />} Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
