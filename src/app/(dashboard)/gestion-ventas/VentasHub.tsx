'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, ShoppingCart, ListChecks, ExternalLink, Calculator, X, Loader2, FileText, ClipboardList, FilePlus2, Percent, Users, Landmark, Handshake } from 'lucide-react'
import ProformasTab from '../link-ventas/ProformasTab'
import CotizacionesTab from '../link-ventas/CotizacionesTab'
import CotizacionCDMTab from '../link-ventas/CotizacionCDMTab'
import TasasEditor from '../link-ventas/TasasEditor'
import ClientesHistorialTab from '../link-ventas/ClientesHistorialTab'
import BancaNacionalTab from '../link-ventas/BancaNacionalTab'
import AliadosTab from './AliadosTab'

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
  monto_proforma: number
  poliza_carro: number
  poliza_vida: number
  obsequio_clientes: number
  alfombras: number
  papel_ahumado: number
  gasto_administrativo: number
  vendedora: string
  reportado_vm: boolean
  div_notas: string
  // Nuevo modelo de división contable
  tipo_venta: string | null
  comision_vendedores_pct: number
  comision_vendedores_monto: number
  comision_directiva_pct: number
  comision_directiva_monto: number
  vendedores_split: { nombre: string; pct: number }[] | null
  ingreso_neto_venta: number
  pote_directiva: number
}

const TIPOS_VENTA: { key: string; label: string }[] = [
  { key: 'contado', label: 'Contado' },
  { key: 'credito_vehimotors', label: 'Crédito Vehimotors' },
  { key: 'credito_banca_nacional', label: 'Crédito banca nacional' },
  { key: 'credito_financiadora_interno', label: 'Crédito financiadora interno' },
]
const tipoVentaLabel = (k: string | null) => TIPOS_VENTA.find(t => t.key === k)?.label ?? '—'

