'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, ShoppingCart, ListChecks, ExternalLink, Calculator, X, Loader2, FileText, ClipboardList, FilePlus2, Percent, Users } from 'lucide-react'
import ProformasTab from '../link-ventas/ProformasTab'
import CotizacionesTab from '../link-ventas/CotizacionesTab'
import CotizacionCDMTab from '../link-ventas/CotizacionCDMTab'
import TasasEditor from '../link-ventas/TasasEditor'
import ClientesHistorialTab from '../link-ventas/ClientesHistorialTab'

type Venta = {
  id: string
  marca: string
  modelo: string
  placa: string | null
  tipo_compra: string | null
  precio_total: number | null
  created_at: string
  cliente_nombre: string
  cliente_ci: string
  proforma_numero: string | null
  proforma_id: string | null
  cotizacion_id: string | null
  cliente_id: string | null
  etapa_key: string
  etapa_label: string
  es_ac500: boolean
  es_showroom: boolean
  div_definida: boolean
  precio_venta: number
  pago_vehimotors: number
  comision_pct: number
  comision_monto: number
  vendedora: string
  reportado_vm: boolean
  div_notas: string
}

const ETAPA_CFG: Record<string, string> = {
  entregado: 'bg-green-100 text-green-700',
  inicial: 'bg-amber-100 text-amber-700',
  credito: 'bg-blue-100 text-blue-700',
  mora: 'bg-red-100 text-red-700',
  pagado: 'bg-emerald-100 text-emerald-700',
  contado: 'bg-indigo-100 text-indigo-700',
  vendido: 'bg-gray-100 text-gray-600',
}

const fmt = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtFecha = (s: string | null) => {
  if (!s) return '—'
  try { return new Date(s).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return s }
}

const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

