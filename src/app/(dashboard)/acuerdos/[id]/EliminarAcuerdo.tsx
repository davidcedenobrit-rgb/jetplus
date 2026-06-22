'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2, AlertTriangle, X } from 'lucide-react'

export default function EliminarAcuerdo({ acuerdoId }: { acuerdoId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function eliminar() {
    setLoading(true); setError('')
    // Desvincular ingresos antes de eliminar
    await supabase
      .from('ingresos')
      .update({ acuerdo_inicial_id: null })
      .eq('acuerdo_inicial_id', acuerdoId)

    const { error: err } = await supabase
      .from('acuerdos_inicial')
      .delete()
      .eq('id', acuerdoId)

    if (err) { setError(err.message); setLoading(false); return }
    router.push('/acuerdos')
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 border border-red-200 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors"
      >
        <Trash2 size={13} /> Eliminar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle size={18} />
                <h3 className="font-bold text-base">Eliminar acuerdo</h3>
              </div>
              <button onClick={() => setOpen(false)} className="text-oriental-gray hover:text-oriental-black">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-oriental-gray mb-2">
              ¿Seguro que quieres eliminar este acuerdo de pago?
            </p>
            <p className="text-xs text-oriental-gray bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5">
              Los ingresos/recibos registrados <strong>no se eliminan</strong>, solo se desvinculan del acuerdo.
            </p>
            {error && <p className="text-red-600 text-xs mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-oriental-gray hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={eliminar} disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 flex items-center justify-center gap-2 disabled:opacity-60">
                <Trash2 size={13} /> {loading ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
