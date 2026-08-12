'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, Share2, ExternalLink, Check } from 'lucide-react'

export default function VerCotizacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [copiado, setCopiado] = useState(false)

  const pdfUrl = `/api/cotizaciones/${id}/pdf`
  const pdfAbs = typeof window !== 'undefined' ? `${window.location.origin}${pdfUrl}` : pdfUrl

  async function compartir() {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Cotización — JETPLUS', url: pdfAbs })
        return
      }
    } catch { /* el usuario canceló o no soporta */ }
    try {
      await navigator.clipboard.writeText(pdfAbs)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch { /* nada */ }
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-100">
      {/* Barra superior */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-200 flex-shrink-0">
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-oriental-gray hover:bg-gray-100">
          <ArrowLeft size={16} /> Volver
        </button>
        <p className="flex-1 text-sm font-bold text-oriental-black truncate text-center">Cotización</p>
        <a href={`${pdfUrl}?download=1`}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-oriental-black hover:bg-black">
          <Download size={16} /> <span className="hidden sm:inline">Descargar</span>
        </a>
        <button onClick={compartir}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700">
          {copiado ? <Check size={16} /> : <Share2 size={16} />} <span className="hidden sm:inline">{copiado ? 'Copiado' : 'Compartir'}</span>
        </button>
      </div>

      {/* Visor del PDF */}
      <iframe src={pdfUrl} title="Cotización PDF" className="flex-1 w-full border-0 bg-gray-100" />

      {/* Fallback móvil: si el visor embebido no carga, abrir a pantalla completa */}
      <div className="flex-shrink-0 px-3 py-2 bg-white border-t border-gray-200 text-center">
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-oriental-red hover:underline">
          <ExternalLink size={13} /> ¿No se ve? Abrir el PDF a pantalla completa
        </a>
      </div>
    </div>
  )
}