type Vista = 'registradas' | 'registrar' | 'cotizaciones' | 'proformas' | 'generar' | 'tasas' | 'historial' | 'division'
const VISTAS_VALIDAS: Vista[] = ['registradas', 'registrar', 'cotizaciones', 'proformas', 'generar', 'tasas', 'historial', 'division']

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function VentasHub({ ventas: ventasIniciales, catalogo = [], ac500 = [], showroomStock = [], tasas = { bcv: 0, usdt: 0 }, puedeEditar = false }: {
  ventas: Venta[]
  catalogo?: any[]
  ac500?: any[]
  showroomStock?: { marca: string; modelo: string; unidades: number }[]
  tasas?: { bcv: number; usdt: number }
  puedeEditar?: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabUrl = searchParams.get('tab') as Vista | null
  const [ventas, setVentas] = useState<Venta[]>(ventasIniciales)
  const [vista, setVista] = useState<Vista>(tabUrl && VISTAS_VALIDAS.includes(tabUrl) ? tabUrl : 'registradas')
  const [q, setQ] = useState('')
  const [etapa, setEtapa] = useState<string>('todas')
  const [editar, setEditar] = useState<Venta | null>(null)

  const etapas = useMemo(() => {
    const set = new Map<string, string>()
    ventas.forEach(v => set.set(v.etapa_key, v.etapa_label))
    return Array.from(set.entries())
  }, [ventas])

  const filtroFn = (v: Venta) => {
    const nq = norm(q.trim())
    if (!nq) return true
    return norm(v.cliente_nombre).includes(nq) || norm(v.cliente_ci).includes(nq) ||
      norm(`${v.marca} ${v.modelo}`).includes(nq) || norm(v.placa ?? '').includes(nq) ||
      norm(v.proforma_numero ?? '').includes(nq)
  }

  const filtradas = useMemo(() =>
    ventas.filter(v => (etapa === 'todas' || v.etapa_key === etapa) && filtroFn(v)),
    [ventas, q, etapa])

  const divFiltradas = useMemo(() => ventas.filter(filtroFn), [ventas, q])

  const totales = useMemo(() => {
    return divFiltradas.reduce((acc, v) => {
      acc.venta += Number(v.precio_venta || 0)
      acc.vm += Number(v.pago_vehimotors || 0)
      acc.directiva += Number(v.precio_venta || 0) - Number(v.pago_vehimotors || 0)
      acc.comision += Number(v.comision_monto || 0)
      return acc
    }, { venta: 0, vm: 0, directiva: 0, comision: 0 })
  }, [divFiltradas])

  function onSaved(div: any) {
    setVentas(prev => prev.map(v => v.id === div.vehiculo_id ? {
      ...v,
      div_definida: true,
      precio_venta: Number(div.precio_venta),
      pago_vehimotors: Number(div.pago_vehimotors),
      comision_pct: Number(div.comision_pct),
      comision_monto: Number(div.comision_monto),
      vendedora: div.vendedora ?? '',
      reportado_vm: !!div.reportado_vm,
      div_notas: div.notas ?? '',
    } : v))
    setEditar(null)
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Ventas</h1>
          <p className="text-oriental-gray text-sm mt-1">Todo lo vendido y en qué parte del proceso va cada venta</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => router.push('/vehiculos/nuevo?plan=ac500')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-800 hover:bg-blue-900 text-white text-sm font-bold transition-colors">
            🛡 Registrar venta AC500
          </button>
          <button onClick={() => setVista('registrar')} className="btn-primary flex items-center gap-2">
            <ShoppingCart size={16} /> Registrar venta
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {([
          ['generar', 'Generar cotización', FilePlus2],
          ['cotizaciones', 'Cotizaciones', ClipboardList],
          ['proformas', 'Proformas', FileText],
          ['registrar', 'Registrar venta', ShoppingCart],
          ['registradas', 'Ventas registradas', ListChecks],
          ['tasas', 'Tasas', Percent],
          ['historial', 'Historial de clientes', Users],
          ['division', 'División contable', Calculator],
        ] as const).map(([k, label, Icon]) => (
          <button key={k} onClick={() => setVista(k)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              vista === k ? 'border-oriental-red text-oriental-red' : 'border-transparent text-gray-500 hover:text-oriental-black'
            }`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {(vista === 'registradas' || vista === 'division') && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="Buscar por cliente, cédula, modelo, placa o N° de proforma…"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oriental-red" />
          </div>
          {vista === 'registradas' && (
            <select value={etapa} onChange={e => setEtapa(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oriental-red bg-white">
              <option value="todas">Todas las etapas</option>
              {etapas.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          )}
        </div>
      )}

      {vista === 'registradas' ? (
        filtradas.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">No hay ventas que coincidan.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-400">{filtradas.length} de {ventas.length} ventas</p>
            {filtradas.map(v => {
              const utilidad = Number(v.precio_venta || 0) - Number(v.pago_vehimotors || 0)
              return (
              <Link key={v.id} href={`/vehiculos/${v.id}`}
                className="flex flex-col sm:flex-row sm:items-center gap-2 border border-gray-200 rounded-xl p-4 hover:border-oriental-red hover:bg-red-50/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-semibold text-oriental-black text-sm truncate">{v.marca} {v.modelo}</span>
                    {v.placa && <span className="font-mono text-[11px] text-gray-400">{v.placa}</span>}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${ETAPA_CFG[v.etapa_key] ?? 'bg-gray-100 text-gray-600'}`}>{v.etapa_label}</span>
                    {v.es_showroom && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-700">🏬 Showroom</span>}
                    {v.es_ac500 && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">🛡 AC500</span>}
                    {v.proforma_numero && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700">{v.proforma_numero}</span>}
                  </div>
                  <p className="text-gray-500 text-xs truncate">{v.cliente_nombre} {v.cliente_ci && <span className="text-gray-400">· {v.cliente_ci}</span>}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-oriental-black">${fmt(v.precio_total)}</p>
                  <p className="text-[10px] text-gray-400 mb-1">Precio base · {fmtFecha(v.created_at)}</p>
                  {v.div_definida ? (
                    <p className="text-[11px] font-bold text-green-700">Utilidad: ${fmt(utilidad)}</p>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setVista('division'); setEditar(v) }}
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
                      Definir utilidad
                    </button>
                  )}
                </div>
                <ExternalLink size={14} className="text-gray-300 shrink-0 hidden sm:block" />
              </Link>
              )
            })}
          </div>
        )
      ) : vista === 'registrar' ? (
        <div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-5">
            <p className="text-sm text-indigo-900 font-semibold mb-1">Registrar una venta</p>
            <p className="text-xs text-indigo-700 leading-relaxed">
              Toda venta parte de una <b>proforma</b>. Busca al cliente abajo y dale a <b>Registrar venta</b> en su proforma: se abre el registro con el vehículo y el plan ya cargados desde la cotización — ahí confirmas o creas el cliente al instante y completas el pago inicial y el crédito.{' '}
              ¿Aún no tiene proforma? Genérala desde su cotización aceptada en <button type="button" onClick={() => setVista('cotizaciones')} className="font-bold underline">Cotizaciones</button>.
            </p>
          </div>
          <ProformasTab />
        </div>
      ) : vista === 'cotizaciones' ? (
        <CotizacionesTab puedeEditar={puedeEditar} />
      ) : vista === 'proformas' ? (
        <ProformasTab />
      ) : vista === 'generar' ? (
        <CotizacionCDMTab catalogo={catalogo} showroomStock={showroomStock} tasas={tasas} />
      ) : vista === 'tasas' ? (
        <TasasEditor />
      ) : vista === 'historial' ? (
        <ClientesHistorialTab />
      ) : (
        /* División contable */
        <div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
            <TotalCard label="Precio de venta (X)" value={totales.venta} color="text-oriental-black" />
            <TotalCard label="Pago a Vehimotors (Y)" value={totales.vm} color="text-red-600" />
            <TotalCard label="Directiva (X − Y)" value={totales.directiva} color="text-green-700" />
            <TotalCard label="Comisiones (Z)" value={totales.comision} color="text-indigo-700" />
          </div>

          {divFiltradas.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">No hay ventas que coincidan.</p>
          ) : (
            <div className="space-y-2">
              {divFiltradas.map(v => {
                const directiva = Number(v.precio_venta || 0) - Number(v.pago_vehimotors || 0)
                return (
                  <div key={v.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-oriental-black text-sm truncate">{v.marca} {v.modelo}</span>
                          {v.placa && <span className="font-mono text-[11px] text-gray-400">{v.placa}</span>}
                          {!v.div_definida && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700">Sin definir</span>}
                          {v.reportado_vm && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700">Reportado VM</span>}
                        </div>
                        <p className="text-gray-500 text-xs truncate">{v.cliente_nombre}{v.vendedora ? ` · Vendedora: ${v.vendedora}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/vehimotors/reportar?vehiculoId=${v.id}`}
                          className="px-3 py-1.5 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-700 hover:bg-indigo-50">
                          Reportar VM
                        </Link>
                        <button onClick={() => setEditar(v)}
                          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-oriental-red hover:bg-red-50">
                          Editar
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <Celda label="Venta (X)" value={`$${fmt(v.precio_venta)}`} />
                      <Celda label="Pago VM (Y)" value={`$${fmt(v.pago_vehimotors)}`} rojo />
                      <Celda label="Directiva" value={`$${fmt(directiva)}`} verde />
                      <Celda label={`Comisión${v.comision_pct ? ` (${v.comision_pct}%)` : ''}`} value={`$${fmt(v.comision_monto)}`} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {editar && <DivisionModal venta={editar} onClose={() => setEditar(null)} onSaved={onSaved} />}
    </div>
  )
}

function TotalCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="border border-gray-200 rounded-xl p-3">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{label}</p>
      <p className={`text-lg font-bold ${color} mt-0.5`}>${fmt(value)}</p>
    </div>
  )
}

function Celda({ label, value, rojo, verde }: { label: string; value: string; rojo?: boolean; verde?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`font-bold ${rojo ? 'text-red-600' : verde ? 'text-green-700' : 'text-oriental-black'}`}>{value}</p>
    </div>
  )
}

function DivisionModal({ venta, onClose, onSaved }: { venta: Venta; onClose: () => void; onSaved: (div: any) => void }) {
  const [precioVenta, setPrecioVenta] = useState(String(venta.precio_venta || ''))
  const [pagoVM, setPagoVM] = useState(String(venta.pago_vehimotors || ''))
  const [comisionPct, setComisionPct] = useState(String(venta.comision_pct || ''))
  const [vendedora, setVendedora] = useState(venta.vendedora || '')
  const [reportadoVm, setReportadoVm] = useState(venta.reportado_vm)
  const [notas, setNotas] = useState(venta.div_notas || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const x = parseFloat(precioVenta.replace(',', '.')) || 0
  const y = parseFloat(pagoVM.replace(',', '.')) || 0
  const pct = parseFloat(comisionPct.replace(',', '.')) || 0
  const directiva = x - y
  const comisionMonto = Math.round(x * pct) / 100

  async function guardar() {
    setSaving(true); setError('')
    try {
      const r = await fetch('/api/ventas-division', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculoId: venta.id, proformaId: venta.proforma_id, cotizacionId: venta.cotizacion_id, clienteId: venta.cliente_id,
          precioVenta: x, pagoVehimotors: y, comisionPct: pct, comisionMonto,
          vendedora, reportadoVm, notas,
        }),
      })
      const j = await r.json()
      if (!r.ok) { setError(j.error ?? 'No se pudo guardar'); setSaving(false); return }
      onSaved(j.division)
    } catch { setError('Error de conexión'); setSaving(false) }
  }

  const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:border-oriental-red'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && onClose()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <h2 className="font-bold text-oriental-black text-base flex items-center gap-2"><Calculator size={16} className="text-oriental-red" /> División contable</h2>
            <p className="text-xs text-oriental-gray">{venta.marca} {venta.modelo}{venta.placa ? ` · ${venta.placa}` : ''}</p>
          </div>
          <button onClick={() => !saving && onClose()} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-800">{error}</div>}

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Precio de venta (X) $</label>
            <input className={inp} inputMode="decimal" value={precioVenta} onChange={e => setPrecioVenta(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Pago a Vehimotors (Y) $</label>
            <input className={inp} inputMode="decimal" value={pagoVM} onChange={e => setPagoVM(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Comisión (% sobre X)</label>
            <input className={inp} inputMode="decimal" value={comisionPct} onChange={e => setComisionPct(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Vendedora</label>
            <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red" value={vendedora} onChange={e => setVendedora(e.target.value)} placeholder="Nombre de la vendedora" />
          </div>

          <div className="rounded-xl bg-gray-900 p-4 text-white space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-300"><span>Precio de venta (X)</span><span className="font-mono">${fmt(x)}</span></div>
            <div className="flex justify-between text-gray-300"><span>− Pago a Vehimotors (Y)</span><span className="font-mono">${fmt(y)}</span></div>
            <div className="flex justify-between font-bold text-green-400 border-t border-gray-700 pt-1.5"><span>= Directiva</span><span className="font-mono">${fmt(directiva)}</span></div>
            <div className="flex justify-between text-indigo-300"><span>Comisión ({pct || 0}%)</span><span className="font-mono">${fmt(comisionMonto)}</span></div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={reportadoVm} onChange={e => setReportadoVm(e.target.checked)} className="w-4 h-4" />
            Reportado a Vehimotors
          </label>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Notas (interno)</label>
            <textarea className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red resize-none" rows={2} value={notas} onChange={e => setNotas(e.target.value)} />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
            <button onClick={guardar} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-oriental-red text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />} Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
