'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserX, Loader2, AlertCircle } from 'lucide-react'

export default function DesvincularCliente({ vehiculoId }: { vehiculoId: string }) {
  const supabase = createClient()
  const router   = useRouter()
  const [confirmar, setConfirmar] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  async function desvincular() {
    setLoading(true); setError('')
    const { error: err } = await supabase
      .from('vehiculos')
      .update({ cliente_id: null, updated_at: new Date().toISOString() })
      .eq('id', vehiculoId)
    if (err) { setError(err.message); setLoading(false); return }
    router.refresh()
  }

  if (!confirmar) {
    return (
      <button onClick={() => setConfirmar(true)}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-50 transition-colors">
        <UserX size={13} /> Desvincular cliente
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-3">
      <div className="flex items-start gap-2 mb-2">
        <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-red-700 font-semibold">¿Desvincular el cliente de este vehículo? Los créditos quedan registrados.</p>
      </div>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <div className="flex gap-2">
        <button onClick={desvincular} disabled={loading}
          className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1 disabled:opacity-60">
          {loading ? <Loader2 size={12} className="animate-spin" /> : <UserX size={12} />} Desvincular
        </button>
        <button onClick={() => setConfirmar(false)} className="flex-1 btn-secondary py-1.5 text-xs">
          Cancelar
        </button>
      </div>
    </div>
  )
}
