'use client'

import { useState } from 'react'
import { RotateCcw, X, AlertTriangle } from 'lucide-react'
import { revertirPagoCuota } from './actions'
import { useRouter } from 'next/navigation'

interface Props {
  cuotaId: string
  creditoId: string
  numeroCuota: number
  montoPagado: number
  planLabel: string
  esAbono?: boolean
}

export default function RevertirCuotaButton({ cuotaId, creditoId, numeroCuota, montoPagado, planLabel, esAbono = false }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleRevertir() {
    setLoading(true)
    setError('')
    const result = await revertirPagoCuota(cuotaId, creditoId, montoPagado)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-oriental-red font-medium transition-colors mt-1"
        title={esAbono ? 'Revertir abono parcial (solo directores)' : 'Revertir pago (solo directores)'}
      >
        <RotateCcw size={10} />
        {esAbono ? 'Revertir abono' : 'Revertir'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle size={16} className="text-red-600" />
                </div>
                <h2 className="font-bold text-oriental-black">Revertir pago</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={16} className="text-oriental-gray" />
              </button>
            </div>

            <p className="text-sm text-oriental-gray mb-1">
              {esAbono ? 'Vas a revertir el abono parcial de:' : 'Vas a revertir el pago de:'}
            </p>
            <div className={`border rounded-xl px-4 py-3 mb-4 ${esAbono ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
              <p className="font-bold text-oriental-black text-sm">
                Cuota #{numeroCuota} — {planLabel}
              </p>
              <p className={`text-xs font-semibold mt-0.5 ${esAbono ? 'text-amber-700' : 'text-red-600'}`}>
                Abonado: ${montoPagado.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(montoPagado)*100)%100===0?0:2, maximumFractionDigits: 2 })} USD
              </p>
            </div>

            <p className="text-xs text-oriental-gray mb-4">
              Esto eliminará el vínculo con el(los) recibo(s), devolverá <strong>${montoPagado.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(montoPagado)*100)%100===0?0:2, maximumFractionDigits: 2 })}</strong> al saldo del crédito y marcará la cuota como <strong>Pendiente</strong>. Los recibos de ingreso no se eliminan.
            </p>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleRevertir}
                disabled={loading}
                className="flex-1 py-2.5 bg-oriental-red text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} />
                {loading ? 'Revirtiendo...' : 'Confirmar reversión'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 py-2.5 bg-gray-100 text-oriental-black text-sm font-bold rounded-xl hover:bg-gray-200 transition-colors"
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
