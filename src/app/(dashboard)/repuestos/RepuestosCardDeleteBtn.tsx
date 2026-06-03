'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Loader2 } from 'lucide-react'

export default function RepuestosCardDeleteBtn({ solicitudId, numero }: { solicitudId: string; numero: string }) {
  const supabase = createClient()
  const router   = useRouter()
  const [confirmar, setConfirmar] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  async function eliminar(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)
    setError('')
    const { error: err } = await supabase.from('solicitudes_repuestos').delete().eq('id', solicitudId)
    if (err) { setError(err.message); setLoading(false); return }
    router.push('/repuestos')
    router.refresh()
  }

  function abrirConfirm(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setConfirmar(true)
  }

  function cancelar(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setConfirmar(false)
  }

  if (confirmar) {
    return (
      <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center gap-3 z-10 p-4"
        onClick={e => e.preventDefault()}>
        <p className="text-sm font-semibold text-gray-800 text-center">¿Eliminar {numero}?</p>
        {error && <p className="text-xs text-red-600 text-center">{error}</p>}
        <div className="flex gap-2">
          <button onClick={eliminar} disabled={loading}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 disabled:opacity-60">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Eliminar
          </button>
          <button onClick={cancelar} className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg">
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <button onClick={abrirConfirm}
      className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors z-10"
      title="Eliminar solicitud">
      <Trash2 size={14} />
    </button>
  )
}
