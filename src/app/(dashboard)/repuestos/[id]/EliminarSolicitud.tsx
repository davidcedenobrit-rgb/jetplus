'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Loader2, AlertCircle } from 'lucide-react'

export default function EliminarSolicitud({ solicitudId }: { solicitudId: string }) {
  const supabase = createClient()
  const router   = useRouter()
  const [confirmar, setConfirmar] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  async function eliminar() {
    setLoading(true); setError('')
    await supabase.from('repuestos_historial').delete().eq('solicitud_id', solicitudId)
    await supabase.from('repuestos_items').delete().eq('solicitud_id', solicitudId)
    const { error: err } = await supabase.from('solicitudes_repuestos').delete().eq('id', solicitudId)
    if (err) { setError(err.message); setLoading(false); return }
    router.push('/repuestos')
    router.refresh()
  }

  if (!confirmar) {
    return (
      <button onClick={() => setConfirmar(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors">
        <Trash2 size={14} /> Eliminar solicitud
      </button>
    )
  }

  return (
    <div className="card p-4 border border-red-200 bg-red-50">
      <div className="flex items-start gap-2 mb-3">
        <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-red-700 font-semibold">
          ¿Eliminar esta solicitud? Esta acción no se puede deshacer.
        </p>
      </div>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <div className="flex gap-2">
        <button onClick={eliminar} disabled={loading}
          className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-1 disabled:opacity-60">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          Sí, eliminar
        </button>
        <button onClick={() => setConfirmar(false)} className="flex-1 btn-secondary py-2 text-sm">
          Cancelar
        </button>
      </div>
    </div>
  )
}
