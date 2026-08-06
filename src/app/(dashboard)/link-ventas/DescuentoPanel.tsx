'use client'

import { useState } from 'react'
import { Percent, X, Loader2 } from 'lucide-react'

type Lineas = {
  placa: number; poliza_vehiculo: number; poliza_vida: number; gastos_vhm: number
  honorarios: number; gastos_int: number; alfombras: number; transporte: number
  accesorios: number; igtf: number; diferencial: number
}
type Estructura = {
  precioBase: number; modalidad: 'contado' | 'credito_24'; plan: string
  inicialPct: number; tasaPct: number; meses: number; cuotaVehimotors: number; lineas: Lineas
}

const CLAVES: { k: keyof Lineas; label: string }[] = [
  { k: 'placa', label: 'Placa' },
  { k: 'poliza_vehiculo', label: 'Póliza vehículo' },
  { k: 'poliza_vida', label: 'Póliza vida' },
  { k: 'gastos_vhm', label: 'Gastos Vehimotor' },
  { k: 'honorarios', label: 'Honorarios' },
  { k: 'gastos_int', label: 'Gastos internos' },
  { k: 'alfombras', label: 'Alfombras' },
  { k: 'transporte', label: 'Transporte' },
  { k: 'accesorios', label: 'Accesorios' },
  { k: 'igtf', label: 'IGTF' },
  { k: 'diferencial', label: 'Diferencial cambiario' },
]

const fmt = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100

// Cargos que se calculan solos a partir del precio base y el % inicial.
//  · Gastos Vehimotor = precio base × %financiado × 7%   (financiado = 100 − inicial; solo crédito)
//  · IGTF            = precio base × 3%
const calcVhm = (base: number, inicialPct: number) => r2(base * (1 - (inicialPct || 0) / 100) * 0.07)
const calcIgtf = (base: number) => r2(base * 0.03)

