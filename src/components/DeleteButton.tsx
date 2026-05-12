'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2, AlertTriangle, X } from 'lucide-react'

interface Props {
  table: string
  id: string
  redirectTo: string
  label?: string
}

export default function DeleteButton({ table, id, redirectTo, label = 'Eliminar' }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setLoading(true)
    setError('')
    const { error: deleteError } = await supabase.from(table).delete().eq('id', id)
    if (deleteError) {
      setError(deleteError.message)
      setLoading(false)
      return
    }
    router.push(redirectTo)
    router.refresh()
  }

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
      >
        <Trash2 size={16} />
        {label}
      </button>
    )
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-red-800">
          ¿Estás seguro? Esta acción no se puede deshacer.
        </p>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="flex-1 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Eliminando...' : 'Sí, eliminar'}
        </button>
        <button
          onClick={() => { setShowConfirm(false); setError('') }}
          className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-oriental-gray hover:bg-gray-50 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