// Fórmula de la división contable de una venta (cuadro resumen en 3 bloques):
//   Monto comisión de venta = precio × % comisión de venta   (= ingreso bruto venta)
//   Monto base de Jetplus = precio − comisión de venta
//   Comisión de vendedores = base × % vendedores   (pool repartido entre los vendedores)
//   Comisión de directiva  = base × % directiva
//   A) Ingreso bruto oriental = monto proforma oriental − pagado a Vehimotors
//   B) Ingreso neto venta = comisión de venta − comisión vendedores − comisión directiva  (→ contabilidad)
//   C) Ingreso bóveda ("la bolsa") = ingreso bruto oriental − comisión de venta − egresos directiva  (reservado)
function calcDivision(v: Venta) {
  const r2 = (n: number) => Math.round(n * 100) / 100
  const precio = Number(v.precio_venta || 0)
  const comisionVentaMonto = v.comision_monto
    ? Number(v.comision_monto)
    : r2(precio * Number(v.comision_pct || 0) / 100)
  const montoBase = precio - comisionVentaMonto
  const comisionVendedores = v.comision_vendedores_monto
    ? Number(v.comision_vendedores_monto)
    : r2(montoBase * Number(v.comision_vendedores_pct || 0) / 100)
  const comisionDirectiva = v.comision_directiva_monto
    ? Number(v.comision_directiva_monto)
    : r2(montoBase * Number(v.comision_directiva_pct || 0) / 100)
  // A) bloque oriental
  const ingresoBrutoOriental = r2(Number(v.monto_proforma || 0) - Number(v.pago_vehimotors || 0))
  // B) bloque venta → contabilidad
  const ingresoNetoVenta = r2(comisionVentaMonto - comisionVendedores - comisionDirectiva)
  // C) bloque directiva → bóveda
  const egresosDirectiva = Number(v.poliza_carro || 0) + Number(v.poliza_vida || 0) + Number(v.obsequio_clientes || 0) + Number(v.alfombras || 0) + Number(v.papel_ahumado || 0) + Number(v.gasto_administrativo || 0)
  const ingresoBoveda = r2(ingresoBrutoOriental - comisionVentaMonto - egresosDirectiva)
  return { precio, comisionVentaMonto, montoBase, comisionVendedores, comisionDirectiva, ingresoBrutoOriental, ingresoNetoVenta, egresosDirectiva, ingresoBoveda }
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

type Vista = 'registradas' | 'registrar' | 'cotizaciones' | 'proformas' | 'generar' | 'banca' | 'tasas' | 'historial' | 'division' | 'aliados'
const VISTAS_VALIDAS: Vista[] = ['registradas', 'registrar', 'cotizaciones', 'proformas', 'generar', 'banca', 'tasas', 'historial', 'division', 'aliados']

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function VentasHub({ ventas: ventasIniciales, catalogo = [], ac500 = [], showroomStock = [], tasas = { bcv: 0, usdt: 0 }, puedeEditar = false, esRojas = false }: {
  ventas: Venta[]
  catalogo?: any[]
  ac500?: any[]
  showroomStock?: { marca: string; modelo: string; unidades: number }[]
  tasas?: { bcv: number; usdt: number }
  puedeEditar?: boolean
  esRojas?: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabUrl = searchParams.get('tab') as Vista | null
  const [ventas, setVentas] = useState<Venta[]>(ventasIniciales)
  const [vista, setVista] = useState<Vista>(tabUrl && VISTAS_VALIDAS.includes(tabUrl) ? tabUrl : 'registradas')
  const [q, setQ] = useState('')
  const [etapa, setEtapa] = useState<string>('todas')
  const [tipoVenta, setTipoVenta] = useState<'todas' | 'nuevas' | 'antiguas'>('todas')
  const [editar, setEditar] = useState<Venta | null>(null)

  // "Nueva" = venta cargada/registrada en el sistema (tiene proforma, división
  // definida o es AC500). "Antigua" = venta importada del pasado, sin eso.
  const esNueva = (v: Venta) => !!(v.proforma_numero || v.div_definida || v.es_ac500)

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
    ventas.filter(v => (etapa === 'todas' || v.etapa_key === etapa)
      && (tipoVenta === 'todas' || (tipoVenta === 'nuevas' ? esNueva(v) : !esNueva(v)))
      && filtroFn(v)),
    [ventas, q, etapa, tipoVenta])

  const divFiltradas = useMemo(() => ventas.filter(filtroFn), [ventas, q])

  const totales = useMemo(() => {
    return divFiltradas.reduce((acc, v) => {
      const d = calcDivision(v)
      acc.precio += d.precio
      acc.netoVenta += d.ingresoNetoVenta
      acc.comisionVend += d.comisionVendedores
      acc.boveda += d.ingresoBoveda
      return acc
    }, { precio: 0, netoVenta: 0, comisionVend: 0, boveda: 0 })
  }, [divFiltradas])

  function onSaved(div: any) {
    setVentas(prev => prev.map(v => v.id === div.vehiculo_id ? {
      ...v,
      div_definida: true,
      precio_venta: Number(div.precio_venta),
      pago_vehimotors: Number(div.pago_vehimotors),
      comision_pct: Number(div.comision_pct),
      comision_monto: Number(div.comision_monto),
      monto_proforma: Number(div.monto_proforma ?? 0),
      poliza_carro: Number(div.poliza_carro ?? 0),
      poliza_vida: Number(div.poliza_vida ?? 0),
      obsequio_clientes: Number(div.obsequio_clientes ?? 0),
      alfombras: Number(div.alfombras ?? 0),
      papel_ahumado: Number(div.papel_ahumado ?? 0),
      gasto_administrativo: Number(div.gasto_administrativo ?? 0),
      tipo_venta: div.tipo_venta ?? null,
      comision_vendedores_pct: Number(div.comision_vendedores_pct ?? 0),
      comision_vendedores_monto: Number(div.comision_vendedores_monto ?? 0),
      comision_directiva_pct: Number(div.comision_directiva_pct ?? 0),
      comision_directiva_monto: Number(div.comision_directiva_monto ?? 0),
      vendedores_split: Array.isArray(div.vendedores_split) ? div.vendedores_split : null,
      ingreso_neto_venta: Number(div.ingreso_neto_venta ?? 0),
      pote_directiva: Number(div.pote_directiva ?? 0),
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
        {/* Pestañas "Banca Nacional", "Tasas" y "División contable" ocultas a
            pedido de David (2026-08-13): Jetplus arranca solo con lo básico de
            ventas hasta que Gustavo pida activarlas. Para reactivar, descomentar
            las 3 líneas de abajo (el resto del código de esas vistas sigue igual). */}
        {([
          ['generar', 'Generar cotización', FilePlus2],
          ['cotizaciones', 'Cotizaciones', ClipboardList],
          ['proformas', 'Proformas', FileText],
          ['registrar', 'Registrar venta', ShoppingCart],
          ['registradas', 'Ventas registradas', ListChecks],
          // ['banca', 'Banca Nacional', Landmark],
          // ['tasas', 'Tasas', Percent],
          ['historial', 'Historial de clientes', Users],
          ['aliados', 'Aliados', Handshake],
          // ['division', 'División contable', Calculator],
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

      {/* Filtro cliente antiguo / ventas nuevas */}
      {vista === 'registradas' && (
        <div className="flex items-center gap-2 mb-4">
          {([['todas', 'Todas'], ['nuevas', 'Ventas nuevas'], ['antiguas', 'Clientes antiguos']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTipoVenta(k)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${tipoVenta === k ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {vista === 'registradas' ? (
        filtradas.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">No hay ventas que coincidan.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-400">{filtradas.length} de {ventas.length} ventas</p>
            {filtradas.map(v => {
              // Utilidad = Ingreso neto de venta que va a contabilidad (comisión por
              // venta de carro − comisión vendedores − comisión directiva). NO es
              // precio_venta − pago_vehimotors (eso es el ingreso bruto oriental).
              const utilidad = Number(v.ingreso_neto_venta || 0)
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
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${esNueva(v) ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{esNueva(v) ? 'Nueva' : 'Antigua'}</span>
                  </div>
                  <p className="text-gray-500 text-xs truncate">
                    {v.cliente_nombre} {v.cliente_ci && <span className="text-gray-400">· {v.cliente_ci}</span>}
                    {v.vendedora ? <span className="text-oriental-red font-semibold"> · Vendedora: {v.vendedora}</span> : <span className="text-amber-600"> · Sin vendedora</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-oriental-black">${fmt(v.precio_total)}</p>
                  <p className="text-[10px] text-gray-400 mb-1">Precio base · {fmtFecha(v.created_at)}</p>
                  {v.div_definida ? (
                    <p className="text-[11px] font-bold text-green-700" title="Ingreso neto de la venta que va a contabilidad (comisión por venta de carro − comisión de vendedores − comisión de directiva)">Utilidad: ${fmt(utilidad)}</p>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setVista('division'); setEditar(v) }}
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
                      Definir utilidad
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditar(v) }}
                  className="shrink-0 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-oriental-red hover:bg-red-50 hidden sm:block"
                  title="Editar vendedora y división">
                  Editar
                </button>
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
      ) : vista === 'banca' ? (
        <BancaNacionalTab catalogo={catalogo} puedeEditar={puedeEditar} />
      ) : vista === 'tasas' ? (
        <TasasEditor />
      ) : vista === 'historial' ? (
        <ClientesHistorialTab />
      ) : vista === 'aliados' ? (
        <AliadosTab />
      ) : (
        /* División contable */
        <div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
            <TotalCard label="Precio de venta" value={totales.precio} color="text-oriental-black" />
            <TotalCard label="Ingreso neto venta (contab.)" value={totales.netoVenta} color="text-indigo-700" />
            <TotalCard label="Comisión vendedores" value={totales.comisionVend} color="text-red-600" />
            {esRojas && <TotalCard label="Ingreso bóveda (la bolsa)" value={totales.boveda} color="text-green-700" />}
          </div>

          {divFiltradas.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">No hay ventas que coincidan.</p>
          ) : (
            <div className="space-y-2">
              {divFiltradas.map(v => {
                const d = calcDivision(v)
                return (
                  <div key={v.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-oriental-black text-sm truncate">{v.marca} {v.modelo}</span>
                          {v.placa && <span className="font-mono text-[11px] text-gray-400">{v.placa}</span>}
                          {v.tipo_venta && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700">{tipoVentaLabel(v.tipo_venta)}</span>}
                          {!v.div_definida && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700">Sin definir</span>}
                          {v.reportado_vm && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700">Reportado VM</span>}
                        </div>
                        <p className="text-gray-500 text-xs truncate">{v.cliente_nombre}{v.vendedora ? ` · Vendedor(es): ${v.vendedora}` : ''}</p>
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
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                      <Celda label="Precio de venta" value={`$${fmt(d.precio)}`} />
                      <Celda label="Ingreso bruto oriental" value={`$${fmt(d.ingresoBrutoOriental)}`} />
                      <Celda label={`Comisión venta${v.comision_pct ? ` (${v.comision_pct}%)` : ''}`} value={`$${fmt(d.comisionVentaMonto)}`} />
                      <Celda label="Ingreso neto venta" value={`$${fmt(d.ingresoNetoVenta)}`} verde />
                      {esRojas
                        ? <Celda label="Ingreso bóveda" value={`$${fmt(d.ingresoBoveda)}`} verde />
                        : <Celda label={`Com. vendedores${v.comision_vendedores_pct ? ` (${v.comision_vendedores_pct}%)` : ''}`} value={`$${fmt(d.comisionVendedores)}`} rojo />}
                    </div>
                    {(d.comisionVendedores > 0 || d.comisionDirectiva > 0 || d.egresosDirectiva > 0) && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[10px] text-gray-400">
                        {d.comisionVendedores > 0 && <span>Com. vendedores: ${fmt(d.comisionVendedores)}</span>}
                        {d.comisionDirectiva > 0 && <span>Com. directiva: ${fmt(d.comisionDirectiva)}</span>}
                        {d.egresosDirectiva > 0 && <span>Egresos directiva: ${fmt(d.egresosDirectiva)}</span>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {editar && <DivisionModal venta={editar} esRojas={esRojas} onClose={() => setEditar(null)} onSaved={onSaved} />}
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

type VendSplit = { nombre: string; pct: string }

function DivisionModal({ venta, esRojas = false, onClose, onSaved }: { venta: Venta; esRojas?: boolean; onClose: () => void; onSaved: (div: any) => void }) {
  const [tipoVenta, setTipoVenta] = useState<string>(venta.tipo_venta || '')
  const [precioVenta, setPrecioVenta] = useState(String(venta.precio_venta || ''))
  const [comisionPct, setComisionPct] = useState(String(venta.comision_pct || ''))
  const [comVendPct, setComVendPct] = useState(String(venta.comision_vendedores_pct || ''))
  const [comDirPct, setComDirPct] = useState(String(venta.comision_directiva_pct || ''))
  const [montoProforma, setMontoProforma] = useState(String(venta.monto_proforma || ''))
  const [pagoVM, setPagoVM] = useState(String(venta.pago_vehimotors || ''))
  const [polizaCarro, setPolizaCarro] = useState(String(venta.poliza_carro || ''))
  const [polizaVida, setPolizaVida] = useState(String(venta.poliza_vida || ''))
  const [obsequio, setObsequio] = useState(String(venta.obsequio_clientes || ''))
  const [alfombras, setAlfombras] = useState(String(venta.alfombras || ''))
  const [papelAhumado, setPapelAhumado] = useState(String(venta.papel_ahumado || ''))
  const [gastoAdmin, setGastoAdmin] = useState(String(venta.gasto_administrativo || ''))
  // Vendedores: base de datos (Rojas los carga) + áreas fijas. Rojas elige los que quiera
  // y reparte el monto de comisión de vendedores (que es el 100%) entre ellos por %.
  const AREAS = ['Dpto. de Mercadeo', 'Taller', 'Dpto. Administrativo', 'Directiva']
  const [vendedorasBd, setVendedorasBd] = useState<string[]>([])
  const [vendedores, setVendedores] = useState<VendSplit[]>(() => {
    if (Array.isArray(venta.vendedores_split) && venta.vendedores_split.length) {
      return venta.vendedores_split.map(v => ({ nombre: String(v.nombre), pct: String(v.pct ?? '') }))
    }
    const nombres = (venta.vendedora || '').split(/\s*(?:\/|,)\s*/).map(s => s.trim()).filter(Boolean)
    if (nombres.length === 1) return [{ nombre: nombres[0], pct: '100' }]
    return nombres.map(n => ({ nombre: n, pct: '' }))
  })
  const [reportadoVm, setReportadoVm] = useState(venta.reportado_vm)
  const [notas, setNotas] = useState(venta.div_notas || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/vendedoras').then(r => r.ok ? r.json() : []).then((data: any[]) => {
      setVendedorasBd((data ?? []).filter(v => v.activa !== false).map(v => v.nombre).filter(Boolean))
    }).catch(() => {})
  }, [])

  const opcionesVend = useMemo(() => {
    const base = [...vendedorasBd, ...AREAS]
    const extra = vendedores.map(v => v.nombre).filter(n => !base.includes(n))
    return [...base, ...extra]
  }, [vendedorasBd, vendedores])

  function toggleVend(nombre: string) {
    setVendedores(prev => {
      if (prev.some(v => v.nombre === nombre)) return prev.filter(v => v.nombre !== nombre)
      return [...prev, { nombre, pct: '' }]
    })
  }
  function setVendPct(nombre: string, pct: string) {
    setVendedores(prev => prev.map(v => v.nombre === nombre ? { ...v, pct } : v))
  }
  const vendedora = vendedores.map(v => v.nombre).join(' / ')

  const nf = (s: string) => parseFloat(String(s).replace(',', '.')) || 0
  const r2 = (n: number) => Math.round(n * 100) / 100
  const x = nf(precioVenta)                                  // precio de venta
  const pctVenta = nf(comisionPct)                           // % comisión de venta
  const comisionVentaMonto = r2(x * pctVenta / 100)          // monto comisión de venta (= ingreso bruto venta)
  const montoBase = x - comisionVentaMonto                   // monto base de Jetplus
  const pctVend = nf(comVendPct)
  const comVendMonto = r2(montoBase * pctVend / 100)         // pool de comisión de vendedores (100%)
  const pctDir = nf(comDirPct)
  const comDirMonto = r2(montoBase * pctDir / 100)           // comisión de directiva
  const egr = { pc: nf(polizaCarro), pv: nf(polizaVida), ob: nf(obsequio), al: nf(alfombras), pa: nf(papelAhumado), ga: nf(gastoAdmin) }
  const sumaPctVend = r2(vendedores.reduce((s, v) => s + nf(v.pct), 0))
  const proforma = nf(montoProforma)                         // monto proforma oriental
  const y = nf(pagoVM)                                       // pagado a Vehimotors

  // Cuadro resumen en 3 bloques (dibujo de dirección)
  const ingresoBrutoOriental = r2(proforma - y)                                          // A
  const ingresoNetoVenta = r2(comisionVentaMonto - comVendMonto - comDirMonto)           // B → contabilidad
  const egresosDirectiva = egr.pc + egr.pv + egr.ob + egr.al + egr.pa + egr.ga
  const ingresoBoveda = r2(ingresoBrutoOriental - comisionVentaMonto - egresosDirectiva) // C → la bolsa

  async function guardar() {
    setSaving(true); setError('')
    try {
      const r = await fetch('/api/ventas-division', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculoId: venta.id, proformaId: venta.proforma_id, cotizacionId: venta.cotizacion_id, clienteId: venta.cliente_id,
          tipoVenta: tipoVenta || null,
          precioVenta: x, comisionPct: pctVenta,
          comisionVendedoresPct: pctVend, comisionDirectivaPct: pctDir,
          vendedoresSplit: vendedores.map(v => ({ nombre: v.nombre, pct: nf(v.pct) })),
          montoProforma: proforma, pagoVehimotors: y,
          polizaCarro: egr.pc, polizaVida: egr.pv, obsequioClientes: egr.ob, alfombras: egr.al,
          papelAhumado: egr.pa, gastoAdministrativo: egr.ga,
          vendedora, reportadoVm, notas,
        }),
      })
      const j = await r.json()
      if (!r.ok) { setError(j.error ?? 'No se pudo guardar'); setSaving(false); return }
      onSaved(j.division)
    } catch { setError('Error de conexión'); setSaving(false) }
  }

  const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:border-oriental-red'
  const inpRO = 'w-full px-3 py-2 border border-gray-100 rounded-lg text-sm text-right bg-gray-50 text-gray-700 font-bold'
  const lbl = 'block text-[11px] font-semibold text-gray-500 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && onClose()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-bold text-oriental-black text-base flex items-center gap-2"><Calculator size={16} className="text-oriental-red" /> División contable</h2>
            <p className="text-xs text-oriental-gray">{venta.marca} {venta.modelo}{venta.placa ? ` · ${venta.placa}` : ''}</p>
          </div>
          <button onClick={() => !saving && onClose()} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-800">{error}</div>}

          {/* 1. Tipo de venta */}
          <div>
            <label className={lbl}>Tipo de venta</label>
            <div className="flex flex-wrap gap-1.5">
              {TIPOS_VENTA.map(t => (
                <button key={t.key} type="button" onClick={() => setTipoVenta(t.key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${tipoVenta === t.key ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-oriental-black'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2-3. Precio de venta + % comisión de venta (refleja monto) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Precio de venta $</label>
              <input className={inp} inputMode="decimal" value={precioVenta} onChange={e => setPrecioVenta(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>% Comisión de venta</label>
              <input className={inp} inputMode="decimal" value={comisionPct} onChange={e => setComisionPct(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-between text-[11px] text-gray-500 -mt-1 px-1">
            <span>Monto comisión de venta</span><span className="font-bold text-indigo-700">${fmt(comisionVentaMonto)}</span>
          </div>

          {/* 4. Monto base de Jetplus */}
          <div>
            <label className={lbl}>Monto base de Jetplus $ <span className="font-normal text-gray-400">= precio − comisión de venta</span></label>
            <input className={inpRO} value={fmt(montoBase)} readOnly tabIndex={-1} />
          </div>

          {/* 5-6. % Comisión de vendedores y directiva (reflejan monto sobre la base) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>% Comisión de vendedores</label>
              <input className={inp} inputMode="decimal" value={comVendPct} onChange={e => setComVendPct(e.target.value)} />
              <p className="text-[11px] text-right mt-1 font-bold text-red-600">${fmt(comVendMonto)}</p>
            </div>
            <div>
              <label className={lbl}>% Comisión de directiva</label>
              <input className={inp} inputMode="decimal" value={comDirPct} onChange={e => setComDirPct(e.target.value)} />
              <p className="text-[11px] text-right mt-1 font-bold text-amber-600">${fmt(comDirMonto)}</p>
            </div>
          </div>

          {/* 7. Vendedores + reparto del pool */}
          <div>
            <label className={lbl}>Vendedores — reparte el monto de comisión (100%) entre los que elijas</label>
            <div className="flex flex-wrap gap-1.5">
              {opcionesVend.map(nombre => {
                const on = vendedores.some(v => v.nombre === nombre)
                return (
                  <button key={nombre} type="button" onClick={() => toggleVend(nombre)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${on ? 'bg-oriental-red text-white border-oriental-red' : 'bg-white text-oriental-gray border-gray-200 hover:border-oriental-red'}`}>
                    {nombre}
                  </button>
                )
              })}
            </div>
            {vendedorasBd.length === 0 && <p className="text-[11px] text-amber-600 mt-1">No hay vendedores cargados. Rojas los agrega en Base de datos → Vendedoras.</p>}
            {vendedores.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {vendedores.map(v => {
                  const montoV = Math.round(comVendMonto * nf(v.pct)) / 100
                  return (
                    <div key={v.nombre} className="flex items-center gap-2">
                      <span className="flex-1 text-xs font-semibold text-oriental-black truncate">{v.nombre}</span>
                      <div className="relative w-20">
                        <input className="w-full px-2 py-1.5 pr-6 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:border-oriental-red"
                          inputMode="decimal" placeholder="0" value={v.pct} onChange={e => setVendPct(v.nombre, e.target.value)} />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                      </div>
                      <span className="w-20 text-right text-xs font-bold text-red-600">${fmt(montoV)}</span>
                    </div>
                  )
                })}
                <div className={`flex justify-between text-[11px] px-1 pt-0.5 ${sumaPctVend === 100 ? 'text-gray-500' : 'text-amber-600 font-semibold'}`}>
                  <span>{sumaPctVend === 100 ? 'Reparto completo' : 'El reparto debe sumar 100%'}</span><span className="font-bold">{fmt(sumaPctVend)}%</span>
                </div>
              </div>
            )}
          </div>

          {/* 8-9. Monto proforma oriental + Pagado a Vehimotors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Monto proforma oriental $</label>
              <input className={inp} inputMode="decimal" value={montoProforma} onChange={e => setMontoProforma(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Pagado a Vehimotors $</label>
              <input className={inp} inputMode="decimal" value={pagoVM} onChange={e => setPagoVM(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-between text-[11px] text-gray-500 -mt-1 px-1">
            <span>Ingreso bruto oriental</span><span className="font-bold text-oriental-black">${fmt(ingresoBrutoOriental)}</span>
          </div>

          {/* 10. Egresos de directiva */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Egresos de directiva</p>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={lbl}>Póliza de carro $</label><input className={inp} inputMode="decimal" value={polizaCarro} onChange={e => setPolizaCarro(e.target.value)} /></div>
              <div><label className={lbl}>Póliza de vida $</label><input className={inp} inputMode="decimal" value={polizaVida} onChange={e => setPolizaVida(e.target.value)} /></div>
              <div><label className={lbl}>Obsequio a clientes $</label><input className={inp} inputMode="decimal" value={obsequio} onChange={e => setObsequio(e.target.value)} /></div>
              <div><label className={lbl}>Alfombra $</label><input className={inp} inputMode="decimal" value={alfombras} onChange={e => setAlfombras(e.target.value)} /></div>
              <div><label className={lbl}>Papel ahumado $</label><input className={inp} inputMode="decimal" value={papelAhumado} onChange={e => setPapelAhumado(e.target.value)} /></div>
              <div><label className={lbl}>Gasto administrativo $</label><input className={inp} inputMode="decimal" value={gastoAdmin} onChange={e => setGastoAdmin(e.target.value)} /></div>
            </div>
          </div>

          {/* Resumen — 3 bloques (dibujo de dirección) */}
          <div className="rounded-xl bg-gray-900 p-4 text-white space-y-1.5 text-sm">
            {/* A) Ingreso bruto oriental */}
            <div className="flex justify-between text-gray-300"><span>Monto proforma oriental</span><span className="font-mono">${fmt(proforma)}</span></div>
            <div className="flex justify-between text-gray-300"><span>− Pagado a Vehimotors</span><span className="font-mono">${fmt(y)}</span></div>
            <div className="flex justify-between text-gray-100 border-t border-gray-700 pt-1.5"><span>= Ingreso bruto oriental</span><span className="font-mono">${fmt(ingresoBrutoOriental)}</span></div>

            {/* B) A oriental → Ingreso neto venta (contabilidad) */}
            <div className="pt-1.5 mt-1 border-t border-gray-700">
              <p className="text-[10px] uppercase tracking-wider text-indigo-300 font-bold mb-1">A oriental</p>
              <div className="flex justify-between text-gray-300"><span>Ingreso bruto venta ({fmt(pctVenta)}%)</span><span className="font-mono">${fmt(comisionVentaMonto)}</span></div>
              {vendedores.filter(v => nf(v.pct) > 0).map(v => (
                <div key={v.nombre} className="flex justify-between text-gray-300"><span>− Comisión venta · {v.nombre} ({fmt(nf(v.pct))}%)</span><span className="font-mono">${fmt(Math.round(comVendMonto * nf(v.pct)) / 100)}</span></div>
              ))}
              {comVendMonto > 0 && vendedores.filter(v => nf(v.pct) > 0).length === 0 && (
                <div className="flex justify-between text-gray-300"><span>− Comisión de vendedores ({fmt(pctVend)}%)</span><span className="font-mono">${fmt(comVendMonto)}</span></div>
              )}
              {comDirMonto > 0 && <div className="flex justify-between text-gray-300"><span>− Comisión venta directiva ({fmt(pctDir)}%)</span><span className="font-mono">${fmt(comDirMonto)}</span></div>}
              <div className="flex justify-between font-bold text-green-400 border-t border-gray-700 pt-1.5 mt-1"><span>= Ingreso neto venta</span><span className="font-mono">${fmt(ingresoNetoVenta)}</span></div>
              <p className="text-[10px] text-gray-500 text-right">va a contabilidad</p>
            </div>

            {/* C) A directiva → Ingreso bóveda (la bolsa, reservado) */}
            <div className="pt-1.5 mt-1 border-t border-gray-700">
              <p className="text-[10px] uppercase tracking-wider text-amber-300 font-bold mb-1">A directiva <span className="text-gray-500 normal-case">(IBO − IBV)</span></p>
              <div className="flex justify-between text-gray-300"><span>Ingreso bruto oriental − ingreso bruto venta</span><span className="font-mono">${fmt(r2(ingresoBrutoOriental - comisionVentaMonto))}</span></div>
              {egr.pv > 0 && <div className="flex justify-between text-gray-300"><span>− Póliza de vida</span><span className="font-mono">${fmt(egr.pv)}</span></div>}
              {egr.pc > 0 && <div className="flex justify-between text-gray-300"><span>− Póliza de carro</span><span className="font-mono">${fmt(egr.pc)}</span></div>}
              {egr.ob > 0 && <div className="flex justify-between text-gray-300"><span>− Obsequio a clientes</span><span className="font-mono">${fmt(egr.ob)}</span></div>}
              {egr.al > 0 && <div className="flex justify-between text-gray-300"><span>− Alfombra</span><span className="font-mono">${fmt(egr.al)}</span></div>}
              {egr.pa > 0 && <div className="flex justify-between text-gray-300"><span>− Papel ahumado</span><span className="font-mono">${fmt(egr.pa)}</span></div>}
              {egr.ga > 0 && <div className="flex justify-between text-gray-300"><span>− Gasto administrativo</span><span className="font-mono">${fmt(egr.ga)}</span></div>}
              {esRojas ? (
                <div className="flex justify-between font-bold text-green-400 border-t border-gray-700 pt-1.5 mt-1"><span>= Ingreso bóveda</span><span className="font-mono">${fmt(ingresoBoveda)}</span></div>
              ) : (
                <div className="flex justify-between text-[11px] text-gray-500 border-t border-gray-700 pt-1.5 mt-1"><span>Ingreso bóveda</span><span className="font-mono">— reservado —</span></div>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={reportadoVm} onChange={e => setReportadoVm(e.target.checked)} className="w-4 h-4" />
            Reportado a Vehimotors
          </label>
          <div>
            <label className={lbl}>Notas (interno)</label>
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
