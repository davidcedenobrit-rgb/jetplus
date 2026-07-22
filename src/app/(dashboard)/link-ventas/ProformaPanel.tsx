'use client'

import { useState } from 'react'
import { FileText, X, Loader2, ExternalLink } from 'lucide-react'

const fmt = (n: number) => Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Genera una PROFORMA a partir de una cotización aceptada (flujo nuevo:
// cotización → aprobación → PROFORMA → venta). La proforma es la cotización
// negociada + las condiciones de pago para ese cliente.
export default function ProformaPanel({
  cotId, numero, correoCliente, onDone, compact = false, plan, total = 0,
}: {
  cotId: string
  numero: string
  correoCliente?: string | null
  onDone: () => void
  compact?: boolean
  plan?: string
  total?: number
}) {
  const esBancaNacional = plan === 'banca_nacional'
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [enviarCorreo, setEnviarCorreo] = useState(false)
  const [correo, setCorreo] = useState(correoCliente ?? '')
  const [observaciones, setObservaciones] = useState('')
  const [aprobadoBanco, setAprobadoBanco] = useState('')
  const [restanteMetodo, setRestanteMetodo] = useState<'contado' | 'acuerdo'>('contado')
  const [resultado, setResultado] = useState<{ proformaId: string; numero: string; correoEnviado: boolean } | null>(null)
  const [yaExiste, setYaExiste] = useState<{ proformaId: string; numero: string } | null>(null)

  const aprobadoNum = parseFloat(aprobadoBanco.replace(',', '.')) || 0
  const restante = Math.max(0, Number(total) - aprobadoNum)
  const pctBanco = Number(total) > 0 ? Math.round((aprobadoNum / Number(total)) * 100) : 0

  function abrir() {
    setOpen(true); setError(''); setResultado(null); setYaExiste(null)
    setEnviarCorreo(false); setCorreo(correoCliente ?? ''); setObservaciones('')
    setAprobadoBanco(''); setRestanteMetodo('contado')
  }

  async function generar() {
    if (esBancaNacional && aprobadoNum <= 0) { setError('Indica el monto que aprobó el banco'); return }
    if (esBancaNacional && aprobadoNum > Number(total)) { setError('Lo aprobado por el banco no puede superar el total'); return }
    setSaving(true); setError('')
    try {
      const r = await fetch('/api/proformas/desde-cotizacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cotizacionId: cotId,
          enviarCorreo,
          correoDestino: enviarCorreo ? correo.trim() : null,
          observaciones: observaciones.trim() || null,
          ...(esBancaNacional ? { bancaNacional: { aprobado_banco: aprobadoNum, restante, restante_metodo: restanteMetodo } } : {}),
        }),
      })
      const j = await r.json()
      if (r.status === 409 && j.proformaId) {
        setYaExiste({ proformaId: j.proformaId, numero: j.numero })
        setSaving(false)
        return
      }
      if (!r.ok) { setError(j.error ?? 'No se pudo generar la proforma'); setSaving(false); return }
      setResultado({ proformaId: j.proformaId, numero: j.numero, correoEnviado: !!j.correoEnviado })
      setSaving(false)
    } catch {
      setError('Error de conexión'); setSaving(false)
    }
  }

  return (
    <>
      {compact ? (
        <button onClick={abrir}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors">
          <FileText size={12} /> Convertir en proforma
        </button>
      ) : (
        <button onClick={abrir}
          className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl text-sm transition-colors">
          <FileText size={15} /> Generar proforma
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="font-bold text-oriental-black text-base flex items-center gap-2"><FileText size={16} className="text-indigo-600" /> Generar proforma</h2>
                <p className="text-xs text-oriental-gray font-mono">{numero}</p>
              </div>
              <button onClick={() => !saving && setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><X size={16} /></button>
            </div>

            <div className="p-5">
              {error && <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-800">{error}</div>}

              {yaExiste ? (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                    Esta cotización ya tiene una proforma: <span className="font-mono font-bold">{yaExiste.numero}</span>.
                  </div>
                  <a href={`/api/proformas/${yaExiste.proformaId}/pdf`} target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-700 text-white text-sm font-semibold hover:bg-indigo-800">
                    <ExternalLink size={14} /> Ver proforma {yaExiste.numero}
                  </a>
                  <button onClick={() => setOpen(false)} className="w-full py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cerrar</button>
                </div>
              ) : resultado ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                    ✓ Proforma <span className="font-mono font-bold">{resultado.numero}</span> generada.
                    {resultado.correoEnviado && ' Correo enviado al cliente.'}
                  </div>
                  <a href={`/api/proformas/${resultado.proformaId}/pdf`} target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-700 text-white text-sm font-semibold hover:bg-indigo-800">
                    <ExternalLink size={14} /> Ver proforma {resultado.numero}
                  </a>
                  <button onClick={() => { setOpen(false); onDone() }} className="w-full py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cerrar</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Se creará la proforma con la estructura negociada de la cotización y el cronograma de pago del cliente. Sirve como el documento previo a la venta.
                  </p>

                  {esBancaNacional && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-3">
                      <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">🏦 Banca nacional — reparto del pago</p>
                      <p className="text-[11px] text-emerald-700">Total del vehículo: <b>${fmt(Number(total))}</b></p>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Monto que aprobó el banco ($)</label>
                        <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:border-emerald-600"
                          inputMode="decimal" value={aprobadoBanco} onChange={e => setAprobadoBanco(e.target.value)} placeholder="0,00" />
                        {aprobadoNum > 0 && <p className="text-[10px] text-emerald-700 mt-1">Equivale al <b>{pctBanco}%</b> del total.</p>}
                      </div>
                      <div className="rounded-lg bg-white border border-emerald-200 p-2.5 text-sm">
                        <div className="flex justify-between text-gray-600"><span>Aprobado por el banco</span><span className="font-mono font-bold text-emerald-700">${fmt(aprobadoNum)}</span></div>
                        <div className="flex justify-between text-gray-600 mt-0.5"><span>Restante (cliente)</span><span className="font-mono font-bold text-oriental-black">${fmt(restante)}</span></div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">El restante lo paga:</label>
                        <div className="flex gap-2">
                          {([['contado', 'De contado'], ['acuerdo', 'Acuerdo de pago']] as const).map(([v, l]) => (
                            <button key={v} type="button" onClick={() => setRestanteMetodo(v)}
                              className={`flex-1 py-1.5 rounded-lg border-2 text-xs font-bold transition-all ${restanteMetodo === v ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-200 text-gray-500'}`}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">Observaciones / condiciones de pago (opcional)</label>
                    <textarea className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red resize-none" rows={3}
                      value={observaciones} onChange={e => setObservaciones(e.target.value)}
                      placeholder="Ej: inicial en 2 partes, entrega al completar el 40%…" />
                  </div>

                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={enviarCorreo} onChange={e => setEnviarCorreo(e.target.checked)} className="w-4 h-4" />
                    Enviar la proforma al cliente por correo
                  </label>
                  {enviarCorreo && (
                    <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red" type="email"
                      value={correo} onChange={e => setCorreo(e.target.value)} placeholder="correo@cliente.com" />
                  )}

                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setOpen(false)} disabled={saving} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
                    <button onClick={generar} disabled={saving || (enviarCorreo && !correo.trim())} className="flex-1 py-2.5 rounded-lg bg-indigo-700 text-white text-sm font-semibold hover:bg-indigo-800 disabled:opacity-50 flex items-center justify-center gap-2">
                      {saving && <Loader2 size={14} className="animate-spin" />} Generar
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
