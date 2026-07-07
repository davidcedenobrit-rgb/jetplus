'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRightLeft, Handshake, Loader2, X } from 'lucide-react'

interface Props {
  showroomId: string
  vehiculoLabel: string
}

type Modo = null | 'transferido' | 'aliado'

export default function SalidaAlternativaButtons({ showroomId, vehiculoLabel }: Props) {
  const router = useRouter()
  const [modo, setModo] = useState<Modo>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [destinatario, setDestinatario] = useState('')
  const [aliadoSel, setAliadoSel] = useState<'ki_auto' | 'autosurca'>('ki_auto')
  const [notas, setNotas] = useState('')

  function cerrar() {
    if (loading) return
    setModo(null)
    setDestinatario('')
    setAliadoSel('ki_auto')
    setNotas('')
    setError('')
  }

  async function confirmar() {
    setError('')
    setLoading(true)
    try {
      const body =
        modo === 'transferido'
          ? { tipo: 'transferido', destinatario: destinatario.trim(), notas: notas.trim() || null }
          : { tipo: 'aliado', destinatario: aliadoSel, notas: notas.trim() || null }

      const res = await fetch(`/api/showroom/${showroomId}/salida-alternativa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await res.json()
      if (!res.ok) {
        setError(j.error ?? 'Error al registrar')
        setLoading(false)
        return
      }
      cerrar()
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setModo('transferido')}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 text-sm font-semibold transition-colors"
      >
        <ArrowRightLeft size={14} /> Transferido a…
      </button>
      <button
        onClick={() => setModo('aliado')}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 text-sm font-semibold transition-colors"
      >
        <Handshake size={14} /> Vendido por…
      </button>

      {modo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={cerrar} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  modo === 'transferido' ? 'bg-blue-600' : 'bg-purple-600'
                }`}>
                  {modo === 'transferido' ? (
                    <ArrowRightLeft size={18} className="text-white" />
                  ) : (
                    <Handshake size={18} className="text-white" />
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-oriental-black text-base">
                    {modo === 'transferido' ? 'Transferido a…' : 'Vendido por…'}
                  </h2>
                  <p className="text-xs text-oriental-gray mt-0.5">{vehiculoLabel}</p>
                </div>
              </div>
              <button onClick={cerrar} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                <X size={16} className="text-oriental-gray" />
              </button>
            </div>

            {modo === 'transferido' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">
                    Destinatario *
                  </label>
                  <input
                    type="text"
                    value={destinatario}
                    onChange={e => setDestinatario(e.target.value)}
                    placeholder="Persona / entidad a la que se transfirió"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                    rows={2}
                    placeholder="Motivo, condiciones, referencia…"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">
                    Aliado *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'ki_auto', label: 'Ki Auto' },
                      { key: 'autosurca', label: 'Autosurca' },
                    ].map(a => (
                      <button
                        key={a.key}
                        type="button"
                        onClick={() => setAliadoSel(a.key as any)}
                        className={`py-3 rounded-xl text-sm font-bold border-2 transition-colors ${
                          aliadoSel === a.key
                            ? 'border-purple-600 bg-purple-50 text-purple-800'
                            : 'border-gray-200 text-oriental-gray hover:border-gray-300'
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                    rows={2}
                    placeholder="Referencia, cliente final, comisión…"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 mt-3">
                <p className="text-xs text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <button
                onClick={cerrar}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-oriental-gray hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmar}
                disabled={loading || (modo === 'transferido' && !destinatario.trim())}
                className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 ${
                  modo === 'transferido'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? 'Guardando…' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
