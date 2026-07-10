'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckSquare, Square, ExternalLink, Send, Loader2, X, ArrowRightLeft } from 'lucide-react'

const CANAL_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  personal_jose: 'Cta. José',
  personal_carla: 'Cta. Carla',
  personal_mary: 'Cta. Mary',
  personal_leysdem: 'Cta. Leysdem',
  zelle: 'Zelle',
  usdt: 'USDT',
  otro: 'Otro',
}

const ROL_LABELS: Record<string, string> = {
  jose: 'José Rojas',
  carla: 'Carla',
  mary: 'Mary',
  leysdem: 'Leysdem',
}

interface Ingreso {
  id: string
  numero_recibo: string
  monto: number
  moneda: string
  tasa_cambio: number | null
  canal_destino: string | null
  custodio_desde: string | null
  fecha_pago: string
  concepto: string
  clientes: { nombre: string | null } | null
}

interface Custodio { id: string; nombre: string; rol: string }

interface Props {
  ingresos: Ingreso[]
  custodios: Custodio[]
  custodioActualId: string
}

function fmtMoneda(n: number, moneda: string) {
  const prefix = moneda === 'VES' ? 'Bs.' : moneda
  return `${prefix} ${n.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(n)*100)%100===0?0:2, maximumFractionDigits: 2 })}`
}

