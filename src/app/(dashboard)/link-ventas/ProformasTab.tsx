'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Search, ExternalLink, ShoppingCart, CheckCircle2 } from 'lucide-react'

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
    </div>
  )
}
