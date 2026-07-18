'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Link2, X, Loader2 } from 'lucide-react'
import { crearVinculacion } from '../../vehimotors/asignaciones/actions'

export default function AsignarClienteButton({ vehiculoId, tieneCliente, numeroSaActual }: { vehiculoId: string; tieneCliente: boolean; numeroSaActual: string | null }) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [numeroSa, setNumeroSa] = useState(numeroSaActual ?? '')
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState('USD')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function guardar() {
    setGuardando(true); setError('')
    const r = await crearVinculacion({
      vehiculoId,
      numeroSa,
      montoProforma: monto ? parseFloat(monto) : null,
      moneda,
    })
    setGuardando(false)
    if ('error' in r && r.error) { setError(r.error); return }
    if ('ok' in r && r.ok && 'vinculacionId' in r) {
      router.push(`/vehimotors/asignaciones/${r.vinculacionId}`)
    }
  }

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        disabled={!tieneCliente}
        title={tieneCliente ? 'Asignar el cliente y enviar a facturar' : 'Primero vincula un cliente al vehículo'}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        <Link2 size={13} /> Asignar al cliente
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setAbierto(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-oriental-black flex items-center gap-2"><Link2 size={18} className="text-indigo-600" /> Asignar al cliente</h3>
              <button onClick={() => setAbierto(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X size={16} className="text-oriental-gray" /></button>
            </div>
            <p className="text-xs text-oriental-gray mb-4">Se crea la asignación y pasa al módulo <b>Asignaciones y Ventas</b> (Vehimotors) para su fase a fase.</p>

            <div className="space-y-3">
              <div>
                <label className="label">N° SA / Proforma</label>
                <input value={numeroSa} onChange={e => setNumeroSa(e.target.value)} className="input" placeholder="Ej. SA-6960" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="label">Monto de proforma</label>
                  <input type="number" step="0.01" min="0" value={monto} onChange={e => setMonto(e.target.value)} className="input" placeholder="0.00" />
                </div>
                <div>
                  <label className="label">Moneda</label>
                  <select value={moneda} onChange={e => setMoneda(e.target.value)} className="select">
                    <option value="USD">USD</option>
                    <option value="VES">VES</option>
                  </select>
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-oriental-red mt-3">{error}</p>}

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setAbierto(false)} className="btn-secondary text-sm">Cancelar</button>
              <button onClick={guardar} disabled={guardando} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
                {guardando ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />} Asignar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
