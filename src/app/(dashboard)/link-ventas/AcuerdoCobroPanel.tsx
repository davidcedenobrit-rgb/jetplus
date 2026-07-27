'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileSignature, X, Loader2, ExternalLink, CheckCircle2, Trash2, Clock } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

// Acuerdo de Responsabilidad de Gestión de Cobro. Aplica cuando La Oriental
// financia parte de la inicial (doble financiamiento). Va ligado a la
// cotización; la vendedora asume el cobro y su comisión se paga cuando el
// cliente termina de pagar. Cuando existe y está aceptado, junto con la
// cotización aprobada, habilita crear la proforma.
export default function AcuerdoCobroPanel({
  cotId, vendedoraNombre, onChange, compact = false,
}: {
  cotId: string
  vendedoraNombre?: string
  onChange?: () => void
  compact?: boolean
}) {
  const [acuerdo, setAcuerdo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Campos del formulario
  const [inicialTotal, setInicialTotal] = useState('')
  const [montoContado, setMontoContado] = useState('')
  const [montoFinanciado, setMontoFinanciado] = useState('')
  const [numCuotas, setNumCuotas] = useState('')
  const [cuotaMonto, setCuotaMonto] = useState('')
  const [planCuotas, setPlanCuotas] = useState('')
  const [observaciones, setObservaciones] = useState('')

  // Flags de "el usuario lo escribió a mano". Mientras estén en false, el campo
  // se calcula solo a partir de los otros. Se marcan true al editar el campo, o
  // al abrir un acuerdo ya guardado (para respetar lo que quedó registrado).
  const [finManual, setFinManual] = useState(false)
  const [cuotaManual, setCuotaManual] = useState(false)
  const [planManual, setPlanManual] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/acuerdos-cobro?cotizacionId=${cotId}`)
      const j = await r.json()
      setAcuerdo(j.acuerdo ?? null)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [cotId])

  useEffect(() => { cargar() }, [cargar])

  function abrir() {
    setError('')
    setInicialTotal(acuerdo?.inicial_total != null ? String(acuerdo.inicial_total) : '')
    setMontoContado(acuerdo?.monto_contado != null ? String(acuerdo.monto_contado) : '')
    setMontoFinanciado(acuerdo?.monto_financiado != null ? String(acuerdo.monto_financiado) : '')
    setNumCuotas(acuerdo?.num_cuotas != null ? String(acuerdo.num_cuotas) : '')
    setCuotaMonto(acuerdo?.cuota_monto != null ? String(acuerdo.cuota_monto) : '')
    setPlanCuotas(acuerdo?.plan_cuotas ?? '')
    setObservaciones(acuerdo?.observaciones ?? '')
    // Al reabrir un acuerdo ya guardado respetamos sus valores (manual = true).
    // En uno nuevo, todo se calcula solo (manual = false).
    const existe = !!acuerdo
    setFinManual(existe && acuerdo?.monto_financiado != null)
    setCuotaManual(existe && acuerdo?.cuota_monto != null)
    setPlanManual(existe && !!acuerdo?.plan_cuotas)
    setOpen(true)
  }

  const num = (s: string) => { const n = parseFloat(String(s).replace(',', '.')); return Number.isFinite(n) ? n : null }

  // Formatea un número calculado en un string limpio para el input (punto decimal,
  // sin ceros sobrantes) que el parser num() vuelve a leer sin problemas.
  const clean = (n: number) => String(Math.round(n * 100) / 100)
  // Texto en formato local (es-VE) solo para la sugerencia del plan de cuotas.
  const fmtLocal = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // Financiado por La Oriental = Inicial total − Pagado de contado.
  useEffect(() => {
    if (finManual) return
    const it = num(inicialTotal)
    if (it == null) { setMontoFinanciado(''); return }
    const fin = Math.max(0, it - (num(montoContado) ?? 0))
    setMontoFinanciado(fin > 0 ? clean(fin) : '')
  }, [inicialTotal, montoContado, finManual]) // eslint-disable-line react-hooks/exhaustive-deps

  // Monto por cuota = Financiado ÷ N° de cuotas.
  useEffect(() => {
    if (cuotaManual) return
    const fin = num(montoFinanciado), nc = num(numCuotas)
    if (fin == null || !nc || nc <= 0) { setCuotaMonto(''); return }
    setCuotaMonto(clean(fin / nc))
  }, [montoFinanciado, numCuotas, cuotaManual]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sugerencia del plan de cuotas en texto: "N cuotas mensuales de $X,XX".
  useEffect(() => {
    if (planManual) return
    const nc = num(numCuotas), cm = num(cuotaMonto)
    if (!nc || nc <= 0 || cm == null || cm <= 0) { setPlanCuotas(''); return }
    const n = Math.round(nc)
    setPlanCuotas(`${n} ${n === 1 ? 'cuota mensual' : 'cuotas mensuales'} de $${fmtLocal(cm)} desde la entrega`)
  }, [numCuotas, cuotaMonto, planManual]) // eslint-disable-line react-hooks/exhaustive-deps

  async function guardar() {
    if (!num(montoFinanciado) || num(montoFinanciado)! <= 0) { setError('Indica el monto financiado por La Oriental.'); return }
    setSaving(true); setError('')
    try {
      const r = await fetch('/api/acuerdos-cobro', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cotizacionId: cotId,
          inicialTotal: num(inicialTotal), montoContado: num(montoContado), montoFinanciado: num(montoFinanciado),
          numCuotas: num(numCuotas), cuotaMonto: num(cuotaMonto), planCuotas, observaciones,
        }),
      })
      const j = await r.json()
      if (!r.ok) { setError(j.error ?? 'No se pudo guardar el acuerdo'); setSaving(false); return }
      setAcuerdo(j.acuerdo); setOpen(false); setSaving(false); onChange?.()
    } catch { setError('Error de conexión'); setSaving(false) }
  }

  async function marcar(estado: 'aceptado' | 'pendiente') {
    setSaving(true)
    try {
      const r = await fetch('/api/acuerdos-cobro', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acuerdoId: acuerdo.id, estado }),
      })
      const j = await r.json()
      if (r.ok) { setAcuerdo(j.acuerdo); onChange?.() }
    } finally { setSaving(false) }
  }

  async function eliminar() {
    if (!confirm('¿Eliminar el acuerdo de gestión de cobro?')) return
    setSaving(true)
    try {
      const r = await fetch(`/api/acuerdos-cobro?id=${acuerdo.id}`, { method: 'DELETE' })
      if (r.ok) { setAcuerdo(null); onChange?.() }
    } finally { setSaving(false) }
  }

  // En modo compacto no dejamos hueco mientras carga: se muestra "Realizar
  // acuerdo de cobro" por defecto y cambia a "Ver" si ya existe uno.
  if (loading && !compact) return null

  const aceptado = acuerdo?.estado === 'aceptado'

  return (
    <>
    {compact ? (
      !acuerdo ? (
        <button onClick={abrir}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-purple-300 bg-white hover:bg-purple-50 text-purple-700 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors">
          <FileSignature size={12} /> Realizar acuerdo de cobro
        </button>
      ) : (
        <a href={`/api/acuerdos-cobro/${acuerdo.id}/pdf`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors">
          <ExternalLink size={11} /> Ver acuerdo de cobro
        </a>
      )
    ) : (
    <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-[11px] font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1.5">
          <FileSignature size={13} /> Acuerdo de gestión de cobro
        </p>
        {acuerdo && (
          aceptado
            ? <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full"><CheckCircle2 size={11} /> Aceptado</span>
            : <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full"><Clock size={11} /> Pendiente</span>
        )}
      </div>
      <p className="text-[11px] text-purple-700/80 mb-2">
        Úsalo cuando La Oriental financia parte de la inicial. La vendedora asume el cobro y su comisión se paga al terminar. Sin aceptar, no se puede crear la proforma.
      </p>

      {!acuerdo ? (
        <button onClick={abrir}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold transition-colors">
          <FileSignature size={12} /> Crear acuerdo
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <a href={`/api/acuerdos-cobro/${acuerdo.id}/pdf`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-purple-300 text-purple-700 rounded-lg text-[11px] font-bold hover:bg-purple-50">
            <ExternalLink size={11} /> Ver acuerdo de cobro
          </a>
          {!aceptado && (
            <>
              <button onClick={() => marcar('aceptado')} disabled={saving}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[11px] font-bold disabled:opacity-50">
                {saving ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />} Marcar aceptado
              </button>
              <button onClick={abrir} className="text-[11px] font-bold text-purple-700 hover:underline">Editar</button>
              <button onClick={eliminar} disabled={saving} className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:underline disabled:opacity-50">
                <Trash2 size={11} /> Eliminar
              </button>
            </>
          )}
          {aceptado && (
            <button onClick={() => marcar('pendiente')} disabled={saving} className="text-[11px] font-bold text-amber-700 hover:underline disabled:opacity-50">
              Revertir a pendiente
            </button>
          )}
        </div>
      )}
    </div>
    )}

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="font-bold text-oriental-black text-base flex items-center gap-2"><FileSignature size={16} className="text-purple-600" /> Acuerdo de gestión de cobro</h2>
              <button onClick={() => !saving && setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              {error && <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-800">{error}</div>}
              {vendedoraNombre && <p className="text-[11px] text-gray-500">Responsable(s) de cobro: <b className="text-oriental-black">{vendedoraNombre}</b></p>}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Inicial total ($)" value={inicialTotal} onChange={setInicialTotal} />
                <Field label="Pagado de contado ($)" value={montoContado} onChange={setMontoContado} />
              </div>
              <Field label="Financiado por La Oriental ($) *" value={montoFinanciado}
                onChange={v => { setFinManual(true); setMontoFinanciado(v) }}
                hint={finManual ? 'Editado manualmente' : 'Automático: inicial − contado'}
                auto={!finManual} onReset={() => setFinManual(false)} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="N° de cuotas" value={numCuotas} onChange={setNumCuotas} />
                <Field label="Monto por cuota ($)" value={cuotaMonto}
                  onChange={v => { setCuotaManual(true); setCuotaMonto(v) }}
                  hint={cuotaManual ? 'Manual' : 'Auto: financiado ÷ cuotas'}
                  auto={!cuotaManual} onReset={() => setCuotaManual(false)} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-gray-500">Plan de cuotas (texto)</label>
                  {planManual
                    ? <button type="button" onClick={() => setPlanManual(false)} className="text-[10px] font-bold text-purple-600 hover:underline">Auto</button>
                    : <span className="text-[10px] font-medium text-purple-500">Generado automático</span>}
                </div>
                <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                  value={planCuotas} onChange={e => { setPlanManual(true); setPlanCuotas(e.target.value) }} placeholder="Ej: 3 cuotas mensuales de $1.666,67 desde la entrega" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Observaciones (opcional)</label>
                <textarea className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 resize-none" rows={2}
                  value={observaciones} onChange={e => setObservaciones(e.target.value)} />
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setOpen(false)} disabled={saving} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
                <button onClick={guardar} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />} Guardar acuerdo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Field({ label, value, onChange, hint, auto, onReset }: {
  label: string; value: string; onChange: (v: string) => void
  hint?: string; auto?: boolean; onReset?: () => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-1">
        <label className="block text-[11px] font-semibold text-gray-500 truncate">{label}</label>
        {hint && (auto
          ? <span className="text-[9px] font-medium text-purple-500 whitespace-nowrap">{hint}</span>
          : <button type="button" onClick={onReset} className="text-[9px] font-bold text-purple-600 hover:underline whitespace-nowrap">Auto</button>)}
      </div>
      <input className={`w-full px-3 py-2 border rounded-lg text-sm text-right focus:outline-none focus:border-purple-500 ${auto ? 'border-purple-200 bg-purple-50/40' : 'border-gray-200'}`}
        inputMode="decimal" value={value} onChange={e => onChange(e.target.value)} placeholder="0,00" />
    </div>
  )
}
