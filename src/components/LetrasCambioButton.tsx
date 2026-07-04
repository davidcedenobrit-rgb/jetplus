'use client'

import { useState } from 'react'
import { FileText, X, Loader2 } from 'lucide-react'

interface Props {
  // Tipo de origen del PDF
  origen: 'credito' | 'acuerdo'
  entidadId: string
  // Solo para acuerdos: total del acuerdo y fecha_limite para sugerir defaults
  montoAcordado?: number
  fechaLimite?: string | null
}

export default function LetrasCambioButton({ origen, entidadId, montoAcordado, fechaLimite }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fiadorNombre, setFiadorNombre] = useState('')
  const [fiadorCedula, setFiadorCedula] = useState('')

  // Solo acuerdo
  const [numLetras, setNumLetras] = useState(1)
  const defaultDia = fechaLimite ? new Date(fechaLimite + 'T12:00:00').getDate() : 6
  const [diaVencimiento, setDiaVencimiento] = useState(defaultDia)

  async function generar() {
    setLoading(true)
    try {
      const base = origen === 'credito'
        ? `/api/creditos/${entidadId}/letras-cambio`
        : `/api/acuerdos/${entidadId}/letras-cambio`
      const q = new URLSearchParams()
      if (fiadorNombre.trim()) q.set('fiadorNombre', fiadorNombre.trim())
      if (fiadorCedula.trim()) q.set('fiadorCedula', fiadorCedula.trim())
      if (origen === 'acuerdo') {
        q.set('numLetras', String(numLetras))
        q.set('diaVencimiento', String(diaVencimiento))
      }
      const url = `${base}?${q.toString()}`
      window.open(url, '_blank', 'noopener,noreferrer')
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  const montoPorLetra = origen === 'acuerdo' && montoAcordado
    ? montoAcordado / Math.max(1, numLetras)
    : null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-semibold text-oriental-black transition-colors"
      >
        <FileText size={15} className="text-oriental-red" />
        Letras de cambio
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-oriental-black">Generar letras de cambio</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {origen === 'acuerdo' && (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-oriental-gray uppercase tracking-wide mb-1 block">
                      Cantidad de letras
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={numLetras}
                      onChange={e => setNumLetras(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oriental-red"
                    />
                    {montoPorLetra !== null && (
                      <p className="text-[11px] text-oriental-gray mt-1">
                        {numLetras === 1
                          ? `1 letra por USD ${montoPorLetra.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                          : `${numLetras} letras × ~USD ${montoPorLetra.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`}
                      </p>
                    )}
                  </div>

                  {numLetras > 1 && (
                    <div>
                      <label className="text-[11px] font-bold text-oriental-gray uppercase tracking-wide mb-1 block">
                        Día del mes de vencimiento
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={diaVencimiento}
                        onChange={e => setDiaVencimiento(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oriental-red"
                      />
                      <p className="text-[11px] text-oriental-gray mt-1">
                        Cada letra vencerá el día {diaVencimiento} del mes correspondiente.
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="border-t border-gray-100 pt-4">
                <p className="text-[11px] font-bold text-oriental-gray uppercase tracking-wide mb-2">
                  Fiador (opcional)
                </p>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={fiadorNombre}
                    onChange={e => setFiadorNombre(e.target.value)}
                    placeholder="Nombre del fiador"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oriental-red"
                  />
                  <input
                    type="text"
                    value={fiadorCedula}
                    onChange={e => setFiadorCedula(e.target.value)}
                    placeholder="Cédula del fiador (ej: 12345678)"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oriental-red"
                  />
                </div>
                <p className="text-[11px] text-oriental-gray mt-2">
                  Si lo dejas vacío, el bloque de aval queda en blanco para llenar a mano.
                </p>
              </div>
            </div>

            <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-200 text-sm font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={generar}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-oriental-red text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? 'Generando…' : 'Generar PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
