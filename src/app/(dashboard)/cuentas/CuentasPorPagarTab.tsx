'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2, X, DollarSign, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { CATEGORIAS_EGRESO_LABEL } from '@/lib/utils'
import ProveedorPicker from '../egresos/nuevo/ProveedorPicker'
import type { Proveedor } from '../egresos/actions'
import { crearCuentaPorPagar, marcarPagada, anularCuentaPorPagar } from './actions'

export type CxP = {
  id: string
  beneficiario: string
  concepto: string
  categoria: string | null
  monto: number
  moneda: string
  tasa_cambio: number | null
  fecha_limite: string | null
  fecha_emision: string
  proveedor_id: string | null
}

const MONEDAS = ['USD', 'VES', 'USDT']
const METODOS = ['Efectivo USD', 'Efectivo Bs.', 'Transferencia bancaria', 'Pago Móvil', 'Zelle', 'USDT / Binance', 'Tarjeta de crédito', 'Tarjeta de débito']

function fmt(n: number) {
  return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function simbolo(m: string) { return m === 'VES' ? 'Bs.' : m === 'USDT' ? 'USDT' : '$' }
function fmtFecha(d: string | null) {
  return d ? new Date(d + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

export default function CuentasPorPagarTab({ items, reload }: { items: CxP[]; reload: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  // Alta
  const [showNueva, setShowNueva] = useState(false)
  const [prov, setProv] = useState<Proveedor | null>(null)
  const [benefLibre, setBenefLibre] = useState('')
  const [concepto, setConcepto] = useState('')
  const [categoria, setCategoria] = useState('')
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState('USD')
  const [tasa, setTasa] = useState('')
  const [fechaLimite, setFechaLimite] = useState('')
  const [notas, setNotas] = useState('')

  // Pago
  const [pagando, setPagando] = useState<CxP | null>(null)
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10))
  const [metodo, setMetodo] = useState('')
  const [banco, setBanco] = useState('')
  const [referencia, setReferencia] = useState('')

  const hoy = new Date().toISOString().split('T')[0]

  function resetNueva() {
    setProv(null); setBenefLibre(''); setConcepto(''); setCategoria(''); setMonto(''); setMoneda('USD'); setTasa(''); setFechaLimite(''); setNotas(''); setError('')
  }

  function guardarNueva() {
    setError('')
    const beneficiario = prov?.nombre || benefLibre.trim()
    const montoNum = parseFloat(monto.replace(',', '.'))
    if (!beneficiario) { setError('Elegí o escribí el beneficiario'); return }
    if (!concepto.trim()) { setError('Escribí el concepto'); return }
    if (!(montoNum > 0)) { setError('Monto inválido'); return }
    const tasaNum = tasa ? parseFloat(tasa.replace(',', '.')) : null
    if (moneda === 'VES' && !(tasaNum && tasaNum > 0)) { setError('En bolívares hay que poner la tasa'); return }
    startTransition(async () => {
      const res = await crearCuentaPorPagar({
        beneficiario, proveedorId: prov?.id ?? null, concepto, categoria: categoria || null,
        centroCostoId: null, monto: montoNum, moneda, tasaCambio: tasaNum,
        fechaLimite: fechaLimite || null, notas: notas || null,
      })
      if (res.error) { setError(res.error); return }
      setShowNueva(false); resetNueva(); reload()
    })
  }

  function confirmarPago() {
    if (!pagando) return
    setError('')
    startTransition(async () => {
      const res = await marcarPagada(pagando.id, {
        fechaPago, metodoPago: metodo || null, bancoOrigen: banco || null, referencia: referencia || null,
      })
      if (res.error) { setError(res.error); return }
      setPagando(null); setMetodo(''); setBanco(''); setReferencia(''); reload()
    })
  }

  function anular(c: CxP) {
    if (!confirm(`¿Anular la cuenta por pagar de ${c.beneficiario} (${simbolo(c.moneda)} ${fmt(c.monto)})?`)) return
    startTransition(async () => { await anularCuentaPorPagar(c.id); reload() })
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 bg-oriental-bg border-b border-gray-200 flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-oriental-black">Obligaciones pendientes</h2>
        <button onClick={() => { resetNueva(); setShowNueva(true) }} className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3">
          <Plus size={14} /> Agregar cuenta por pagar
        </button>
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-8 text-sm text-oriental-gray text-center">No hay cuentas por pagar pendientes. Agregá una con el botón de arriba.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Beneficiario</th>
                <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Concepto</th>
                <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Vence</th>
                <th className="text-right px-4 py-2 font-medium text-oriental-gray text-xs">Monto</th>
                <th className="text-right px-4 py-2 font-medium text-oriental-gray text-xs">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(c => {
                const vencida = c.fecha_limite && c.fecha_limite < hoy
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-semibold text-oriental-black">{c.beneficiario}</td>
                    <td className="px-4 py-2.5 text-oriental-gray">{c.concepto}
                      {c.categoria && <span className="ml-1 text-[10px] text-oriental-gray">· {CATEGORIAS_EGRESO_LABEL[c.categoria] ?? c.categoria}</span>}
                    </td>
                    <td className={`px-4 py-2.5 text-xs whitespace-nowrap ${vencida ? 'text-oriental-red font-semibold' : 'text-oriental-gray'}`}>
                      {vencida && <AlertTriangle size={11} className="inline mr-1" />}{fmtFecha(c.fecha_limite)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-oriental-black whitespace-nowrap">{simbolo(c.moneda)} {fmt(c.monto)}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <button onClick={() => { setPagando(c); setFechaPago(hoy); setError('') }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 hover:underline mr-3">
                        <CheckCircle2 size={13} /> Pagar
                      </button>
                      <button onClick={() => anular(c)} className="inline-flex items-center text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: nueva cuenta por pagar */}
      {showNueva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !pending && setShowNueva(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-oriental-black">Nueva cuenta por pagar</h2>
              <button onClick={() => setShowNueva(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X size={16} className="text-oriental-gray" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Proveedor / beneficiario *</label>
                <ProveedorPicker proveedor={prov} onChange={setProv} />
                {!prov && (
                  <input className="input mt-2 text-sm" placeholder="…o escribí el beneficiario libre" value={benefLibre} onChange={e => setBenefLibre(e.target.value)} />
                )}
              </div>
              <div>
                <label className="label">Concepto *</label>
                <input className="input" value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Ej: Factura N° 123, alquiler, servicio…" />
              </div>
              <div>
                <label className="label">Categoría</label>
                <select className="select" value={categoria} onChange={e => setCategoria(e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {Object.entries(CATEGORIAS_EGRESO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Monto *</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input className="input pl-8" inputMode="decimal" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0,00" />
                  </div>
                </div>
                <div>
                  <label className="label">Moneda</label>
                  <select className="select" value={moneda} onChange={e => setMoneda(e.target.value)}>
                    {MONEDAS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              {moneda === 'VES' && (
                <div>
                  <label className="label">Tasa del día (Bs./USD) *</label>
                  <input className="input" inputMode="decimal" value={tasa} onChange={e => setTasa(e.target.value)} placeholder="Ej: 727,45" />
                </div>
              )}
              <div>
                <label className="label">Fecha límite <span className="text-oriental-gray font-normal">(opcional)</span></label>
                <input type="date" className="input" value={fechaLimite} onChange={e => setFechaLimite(e.target.value)} />
              </div>
              <div>
                <label className="label">Notas <span className="text-oriental-gray font-normal">(opcional)</span></label>
                <textarea className="textarea text-sm" rows={2} value={notas} onChange={e => setNotas(e.target.value)} />
              </div>
            </div>
            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={guardarNueva} disabled={pending} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60">
                {pending ? <Loader2 size={14} className="animate-spin" /> : null} Guardar
              </button>
              <button onClick={() => setShowNueva(false)} className="btn-secondary text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: pagar */}
      {pagando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !pending && setPagando(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-oriental-black">Marcar como pagada</h2>
              <button onClick={() => setPagando(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X size={16} className="text-oriental-gray" /></button>
            </div>
            <p className="text-sm text-oriental-gray mb-4">{pagando.beneficiario} · <b className="text-oriental-black">{simbolo(pagando.moneda)} {fmt(pagando.monto)}</b></p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 mb-3 text-xs text-blue-800">
              Al confirmar se registra el <b>egreso</b> automáticamente y la cuenta sale de "por pagar".
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Fecha de pago *</label>
                <input type="date" className="input" value={fechaPago} onChange={e => setFechaPago(e.target.value)} />
              </div>
              <div>
                <label className="label">Método de pago</label>
                <select className="select" value={metodo} onChange={e => setMetodo(e.target.value)}>
                  <option value="">—</option>
                  {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Banco / Origen</label>
                <input className="input" value={banco} onChange={e => setBanco(e.target.value)} placeholder="Opcional" />
              </div>
              <div>
                <label className="label">Referencia</label>
                <input className="input" value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Opcional" />
              </div>
            </div>
            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={confirmarPago} disabled={pending} className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                {pending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={15} />} Confirmar pago
              </button>
              <button onClick={() => setPagando(null)} className="btn-secondary text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
