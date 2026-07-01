'use client'

import { useState } from 'react'
import { FileText, Loader2, X, Mail, Check, AlertCircle, Download } from 'lucide-react'

interface Props {
  creditoId: string
  correoClienteDefault?: string | null
  proformaExistente?: { id: string; numero: string } | null
}

export default function ProformaButton({ creditoId, correoClienteDefault, proformaExistente }: Props) {
  const [open, setOpen] = useState(false)
  const [enviarCorreo, setEnviarCorreo] = useState(true)
  const [correoDestino, setCorreoDestino] = useState(correoClienteDefault ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<{ numero: string; proformaId: string; correoEnviado: boolean; correoError?: string | null } | null>(null)

  // Si ya hay proforma, mostrar link directo al PDF
  if (proformaExistente) {
    return (
      <a
        href={`/api/proformas/${proformaExistente.id}/pdf`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors"
      >
        <FileText size={15} />
        Proforma {proformaExistente.numero}
      </a>
    )
  }

  const handleGenerar = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/proformas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creditoId,
          enviarCorreo,
          correoDestino: enviarCorreo ? correoDestino.trim() : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Error al generar proforma')
        setLoading(false)
        return
      }
      setResultado({ numero: json.numero, proformaId: json.proformaId, correoEnviado: json.correoEnviado, correoError: json.correoError ?? null })
    } catch (e: any) {
      setError(e?.message ?? 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  const cerrarModal = () => {
    if (resultado) {
      // recargar página para reflejar la proforma generada
      window.location.reload()
    } else {
      setOpen(false)
      setError(null)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors"
      >
        <FileText size={15} />
        Generar Proforma
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <FileText size={18} className="text-amber-700" />
                </div>
                <div>
                  <h2 className="font-bold text-oriental-black">Generar Proforma</h2>
                  <p className="text-xs text-oriental-gray">Documento formal de compromiso de pago</p>
                </div>
              </div>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              {resultado ? (
                <div className="text-center space-y-4">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Check size={26} className="text-green-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-oriental-black text-lg">Proforma generada</h3>
                    <p className="text-oriental-gray text-sm mt-1">
                      Número: <span className="font-mono font-bold text-oriental-black">{resultado.numero}</span>
                    </p>
                    {resultado.correoEnviado && (
                      <p className="text-green-700 text-xs mt-2 flex items-center justify-center gap-1">
                        <Mail size={12} /> Correo enviado
                      </p>
                    )}
                    {!resultado.correoEnviado && enviarCorreo && (
                      <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-2 text-left">
                        <p className="text-orange-800 text-xs flex items-start gap-1">
                          <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                          <span>
                            La proforma se guardó pero <b>no se pudo enviar el correo</b>{resultado.correoError ? `: ${resultado.correoError}` : '.'}. Puedes descargarla y enviarla manualmente.
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <a
                      href={`/api/proformas/${resultado.proformaId}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-oriental-red text-white text-sm font-semibold rounded-lg hover:bg-red-700"
                    >
                      <Download size={14} />
                      Ver PDF
                    </a>
                    <button
                      onClick={cerrarModal}
                      className="flex-1 px-4 py-2 border border-gray-200 text-sm font-semibold rounded-lg hover:bg-gray-50"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                    <AlertCircle size={14} className="text-amber-700 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-900 leading-relaxed">
                      La proforma tomará una <b>fotografía del crédito</b> en este momento (cliente, vehículo, cronograma). Se puede emitir solo <b>una vez por crédito</b>.
                    </p>
                  </div>

                  <label className="flex items-center gap-2 mb-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enviarCorreo}
                      onChange={(e) => setEnviarCorreo(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-oriental-red focus:ring-oriental-red"
                    />
                    <span className="text-sm font-medium text-oriental-black">Enviar por correo al cliente</span>
                  </label>

                  {enviarCorreo && (
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-oriental-gray mb-1">Correo destino</label>
                      <input
                        type="email"
                        value={correoDestino}
                        onChange={(e) => setCorreoDestino(e.target.value)}
                        placeholder="cliente@correo.com"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-oriental-red/20 focus:border-oriental-red"
                      />
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <p className="text-xs text-red-700">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setOpen(false)}
                      disabled={loading}
                      className="flex-1 px-4 py-2 border border-gray-200 text-sm font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleGenerar}
                      disabled={loading || (enviarCorreo && !correoDestino.trim())}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Generando…
                        </>
                      ) : (
                        <>
                          <FileText size={14} />
                          Generar
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
