'use client'

import { useState } from 'react'
import { Link2, Copy, Check, MessageCircle } from 'lucide-react'

export default function EnlaceBaseCard() {
  const [copiado, setCopiado] = useState(false)
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://jetplus.vercel.app'
  const link = `${base}/cuestionario`

  function copiar() {
    navigator.clipboard.writeText(link)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const waText = `📋 *JETPLUS — Descripción de cargo*\n\nHola equipo, por favor completa tu descripción de cargo en el siguiente enlace. Es rápido y queda registrado automáticamente:\n\n${link}`
  const waLink = `https://wa.me/?text=${encodeURIComponent(waText)}`

  return (
    <div className="card p-5 mb-6 border-2 border-blue-100 bg-blue-50/40">
      <div className="flex items-center gap-2 mb-2">
        <Link2 size={16} className="text-blue-600" />
        <h2 className="text-sm font-bold text-oriental-black">Enlace para el grupo de WhatsApp</h2>
      </div>
      <p className="text-xs text-oriental-gray mb-3">
        Comparte este enlace único en el grupo. Cualquier trabajador que lo llene queda registrado automáticamente en la nómina.
      </p>
      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 mb-3">
        <p className="text-xs text-oriental-black break-all font-mono">{link}</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={copiar} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-oriental-black hover:bg-gray-50">
          {copiado ? <><Check size={14} className="text-green-600" /> Copiado</> : <><Copy size={14} /> Copiar enlace</>}
        </button>
        <a href={waLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700">
          <MessageCircle size={14} /> Compartir por WhatsApp
        </a>
      </div>
    </div>
  )
}
