'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

/* eslint-disable @typescript-eslint/no-explicit-any */

type Estado = 'aceptada' | 'rechazada' | 'sin_respuesta' | 'pospuesta'

interface Cotizacion {
  id: string
  numero: string
  fecha: string
  vencimiento: string
  vendedora_nombre: string
  cliente_nombre: string
  cliente_ci_rif: string
  cliente_correo: string
  cliente_telefono: string | null
  cliente_direccion: string | null
  cliente_ciudad_estado: string | null
  cliente_codigo_postal: string | null
  agente_retencion: boolean
  marca: string
  modelo: string
  modalidad: 'contado' | 'credito_24' | 'ac500'
  plan: string
  precio_base: number
  iva_monto: number
  gastos_monto: number
  financiamiento_monto: number | null
  cuota_mensual: number | null
  total_inicial: number
  costo_total: number
  estado: Estado
  motivo_rechazo: string | null
  descuento_solicitado: boolean
  motivo_descuento: string | null
  created_at: string
}

function fmt(n: number | null | undefined) {
  if (n == null) return '0,00'
  return Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtFecha(s: string) {
  try { return new Date(s + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return s }
}

const ESTADO_CFG: Record<Estado, { label: string; cls: string; dot: string }> = {
  sin_respuesta: { label: 'Sin respuesta',    cls: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400' },
  aceptada:      { label: 'Aceptada',         cls: 'bg-green-50 text-green-700',  dot: 'bg-green-500' },
  rechazada:     { label: 'No le interesó',   cls: 'bg-red-50 text-red-700',      dot: 'bg-red-500' },
  pospuesta:     { label: 'Por ahora no',     cls: 'bg-amber-50 text-amber-700',  dot: 'bg-amber-400' },
}

function EstadoBadge({ estado }: { estado: Estado }) {
  const cfg = ESTADO_CFG[estado] ?? ESTADO_CFG.sin_respuesta
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function ModalidadBadge({ modalidad, plan }: { modalidad: string; plan: string }) {
  if (modalidad === 'ac500') return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-900 text-white">Asegúrate $500</span>
  if (modalidad === 'contado') return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">Contado</span>
  if (plan === 'banco_100') return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700">100% Banco</span>
  return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-50 text-yellow-700">Crédito 24m</span>
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      <span className="text-xs font-semibold text-oriental-black text-right max-w-[60%]">{value}</span>
    </div>
  )
}

function MontoRow({ label, value, highlight }: { label: string; value: number | null | undefined; highlight?: boolean }) {
  if (value == null) return null
  return (
    <div className={`flex justify-between py-2 border-b border-gray-50 last:border-0 ${highlight ? 'mt-1' : ''}`}>
      <span className={`text-xs font-medium ${highlight ? 'font-bold text-oriental-black' : 'text-gray-500'}`}>{label}</span>
      <span className={`text-xs font-bold ${highlight ? 'text-base text-oriental-black' : 'text-oriental-black'}`}>${fmt(value)}</span>
    </div>
  )
}

/* ── Detail Panel ── */
function DetailPanel({ cot: cotInicial, onClose, onEstadoChange, onMontosChange }: {
  cot: Cotizacion
  onClose: () => void
  onEstadoChange: (id: string, estado: Estado, motivo: string | null) => void
  onMontosChange: (id: string, partial: Partial<Cotizacion>) => void
}) {
  const router = useRouter()
  const [cot, setCot] = useState(cotInicial)
  const [saving, setSaving] = useState(false)
  const [pendingEstado, setPendingEstado] = useState<Estado | null>(null)
  const [motivo, setMotivo] = useState(cot.motivo_rechazo ?? '')
  const [motivoError, setMotivoError] = useState('')

  // Editar montos
  const [editando, setEditando] = useState(false)
  const [eForm, setEForm] = useState({
    precio_base: String(cot.precio_base),
    gastos_monto: String(cot.gastos_monto),
    cuota_mensual: String(cot.cuota_mensual ?? ''),
    modalidad: cot.modalidad as 'contado' | 'credito_24',
    plan: cot.plan as 'vehimotors' | 'banco_100',
  })
  const [eError, setEError] = useState('')
  const [eSaving, setESaving] = useState(false)

  // Reenviar
  const [reenviarMsg, setReenviarMsg] = useState('')
  const [reenviarLoading, setReenviarLoading] = useState(false)

  async function reenviarCotizacion() {
    setReenviarLoading(true); setReenviarMsg('')
    try {
      const res = await fetch(`/api/cotizaciones/${cot.id}/reenviar`, { method: 'POST' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Error')
      setCot(prev => ({ ...prev, descuento_solicitado: false }))
      onMontosChange(cot.id, { descuento_solicitado: false })
      setReenviarMsg('✓ Cotización reenviada al cliente.')
    } catch (e: any) {
      setReenviarMsg(`Error: ${e.message}`)
    } finally { setReenviarLoading(false) }
  }

  async function cambiarEstado(estado: Estado) {
    if (estado === 'rechazada' && !motivo.trim()) { setMotivoError('Indica el motivo del rechazo.'); return }
    setMotivoError('')
    setSaving(true)
    try {
      const res = await fetch(`/api/cotizaciones/${cot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, motivo_rechazo: estado === 'rechazada' ? motivo.trim() : null }),
      })
      if (res.ok) {
        onEstadoChange(cot.id, estado, estado === 'rechazada' ? motivo.trim() : null)
        setCot(prev => ({ ...prev, estado, motivo_rechazo: estado === 'rechazada' ? motivo.trim() : null }))
        setPendingEstado(null)
      }
    } finally { setSaving(false) }
  }

  async function guardarMontos() {
    setEError('')
    const precio_base = parseFloat(eForm.precio_base.replace(',', '.'))
    const gastos_monto = parseFloat(eForm.gastos_monto.replace(',', '.'))
    const cuota_mensual = eForm.cuota_mensual ? parseFloat(eForm.cuota_mensual.replace(',', '.')) : null
    if (isNaN(precio_base) || precio_base <= 0) { setEError('Precio base inválido'); return }
    if (isNaN(gastos_monto) || gastos_monto < 0) { setEError('Gastos inválidos'); return }
    setESaving(true)
    const res = await fetch(`/api/cotizaciones/${cot.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'editar_montos', precio_base, gastos_monto, cuota_mensual, modalidad: eForm.modalidad, plan: eForm.plan }),
    })
    setESaving(false)
    if (!res.ok) { const j = await res.json(); setEError(j.error ?? 'Error'); return }
    const { data } = await res.json()
    const updated = { ...cot, ...data }
    setCot(updated)
    onMontosChange(cot.id, data)
    setEditando(false)
  }

  const es24 = cot.modalidad === 'credito_24'
  const inCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red bg-white'

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <p className="font-mono text-sm font-bold text-oriental-red">{cot.numero}</p>
            <p className="text-xs text-gray-400 mt-0.5">{fmtFecha(cot.fecha)} · vence {fmtFecha(cot.vencimiento)}</p>
          </div>
          <div className="flex items-center gap-2">
            <a href={`/api/cotizaciones/${cot.id}/pdf`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-oriental-red text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors">
              Ver PDF
            </a>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors text-sm">✕</button>
          </div>
        </div>

        <div className="flex-1 px-5 py-4 space-y-5">
          {/* Registrar venta */}
          <button
            onClick={() => { onClose(); router.push(`/vehiculos/nuevo?cotizacionId=${cot.id}`) }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm transition-colors"
          >
            🚗 Registrar venta desde esta cotización
          </button>

          {/* Estado actual */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</span>
            <EstadoBadge estado={cot.estado} />
          </div>

          {/* Vehículo */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-[10px] font-bold text-oriental-red uppercase tracking-wider mb-1">{cot.marca}</p>
            <p className="font-bold text-oriental-black text-base mb-2">{cot.modelo}</p>
            <div className="flex gap-2 flex-wrap">
              <ModalidadBadge modalidad={cot.modalidad} plan={cot.plan} />
            </div>
          </div>

          {/* Montos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Desglose económico</p>
              <button onClick={() => { setEditando(e => !e); setEError('') }}
                className="text-[11px] font-bold text-oriental-red hover:underline">
                {editando ? 'Cancelar edición' : 'Editar montos'}
              </button>
            </div>

            {editando ? (
              <div className="border border-orange-200 bg-orange-50 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">Modalidad</label>
                    <select className={inCls} value={eForm.modalidad} onChange={e => setEForm(p => ({ ...p, modalidad: e.target.value as 'contado'|'credito_24' }))}>
                      <option value="contado">Contado</option>
                      <option value="credito_24">Crédito 24m</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">Plan</label>
                    <select className={inCls} value={eForm.plan} onChange={e => setEForm(p => ({ ...p, plan: e.target.value as 'vehimotors'|'banco_100' }))}>
                      <option value="vehimotors">Vehimotors</option>
                      <option value="banco_100">100% Banco</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Precio base ($)</label>
                  <input className={inCls} value={eForm.precio_base} onChange={e => setEForm(p => ({ ...p, precio_base: e.target.value }))} placeholder="30000" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Gastos totales ($) — puede ajustar para aplicar descuento</label>
                  <input className={inCls} value={eForm.gastos_monto} onChange={e => setEForm(p => ({ ...p, gastos_monto: e.target.value }))} placeholder="3500" />
                </div>
                {eForm.modalidad === 'credito_24' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">Cuota mensual ($/mes)</label>
                    <input className={inCls} value={eForm.cuota_mensual} onChange={e => setEForm(p => ({ ...p, cuota_mensual: e.target.value }))} placeholder="1200" />
                  </div>
                )}
                {eError && <p className="text-xs text-red-600">{eError}</p>}
                <button onClick={guardarMontos} disabled={eSaving}
                  className="w-full py-2.5 bg-oriental-red text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50">
                  {eSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-xl px-4">
                <MontoRow label="Precio base" value={cot.precio_base} />
                <MontoRow label="IVA (16%)" value={cot.iva_monto} />
                <MontoRow label="Gastos" value={cot.gastos_monto} />
                {es24 && cot.financiamiento_monto != null && (
                  <MontoRow label={cot.plan === 'banco_100' ? 'Financiamiento 70%' : 'Financiamiento 60%'} value={cot.financiamiento_monto} />
                )}
                <div className="pt-1">
                  <MontoRow label={es24 ? 'Total inicial a pagar' : 'Total a pagar'} value={cot.total_inicial} highlight />
                </div>
                {es24 && cot.cuota_mensual != null && (
                  <MontoRow label="Cuota mensual × 24" value={cot.cuota_mensual} />
                )}
              </div>
            )}
          </div>

          {/* Cliente */}
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Datos del cliente</p>
            <div className="bg-white border border-gray-100 rounded-xl px-4">
              <InfoRow label="Nombre" value={cot.cliente_nombre} />
              <InfoRow label="C.I. / RIF" value={cot.cliente_ci_rif} />
              <InfoRow label="Correo" value={cot.cliente_correo} />
              <InfoRow label="Teléfono" value={cot.cliente_telefono} />
              <InfoRow label="Dirección" value={cot.cliente_direccion} />
              <InfoRow label="Ciudad / Estado" value={cot.cliente_ciudad_estado} />
              <InfoRow label="Código postal" value={cot.cliente_codigo_postal} />
              {cot.agente_retencion && (
                <div className="py-2">
                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">Agente de Retención</span>
                </div>
              )}
            </div>
          </div>

          <InfoRow label="Vendedora" value={cot.vendedora_nombre} />

          {cot.estado === 'rechazada' && cot.motivo_rechazo && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">Motivo de rechazo</p>
              <p className="text-sm text-red-800">{cot.motivo_rechazo}</p>
            </div>
          )}

          {/* Solicitud de descuento */}
          {cot.descuento_solicitado && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">💬</span>
                <div>
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Cliente solicita revisión de precio</p>
                  <p className="text-[11px] text-amber-600 mt-0.5">Edita los montos y reenvía la cotización actualizada al cliente.</p>
                </div>
              </div>
              {cot.motivo_descuento && (
                <div className="bg-white border border-amber-200 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Mensaje del cliente</p>
                  <p className="text-sm text-amber-900 italic">"{cot.motivo_descuento}"</p>
                </div>
              )}
              <button
                onClick={reenviarCotizacion}
                disabled={reenviarLoading}
                className="w-full py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
              >
                {reenviarLoading ? 'Reenviando...' : '📤 Reenviar cotización actualizada al cliente'}
              </button>
              {reenviarMsg && (
                <p className={`text-xs font-semibold ${reenviarMsg.startsWith('✓') ? 'text-green-700' : 'text-red-600'}`}>{reenviarMsg}</p>
              )}
            </div>
          )}

          {/* Reenviar (sin solicitud activa) */}
          {!cot.descuento_solicitado && (
            <div className="border border-gray-100 rounded-xl p-4">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Reenviar cotización</p>
              <button
                onClick={reenviarCotizacion}
                disabled={reenviarLoading}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                {reenviarLoading ? 'Reenviando...' : '📤 Reenviar PDF al cliente'}
              </button>
              {reenviarMsg && (
                <p className={`text-xs font-semibold mt-2 ${reenviarMsg.startsWith('✓') ? 'text-green-700' : 'text-red-600'}`}>{reenviarMsg}</p>
              )}
            </div>
          )}

          {/* Cambiar estado */}
          <div className="border border-gray-100 rounded-xl p-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Cambiar estado</p>
            <div className="flex gap-2">
              {(['aceptada', 'pospuesta', 'sin_respuesta', 'rechazada'] as Estado[]).map(e => (
                <button key={e} onClick={() => { setPendingEstado(e); setMotivoError('') }}
                  className={`flex-1 py-2 px-2 rounded-lg border-2 text-[11px] font-bold transition-all ${
                    pendingEstado === e
                      ? e === 'aceptada'  ? 'border-green-500 bg-green-50 text-green-700'
                        : e === 'rechazada' ? 'border-red-500 bg-red-50 text-red-700'
                        : e === 'pospuesta' ? 'border-amber-400 bg-amber-50 text-amber-700'
                        : 'border-gray-400 bg-gray-100 text-gray-700'
                      : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}>{ESTADO_CFG[e].label}</button>
              ))}
            </div>
            {pendingEstado === 'rechazada' && (
              <div className="mt-3">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Motivo del rechazo *</label>
                <textarea className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red resize-none"
                  rows={3} placeholder="Ej: El cliente prefirió otro modelo..."
                  value={motivo} onChange={e => { setMotivo(e.target.value); setMotivoError('') }} />
                {motivoError && <p className="text-xs text-red-600 mt-1">{motivoError}</p>}
              </div>
            )}
            {pendingEstado && (
              <div className="flex gap-2 mt-3">
                <button onClick={() => setPendingEstado(null)} className="px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50">Cancelar</button>
                <button onClick={() => cambiarEstado(pendingEstado)} disabled={saving}
                  className="flex-1 py-2 bg-oriental-black text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Confirmar cambio'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Main Tab ── */
type Filtro = 'todas' | Estado | 'descuento'

export default function CotizacionesTab() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [selected, setSelected] = useState<Cotizacion | null>(null)

  useEffect(() => {
    fetch('/api/cotizaciones?limit=100')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCotizaciones(data) })
      .finally(() => setLoading(false))
  }, [])

  const handleEstadoChange = useCallback((id: string, estado: Estado, motivo: string | null) => {
    setCotizaciones(prev => prev.map(c => c.id === id ? { ...c, estado, motivo_rechazo: motivo } : c))
    setSelected(prev => prev && prev.id === id ? { ...prev, estado, motivo_rechazo: motivo } : prev)
  }, [])

  const handleMontosChange = useCallback((id: string, partial: Partial<Cotizacion>) => {
    setCotizaciones(prev => prev.map(c => c.id === id ? { ...c, ...partial } : c))
    setSelected(prev => prev && prev.id === id ? { ...prev, ...partial } : prev)
  }, [])

  const visible = filtro === 'todas' ? cotizaciones
    : filtro === 'descuento' ? cotizaciones.filter(c => c.descuento_solicitado)
    : cotizaciones.filter(c => c.estado === filtro)

  const counts = {
    todas: cotizaciones.length,
    sin_respuesta: cotizaciones.filter(c => c.estado === 'sin_respuesta').length,
    aceptada: cotizaciones.filter(c => c.estado === 'aceptada').length,
    pospuesta: cotizaciones.filter(c => c.estado === 'pospuesta').length,
    rechazada: cotizaciones.filter(c => c.estado === 'rechazada').length,
    descuento: cotizaciones.filter(c => c.descuento_solicitado).length,
  }

  if (loading) return <div className="card p-8 text-center text-oriental-gray text-sm">Cargando cotizaciones...</div>

  if (cotizaciones.length === 0) {
    return (
      <div className="card p-16 text-center text-oriental-gray">
        <p className="text-2xl mb-3">📄</p>
        <p className="font-semibold text-sm">No hay cotizaciones generadas todavía.</p>
        <p className="text-xs mt-1">Las cotizaciones aparecerán aquí cuando las vendedoras las generen.</p>
      </div>
    )
  }

  const filtros: { key: Filtro; label: string; count: number; amber?: boolean }[] = [
    { key: 'todas',         label: 'Todas',              count: counts.todas },
    { key: 'descuento',     label: '💬 Piden descuento', count: counts.descuento, amber: true },
    { key: 'sin_respuesta', label: 'Sin respuesta',      count: counts.sin_respuesta },
    { key: 'aceptada',      label: 'Aceptadas',          count: counts.aceptada },
    { key: 'pospuesta',     label: 'Por ahora no',       count: counts.pospuesta },
    { key: 'rechazada',     label: 'No les interesó',    count: counts.rechazada },
  ]

  return (
    <div>
      {selected && (
        <DetailPanel
          cot={selected}
          onClose={() => setSelected(null)}
          onEstadoChange={handleEstadoChange}
          onMontosChange={handleMontosChange}
        />
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-oriental-black">Cotizaciones</h2>
          <p className="text-xs text-oriental-gray mt-0.5">{cotizaciones.length} cotización{cotizaciones.length !== 1 ? 'es' : ''} registradas</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {filtros.map(f => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
              filtro === f.key
                ? f.amber ? 'border-amber-600 bg-amber-600 text-white' : 'border-oriental-black bg-oriental-black text-white'
                : f.amber && f.count > 0 ? 'border-amber-400 text-amber-700 hover:border-amber-500 animate-pulse'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {f.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${filtro === f.key ? 'bg-white/20 text-white' : f.amber && f.count > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card p-10 text-center text-oriental-gray text-sm">
          No hay cotizaciones con este estado.
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['N° Cotización', 'Fecha', 'Cliente', 'Vehículo', 'Modalidad', 'Vendedora', 'Total inicial', 'Estado', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-oriental-gray uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-bold text-oriental-red">{c.numero}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-oriental-gray whitespace-nowrap">{fmtFecha(c.fecha)}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-oriental-black text-xs">{c.cliente_nombre}</p>
                      <p className="text-[11px] text-oriental-gray">{c.cliente_ci_rif}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-xs text-oriental-black">{c.modelo}</p>
                      <p className="text-[11px] text-oriental-gray">{c.marca}</p>
                    </td>
                    <td className="px-4 py-3">
                      <ModalidadBadge modalidad={c.modalidad} plan={c.plan} />
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-oriental-black">{c.vendedora_nombre}</td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-bold text-sm text-oriental-black">${fmt(c.total_inicial)}</p>
                      {c.cuota_mensual != null && (
                        <p className="text-[11px] text-oriental-gray">{fmt(c.cuota_mensual)}/mes</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={c.estado ?? 'sin_respuesta'} />
                      {c.descuento_solicitado && (
                        <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-300">
                          💬 Pide descuento
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <a
                        href={`/api/cotizaciones/${c.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-oriental-red hover:text-white text-gray-600 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap"
                      >
                        Ver PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {visible.map(c => (
              <div key={c.id} onClick={() => setSelected(c)} className="card p-4 cursor-pointer active:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-oriental-red">{c.numero}</span>
                    <p className="text-[11px] text-oriental-gray mt-0.5">{fmtFecha(c.fecha)} · {c.vendedora_nombre}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <EstadoBadge estado={c.estado ?? 'sin_respuesta'} />
                    {c.descuento_solicitado && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-300">
                        💬 Pide descuento
                      </span>
                    )}
                  </div>
                </div>
                <p className="font-bold text-sm text-oriental-black">{c.modelo}</p>
                <p className="text-xs text-oriental-gray mb-2">{c.cliente_nombre} · {c.cliente_ci_rif}</p>
                <div className="flex items-center justify-between">
                  <ModalidadBadge modalidad={c.modalidad} plan={c.plan} />
                  <p className="text-sm font-bold text-oriental-black">${fmt(c.total_inicial)}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
