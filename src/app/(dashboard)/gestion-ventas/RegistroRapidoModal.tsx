'use client'

import { useState } from 'react'
import { X, Loader2, Check } from 'lucide-react'

export default function RegistroRapidoModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteCedula, setClienteCedula] = useState('')
  const [marca, setMarca] = useState<'MG' | 'MAXUS'>('MG')
  const [modelo, setModelo] = useState('')
  const [placa, setPlaca] = useState('')
  const [precioTotal, setPrecioTotal] = useState('')
  const [tipoCompra, setTipoCompra] = useState<'contado' | 'credito'>('contado')
  const [observaciones, setObservaciones] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function guardar() {
    setError('')
    if (!clienteNombre.trim() || !clienteCedula.trim()) { setError('Nombre y cédula/RIF del cliente son obligatorios.'); return }
    if (!modelo.trim()) { setError('El modelo es obligatorio.'); return }
    const precio = Number(precioTotal.replace(',', '.'))
    if (!precio || precio <= 0) { setError('Ingresa un precio de venta válido.'); return }

    setSaving(true)
    try {
      const r = await fetch('/api/vehiculos/registro-rapido', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteNombre: clienteNombre.trim(), clienteCedula: clienteCedula.trim(),
          marca, modelo: modelo.trim(), placa: placa.trim(), precioTotal: precio,
          tipoCompra, observaciones: observaciones.trim(),
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setError(j.error ?? 'No se pudo registrar la venta'); setSaving(false); return }
      onSaved()
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      setSaving(false)
    }
  }

  const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red'
  const lbl = 'block text-[11px] font-semibold text-gray-500 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && onClose()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-bold text-oriental-black text-base">⚡ Registro rápido de venta</h2>
            <p className="text-xs text-oriental-gray mt-0.5">Solo deja constancia de que el carro se vendió. No genera ingresos, créditos ni cuotas — eso lo completas después desde &quot;Definir utilidad&quot; en Ventas registradas.</p>
          </div>
          <button onClick={() => !saving && onClose()} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center shrink-0"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-800">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Nombre del cliente *</label>
              <input className={inp} value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} placeholder="Nombre y apellido" />
            </div>
            <div>
              <label className={lbl}>Cédula / RIF *</label>
              <input className={inp} value={clienteCedula} onChange={e => setClienteCedula(e.target.value)} placeholder="V-12345678" />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 -mt-1">Si esa cédula ya existe en tus clientes, se usa el mismo registro.</p>

          <div>
            <label className={lbl}>Marca *</label>
            <div className="flex gap-1.5">
              {(['MG', 'MAXUS'] as const).map(m => (
                <button key={m} type="button" onClick={() => setMarca(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${marca === m ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-oriental-black'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Modelo *</label>
              <input className={inp} value={modelo} onChange={e => setModelo(e.target.value)} placeholder="MG3, T60..." />
            </div>
            <div>
              <label className={lbl}>Placa</label>
              <input className={inp} value={placa} onChange={e => setPlaca(e.target.value)} placeholder="Opcional" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Precio de venta $ *</label>
              <input className={inp} inputMode="decimal" value={precioTotal} onChange={e => setPrecioTotal(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className={lbl}>Forma de pago</label>
              <div className="flex gap-1.5">
                {([['contado', 'Contado'], ['credito', 'Crédito']] as const).map(([k, label]) => (
                  <button key={k} type="button" onClick={() => setTipoCompra(k)}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${tipoCompra === k ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-oriental-black'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className={lbl}>Notas (opcional)</label>
            <textarea className={`${inp} resize-none`} rows={2} value={observaciones} onChange={e => setObservaciones(e.target.value)} />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
            <button onClick={guardar} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-oriental-red text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Registrar venta
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
