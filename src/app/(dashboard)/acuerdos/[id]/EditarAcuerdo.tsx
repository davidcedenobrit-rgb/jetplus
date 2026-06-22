'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Edit3, X, Save } from 'lucide-react'

interface Props {
  acuerdo: {
    id: string
    monto_acordado: number
    fecha_limite: string | null
    observaciones: string | null
  }
}

export default function EditarAcuerdo({ acuerdo }: Props) {
  const [open, setOpen] = useState(false)
  const [monto, setMonto] = useState(acuerdo.monto_acordado.toString())
  const [fecha, setFecha] = useState(acuerdo.fecha_limite ?? '')
  const [obs, setObs] = useState(acuerdo.observaciones ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function guardar() {
    const montoNum = parseFloat(monto)
    if (!montoNum || montoNum <= 0) { setError('Monto inválido'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase
      .from('acuerdos_inicial')
      .update({
        monto_acordado: montoNum,
        fecha_limite: fecha || null,
        observaciones: obs || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', acuerdo.id)
    if (err) { setError(err.message); setLoading(false); return }
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-oriental-gray hover:bg-gray-50 transition-colors"
      >
        <Edit3 size={13} /> Editar acuerdo
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-oriental-black text-lg">Editar acuerdo</h3>
              <button onClick={() => setOpen(false)} className="text-oriental-gray hover:text-oriental-black">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Monto acordado (USD) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray font-bold">$</span>
                  <input type="number" step="0.01" min="0" className="input pl-7 font-semibold text-lg"
                    value={monto} onChange={e => setMonto(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Fecha límite de pago</label>
                <input type="date" className="input" value={fecha} onChange={e => setFecha(e.target.value)} />
              </div>
              <div>
                <label className="label">Observaciones</label>
                <textarea className="input min-h-[80px]" placeholder="Pagará $3k el lunes..."
                  value={obs} onChange={e => setObs(e.target.value)} />
              </div>
            </div>

            {error && <p className="text-red-600 text-xs mt-3">{error}</p>}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-oriental-gray hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={guardar} disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-oriental-red text-white text-sm font-bold hover:bg-red-700 flex items-center justify-center gap-2 disabled:opacity-60">
                <Save size={14} /> {loading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
