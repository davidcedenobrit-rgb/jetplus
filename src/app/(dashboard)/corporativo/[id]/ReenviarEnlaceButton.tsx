'use client'

import { useState } from 'react'
import { Copy, Check, MessageCircle } from 'lucide-react'

export default function ReenviarEnlaceButton({ token, nombre }: { token: string | null; nombre: string }) {
  const [copiado, setCopiado] = useState(false)
  if (!token) return null

  const link = typeof window !== 'undefined' ? `${window.location.origin}/cuestionario/${token}` : ''

  function copiar() {
    navigator.clipboard.writeText(link)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const waLink = `https://wa.me/?text=${encodeURIComponent(`Hola ${nombre}, por favor completa tu descripción de cargo de La Oriental en las próximas 72 horas: ${link}`)}`

  return (
    <div className="flex gap-2 flex-wrap">
      <button onClick={copiar} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-amber-800 hover:bg-amber-100">
        {copiado ? <><Check size={13} className="text-green-600" /> Copiado</> : <><Copy size={13} /> Copiar enlace</>}
      </button>
      <a href={waLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700">
        <MessageCircle size={13} /> Enviar por WhatsApp
      </a>
    </div>
  )
}
