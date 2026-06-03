'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Loader2 } from 'lucide-react'

interface Props {
  id: string
  modelo: string
  placa: string | null
}

export default function ShowroomDeleteButton({ id, modelo, placa }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleDelete() {
    setLoading(true)
    setError('')
    const { error: err } = await supabase.from('vehiculos_showroom').delete().eq('id', id)
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    router.push('/showroom')
    router.refresh()
  }

  return (
    <>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(true) }}
        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
      >
        <Trash2 size={13} /> Eliminar
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-oriental-black text-lg mb-1">Eliminar vehículo</h3>
            <p className="text-sm text-oriental-gray mb-4">
              ¿Seguro que deseas eliminar <strong>{modelo}</strong>{placa ? ` (${placa})` : ''}?
              Esta acción no se puede deshacer.
            </p>
            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors disabled:opacity-60"
              >
                {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Sí, eliminar'}
              </button>
              <button
                onClick={() => { setOpen(false); setError('') }}
                className="flex-1 btn-secondary py-2.5"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
