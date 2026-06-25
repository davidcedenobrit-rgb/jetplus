'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { actualizarTasaEgreso } from '../actions'

interface Props {
  egresoId: string
  monto: number
  tasaActual: number | null
  montoBsActual: number | null
}

export default function EgresoTasaEditor({ egresoId, monto, tasaActual, montoBsActual }: Props) {
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [tasa, setTasa] = useState(tasaActual ? String(tasaActual) : '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const tasaNum = parseFloat(tasa)
  const preview = !isNaN(tasaNum) && tasaNum > 0 ? monto * tasaNum : null

  async function handleSave() {
    if (isNaN(tasaNum) || tasaNum <= 0) { setErr('Ingresa una tasa válida mayor a 0'); return }
    setSaving(true); setErr('')
    const res = await actualizarTasaEgreso(egresoId, tasaNum, monto)
    setSaving(false)
    if (res.error) { setErr(res.error); return }
    setEditando(false)
    router.refresh()
  }

  if (!editando) {
    return (
      <div className="flex items-center justify-between">
        <div>
          {tasaActual ? (
            <div>
              <p className="text-xs text-oriental-gray uppercase tracking-wider font-semibold mb-0.5">Tasa Bs/$</p>
              <p className="text-sm font-mono font-bold text-oriental-black">{Number(tasaActual).toFixed(4)}</p>
              {montoBsActual && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Bs {Number(montoBsActual).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Sin tasa registrada</p>
          )}
        </div>
        <button
          onClick={() => setEditando(true)}
          className="text-xs text-oriental-red hover:underline font-medium"
        >
          {tasaActual ? 'Editar tasa' : '+ Agregar tasa'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-[11px] text-oriental-gray uppercase tracking-wider font-semibold mb-1">
            Tasa Bs/$ al momento del pago
          </label>
          <input
            type="number" step="0.0001" min="0"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-oriental-red"
            placeholder="Ej: 98.50"
            value={tasa}
            onChange={e => setTasa(e.target.value)}
            autoFocus
          />
          {preview && (
            <p className="text-[11px] text-gray-500 mt-1">
              = Bs {preview.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}
        </div>
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => { setEditando(false); setErr('') }}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 bg-oriental-red text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar tasa'}
        </button>
      </div>
    </div>
  )
}
