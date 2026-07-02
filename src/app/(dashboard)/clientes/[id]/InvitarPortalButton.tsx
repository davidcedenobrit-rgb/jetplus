'use client'

import { useState } from 'react'
import { UserPlus, Loader2, X, Mail, MessageCircle, Copy, Check, AlertCircle } from 'lucide-react'

interface Props {
  clienteId: string
  clienteNombre: string
  correoDefault: string | null
  telefonoDefault: string | null
  yaTieneCuenta: boolean
}

export default function InvitarPortalButton({ clienteId, clienteNombre, correoDefault, telefonoDefault, yaTieneCuenta }: Props) {
  const [open, setOpen] = useState(false)
  const [canal, setCanal] = useState<'correo' | 'whatsapp' | 'link'>('correo')
  const [destinatario, setDestinatario] = useState(correoDefault ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<{ linkPortal: string; whatsappUrl: string | null; correoEnviado: boolean; correoError: string | null } | null>(null)
  const [copiado, setCopiado] = useState(false)

  function cambiarCanal(c: 'correo' | 'whatsapp' | 'link') {
    setCanal(c)
    setError(null)
    if (c === 'correo') setDestinatario(correoDefault ?? '')
    else if (c === 'whatsapp') setDestinatario(telefonoDefault ?? '')
    else setDestinatario('')
  }

  async function enviar() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/portal-clientes/invitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId,
          canal,
          destinatario: canal === 'link' ? null : destinatario.trim(),
        }),
      })
      const j = await res.json()
      if (!res.ok) {
        setError(j.error ?? 'Error al crear invitación')
        setLoading(false)
        return
      }
      setResultado({
        linkPortal: j.linkPortal,
        whatsappUrl: j.whatsappUrl,
        correoEnviado: j.correoEnviado,
        correoError: j.correoError,
      })
    } catch (e: any) {
      setError(e?.message ?? 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  async function copiar() {
    if (!resultado) return
    try {
      await navigator.clipboard.writeText(resultado.linkPortal)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {}
  }

  function cerrar() {
    setOpen(false)
    setResultado(null)
    setError(null)
  }

  if (yaTieneCuenta) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-lg">
        <Check size={13} /> Cuenta activa en el portal
      </span>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
      >
        <UserPlus size={14} /> Invitar al portal
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={cerrar}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-oriental-black">Invitar al Portal del Cliente</h3>
                <p className="text-xs text-oriental-gray">{clienteNombre}</p>
              </div>
              <button onClick={cerrar} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="p-5">
              {resultado ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Check size={22} className="text-green-700" />
                    </div>
                    <p className="font-bold text-oriental-black">Invitación creada</p>
                    {resultado.correoEnviado && (
                      <p className="text-xs text-green-700 mt-1">✓ Correo enviado a {destinatario}</p>
                    )}
                    {canal === 'correo' && !resultado.correoEnviado && (
                      <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg p-2">
                        <p className="text-xs text-orange-800 flex items-start gap-1">
                          <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                          <span>No se pudo enviar el correo{resultado.correoError ? `: ${resultado.correoError}` : '.'} Pero el link está listo para compartir.</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-oriental-gray uppercase tracking-wide mb-1">Link de activación</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={resultado.linkPortal}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono bg-gray-50 text-oriental-black"
                      />
                      <button
                        onClick={copiar}
                        className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-xs font-semibold text-oriental-black flex items-center gap-1"
                      >
                        {copiado ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                        {copiado ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <p className="text-[11px] text-oriental-gray mt-1">Válido por 30 días.</p>
                  </div>

                  {resultado.whatsappUrl && (
                    <a
                      href={resultado.whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700"
                    >
                      <MessageCircle size={15} /> Abrir en WhatsApp
                    </a>
                  )}

                  <button
                    onClick={cerrar}
                    className="w-full px-4 py-2 border border-gray-200 text-sm font-semibold rounded-lg hover:bg-gray-50"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-oriental-gray mb-3">Selecciona cómo enviar la invitación al cliente:</p>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <button
                      onClick={() => cambiarCanal('correo')}
                      className={`flex flex-col items-center gap-1 px-3 py-3 border-2 rounded-lg transition-colors ${
                        canal === 'correo' ? 'border-oriental-red bg-red-50 text-oriental-red' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <Mail size={16} />
                      <span className="text-[10px] font-semibold uppercase">Correo</span>
                    </button>
                    <button
                      onClick={() => cambiarCanal('whatsapp')}
                      className={`flex flex-col items-center gap-1 px-3 py-3 border-2 rounded-lg transition-colors ${
                        canal === 'whatsapp' ? 'border-oriental-red bg-red-50 text-oriental-red' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <MessageCircle size={16} />
                      <span className="text-[10px] font-semibold uppercase">WhatsApp</span>
                    </button>
                    <button
                      onClick={() => cambiarCanal('link')}
                      className={`flex flex-col items-center gap-1 px-3 py-3 border-2 rounded-lg transition-colors ${
                        canal === 'link' ? 'border-oriental-red bg-red-50 text-oriental-red' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <Copy size={16} />
                      <span className="text-[10px] font-semibold uppercase">Solo link</span>
                    </button>
                  </div>

                  {canal !== 'link' && (
                    <div className="mb-4">
                      <label className="block text-[11px] font-bold text-oriental-gray uppercase tracking-wide mb-1">
                        {canal === 'correo' ? 'Correo destino' : 'Número de WhatsApp'}
                      </label>
                      <input
                        type={canal === 'correo' ? 'email' : 'tel'}
                        value={destinatario}
                        onChange={e => setDestinatario(e.target.value)}
                        placeholder={canal === 'correo' ? 'cliente@correo.com' : '+58 424...'}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red"
                      />
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <p className="text-xs text-red-700">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={cerrar}
                      disabled={loading}
                      className="flex-1 px-4 py-2 border border-gray-200 text-sm font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={enviar}
                      disabled={loading || (canal !== 'link' && !destinatario.trim())}
                      className="flex-1 px-4 py-2 bg-oriental-red text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading && <Loader2 size={14} className="animate-spin" />}
                      {loading ? 'Creando…' : 'Crear invitación'}
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
