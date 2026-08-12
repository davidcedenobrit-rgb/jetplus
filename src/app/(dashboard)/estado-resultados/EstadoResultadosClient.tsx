'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIAS_EGRESO_LABEL } from '@/lib/utils'
import { distribuirGastoComun, type RepartoRow } from '@/lib/gastos-comunes'
import { ArrowLeft, FileBarChart2, Printer, FileDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'

type MovIngreso = {
  numero_recibo: string | null; monto: number; moneda: string; tasa_cambio: number | null; fecha_pago: string; estado: string
  concepto: string; titular_fondos: string | null; iva_aplica: boolean | null; base_imponible: number | null; centro_costo_id: string | null
}
type MovEgreso = {
  numero_egreso: string | null; beneficiario: string | null
  monto: number; moneda: string; tasa_cambio: number | null; fecha_egreso: string; estado: string
  categoria: string; tipo_movimiento: string | null; centro_costo_id: string | null; area_responsable: string | null
  iva_aplica: boolean | null; base_imponible: number | null; es_comun: boolean | null
}
type CentroCosto = { id: string; nombre: string; es_comun?: boolean | null; genera_ingreso?: boolean | null }
type Doc = { ref: string; fecha: string; detalle: string; monto: number }
type Linea = { nombre: string; total: number; docs: Doc[] }

const EXCL = new Set(['anulado', 'rechazado'])

// Convierte un monto a la moneda de la vista usando la tasa de CADA operación
// (la tasa BCV del día en que se registró), no una tasa única sobre el total.
//  - Vista USD: VES → monto / tasa ; USD → monto.
//  - Vista Bs:  USD → monto * tasa ; VES → monto (ya está en Bs).
function conv(m: number, moneda: string, tasa: number | null, aBs: boolean): number {
  if (aBs) return moneda === 'VES' ? m : m * (tasa && tasa > 0 ? tasa : 0)
  return moneda === 'VES' ? (tasa && tasa > 0 ? m / tasa : 0) : m
}
function fmt(n: number): string {
  return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const PAGE = 1000
  let out: T[] = []
  for (let i = 0; ; i++) {
    const { data } = await build(i * PAGE, i * PAGE + PAGE - 1)
    if (!data || data.length === 0) break
    out = out.concat(data)
    if (data.length < PAGE) break
  }
  return out
}

export default function EstadoResultadosClient() {
  const supabase = createClient()
  const hoy = new Date().toISOString().split('T')[0]
  const inicioAnio = hoy.slice(0, 4) + '-01-01'

  const [desde, setDesde] = useState(inicioAnio)
  const [hasta, setHasta] = useState(hoy)
  const [vista, setVista] = useState<'oriental' | 'vehimotors'>('oriental')
  const [moneda, setMoneda] = useState<'USD' | 'Bs'>('USD')
  const [centros, setCentros] = useState<CentroCosto[]>([])
  const [reparto, setReparto] = useState<RepartoRow[]>([])
  const [ingresos, setIngresos] = useState<MovIngreso[]>([])
  const [egresos, setEgresos] = useState<MovEgreso[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('centros_costo').select('id, nombre, es_comun, genera_ingreso').eq('activo', true).order('orden')
      .then(({ data }) => setCentros((data as CentroCosto[]) ?? []))
    supabase.from('reparto_gastos_comunes').select('centro_costo_id, porcentaje')
      .then(({ data }) => setReparto(((data as { centro_costo_id: string; porcentaje: number }[]) ?? []).map(r => ({ centro_costo_id: r.centro_costo_id, porcentaje: Number(r.porcentaje) }))))
  }, [])

  const cargar = useCallback(async () => {
    setLoading(true)
    const [ing, egr] = await Promise.all([
      fetchAll<MovIngreso>((f, t) => supabase.from('ingresos')
        .select('numero_recibo, monto, moneda, tasa_cambio, fecha_pago, estado, concepto, titular_fondos, iva_aplica, base_imponible, centro_costo_id')
        .gte('fecha_pago', desde).lte('fecha_pago', hasta).range(f, t)),
      fetchAll<MovEgreso>((f, t) => supabase.from('egresos')
        .select('numero_egreso, beneficiario, monto, moneda, tasa_cambio, fecha_egreso, estado, categoria, tipo_movimiento, centro_costo_id, area_responsable, iva_aplica, base_imponible, es_comun')
        .gte('fecha_egreso', desde).lte('fecha_egreso', hasta).range(f, t)),
    ])
    setIngresos(ing.filter(i => !EXCL.has(i.estado)))
    setEgresos(egr.filter(e => !EXCL.has(e.estado)))
    setLoading(false)
  }, [desde, hasta])

  useEffect(() => { cargar() }, [cargar])

  const aBs = moneda === 'Bs'
  const simb = aBs ? 'Bs ' : '$'
  const esPropio = (i: MovIngreso) => (i.titular_fondos ?? 'propio') === 'propio'
  const netoIng = (i: MovIngreso) => conv(i.iva_aplica && i.base_imponible ? Number(i.base_imponible) : i.monto, i.moneda, i.tasa_cambio, aBs)
  const netoEgr = (e: MovEgreso) => conv(e.iva_aplica && e.base_imponible ? Number(e.base_imponible) : e.monto, e.moneda, e.tasa_cambio, aBs)
  const centroNombre = useCallback((id: string | null, area?: string | null): string => {
    if (id) return centros.find(c => c.id === id)?.nombre ?? id
    return area?.trim() || 'Sin centro de costo'
  }, [centros])

  const data = useMemo(() => {
    const propios = ingresos.filter(esPropio)
    const gastosOp = egresos.filter(e => e.tipo_movimiento !== 'inversion')
    const inversiones = egresos.filter(e => e.tipo_movimiento === 'inversion')

    const noPropios = ingresos.filter(i => !esPropio(i))
    const totalIngresos = propios.reduce((s, i) => s + netoIng(i), 0)
    const totalGastos = gastosOp.reduce((s, e) => s + netoEgr(e), 0)
    const totalInversion = inversiones.reduce((s, e) => s + netoEgr(e), 0)
    const custodia = noPropios.reduce((s, i) => s + conv(i.monto, i.moneda, i.tasa_cambio, aBs), 0)
    const resultado = totalIngresos - totalGastos

    // Detalle de fondos de terceros / Vehimotors (para la vista "Con Vehimotors").
    // No forman parte del resultado de Jetplus; se muestran por separado.
    const custPorConcepto: Record<string, Linea> = {}
    for (const i of noPropios) {
      const k = i.concepto?.trim() || 'Otros'
      const l = (custPorConcepto[k] ??= { nombre: k, total: 0, docs: [] })
      const m = conv(i.monto, i.moneda, i.tasa_cambio, aBs)
      l.total += m
      l.docs.push({ ref: i.numero_recibo ?? '—', fecha: (i.fecha_pago ?? '').slice(0, 10), detalle: i.titular_fondos === 'tercero' ? 'Tercero' : 'Vehimotors', monto: m })
    }
    const custodiaConceptos = Object.values(custPorConcepto).sort((a, b) => b.total - a.total)

    // Ingresos por concepto (con detalle de documentos)
    const ingPorConcepto: Record<string, Linea> = {}
    for (const i of propios) {
      const k = i.concepto?.trim() || 'Otros'
      const l = (ingPorConcepto[k] ??= { nombre: k, total: 0, docs: [] })
      const m = netoIng(i)
      l.total += m
      l.docs.push({ ref: i.numero_recibo ?? '—', fecha: (i.fecha_pago ?? '').slice(0, 10), detalle: '', monto: m })
    }
    const conceptos = Object.values(ingPorConcepto).sort((a, b) => b.total - a.total)

    // Gastos por categoría (con detalle de documentos)
    const gastoPorCat: Record<string, Linea> = {}
    for (const e of gastosOp) {
      const k = CATEGORIAS_EGRESO_LABEL[e.categoria] ?? e.categoria ?? 'Otros'
      const l = (gastoPorCat[k] ??= { nombre: k, total: 0, docs: [] })
      const m = netoEgr(e)
      l.total += m
      l.docs.push({ ref: e.numero_egreso ?? '—', fecha: (e.fecha_egreso ?? '').slice(0, 10), detalle: e.beneficiario ?? '', monto: m })
    }
    const categorias = Object.values(gastoPorCat).sort((a, b) => b.total - a.total)

    // Resultado por centro de costo. Los gastos comunes (gastos fijos: alquiler,
    // luz, internet, vigilancia, nómina…) no se cargan a un solo centro: se
    // acumulan y se reparten por % entre las líneas de ingreso, para ver la
    // utilidad real por línea.
    const porCentro: Record<string, { ing: number; gasto: number }> = {}
    for (const i of propios) {
      const k = centroNombre(i.centro_costo_id)
      ;(porCentro[k] ??= { ing: 0, gasto: 0 }).ing += netoIng(i)
    }
    let gastoComun = 0
    for (const e of gastosOp) {
      if (e.es_comun) { gastoComun += netoEgr(e); continue }
      const k = centroNombre(e.centro_costo_id, e.area_responsable)
      ;(porCentro[k] ??= { ing: 0, gasto: 0 }).gasto += netoEgr(e)
    }
    // Repartir el gasto común entre los centros de ingreso según el % configurado
    const dist = distribuirGastoComun(gastoComun, reparto)
    for (const [cid, monto] of Object.entries(dist)) {
      const k = centroNombre(cid)
      ;(porCentro[k] ??= { ing: 0, gasto: 0 }).gasto += monto
    }
    const centrosRows = Object.entries(porCentro)
      .map(([centro, v]) => ({ centro, ing: v.ing, gasto: v.gasto, res: v.ing - v.gasto }))
      .sort((a, b) => b.res - a.res)

    return { totalIngresos, totalGastos, totalInversion, custodia, resultado, conceptos, categorias, centrosRows, custodiaConceptos, gastoComun }
  }, [ingresos, egresos, centros, reparto, centroNombre, aBs])

  function exportarCsv() {
    const rows: (string | number)[][] = [['ESTADO DE RESULTADOS', `${desde} a ${hasta}`], [`Moneda: ${moneda === 'Bs' ? 'Bolívares (tasa BCV de cada operación)' : 'USD'}`], []]
    rows.push(['Ingresos operativos (propios, neto IVA)', data.totalIngresos.toFixed(2)])
    data.conceptos.forEach(l => rows.push([`  ${l.nombre}`, l.total.toFixed(2)]))
    rows.push(['Gastos operativos', data.totalGastos.toFixed(2)])
    data.categorias.forEach(l => rows.push([`  ${l.nombre}`, l.total.toFixed(2)]))
    rows.push(['RESULTADO OPERATIVO', data.resultado.toFixed(2)], [])
    rows.push(['Memo — Inversiones (no afecta resultado)', data.totalInversion.toFixed(2)])
    rows.push(['Memo — Fondos de terceros en custodia', data.custodia.toFixed(2)], [])
    if (vista === 'vehimotors') {
      rows.push(['FONDOS DE VEHIMOTORS / TERCEROS (custodia, no es ingreso de Jetplus)', data.custodia.toFixed(2)])
      data.custodiaConceptos.forEach(l => rows.push([`  ${l.nombre}`, l.total.toFixed(2)]))
      rows.push([])
    }
    rows.push(['Por centro de costo', 'Ingresos', 'Gastos', 'Resultado'])
    data.centrosRows.forEach(r => rows.push([r.centro, r.ing.toFixed(2), r.gasto.toFixed(2), r.res.toFixed(2)]))
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = `estado-resultados-${moneda.toLowerCase()}-${desde}_${hasta}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      <div className="flex items-center gap-4 mb-6 no-print">
        <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"><ArrowLeft size={18} className="text-oriental-gray" /></Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center"><FileBarChart2 size={20} className="text-oriental-red" /></div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Estado de resultados</h1>
            <p className="text-oriental-gray text-sm">Resultado operativo por período y por centro de costo (en {moneda === 'Bs' ? 'bolívares' : 'USD'})</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-6 flex flex-wrap items-end gap-3 no-print">
        <div><label className="label">Desde</label><input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="input" /></div>
        <div><label className="label">Hasta</label><input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="input" /></div>
        <button onClick={() => { setDesde(hoy.slice(0, 7) + '-01'); setHasta(hoy) }} className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-oriental-gray hover:bg-gray-50">Este mes</button>
        <button onClick={() => { setDesde(inicioAnio); setHasta(hoy) }} className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-oriental-gray hover:bg-gray-50">Este año</button>
        <div className="ml-auto flex gap-2">
          <button onClick={exportarCsv} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-oriental-gray hover:bg-gray-50"><FileDown size={15} /> CSV</button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-oriental-gray hover:bg-gray-50"><Printer size={15} /> Imprimir</button>
        </div>
      </div>

      {/* Vista: solo Jetplus vs con Vehimotors (para presentar a Carla / Carlos) */}
      <div className="flex items-center gap-2 mb-4 no-print">
        <span className="text-xs font-semibold text-oriental-gray">Vista:</span>
        <button onClick={() => setVista('oriental')} className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${vista === 'oriental' ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'}`}>Solo Jetplus</button>
        <button onClick={() => setVista('vehimotors')} className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${vista === 'vehimotors' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'}`}>Con Vehimotors</button>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <span className="text-xs font-semibold text-oriental-gray">Moneda:</span>
        <button onClick={() => setMoneda('USD')} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${moneda === 'USD' ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'}`}>USD</button>
        <button onClick={() => setMoneda('Bs')} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${moneda === 'Bs' ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'}`}>Bs</button>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-oriental-gray text-sm">Cargando…</div>
      ) : (
        <div className="card p-6 lg:p-8">
          <div className="text-center mb-6 pb-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-oriental-black">Estado de Resultados</h2>
            <p className="text-xs text-oriental-gray">Del {desde} al {hasta} · valores en {moneda === 'Bs' ? 'bolívares (tasa BCV de cada operación)' : 'USD'}, netos de IVA</p>
          </div>

          {/* Ingresos */}
          <Seccion titulo="Ingresos operativos" total={data.totalIngresos} tono="pos" filas={data.conceptos} simb={simb} />
          {/* Gastos */}
          <Seccion titulo="Gastos operativos" total={data.totalGastos} tono="neg" filas={data.categorias} signo="−" simb={simb} />

          {/* Resultado */}
          <div className={`flex items-center justify-between mt-4 py-3 px-4 rounded-lg ${data.resultado >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <span className="font-bold text-oriental-black">RESULTADO OPERATIVO</span>
            <span className={`text-xl font-black ${data.resultado >= 0 ? 'text-green-800' : 'text-oriental-red'}`}>{data.resultado < 0 ? '−' : ''}{simb}{fmt(Math.abs(data.resultado))}</span>
          </div>

          {/* Memo */}
          <div className="mt-5 pt-4 border-t border-gray-100 space-y-1.5 text-sm">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-oriental-gray mb-1">Partidas informativas (no afectan el resultado)</p>
            <div className="flex justify-between"><span className="text-oriental-gray">Inversiones del período</span><span className="font-semibold text-oriental-black">{simb}{fmt(data.totalInversion)}</span></div>
            <div className="flex justify-between"><span className="text-oriental-gray">Fondos de terceros en custodia</span><span className="font-semibold text-amber-700">{simb}{fmt(data.custodia)}</span></div>
          </div>

          {/* Vista "Con Vehimotors": detalle de los fondos de terceros, por separado */}
          {vista === 'vehimotors' && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-200">
                <span className="font-bold text-amber-900">Fondos de Vehimotors / terceros (custodia)</span>
                <span className="font-black text-amber-800">{simb}{fmt(data.custodia)}</span>
              </div>
              {data.custodiaConceptos.length === 0 ? (
                <p className="py-2 text-xs text-oriental-gray">Sin fondos de terceros en el período</p>
              ) : (
                <div className="space-y-1">
                  {data.custodiaConceptos.map(l => (
                    <div key={l.nombre} className="flex items-center justify-between py-1 text-sm">
                      <span className="text-oriental-gray">{l.nombre} <span className="text-[10px] text-gray-400">({l.docs.length})</span></span>
                      <span className="tabular-nums text-amber-900">{simb}{fmt(l.total)}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-amber-800/80 mt-3">
                Dinero cobrado por cuenta de Vehimotors (y otros terceros) que pasa por Jetplus en custodia. <span className="font-semibold">No es ingreso ni resultado de Jetplus</span>; se muestra aparte solo para presentarle a Carla y Carlos el movimiento completo.
              </p>
            </div>
          )}

          {/* Por centro de costo */}
          <div className="mt-6">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-oriental-gray mb-2">Resultado por centro de costo</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="text-left py-2 font-medium text-oriental-gray text-xs">Centro</th>
                    <th className="text-right py-2 font-medium text-oriental-gray text-xs">Ingresos</th>
                    <th className="text-right py-2 font-medium text-oriental-gray text-xs">Gastos</th>
                    <th className="text-right py-2 font-medium text-oriental-gray text-xs">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.centrosRows.map(r => (
                    <tr key={r.centro}>
                      <td className="py-2 font-semibold text-oriental-black">{r.centro}</td>
                      <td className="py-2 text-right tabular-nums text-green-700">{simb}{fmt(r.ing)}</td>
                      <td className="py-2 text-right tabular-nums text-oriental-red">{simb}{fmt(r.gasto)}</td>
                      <td className={`py-2 text-right tabular-nums font-bold ${r.res >= 0 ? 'text-oriental-black' : 'text-oriental-red'}`}>{r.res < 0 ? '−' : ''}{simb}{fmt(Math.abs(r.res))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {data.gastoComun > 0 && (
            <p className="text-[11px] text-oriental-gray mt-2">
              Incluye <span className="font-semibold">{simb}{fmt(data.gastoComun)}</span> de gastos comunes (gastos fijos: alquiler, luz, internet, vigilancia, nómina…) repartidos por % entre las líneas de ingreso. El % se configura en Centros de costo → Gestionar.
            </p>
          )}

          <p className="text-[11px] text-oriental-gray mt-5">
            Resultado operativo = ingreso propio (neto de IVA, excluye custodia de terceros) − gastos operativos (neto de IVA). Las inversiones no restan del resultado (son activo). {moneda === 'Bs' ? 'Cada monto se convierte a bolívares con la tasa BCV del día de la operación (no el total por la tasa de hoy).' : 'VES convertido a USD con la tasa de cada registro.'}
          </p>
        </div>
      )}
    </div>
  )
}

function Seccion({ titulo, total, tono, filas, signo, simb }: { titulo: string; total: number; tono: 'pos' | 'neg'; filas: Linea[]; signo?: string; simb: string }) {
  const [abierto, setAbierto] = useState<string | null>(null)
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between py-2 border-b border-gray-200">
        <span className="font-bold text-oriental-black">{titulo}</span>
        <span className={`font-bold ${tono === 'pos' ? 'text-green-700' : 'text-oriental-red'}`}>{signo ?? ''}{simb}{fmt(total)}</span>
      </div>
      <div className="pl-2">
        {filas.length === 0 ? (
          <p className="py-2 text-xs text-oriental-gray">Sin movimientos</p>
        ) : filas.map(l => {
          const open = abierto === l.nombre
          return (
            <div key={l.nombre} className="border-b border-gray-50">
              <button onClick={() => setAbierto(open ? null : l.nombre)} className="w-full flex items-center justify-between py-1.5 text-sm hover:bg-gray-50 rounded px-1 -mx-1">
                <span className="text-oriental-gray flex items-center gap-1">
                  <ChevronRight size={13} className={`text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
                  {l.nombre} <span className="text-[10px] text-gray-400">({l.docs.length})</span>
                </span>
                <span className="tabular-nums text-oriental-black">{simb}{fmt(l.total)}</span>
              </button>
              {open && (
                <div className="ml-5 mb-2 border-l-2 border-gray-100 pl-3">
                  {l.docs.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).map((d, i) => (
                    <div key={i} className="flex items-center justify-between py-1 text-xs text-oriental-gray">
                      <span><span className="font-mono">{d.ref}</span> · {d.fecha}{d.detalle ? ` · ${d.detalle}` : ''}</span>
                      <span className="tabular-nums">{simb}{fmt(d.monto)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
