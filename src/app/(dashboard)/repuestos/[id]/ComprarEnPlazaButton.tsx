'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Loader2, X, DollarSign } from 'lucide-react'

interface Props {
  solicitudId: string
  numero: string
}

export default function ComprarEnPlazaButton({ solicitudId, numero }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [proveedor, setProveedor] = useState('')
  const [monto, setMonto] = useState('')
  const [fechaCompra, setFechaCompra] = useState(new Date().toISOString().slice(0, 10))
  const [metodoPago, setMetodoPago] = useState('')
  const [referencia, setReferencia] = useState('')
  const [bancoOrigen, setBancoOrigen] = useState('')
  const [notas, setNotas] = useState('')

  async function confirmar() {
    setError('')
    const montoNum = parseFloat(monto.replace(',', '.'))
    if (!proveedor.trim()) { setError('Escribe el proveedor'); return }
    if (isNaN(montoNum) || montoNum <= 0) { setError('Monto inválido'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/repuestos/${solicitudId}/comprar-plaza`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proveedor: proveedor.trim(),
          monto: montoNum,
          fechaCompra,
          metodoPago: metodoPago || null,
          referencia: referencia || null,
          bancoOrigen: bancoOrigen || null,
          notas: notas || null,
        }),
      })
      const j = await res.json()
      if (!res.ok) {
        setError(j.error ?? 'Error al registrar la compra')
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
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors"
      >
        <ShoppingBag size={15} /> Comprar en plaza
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !loading && setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center flex-shrink-0">
                  <ShoppingBag size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-oriental-black text-base">Comprar en plaza</h2>
                  <p className="text-xs text-oriental-gray mt-0.5 font-mono">{numero}</p>
                </div>
              </div>
              <button onClick={() => !loading && setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                <X size={16} className="text-oriental-gray" />
              </button>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-4 text-xs text-purple-800">
              Al confirmar se crea un <strong>egreso</strong> vinculado (categoría "cr_plaza") y la solicitud queda en el grupo <strong>Compra en plaza</strong>.
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">Proveedor *</label>
                <input
                  type="text"
                  value={proveedor}
                  onChange={e => setProveedor(e.target.value)}
                  placeholder="Ej: Repuestos Maturín C.A."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">Monto (USD) *</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={monto}
                      onChange={e => setMonto(e.target.value)}
                      placeholder="0,00"
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">Fecha *</label>
                  <input
                    type="date"
                    value={fechaCompra}
                    onChange={e => setFechaCompra(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">Método de pago</label>
                  <select
                    value={metodoPago}
                    onChange={e => setMetodoPago(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">—</option>
                    <option value="Efectivo USD">Efectivo USD</option>
                    <option value="Efectivo VES">Efectivo Bs.</option>
                    <option value="Transferencia bancaria">Transferencia bancaria</option>
                    <option value="Pago Móvil">Pago Móvil</option>
                    <option value="Zelle">Zelle</option>
                    <option value="USDT VE">USDT / Binance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">Banco / Origen</label>
                  <input
                    type="text"
                    value={bancoOrigen}
                    onChange={e => setBancoOrigen(e.target.value)}
                    placeholder="Opcional"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">Referencia</label>
                <input
                  type="text"
                  value={referencia}
                  onChange={e => setReferencia(e.target.value)}
                  placeholder="Opcional"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">Notas</label>
                <textarea
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  rows={2}
                  placeholder="Opcional"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 mt-3">
                <p className="text-xs text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
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
                className="flex-1 px-4 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? 'Registrando…' : 'Registrar compra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
