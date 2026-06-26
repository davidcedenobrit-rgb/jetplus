'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, CATEGORIAS_EGRESO_LABEL } from '@/lib/utils'
import { ArrowLeft, Printer, Search, LayoutGrid, Users } from 'lucide-react'
import Link from 'next/link'

type Egreso = {
  id: string
  numero_egreso: string
  categoria: string
  concepto: string
  descripcion: string | null
  monto: number
  moneda: string
  tasa_cambio: number | null
  monto_bs: number | null
  beneficiario: string | null
  referencia: string | null
  fecha_egreso: string
  estado: string
  area_responsable: string | null
}

function escapeHtml(s: string | number | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtMonto(monto: number, moneda: string) {
  if (moneda === 'USD' || moneda === 'USDT') return `$${monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
  return `Bs. ${monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
}

function montoUSD(e: Egreso): number {
  if (e.moneda !== 'VES') return e.monto
  return e.tasa_cambio && e.tasa_cambio > 0 ? e.monto / e.tasa_cambio : 0
}

function montoBs(e: Egreso): number | null {
  if (e.moneda === 'VES') return e.monto
  if (e.monto_bs) return e.monto_bs
  if (e.tasa_cambio) return e.monto * e.tasa_cambio
  return null
}

const ESTADOS_LABEL: Record<string, string> = {
  registrado: 'Registrado',
  pendiente_aprobacion: 'Pend. Aprobación',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  pagado: 'Pagado',
  anulado: 'Anulado',
}

type AgruparPor = 'categoria' | 'beneficiario'

export default function ReporteEgresosPage() {
  const supabase = createClient()

  const hoy = new Date().toISOString().split('T')[0]
  const primerDiaMes = hoy.slice(0, 7) + '-01'

  const [fechaDesde, setFechaDesde] = useState(primerDiaMes)
  const [fechaHasta, setFechaHasta] = useState(hoy)
  const [categoria, setCategoria] = useState('')
  const [estado, setEstado] = useState('')
  const [agruparPor, setAgruparPor] = useState<AgruparPor>('categoria')
  const [egresos, setEgresos] = useState<Egreso[]>([])
  const [loading, setLoading] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('egresos')
      .select('id, numero_egreso, categoria, concepto, descripcion, monto, moneda, tasa_cambio, monto_bs, beneficiario, referencia, fecha_egreso, estado, area_responsable')
      .gte('fecha_egreso', fechaDesde)
      .lte('fecha_egreso', fechaHasta)
      .neq('estado', 'anulado')
      .order(agruparPor === 'beneficiario' ? 'beneficiario' : 'categoria')
      .order('fecha_egreso')

    if (categoria) q = q.eq('categoria', categoria)
    if (estado) q = q.eq('estado', estado)

    const { data } = await q
    setEgresos(data ?? [])
    setLoading(false)
  }, [fechaDesde, fechaHasta, categoria, estado, agruparPor])

  useEffect(() => { cargar() }, [cargar])

  // ── Agrupar ──────────────────────────────────────────────────────────────
  const grupos: Record<string, Egreso[]> = {}
  for (const e of egresos) {
    const k = agruparPor === 'beneficiario'
      ? (e.beneficiario?.trim() || 'Sin beneficiario')
      : (e.categoria ?? 'otros')
    if (!grupos[k]) grupos[k] = []
    grupos[k].push(e)
  }

  const totalUSD = egresos.reduce((s, e) => s + montoUSD(e), 0)
  const totalVES = egresos.filter(e => e.moneda === 'VES').reduce((s, e) => s + e.monto, 0)
  const hayVES = egresos.some(e => e.moneda === 'VES')

  // ── Imprimir ─────────────────────────────────────────────────────────────
  function imprimir() {
    const etiquetaDesde = fmtDate(fechaDesde)
    const etiquetaHasta = fmtDate(fechaHasta)
    const etiquetaCat = categoria ? (CATEGORIAS_EGRESO_LABEL[categoria] ?? categoria) : 'Todas las categorías'
    const etiquetaEst = estado ? (ESTADOS_LABEL[estado] ?? estado) : 'Todos los estados'
    const etiquetaAgrup = agruparPor === 'beneficiario' ? 'Por beneficiario' : 'Por categoría'

    const filas = Object.entries(grupos).map(([grupo, items]) => {
      const subUSD = items.reduce((s, e) => s + montoUSD(e), 0)
      const subVES = items.filter(e => e.moneda === 'VES').reduce((s, e) => s + e.monto, 0)
      const grupoLabel = agruparPor === 'categoria' ? (CATEGORIAS_EGRESO_LABEL[grupo] ?? grupo) : grupo

      const filasItems = items.map(e => {
        const usd = montoUSD(e)
        const bs = montoBs(e)
        return `
        <tr>
          <td class="mono">${escapeHtml(e.numero_egreso)}</td>
          <td>${escapeHtml(e.concepto)}</td>
          ${agruparPor === 'beneficiario' ? `<td>${escapeHtml(CATEGORIAS_EGRESO_LABEL[e.categoria] ?? e.categoria)}</td>` : `<td>${escapeHtml(e.beneficiario ?? '—')}</td>`}
          <td class="mono">${escapeHtml(e.referencia ?? '—')}</td>
          <td>${fmtDate(e.fecha_egreso)}</td>
          <td class="num">$${usd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
          ${hayVES ? `<td class="num">${bs !== null ? `Bs. ${bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}` : '—'}</td>` : ''}
        </tr>`
      }).join('')

      const cols = hayVES ? 7 : 6
      return `
        <tr class="cat-header">
          <td colspan="${cols}">${escapeHtml(grupoLabel)}</td>
        </tr>
        ${filasItems}
        <tr class="subtotal">
          <td colspan="${cols - (hayVES ? 2 : 1)}">Subtotal — ${escapeHtml(grupoLabel)}</td>
          <td class="num">$${subUSD.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
          ${hayVES ? `<td class="num">${subVES > 0 ? `Bs. ${subVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}` : '—'}</td>` : ''}
        </tr>`
    }).join('')

    const cols = hayVES ? 7 : 6
    const colTercer = agruparPor === 'beneficiario' ? 'Categoría' : 'Beneficiario'

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Reporte de Egresos</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 20px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 2px solid #111; padding-bottom: 12px; }
  .logo { font-size: 16px; font-weight: 900; letter-spacing: -0.5px; }
  .logo span { color: #c00; }
  .report-title { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
  .meta { font-size: 10px; color: #555; }
  .meta span { font-weight: 600; color: #111; }
  .summary { display: flex; gap: 24px; margin-bottom: 16px; padding: 10px 14px; background: #f5f5f5; border-radius: 4px; }
  .summary-item { font-size: 11px; }
  .summary-item .label { color: #666; margin-bottom: 2px; }
  .summary-item .value { font-weight: 700; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #111; color: #fff; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  th.num, td.num { text-align: right; }
  td { padding: 5px 8px; border-bottom: 1px solid #e8e8e8; vertical-align: top; }
  .mono { font-family: 'Courier New', monospace; font-size: 10px; color: #555; }
  .cat-header td { background: #f0f0f0; font-weight: 700; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.3px; color: #333; padding: 7px 8px; border-top: 1px solid #ccc; }
  .subtotal td { background: #fafafa; font-weight: 600; font-size: 10.5px; color: #333; border-top: 1px solid #ddd; }
  .total-row td { background: #111; color: #fff; font-weight: 700; font-size: 12px; padding: 8px; }
  .total-row td.num { text-align: right; }
  .footer { margin-top: 24px; font-size: 9px; color: #888; border-top: 1px solid #ddd; padding-top: 8px; display: flex; justify-content: space-between; }
  @media print {
    body { padding: 10mm; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">LA ORIENTAL <span>AUTOMOTORS</span></div>
    <div style="font-size:9px;color:#666;margin-top:2px">MG &amp; MAXUS — Oriente de Venezuela</div>
  </div>
  <div style="text-align:right">
    <div class="report-title">REPORTE DE EGRESOS</div>
    <div class="meta">Período: <span>${escapeHtml(etiquetaDesde)}</span> al <span>${escapeHtml(etiquetaHasta)}</span></div>
    <div class="meta">Categoría: <span>${escapeHtml(etiquetaCat)}</span> &nbsp;·&nbsp; Estado: <span>${escapeHtml(etiquetaEst)}</span></div>
    <div class="meta">Agrupado: <span>${escapeHtml(etiquetaAgrup)}</span></div>
    <div class="meta" style="margin-top:4px">Generado: ${new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
  </div>
</div>

<div class="summary">
  <div class="summary-item">
    <div class="label">Total registros</div>
    <div class="value">${egresos.length}</div>
  </div>
  <div class="summary-item">
    <div class="label">Total USD / USDT</div>
    <div class="value">$${totalUSD.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
  </div>
  ${hayVES ? `<div class="summary-item">
    <div class="label">Total VES (Bs.)</div>
    <div class="value">Bs. ${totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
  </div>` : ''}
  <div class="summary-item">
    <div class="label">Grupos</div>
    <div class="value">${Object.keys(grupos).length}</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:130px">N° Egreso</th>
      <th>Concepto</th>
      <th style="width:130px">${escapeHtml(colTercer)}</th>
      <th style="width:90px">Referencia</th>
      <th style="width:80px">Fecha</th>
      <th class="num" style="width:110px">Monto USD</th>
      ${hayVES ? '<th class="num" style="width:110px">Monto Bs.</th>' : ''}
    </tr>
  </thead>
  <tbody>
    ${filas}
    <tr class="total-row">
      <td colspan="${cols - (hayVES ? 2 : 1)}">TOTAL GENERAL</td>
      <td class="num">$${totalUSD.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
      ${hayVES ? `<td class="num">${totalVES > 0 ? `Bs. ${totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}` : '—'}</td>` : ''}
    </tr>
  </tbody>
</table>

<div class="footer">
  <span>La Oriental Automotors — Documento de uso interno</span>
  <span>Director: José Rojas</span>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`

    const w = window.open('', '_blank', 'width=900,height=700')
    if (w) { w.document.write(html); w.document.close() }
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/egresos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-oriental-black">Reporte de Egresos</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Listado con totales en USD</p>
        </div>
        <button
          onClick={imprimir}
          disabled={loading || egresos.length === 0}
          className="btn-primary flex items-center gap-2"
        >
          <Printer size={16} />
          Imprimir reporte
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="label">Desde</label>
            <input type="date" className="input" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" className="input" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
          </div>
          <div>
            <label className="label">Categoría</label>
            <select className="select" value={categoria} onChange={e => setCategoria(e.target.value)}>
              <option value="">Todas</option>
              {Object.entries(CATEGORIAS_EGRESO_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="select" value={estado} onChange={e => setEstado(e.target.value)}>
              <option value="">Todos</option>
              <option value="pendiente_aprobacion">Pend. Aprobación</option>
              <option value="aprobado">Aprobado</option>
              <option value="pagado">Pagado</option>
              <option value="rechazado">Rechazado</option>
            </select>
          </div>
        </div>
        {/* Toggle agrupación */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          <span className="text-xs text-oriental-gray font-semibold uppercase tracking-wider">Agrupar por:</span>
          <button
            onClick={() => setAgruparPor('categoria')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              agruparPor === 'categoria'
                ? 'bg-oriental-black text-white border-oriental-black'
                : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
            }`}
          >
            <LayoutGrid size={13} /> Categoría
          </button>
          <button
            onClick={() => setAgruparPor('beneficiario')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              agruparPor === 'beneficiario'
                ? 'bg-oriental-black text-white border-oriental-black'
                : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
            }`}
          >
            <Users size={13} /> Beneficiario
          </button>
        </div>
      </div>

      {/* Resumen */}
      {!loading && egresos.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-xs text-oriental-gray uppercase tracking-wider mb-1">Registros</p>
            <p className="text-2xl font-bold text-oriental-black">{egresos.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-oriental-gray uppercase tracking-wider mb-1">Total USD / USDT</p>
            <p className="text-2xl font-bold text-oriental-black">
              ${totalUSD.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </p>
          </div>
          {hayVES && (
            <div className="card p-4">
              <p className="text-xs text-oriental-gray uppercase tracking-wider mb-1">Total VES</p>
              <p className="text-2xl font-bold text-oriental-black">
                Bs. {totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="card p-12 text-center text-oriental-gray text-sm">Cargando...</div>
      ) : egresos.length === 0 ? (
        <div className="card p-12 text-center">
          <Search size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-oriental-gray text-sm">No hay egresos en el período seleccionado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grupos).map(([grupo, items]) => {
            const subUSD = items.reduce((s, e) => s + montoUSD(e), 0)
            const subVES = items.filter(e => e.moneda === 'VES').reduce((s, e) => s + e.monto, 0)
            const grupoLabel = agruparPor === 'categoria'
              ? (CATEGORIAS_EGRESO_LABEL[grupo] ?? grupo)
              : grupo
            return (
              <div key={grupo} className="card overflow-hidden">
                {/* Cabecera de grupo */}
                <div className="px-4 py-2.5 bg-oriental-bg border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-oriental-black">
                    {grupoLabel}
                  </h3>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-semibold text-oriental-black">
                      ${subUSD.toLocaleString('es-VE', { minimumFractionDigits: 2 })} USD
                    </span>
                    {subVES > 0 && (
                      <span className="font-semibold text-oriental-black">
                        Bs. {subVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                    <span className="text-oriental-gray">({items.length})</span>
                  </div>
                </div>

                {/* Filas */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">N° Egreso</th>
                        <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Concepto</th>
                        <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">
                          {agruparPor === 'beneficiario' ? 'Categoría' : 'Beneficiario'}
                        </th>
                        <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Referencia</th>
                        <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Fecha</th>
                        <th className="text-right px-4 py-2 font-medium text-oriental-gray text-xs">USD</th>
                        {hayVES && <th className="text-right px-4 py-2 font-medium text-oriental-gray text-xs">Bs.</th>}
                        <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {items.map(e => {
                        const usd = montoUSD(e)
                        const bs = montoBs(e)
                        return (
                          <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2.5 font-mono text-xs text-oriental-gray">{e.numero_egreso}</td>
                            <td className="px-4 py-2.5 text-oriental-black">
                              <div>{e.concepto}</div>
                              {e.descripcion && <div className="text-xs text-oriental-gray mt-0.5">{e.descripcion}</div>}
                            </td>
                            <td className="px-4 py-2.5 text-oriental-gray text-xs">
                              {agruparPor === 'beneficiario'
                                ? (CATEGORIAS_EGRESO_LABEL[e.categoria] ?? e.categoria)
                                : (e.beneficiario ?? '—')}
                            </td>
                            <td className="px-4 py-2.5 text-oriental-gray font-mono text-xs">{e.referencia ?? '—'}</td>
                            <td className="px-4 py-2.5 text-oriental-gray text-xs whitespace-nowrap">{formatDate(e.fecha_egreso)}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-oriental-black whitespace-nowrap">
                              ${usd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                            </td>
                            {hayVES && (
                              <td className="px-4 py-2.5 text-right text-oriental-gray text-xs whitespace-nowrap">
                                {bs !== null ? `Bs. ${bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}` : '—'}
                              </td>
                            )}
                            <td className="px-4 py-2.5">
                              <span className="text-xs font-medium text-oriental-gray">
                                {ESTADOS_LABEL[e.estado] ?? e.estado}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}

          {/* Total general */}
          <div className="card p-4 flex items-center justify-between bg-oriental-black text-white">
            <span className="font-bold text-sm uppercase tracking-wider">Total General</span>
            <div className="flex items-center gap-4">
              <span className="font-bold text-lg">
                ${totalUSD.toLocaleString('es-VE', { minimumFractionDigits: 2 })} USD
              </span>
              {hayVES && (
                <span className="font-bold text-lg">
                  Bs. {totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
