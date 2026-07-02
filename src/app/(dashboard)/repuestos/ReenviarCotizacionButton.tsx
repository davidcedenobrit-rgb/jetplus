'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw } from 'lucide-react'

interface Props {
  solicitudId: string
  userEmail?: string
  size?: 'sm' | 'md'
  className?: string
}

export default function ReenviarCotizacionButton({ solicitudId, userEmail, size = 'md', className = '' }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function reenviar() {
    setLoading(true)
    setMessage('')
    setError('')

    const res = await fetch('/api/repuestos/enviar-cotizacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solicitudId, reenviar: true, userEmail }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'No se pudo reenviar')
      setLoading(false)
      return
    }

    setMessage('Reenviado')
    router.refresh()
    setLoading(false)
  }

  const compact = size === 'sm'

  return (
    <div className={className}>
      <button
        type="button"
        onClick={reenviar}
        disabled={loading}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-oriental-red/25 bg-white text-oriental-red font-bold hover:bg-red-50 disabled:opacity-60 ${
          compact ? 'px-2.5 py-1.5 text-[11px]' : 'w-full px-3 py-2.5 text-sm'
        }`}
      >
        {loading ? <Loader2 size={compact ? 12 : 15} className="animate-spin" /> : <RefreshCw size={compact ? 12 : 15} />}
        Reenviar
      </button>
      {message && <p className="mt-1 text-[11px] font-semibold text-green-700">{message}</p>}
      {error && <p className="mt-1 text-[11px] font-semibold text-red-700">{error}</p>}
    </div>
  )
}
