'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Loader2, X, Plus, Trash2, DollarSign } from 'lucide-react'
import ProveedorPicker from '../../egresos/nuevo/ProveedorPicker'
import type { Proveedor } from '../../egresos/actions'
import { crearCompraPlazaDirecta } from './actions'

type Item = { descripcion: string; cantidad: number }

const METODOS = ['Efectivo USD', 'Efectivo Bs.', 'Transferencia bancaria', 'Pago Móvil', 'Zelle', 'USDT / Binance']

export default function NuevaCompraPlaza() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [proveedor, setProveedor] = useState<Proveedor | null>(null)
  const [items, setItems] = useState<Item[]>([{ descripcion: '', cantidad: 1 }])
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState<'USD' | 'VES'>('USD')
  const [tasa, setTasa] = useState('')
  const [fechaCompra, setFechaCompra] = useState(new Date().toISOString().slice(0, 10))
  const [metodoPago, setMetodoPago] = useState('')
  const [bancoOrigen, setBancoOrigen] = useState('')
  const [referencia, setReferencia] = useState('')
  const [notas, setNotas] = useState('')

  function reset() {
    setProveedor(null); setItems([{ descripcion: '', cantidad: 1 }]); setMonto(''); setMoneda('USD')
    setFechaCompra(new Date().toISOString().slice(0, 10)); setMetodoPago(''); setBancoOrigen('')
    setReferencia(''); setNotas(''); setError('')
  }

  function setItem(i: number, patch: Partial<Item>) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  }

  async function guardar() {
    setError('')
    if (!proveedor) { setError('Selecciona o crea el proveedor'); return }
    const validos = items.filter(it => it.descripcion.trim())
    if (validos.length === 0) { setError('Agrega al menos un ítem'); return }
    const montoNum = parseFloat(monto.replace(',', '.'))
    if (isNaN(montoNum) || montoNum <= 0) { setError('Monto inválido'); return }
    const tasaNum = parseFloat(tasa.replace(',', '.'))
    if (moneda === 'VES' && !(tasaNum > 0)) { setError('Para pagos en Bs ingresa la tasa del día (Bs/$)'); return }
    setLoading(true)
    const res = await crearCompraPlazaDirecta({
      proveedorId: proveedor.id,
      proveedorNombre: proveedor.nombre,
      items: validos.map(it => ({ descripcion: it.descripcion.trim(), cantidad: it.cantidad })),
      monto: montoNum,
      moneda,
      tasa: moneda === 'VES' ? tasaNum : null,
      fechaCompra,
      metodoPago: metodoPago || null,
      bancoOrigen: bancoOrigen || null,
      referencia: referencia || null,
      notas: notas || null,
      destino: 'oriental',
    })
    setLoading(false)
    if (res.error) { setError(res.error); return }
    reset(); setOpen(false)
    if (res.solicitudId) router.push(`/repuestos/${res.solicitudId}`)
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors">
        <Plus size={15} /> Nueva compra en plaza
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !loading && setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center flex-shrink-0">
                  <ShoppingBag size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-oriental-black text-base">Nueva compra en plaza</h2>
                  <p className="text-xs text-oriental-gray mt-0.5">Compra local directa, sin cotización de Vehimotors.</p>
                </div>
              </div>
              <button onClick={() => !loading && setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                <X size={16} className="text-oriental-gray" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Proveedor *</label>
                <ProveedorPicker proveedor={proveedor} onChange={setProveedor} />
              </div>

              <div>
                <label className="label">Ítems comprados *</label>
                <div className="space-y-2">
                  {items.map((it, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        className="input text-sm flex-1"
                        placeholder="Ej: Silicón, filtro, tornillería…"
                        value={it.descripcion}
                        onChange={e => setItem(i, { descripcion: e.target.value })}
                      />
                      <input
                        className="input text-sm w-20"
                        type="number" min="1" step="1"
                        value={it.cantidad}
                        onChange={e => setItem(i, { cantidad: parseInt(e.target.value) || 1 })}
                      />
                      {items.length > 1 && (
                        <button type="button" onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                          className="w-9 flex items-center justify-center rounded-lg border border-gray-200 text-oriental-gray hover:text-oriental-red hover:bg-red-50">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setItems(prev => [...prev, { descripcion: '', cantidad: 1 }])}
                  className="mt-2 text-xs font-semibold text-oriental-red hover:underline flex items-center gap-1">
                  <Plus size={12} /> Agregar ítem
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Monto pagado *</label>
                  <div className="flex gap-1">
                    <div className="relative flex-1">
                      <DollarSign size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input className="input text-sm pl-8" type="text" inputMode="decimal" placeholder="0,00"
                        value={monto} onChange={e => setMonto(e.target.value)} />
                    </div>
                    {(['USD', 'VES'] as const).map(m => (
                      <button key={m} type="button" onClick={() => setMoneda(m)}
                        className={`px-2 rounded-lg text-xs font-semibold border ${moneda === m ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200'}`}>{m}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Fecha *</label>
                  <input className="input text-sm" type="date" value={fechaCompra} onChange={e => setFechaCompra(e.target.value)} />
                </div>
              </div>

              {moneda === 'VES' && (
                <div>
                  <label className="label">Tasa Bs/$ del día *</label>
                  <input className="input text-sm font-mono" type="text" inputMode="decimal" placeholder="Ej: 98,50"
                    value={tasa} onChange={e => setTasa(e.target.value)} />
                  {tasa && parseFloat(tasa.replace(',', '.')) > 0 && parseFloat(monto.replace(',', '.')) > 0 && (
                    <p className="text-[11px] text-oriental-gray mt-1">
                      ≈ ${(parseFloat(monto.replace(',', '.')) / parseFloat(tasa.replace(',', '.'))).toLocaleString('es-VE', { maximumFractionDigits: 2 })} USD
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Método de pago</label>
                  <select className="select text-sm" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                    <option value="">—</option>
                    {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Banco / Origen</label>
                  <input className="input text-sm" placeholder="Opcional" value={bancoOrigen} onChange={e => setBancoOrigen(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="label">Referencia</label>
                <input className="input text-sm" placeholder="Opcional" value={referencia} onChange={e => setReferencia(e.target.value)} />
              </div>
              <div>
                <label className="label">Notas</label>
                <textarea className="textarea text-sm" rows={2} placeholder="Opcional" value={notas} onChange={e => setNotas(e.target.value)} />
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mt-3 text-[11px] text-purple-800">
              Al guardar se crea la compra en el grupo <strong>Compra en plaza</strong> y su <strong>egreso</strong> (categoría "cr_plaza", centro de costo Repuestos).
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 mt-3"><p className="text-xs text-red-800">{error}</p></div>}

            <div className="flex gap-2 pt-4">
              <button onClick={() => !loading && setOpen(false)} disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-oriental-gray hover:bg-gray-50 disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={guardar} disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? 'Guardando…' : 'Registrar compra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
