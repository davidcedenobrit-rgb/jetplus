'use client'

import { useState } from 'react'
import { X, MessageCircle, Mail, Send, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  clienteId: string
  nombre: string
  cedula: string
  telefono: string | null
  whatsapp: string | null
  correo: string | null
  cuotasVencidas: number
  montoVencido: number
  diasMaxVencido: number
  placa: string
  onClose: () => void
  onSent: () => void
}

function fmt(n: number) {
  return n.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(n)*100)%100===0?0:2, maximumFractionDigits: 2 })
}

function buildWhatsAppMsg(nombre: string, cuotasVencidas: number, montoVencido: number, diasMaxVencido: number, placa: string) {
  return `Estimado/a ${nombre},\n\nLe informamos que tiene *${cuotasVencidas} cuota${cuotasVencidas !== 1 ? 's' : ''} vencida${cuotasVencidas !== 1 ? 's' : ''}* con un monto total de *$${fmt(montoVencido)}* correspondiente al vehículo placa *${placa}* (${diasMaxVencido} días vencido).\n\nLe pedimos regularizar su situación a la brevedad posible.\n\n_LA ORIENTAL AUTOMOTORS, C.A._\nTel: 0414-9989010`
}

export default function AvisoCobro({ clienteId, nombre, cedula, telefono, whatsapp, correo, cuotasVencidas, montoVencido, diasMaxVencido, placa, onClose, onSent }: Props) {
  const [tipoEnvio, setTipoEnvio] = useState<'whatsapp' | 'email' | 'ambos' | 'manual'>('ambos')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const waNum = (whatsapp || telefono || '').replace(/\D/g, '')
  const waMsg = buildWhatsAppMsg(nombre, cuotasVencidas, montoVencido, diasMaxVencido, placa)

  async function enviar() {
    setLoading(true); setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const registradoPor = user?.user_metadata?.nombre ?? user?.email ?? 'Sistema'

      if (tipoEnvio === 'whatsapp' || tipoEnvio === 'ambos') {
        if (!waNum) { setError('El cliente no tiene número de WhatsApp/teléfono registrado'); setLoading(false); return }
        window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(waMsg)}`, '_blank')
      }

      await fetch('/api/avisos-cobro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId, nombre, correo, cuotasVencidas, montoVencido,
          diasMaxVencido, placa, notas, tipoEnvio, registradoPor,
        }),
      })

      onSent()
    } catch {
      setError('Error al enviar el aviso')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-oriental-black text-base">Aviso de cobro</h3>
            <p className="text-xs text-oriental-gray mt-0.5">{nombre} · {cedula}</p>
          </div>
          <button onClick={onClose} className="text-oriental-gray hover:text-oriental-black"><X size={20} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Resumen vencido */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-red-400">Cuotas venc.</p>
              <p className="text-xl font-extrabold text-red-600">{cuotasVencidas}</p>
            </div>
            <div>
              <p className="text-xs text-red-400">Monto</p>
              <p className="text-sm font-extrabold text-red-600">${fmt(montoVencido)}</p>
            </div>
            <div>
              <p className="text-xs text-red-400">Días</p>
              <p className="text-xl font-extrabold text-red-600">{diasMaxVencido}</p>
            </div>
          </div>

          {/* Tipo de envío */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Enviar por</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { v: 'ambos',     icon: Send,          label: 'WhatsApp + Email' },
                { v: 'whatsapp',  icon: MessageCircle, label: 'Solo WhatsApp' },
                { v: 'email',     icon: Mail,          label: 'Solo Email' },
                { v: 'manual',    icon: Check,         label: 'Solo registrar' },
              ] as const).map(opt => (
                <button key={opt.v} onClick={() => setTipoEnvio(opt.v)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                    tipoEnvio === opt.v
                      ? 'bg-oriental-red text-white border-oriental-red'
                      : 'border-gray-200 text-gray-600 hover:border-gray-400 bg-white'
                  }`}>
                  <opt.icon size={13} /> {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Info de contacto */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">WhatsApp/Tel.</span>
              <span className="font-semibold text-gray-800">{whatsapp || telefono || <span className="text-red-400">No registrado</span>}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Email</span>
              <span className="font-semibold text-gray-800 truncate ml-4">{correo || <span className="text-red-400">No registrado</span>}</span>
            </div>
          </div>

          {/* Vista previa WhatsApp */}
          {(tipoEnvio === 'whatsapp' || tipoEnvio === 'ambos') && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Mensaje WhatsApp (previsualización)</p>
              <div className="bg-[#dcf8c6] rounded-xl px-3 py-2.5 text-xs text-gray-800 whitespace-pre-wrap leading-relaxed border border-green-200">
                {waMsg}
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Notas / observaciones</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oriental-red resize-none"
              rows={2}
              placeholder="Acordó pagar el viernes..."
              value={notas}
              onChange={e => setNotas(e.target.value)}
            />
          </div>

          {error && <p className="text-red-600 text-xs">{error}</p>}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-oriental-gray hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={enviar} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-oriental-red text-white text-sm font-bold hover:bg-red-700 flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? 'Enviando...' : <><Send size={14} /> Enviar aviso</>}
          </button>
        </div>
      </div>
    </div>
  )
}