export default function DescuentoPanel({ cotId, numero, onDone }: { cotId: string; numero: string; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [est, setEst] = useState<Estructura | null>(null)
  const [motivo, setMotivo] = useState('')
  const [reenviar, setReenviar] = useState(true)
  // "Editado a mano": mientras esté en false, el cargo se recalcula solo al
  // cambiar el precio base o el % inicial. Se marca true si el usuario lo escribe.
  const [vhmManual, setVhmManual] = useState(false)
  const [igtfManual, setIgtfManual] = useState(false)

  async function abrir() {
    setOpen(true); setError(''); setEst(null); setLoading(true)
    setVhmManual(false); setIgtfManual(false)
    try {
      const r = await fetch(`/api/cotizaciones/${cotId}/estructura`)
      const j = await r.json()
      if (!r.ok) { setError(j.error ?? 'No se pudo cargar la estructura'); setLoading(false); return }
      // Arrancan en "auto": al abrir se prellena Gastos Vehimotor (7% del
      // financiado) e IGTF (3%) por fórmula; luego se recalculan al cambiar el
      // precio base o el % inicial. Si Rojas escribe un valor, ese pasa a manual.
      const e = j.estructura as Estructura
      const lineas = { ...e.lineas }
      if (e.modalidad === 'credito_24') lineas.gastos_vhm = calcVhm(e.precioBase, e.inicialPct)
      lineas.igtf = calcIgtf(e.precioBase)
      setEst({ ...e, lineas })
    } catch { setError('Error de conexión') }
    setLoading(false)
  }

  function setLinea(k: keyof Lineas, v: string) {
    // Al escribir un cargo automático, pasa a "manual" y manda lo que puso el usuario.
    if (k === 'gastos_vhm') setVhmManual(true)
    if (k === 'igtf') setIgtfManual(true)
    setEst(prev => prev ? { ...prev, lineas: { ...prev.lineas, [k]: parseFloat(v.replace(',', '.')) || 0 } } : prev)
  }
  function setCampo(campo: 'precioBase' | 'inicialPct' | 'tasaPct' | 'meses' | 'cuotaVehimotors', v: string) {
    const val = parseFloat(v.replace(',', '.')) || 0
    setEst(prev => {
      if (!prev) return prev
      const next = { ...prev, [campo]: val }
      // Al cambiar precio base o % inicial, se recalculan los cargos automáticos
      // (salvo que hayan sido editados a mano).
      if (campo === 'precioBase' || campo === 'inicialPct') {
        const lineas = { ...next.lineas }
        if (!vhmManual && next.modalidad === 'credito_24') lineas.gastos_vhm = calcVhm(next.precioBase, next.inicialPct)
        if (!igtfManual) lineas.igtf = calcIgtf(next.precioBase)
        next.lineas = lineas
      }
      return next
    })
  }
  // Volver a "auto" un cargo que se editó a mano (recalcula al instante).
  function reautoVhm() { setVhmManual(false); setEst(prev => prev ? { ...prev, lineas: { ...prev.lineas, gastos_vhm: calcVhm(prev.precioBase, prev.inicialPct) } } : prev) }
  function reautoIgtf() { setIgtfManual(false); setEst(prev => prev ? { ...prev, lineas: { ...prev.lineas, igtf: calcIgtf(prev.precioBase) } } : prev) }

  // Vista previa (el cálculo autoritativo se hace en el servidor al guardar).
  const preview = (() => {
    if (!est) return null
    const iva = est.precioBase * 0.16
    const sumaLineas = CLAVES.reduce((s, { k }) => s + (est.lineas[k] || 0), 0)
    const esContado = est.modalidad === 'contado'
    const esBanco = est.plan === 'banco_100'
    const gastos = esBanco ? Math.max(0, sumaLineas - est.lineas.placa) : sumaLineas
    if (esContado) {
      return { gastos, iva, total: est.precioBase + iva + gastos, etiqueta: 'TOTAL A PAGAR' }
    }
    if (esBanco) {
      const totalVeh = est.precioBase + iva + est.lineas.placa
      return { gastos, iva, total: totalVeh * 0.30 + gastos, etiqueta: 'TOTAL INICIAL' }
    }
    const iniPct = (est.inicialPct || 40) / 100
    return { gastos, iva, total: est.precioBase * iniPct + iva + gastos, etiqueta: 'TOTAL INICIAL' }
  })()

  async function guardar() {
    if (!est) return
    setSaving(true); setError('')
    try {
      const r = await fetch(`/api/cotizaciones/${cotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'aplicar_descuento', estructura: est, motivo, reenviar_correo: reenviar }),
      })
      const j = await r.json()
      if (!r.ok) { setError(j.error ?? 'No se pudo guardar'); setSaving(false); return }
      setOpen(false); setSaving(false); onDone()
    } catch { setError('Error de conexión'); setSaving(false) }
  }

  const inp = 'w-28 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:border-oriental-red'
  const esCredito = est && est.modalidad === 'credito_24'

  return (
    <>
      <button onClick={abrir}
        className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 hover:underline">
        <Percent size={12} /> Aplicar descuento
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="font-bold text-oriental-black text-base flex items-center gap-2"><Percent size={16} className="text-indigo-600" /> Aplicar descuento</h2>
                <p className="text-xs text-oriental-gray font-mono">{numero}</p>
              </div>
              <button onClick={() => !saving && setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><X size={16} /></button>
            </div>

            <div className="p-5">
              {loading && <div className="py-10 text-center text-oriental-gray text-sm">Cargando estructura…</div>}
              {error && <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-800">{error}</div>}

              {est && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">Precio base ($)</label>
                      <input className={inp + ' w-full text-left font-semibold'} inputMode="decimal" value={est.precioBase} onChange={e => setCampo('precioBase', e.target.value)} />
                    </div>
                    {esCredito && (
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">% Inicial</label>
                        <input className={inp + ' w-full text-left'} inputMode="decimal" value={est.inicialPct} onChange={e => setCampo('inicialPct', e.target.value)} />
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Estructura de costos (editable)</p>
                    <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
                      {CLAVES.map(({ k, label }) => {
                        const autoField = k === 'igtf' || (k === 'gastos_vhm' && esCredito)
                        const isManual = k === 'gastos_vhm' ? vhmManual : k === 'igtf' ? igtfManual : false
                        const reauto = k === 'gastos_vhm' ? reautoVhm : reautoIgtf
                        return (
                          <div key={k} className="flex items-center justify-between px-3 py-1.5">
                            <span className="text-sm text-gray-600 flex items-center gap-1.5">
                              {label}
                              {autoField && !isManual && <span className="text-[9px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">AUTO</span>}
                              {autoField && isManual && <button type="button" onClick={reauto} className="text-[9px] font-bold text-indigo-600 hover:underline">↻ auto</button>}
                            </span>
                            <input className={inp} inputMode="decimal" value={est.lineas[k]} onChange={e => setLinea(k, e.target.value)} />
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {esCredito && est.plan !== 'vehimotors' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">Tasa % anual</label>
                        <input className={inp + ' w-full text-left'} inputMode="decimal" value={est.tasaPct} onChange={e => setCampo('tasaPct', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">Meses</label>
                        <input className={inp + ' w-full text-left'} inputMode="numeric" value={est.meses} onChange={e => setCampo('meses', e.target.value)} />
                      </div>
                    </div>
                  )}

                  {preview && (
                    <div className="rounded-xl bg-gray-900 p-4 text-white space-y-1.5 text-sm">
                      <div className="flex justify-between text-gray-300"><span>Precio base</span><span className="font-mono">${fmt(est.precioBase)}</span></div>
                      <div className="flex justify-between text-gray-300"><span>IVA 16%</span><span className="font-mono">${fmt(preview.iva)}</span></div>
                      <div className="flex justify-between text-gray-300"><span>Gastos (suma)</span><span className="font-mono">${fmt(preview.gastos)}</span></div>
                      <div className="flex justify-between font-bold text-yellow-400 border-t border-gray-700 pt-1.5">
                        <span>{preview.etiqueta}</span><span className="font-mono">${fmt(preview.total)}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">Motivo (interno)</label>
                    <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: descuento solicitado por el cliente" />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={reenviar} onChange={e => setReenviar(e.target.checked)} className="w-4 h-4" />
                    Reenviar la cotización actualizada al cliente
                  </label>

                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setOpen(false)} disabled={saving} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
                    <button onClick={guardar} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-oriental-red text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                      {saving && <Loader2 size={14} className="animate-spin" />} Guardar{reenviar ? ' y reenviar' : ''}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
