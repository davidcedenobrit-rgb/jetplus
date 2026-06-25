'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { actualizarTasaEgreso } from '../actions'

interface Props {
  egresoId: string
  monto: number
  moneda: string
  tasaActual: number | null
}

export default function EgresoTasaEditor({ egresoId, monto, moneda, tasaActual }: Props) {
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [tasa, setTasa] = useState(tasaActual ? String(tasaActual) : '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const tasaNum = parseFloat(tasa)
  const equivalente = !isNaN(tasaNum) && tasaNum > 0
    ? moneda === 'VES'
      ? `≈ USD ${(monto / tasaNum).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `Bs ${(monto * tasaNum).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : null

  async function handleSave() {
    if (isNaN(tasaNum) || tasaNum <= 0) { setErr('Ingresa una tasa válida mayor a 0'); return }
    setSaving(true); setErr('')
    const res = await actualizarTasaEgreso(egresoId, tasaNum, monto, moneda)
    setSaving(false)
    if (res.error) { setErr(res.error); return }
    setEditando(false)
    router.refresh()
  }

  const equivalenteActual = tasaActual && tasaActual > 0
    ? moneda === 'VES'
      ? `≈ USD ${(monto / tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `Bs ${(monto * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : null

  if (!editando) {
    return (
      <div className="flex items-center justify-between">
        <div>
          {tasaActual ? (
            <div>
              <p className="text-xs text-oriental-gray uppercase tracking-wider font-semibold mb-0.5">Tasa Bs/$</p>
              <p className="text-sm font-mono font-bold text-oriental-black">{Number(tasaActual).toFixed(4)}</p>
              {equivalenteActual && <p className="text-xs text-gray-500 mt-0.5">{equivalenteActual}</p>}
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
        {equivalente && (
          <p className="text-[11px] text-gray-500 mt-1">{equivalente}</p>
        )}
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