export default function BandejaCustodio({ ingresos, custodios, custodioActualId }: Props) {
  const router = useRouter()
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [showTraspaso, setShowTraspaso] = useState(false)
  const [showDeposito, setShowDeposito] = useState(false)

  // El total seleccionado se muestra en USD. Un pago en bolívares se convierte
  // con su tasa; nunca se suma el monto en Bs como si fueran dólares.
  const totalSeleccionado = useMemo(
    () => ingresos.filter(i => seleccionados.has(i.id)).reduce((s, i) => {
      const usd = i.moneda === 'VES' && Number(i.tasa_cambio) > 0
        ? Number(i.monto) / Number(i.tasa_cambio)
        : Number(i.monto)
      return s + usd
    }, 0),
    [ingresos, seleccionados]
  )

  function toggle(id: string) {
    setSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleTodos() {
    if (seleccionados.size === ingresos.length) setSeleccionados(new Set())
    else setSeleccionados(new Set(ingresos.map(i => i.id)))
  }

  return (
    <>
      {/* Barra de acciones sobre la seleccion */}
      {seleccionados.size > 0 && (
        <div className="sticky top-0 z-10 bg-oriental-black text-white rounded-xl p-3 mb-3 flex items-center justify-between gap-3 flex-wrap shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wide">
              {seleccionados.size} seleccionado{seleccionados.size !== 1 ? 's' : ''}
            </span>
            <span className="text-sm font-black">
              USD {totalSeleccionado.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(totalSeleccionado)*100)%100===0?0:2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowTraspaso(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
            >
              <ArrowRightLeft size={13} /> Entregar a…
            </button>
            <button
              onClick={() => setShowDeposito(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
            >
              <Send size={13} /> Enviar a depositar
            </button>
            <button
              onClick={() => setSeleccionados(new Set())}
              className="flex items-center gap-1 px-2 py-2 rounded-lg text-gray-300 hover:text-white text-xs"
            >
              <X size={12} /> Limpiar
            </button>
          </div>
        </div>
      )}

      {/* Header de lista */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white rounded-t-xl border border-gray-100">
        <button
          onClick={toggleTodos}
          className="flex items-center gap-2 text-xs font-bold text-oriental-gray hover:text-oriental-black"
        >
          {seleccionados.size === ingresos.length && ingresos.length > 0 ? (
            <CheckSquare size={14} className="text-oriental-red" />
          ) : (
            <Square size={14} />
          )}
          Seleccionar todos
        </button>
      </div>

      {/* Lista */}
      <div className="divide-y divide-gray-100 bg-white rounded-b-xl border-l border-r border-b border-gray-100">
        {ingresos.map(ing => {
          const marcado = seleccionados.has(ing.id)
          return (
            <div
              key={ing.id}
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${marcado ? 'bg-red-50/60' : 'hover:bg-gray-50'}`}
            >
              <button
                onClick={() => toggle(ing.id)}
                className="flex-shrink-0"
                aria-label="Seleccionar"
              >
                {marcado ? (
                  <CheckSquare size={16} className="text-oriental-red" />
                ) : (
                  <Square size={16} className="text-gray-300" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-mono text-[11px] font-bold text-oriental-gray">{ing.numero_recibo}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-oriental-gray uppercase">
                    {CANAL_LABELS[ing.canal_destino ?? ''] ?? ing.canal_destino}
                  </span>
                </div>
                <p className="text-sm font-semibold text-oriental-black truncate">{ing.clientes?.nombre ?? '—'}</p>
                <p className="text-[11px] text-oriental-gray truncate">{ing.concepto}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-black text-oriental-black">{fmtMoneda(ing.monto, ing.moneda)}</p>
                <p className="text-[10px] text-oriental-gray">
                  {ing.custodio_desde
                    ? new Date(ing.custodio_desde).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })
                    : ''}
                </p>
              </div>
              <Link
                href={`/ingresos/${ing.id}`}
                className="text-gray-300 hover:text-oriental-black flex-shrink-0"
                title="Ver recibo"
              >
                <ExternalLink size={14} />
              </Link>
            </div>
          )
        })}
      </div>

      {showTraspaso && (
        <ModalTraspaso
          ingresoIds={Array.from(seleccionados)}
          custodios={custodios.filter(c => c.id !== custodioActualId)}
          onClose={() => setShowTraspaso(false)}
          onDone={() => { setShowTraspaso(false); setSeleccionados(new Set()); router.refresh() }}
        />
      )}

      {showDeposito && (
        <ModalEnviarDeposito
          ingresoIds={Array.from(seleccionados)}
          total={totalSeleccionado}
          onClose={() => setShowDeposito(false)}
          onDone={() => { setShowDeposito(false); setSeleccionados(new Set()); router.refresh() }}
        />
      )}
    </>
  )
}

function ModalTraspaso({
  ingresoIds, custodios, onClose, onDone,
}: {
  ingresoIds: string[]
  custodios: Custodio[]
  onClose: () => void
  onDone: () => void
}) {
  const [nuevoId, setNuevoId] = useState('')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function confirmar() {
    if (!nuevoId) return
    setLoading(true); setError('')
    let ok = 0, fail = 0, ultimoErr = ''
    for (const id of ingresoIds) {
      const res = await fetch(`/api/ingresos/${id}/traspasar-custodia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuevoCustodioId: nuevoId, notas: notas.trim() || null }),
      })
      if (res.ok) ok += 1
      else { fail += 1; try { ultimoErr = (await res.json()).error ?? 'error' } catch { ultimoErr = 'error' } }
    }
    setLoading(false)
    if (fail > 0) setError(`${fail} de ${ingresoIds.length} fallaron. ${ultimoErr}`)
    if (ok > 0) onDone()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !loading && onClose()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-bold text-oriental-black text-base">Traspasar custodia</h2>
            <p className="text-xs text-oriental-gray mt-0.5">{ingresoIds.length} recibo{ingresoIds.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">Entregar a *</label>
            <div className="grid grid-cols-2 gap-2">
              {custodios.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setNuevoId(c.id)}
                  className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-colors ${
                    nuevoId === c.id
                      ? 'border-blue-600 bg-blue-50 text-blue-800'
                      : 'border-gray-200 text-oriental-gray hover:border-gray-300'
                  }`}
                >
                  {ROL_LABELS[c.rol] ?? c.nombre}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">Notas (opcional)</label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={2}
              placeholder="Motivo, condiciones…"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 mt-3">
            <p className="text-xs text-red-800">{error}</p>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-oriental-gray hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={loading || !nuevoId}
            className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'Traspasando…' : 'Entregar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalEnviarDeposito({
  ingresoIds, total, onClose, onDone,
}: {
  ingresoIds: string[]
  total: number
  onClose: () => void
  onDone: () => void
}) {
  const [destino, setDestino] = useState<'' | 'oriental' | 'vehimotors'>('')
  const [responsable, setResponsable] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [hora, setHora] = useState(new Date().toTimeString().slice(0, 5))
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function confirmar() {
    if (!destino || !responsable.trim()) return
    setLoading(true); setError('')
    const res = await fetch('/api/ingresos/enviar-deposito-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingresoIds, destino,
        responsable: responsable.trim(),
        fecha, hora,
        notas: notas.trim() || null,
      }),
    })
    setLoading(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Error al enviar')
      return
    }
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !loading && onClose()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-bold text-oriental-black text-base">Enviar a depositar</h2>
            <p className="text-xs text-oriental-gray mt-0.5">
              {ingresoIds.length} recibo{ingresoIds.length !== 1 ? 's' : ''} · USD {total.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(total)*100)%100===0?0:2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">Destino *</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'oriental',   label: 'Cta. La Oriental' },
                { key: 'vehimotors', label: 'Cta. Vehimotors' },
              ].map(d => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDestino(d.key as any)}
                  className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-colors ${
                    destino === d.key
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-gray-200 text-oriental-gray hover:border-gray-300'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">Quién lleva el efectivo *</label>
            <input
              type="text"
              value={responsable}
              onChange={e => setResponsable(e.target.value)}
              placeholder="Nombre del mensajero / responsable"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">Hora</label>
              <input
                type="time"
                value={hora}
                onChange={e => setHora(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">Notas (opcional)</label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={2}
              placeholder="Referencia, contexto…"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 mt-3">
            <p className="text-xs text-red-800">{error}</p>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-oriental-gray hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={loading || !destino || !responsable.trim()}
            className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'Enviando…' : 'Enviar a depositar'}
          </button>
        </div>
      </div>
    </div>
  )
}
