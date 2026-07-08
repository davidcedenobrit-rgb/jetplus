'use client'

import { useState, useEffect } from 'react'
import { X, MessageCircle, Mail, Send, ClipboardList, CheckCircle } from 'lucide-react'

interface Entrada {
  id: string
  registrado_por: string
  tipo_envio: string
  notas: string | null
  monto_vencido: number
  cuotas_vencidas: number
  created_at: string
}

interface Props {
  clienteId: string
  nombre: string
  onClose: () => void
}

function fmt(n: number) {
  return n.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(n)*100)%100===0?0:2, maximumFractionDigits: 2 })
}

function fmtDt(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const TIPO_ICON: Record<string, { icon: React.ElementType; label: string; bg: string; text: string }> = {
  whatsapp: { icon: MessageCircle, label: 'WhatsApp',         bg: 'bg-green-50',  text: 'text-green-700' },
  email:    { icon: Mail,          label: 'Email',             bg: 'bg-blue-50',   text: 'text-blue-700' },
  ambos:    { icon: Send,          label: 'WhatsApp + Email',  bg: 'bg-purple-50', text: 'text-purple-700' },
  manual:   { icon: CheckCircle,   label: 'Registro manual',   bg: 'bg-gray-100',  text: 'text-gray-600' },
}

export default function BitacoraCobro({ clienteId, nombre, onClose }: Props) {
  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/avisos-cobro?clienteId=${clienteId}`)
      .then(r => r.json())
      .then(j => { setEntradas(j.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [clienteId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-oriental-red" />
            <div>
              <h3 className="font-bold text-oriental-black text-base">Bitácora de cobro</h3>
              <p className="text-xs text-oriental-gray mt-0.5">{nombre}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-oriental-gray hover:text-oriental-black"><X size={20} /></button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-10 text-oriental-gray text-sm">Cargando...</div>
          ) : entradas.length === 0 ? (
            <div className="text-center py-10">
              <ClipboardList size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-oriental-gray">Sin registros de cobro para este cliente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entradas.map(e => {
                const tipo = TIPO_ICON[e.tipo_envio] ?? TIPO_ICON.manual
                const Icon = tipo.icon
                return (
                  <div key={e.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${tipo.bg}`}>
                          <Icon size={13} className={tipo.text} />
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${tipo.text}`}>{tipo.label}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{fmtDt(e.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-oriental-red">${fmt(e.monto_vencido)}</p>
                        <p className="text-[11px] text-gray-400">{e.cuotas_vencidas} cuota{e.cuotas_vencidas !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        <span className="font-semibold text-gray-700">{e.registrado_por}</span>
                      </p>
                      {e.notas && (
                        <p className="text-xs text-gray-500 italic ml-3 text-right">"{e.notas}"</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-oriental-gray hover:bg-gray-50">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
