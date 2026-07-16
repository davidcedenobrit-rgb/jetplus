'use client'

import { useState, useTransition, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, Loader2, X, DollarSign, Trash2, CheckCircle2, AlertTriangle, Upload, FileText, Clock } from 'lucide-react'
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
  factura_url: string | null
}

type CxPPagada = CxP & { pagada_at: string | null; egreso_id: string | null }

const MONEDAS = ['USD', 'VES', 'USDT']
const METODOS = ['Efectivo USD', 'Efectivo Bs.', 'Transferencia bancaria', 'Pago Móvil', 'Zelle', 'USDT / Binance', 'Tarjeta de crédito', 'Tarjeta de débito']

function fmt(n: number) { return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function simbolo(m: string) { return m === 'VES' ? 'Bs.' : m === 'USDT' ? 'USDT' : '$' }
function fmtFecha(d: string | null) {
  return d ? new Date(d + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}
function diasHasta(d: string): number {
  const hoy = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00').getTime()
  return Math.round((new Date(d + 'T00:00:00').getTime() - hoy) / 86400000)
}

// Etiqueta de recordatorio de vencimiento
function Vencimiento({ fecha }: { fecha: string | null }) {
  if (!fecha) return <span className="text-oriental-gray">—</span>
  const d = diasHasta(fecha)
  if (d < 0) return <span className="text-oriental-red font-semibold inline-flex items-center gap-1"><AlertTriangle size={11} /> Vencida hace {Math.abs(d)}d</span>
  if (d === 0) return <span className="text-oriental-red font-semibold inline-flex items-center gap-1"><AlertTriangle size={11} /> Vence hoy</span>
  if (d <= 7) return <span className="text-amber-600 font-semibold inline-flex items-center gap-1"><Clock size={11} /> Vence en {d}d</span>
  return <span className="text-oriental-gray">{fmtFecha(fecha)}</span>
}

export default function CuentasPorPagarTab({ items, reload }: { items: CxP[]; reload: () => void }) {
  const supabase = createClient()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [vista, setVista] = useState<'pendientes' | 'pagadas'>('pendientes')

  // Pagadas (se cargan al entrar a esa vista)
  const [pagadas, setPagadas] = useState<CxPPagada[]>([])
  const [cargandoPagadas, setCargandoPagadas] = useState(false)

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
  const [factura, setFactura] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)

  // Pago
  const [pagando, setPagando] = useState<CxP | null>(null)
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10))
  const [metodo, setMetodo] = useState('')
  const [banco, setBanco] = useState('')
  const [referencia, setReferencia] = useState('')

  useEffect(() => {
    if (vista !== 'pagadas') return
    setCargandoPagadas(true)
    supabase.from('cuentas_por_pagar')
      .select('id, beneficiario, concepto, categoria, monto, moneda, tasa_cambio, fecha_limite, fecha_emision, proveedor_id, factura_url, pagada_at, egreso_id')
      .eq('estado', 'pagada').order('pagada_at', { ascending: false }).limit(500)
      .then(({ data }) => { setPagadas((data ?? []) as CxPPagada[]); setCargandoPagadas(false) })
  }, [vista])

  function resetNueva() {
    setProv(null); setBenefLibre(''); setConcepto(''); setCategoria(''); setMonto(''); setMoneda('USD'); setTasa(''); setFechaLimite(''); setNotas(''); setFactura(null); setError('')
  }

  async function subirFactura(): Promise<string | null> {
    if (!factura) return null
    setSubiendo(true)
    const path = `cuentas-por-pagar/${Date.now()}.${factura.name.split('.').pop()}`
    const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, factura, { upsert: false })
    setSubiendo(false)
    if (upErr) { setError(`No se pudo subir la factura: ${upErr.message}`); return null }
    return supabase.storage.from('comprobantes').getPublicUrl(path).data.publicUrl
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
      const facturaUrl = factura ? await subirFactura() : null
      if (factura && !facturaUrl) return
      const res = await crearCuentaPorPagar({
        beneficiario, proveedorId: prov?.id ?? null, concepto, categoria: categoria || null,
        centroCostoId: null, monto: montoNum, moneda, tasaCambio: tasaNum,
        fechaLimite: fechaLimite || null, notas: notas || null, facturaUrl,
      })
      if (res.error) { setError(res.error); return }
      setShowNueva(false); resetNueva(); reload()
    })
  }

  function confirmarPago() {
    if (!pagando) return
    setError('')
    startTransition(async () => {
      const res = await marcarPagada(pagando.id, { fechaPago, metodoPago: metodo || null, bancoOrigen: banco || null, referencia: referencia || null })
      if (res.error) { setError(res.error); return }
      setPagando(null); setMetodo(''); setBanco(''); setReferencia(''); reload()
    })
  }

  function anular(c: CxP) {
    if (!confirm(`¿Anular la cuenta por pagar de ${c.beneficiario} (${simbolo(c.moneda)} ${fmt(c.monto)})?`)) return
    startTransition(async () => { await anularCuentaPorPagar(c.id); reload() })
  }

  const conceptoCat = (c: CxP) => c.categoria ? ` · ${CATEGORIAS_EGRESO_LABEL[c.categoria] ?? c.categoria}` : ''

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 bg-oriental-bg border-b border-gray-200 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setVista('pendientes')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${vista === 'pendientes' ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200'}`}>Pendientes ({items.length})</button>
          <button onClick={() => setVista('pagadas')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${vista === 'pagadas' ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200'}`}>Pagadas</button>
        </div>
        {vista === 'pendientes' && (
          <button onClick={() => { resetNueva(); setShowNueva(true) }} className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3">
            <Plus size={14} /> Agregar cuenta por pagar
          </button>
        )}
      </div>

      {vista === 'pendientes' ? (
        items.length === 0 ? (
          <p className="px-4 py-8 text-sm text-oriental-gray text-center">No hay cuentas por pagar pendientes. Agregá una con el botón de arriba.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Beneficiario</th>
                  <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Concepto</th>
                  <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Vencimiento</th>
                  <th className="text-right px-4 py-2 font-medium text-oriental-gray text-xs">Monto</th>
                  <th className="text-right px-4 py-2 font-medium text-oriental-gray text-xs">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-semibold text-oriental-black">{c.beneficiario}</td>
                    <td className="px-4 py-2.5 text-oriental-gray">
                      {c.concepto}<span className="text-[10px]">{conceptoCat(c)}</span>
                      {c.factura_url && (
                        <a href={c.factura_url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-[11px] text-blue-700 hover:underline"><FileText size={11} /> factura</a>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs whitespace-nowrap"><Vencimiento fecha={c.fecha_limite} /></td>
                    <td className="px-4 py-2.5 text-right font-bold text-oriental-black whitespace-nowrap">{simbolo(c.moneda)} {fmt(c.monto)}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <button onClick={() => { setPagando(c); setFechaPago(new Date().toISOString().slice(0, 10)); setError('') }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 hover:underline mr-3"><CheckCircle2 size={13} /> Pagar</button>
                      <button onClick={() => anular(c)} className="inline-flex items-center text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        cargandoPagadas ? (
          <p className="px-4 py-8 text-sm text-oriental-gray text-center">Cargando…</p>
        ) : pagadas.length === 0 ? (
          <p className="px-4 py-8 text-sm text-oriental-gray text-center">Todavía no hay cuentas pagadas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Beneficiario</th>
                  <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Concepto</th>
                  <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Pagada</th>
                  <th className="text-right px-4 py-2 font-medium text-oriental-gray text-xs">Monto</th>
                  <th className="text-right px-4 py-2 font-medium text-oriental-gray text-xs">Egreso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagadas.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-semibold text-oriental-black">{c.beneficiario}</td>
                    <td className="px-4 py-2.5 text-oriental-gray">
                      {c.concepto}<span className="text-[10px]">{conceptoCat(c)}</span>
                      {c.factura_url && (
                        <a href={c.factura_url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-[11px] text-blue-700 hover:underline"><FileText size={11} /> factura</a>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-oriental-gray whitespace-nowrap">{c.pagada_at ? new Date(c.pagada_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-oriental-black whitespace-nowrap">{simbolo(c.moneda)} {fmt(c.monto)}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {c.egreso_id ? <Link href={`/egresos/${c.egreso_id}`} className="text-xs font-semibold text-oriental-red hover:underline">Ver egreso →</Link> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
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
                {!prov && <input className="input mt-2 text-sm" placeholder="…o escribí el beneficiario libre" value={benefLibre} onChange={e => setBenefLibre(e.target.value)} />}
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
                <label className="label">Factura / soporte <span className="text-oriental-gray font-normal">(opcional)</span></label>
                <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-oriental-red/30 cursor-pointer text-xs font-medium text-oriental-red hover:bg-red-50">
                  <Upload size={13} /> {factura ? factura.name : 'Adjuntar archivo (PDF o imagen)'}
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => setFactura(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              <div>
                <label className="label">Notas <span className="text-oriental-gray font-normal">(opcional)</span></label>
                <textarea className="textarea text-sm" rows={2} value={notas} onChange={e => setNotas(e.target.value)} />
              </div>
            </div>
            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={guardarNueva} disabled={pending || subiendo} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60">
                {(pending || subiendo) ? <Loader2 size={14} className="animate-spin" /> : null} {subiendo ? 'Subiendo…' : 'Guardar'}
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
              Al confirmar se registra el <b>egreso</b> automáticamente y la cuenta pasa a "Pagadas".
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
