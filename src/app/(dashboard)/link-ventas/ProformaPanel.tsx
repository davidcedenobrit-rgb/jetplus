'use client'

import { useState } from 'react'
import { FileText, X, Loader2, ExternalLink } from 'lucide-react'

// Genera una PROFORMA a partir de una cotización aceptada (flujo nuevo:
// cotización → aprobación → PROFORMA → venta). La proforma es la cotización
// negociada + las condiciones de pago para ese cliente.
export default function ProformaPanel({
  cotId, numero, correoCliente, onDone, compact = false,
}: {
  cotId: string
  numero: string
  correoCliente?: string | null
  onDone: () => void
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [enviarCorreo, setEnviarCorreo] = useState(false)
  const [correo, setCorreo] = useState(correoCliente ?? '')
  const [observaciones, setObservaciones] = useState('')
  const [resultado, setResultado] = useState<{ proformaId: string; numero: string; correoEnviado: boolean } | null>(null)
  const [yaExiste, setYaExiste] = useState<{ proformaId: string; numero: string } | null>(null)

  function abrir() {
    setOpen(true); setError(''); setResultado(null); setYaExiste(null)
    setEnviarCorreo(false); setCorreo(correoCliente ?? ''); setObservaciones('')
  }

  async function generar() {
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
