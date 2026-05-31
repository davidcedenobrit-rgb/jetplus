'use client'

import { useState } from 'react'
import { MessageCircle, Copy, ExternalLink, X, Check } from 'lucide-react'

interface CuotaVencida {
  vehiculoLabel: string
  cantidad: number
  monto: number
  moneda: string
}

interface CuotaProxima {
  vehiculoLabel: string
  monto: number
  moneda: string
  fecha: string
}

interface Props {
  clienteNombre: string
  whatsapp: string
  cuotasVencidas: CuotaVencida[]
  cuotasProximas: CuotaProxima[]
  remitente: string
}

function fmtMonto(monto: number, moneda: string) {
  return `${moneda === 'USD' ? '$' : 'Bs.'}${monto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtFecha(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })
}

function limpiarNumero(num: string) {
  const solo = num.replace(/\D/g, '')
  if (solo.startsWith('58')) return solo
  if (solo.startsWith('0')) return '58' + solo.slice(1)
  return '58' + solo
}

export default function RecordatorioWhatsApp({ clienteNombre, whatsapp, cuotasVencidas, cuotasProximas, remitente }: Props) {
  const [open, setOpen] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const nombre = clienteNombre.split(' ')[0]

  const lineas: string[] = []
  lineas.push(`Hola ${nombre} 👋`)
  lineas.push('')
  lineas.push(`Te saluda *${remitente}* de *La Oriental Automotors*. Queremos recordarte que tienes cuotas pendientes con nosotros:`)
  lineas.push('')

  if (cuotasVencidas.length > 0) {
    lineas.push(`🔴 *Cuotas vencidas:*`)
    cuotasVencidas.forEach(c => {
      lineas.push(`• ${c.vehiculoLabel} — *${fmtMonto(c.monto, c.moneda)}* (${c.cantidad} cuota${c.cantidad > 1 ? 's' : ''})`)
    })
    lineas.push('')
  }

  if (cuotasProximas.length > 0) {
    lineas.push(`🟡 *Por vencer:*`)
    cuotasProximas.forEach(c => {
      lineas.push(`• ${c.vehiculoLabel} — *${fmtMonto(c.monto, c.moneda)}* el ${fmtFecha(c.fecha)}`)
    })
    lineas.push('')
  }

  lineas.push(`Por favor coordina tu pago a la brevedad posible. Estamos a tu disposición para cualquier consulta. 🙏`)
  lineas.push('')
  lineas.push(`_${remitente} · La Oriental Automotors · MG & Maxus · Maturín_`)

  const mensaje = lineas.join('\n')
  const numero  = limpiarNumero(whatsapp)
  const waUrl   = `https://web.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(mensaje)}`

  async function copiar() {
    await navigator.clipboard.writeText(mensaje)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
      >
        <MessageCircle size={16} />
        Aviso de cobro
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">

            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MessageCircle size={18} className="text-green-600" />
                <div>
                  <p className="font-bold text-oriental-black">Aviso de cobro</p>
                  <p className="text-[11px] text-oriental-gray">Enviando como: <span className="font-semibold text-oriental-black">{remitente}</span></p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                <X size={16} className="text-oriental-gray" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="text-xs text-oriental-gray font-semibold uppercase tracking-wider mb-2">
                Mensaje para {clienteNombre}
              </p>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <pre className="text-sm text-oriental-black whitespace-pre-wrap font-sans leading-relaxed">
                  {mensaje}
                </pre>
              </div>
              <p className="text-xs text-oriental-gray mt-3 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
                Se enviará al número: <span className="font-mono font-bold">{whatsapp}</span>
              </p>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 space-y-2">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors"
              >
                <ExternalLink size={16} />
                Abrir en WhatsApp
              </a>
              <button
                onClick={copiar}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-oriental-black text-sm font-semibold transition-colors"
              >
                {copiado ? <><Check size={16} className="text-green-600" /> Copiado</> : <><Copy size={16} /> Copiar mensaje</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
