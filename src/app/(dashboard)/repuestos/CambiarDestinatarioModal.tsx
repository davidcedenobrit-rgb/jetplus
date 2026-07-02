'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X, Building2, User, Search, Loader2, Check, AlertCircle } from 'lucide-react'

interface ClienteLite { id: string; nombre: string; cedula_rif: string }

interface Props {
  solicitudId: string
  numero: string
  destinoActual: 'cliente' | 'oriental' | 'sin'
  clienteActual: { id: string; nombre: string } | null
  onClose: () => void
  onSaved: () => void
}

export default function CambiarDestinatarioModal({
  solicitudId, numero, destinoActual, clienteActual, onClose, onSaved,
}: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [destino, setDestino] = useState<'cliente' | 'oriental'>(
    destinoActual === 'oriental' ? 'oriental' : 'cliente'
  )
  const [clienteSel, setClienteSel] = useState<ClienteLite | null>(
    clienteActual ? { id: clienteActual.id, nombre: clienteActual.nombre, cedula_rif: '' } : null
  )
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<ClienteLite[]>([])
  const [buscando, setBuscando] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (destino !== 'cliente' || clienteSel || !busca.trim() || busca.trim().length < 2) {
      setResultados([])
      return
    }
    const q = busca.trim().toLowerCase()
    const timer = setTimeout(async () => {
      setBuscando(true)
      const { data } = await supabase
        .from('clientes')
        .select('id, nombre, cedula_rif')
        .or(`nombre.ilike.%${q}%,cedula_rif.ilike.%${q}%`)
        .eq('activo', true)
        .order('nombre')
        .limit(10)
      setResultados(data ?? [])
      setBuscando(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [busca, destino, clienteSel, supabase])

  async function guardar() {
    setError(null)
    if (destino === 'cliente' && !clienteSel) {
      setError('Selecciona un cliente o cambia a "La Oriental"')
      return
    }
    setSaving(true)
    const res = await fetch(`/api/repuestos/${solicitudId}/destinatario`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destino,
        clienteId: destino === 'cliente' ? clienteSel!.id : null,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json()
      setError(j.error ?? 'Error al guardar')
      return
    }
    onSaved()
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-oriental-black">Cambiar destinatario</h3>
            <p className="text-xs text-oriental-gray font-mono">{numero}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => { setDestino('cliente'); }}
              className={`flex flex-col items-center gap-2 px-4 py-4 border-2 rounded-xl transition-colors ${
                destino === 'cliente' ? 'border-oriental-red bg-red-50 text-oriental-red' : 'border-gray-200 text-oriental-gray hover:border-gray-300'
              }`}
            >
              <User size={18} />
              <span className="text-xs font-bold uppercase tracking-wide">Cliente</span>
            </button>
            <button
              onClick={() => { setDestino('oriental'); setClienteSel(null); setBusca('') }}
              className={`flex flex-col items-center gap-2 px-4 py-4 border-2 rounded-xl transition-colors ${
                destino === 'oriental' ? 'border-oriental-red bg-red-50 text-oriental-red' : 'border-gray-200 text-oriental-gray hover:border-gray-300'
              }`}
            >
              <Building2 size={18} />
              <span className="text-xs font-bold uppercase tracking-wide">La Oriental</span>
            </button>
          </div>

          {destino === 'cliente' && (
            <div className="space-y-2">
              {clienteSel ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
                      <User size={16} className="text-green-700" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-oriental-black">{clienteSel.nombre}</p>
                      {clienteSel.cedula_rif && (
                        <p className="text-[11px] text-oriental-gray font-mono">{clienteSel.cedula_rif}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => { setClienteSel(null); setBusca('') }}
                    className="text-xs text-oriental-gray hover:text-oriental-red font-semibold flex items-center gap-1">
                    <X size={12} /> Cambiar
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray" />
                    <input
                      type="text"
                      className="input pl-9"
                      placeholder="Buscar por nombre o cédula/RIF…"
                      value={busca}
                      onChange={e => setBusca(e.target.value)}
                      autoFocus
                    />
                  </div>
                  {busca.trim().length >= 2 && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-56 overflow-y-auto">
                      {buscando ? (
                        <p className="text-center text-xs text-oriental-gray py-3">Buscando…</p>
                      ) : resultados.length === 0 ? (
                        <p className="text-center text-xs text-oriental-gray py-3">Sin resultados</p>
                      ) : resultados.map(c => (
                        <button
                          key={c.id}
                          onClick={() => setClienteSel(c)}
                          className="w-full text-left px-4 py-2.5 hover:bg-oriental-bg transition-colors"
                        >
                          <p className="text-sm font-semibold text-oriental-black">{c.nombre}</p>
                          <p className="text-[11px] text-oriental-gray font-mono">{c.cedula_rif}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {destino === 'oriental' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Building2 size={16} className="text-blue-700" />
              </div>
              <div>
                <p className="text-sm font-bold text-oriental-black">La Oriental Automotors</p>
                <p className="text-[11px] text-oriental-gray">Solicitud interna, no vinculada a un cliente.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4 flex items-start gap-2">
              <AlertCircle size={14} className="text-red-700 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2 border border-gray-200 text-sm font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={saving || (destino === 'cliente' && !clienteSel)}
            className="flex-1 px-4 py-2 bg-oriental-red text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
