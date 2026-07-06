'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2, RotateCcw, X } from 'lucide-react'

interface Props {
  showroomId: string
  vehiculoLabel: string
  clienteNombre: string
}

export default function DesvincularVentaButton({ showroomId, vehiculoLabel, clienteNombre }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function confirmar() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/showroom/${showroomId}/desvincular-venta`, {
        method: 'POST',
      })
      const j = await res.json()
      if (!res.ok) {
        setError(j.error ?? 'Error al desvincular la venta')
        setLoading(false)
        return
      }
      setOpen(false)
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full mt-3 flex items-center justify-center gap-2 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
      >
        <RotateCcw size={13} /> Desvincular venta
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !loading && setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-oriental-black text-base">Desvincular venta</h2>
                  <p className="text-xs text-oriental-gray mt-0.5">Esta acción no se puede deshacer</p>
                </div>
              </div>
              <button onClick={() => !loading && setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                <X size={16} className="text-oriental-gray" />
              </button>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 space-y-1">
              <p className="text-xs text-red-800">
                Vas a desvincular el vehículo <strong>{vehiculoLabel}</strong> del cliente <strong>{clienteNombre}</strong>.
              </p>
              <ul className="text-[11px] text-red-700 list-disc pl-4 space-y-0.5 mt-2">
                <li>El registro de venta se elimina</li>
                <li>El cliente queda desvinculado del vehículo</li>
                <li>El vehículo vuelve a <strong>en agencia</strong> y disponible para nueva venta</li>
              </ul>
              <p className="text-[11px] text-red-700 mt-2">
                Si el vehículo ya tiene crédito, cotización, ingresos o acuerdos activos, la operación fallará y deberás resolverlos primero.
              </p>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-300 rounded-lg p-2.5 mb-3">
                <p className="text-xs text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-oriental-gray hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmar}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? 'Desvinculando…' : 'Sí, desvincular'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
