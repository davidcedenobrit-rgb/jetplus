'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, METODOS_PAGO } from '@/lib/utils'
import { ArrowLeft, Printer, Search } from 'lucide-react'
import Link from 'next/link'

type Ingreso = {
  id: string
  numero_recibo: string
  placa: string | null
  concepto: string
  monto: number
  moneda: string
  metodo_pago: string | null
  referencia: string | null
  fecha_pago: string
  estado: string
  tasa_cambio: number | null
  monto_bs: number | null
  clientes: { nombre: string; cedula_rif: string | null } | null
}

const ESTADOS_LABEL: Record<string, string> = {
  pendiente_aprobacion: 'Pend. Aprobación',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  enviado_carla: 'Enviado Carla',
  enviado_deposito: 'En depósito',
  depositado: 'Depositado',
  entregado_carla: 'Entregado Carla',
  reportado_vehimotors: 'Vehimotors',
  anulado: 'Anulado',
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

function montoUSD(i: Ingreso): number {
  if (i.moneda === 'VES') {
    return i.tasa_cambio && i.tasa_cambio > 0 ? i.monto / i.tasa_cambio : 0
  }
  return i.monto
}

function montoVES(i: Ingreso): number {
  if (i.moneda === 'VES') return i.monto
  if (i.monto_bs) return i.monto_bs
  if (i.tasa_cambio) return i.monto * i.tasa_cambio
  return 0
}

function fmtUSD(n: number) {
  return `$${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtBS(n: number) {
  return `Bs. ${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function ReporteIngresosPage() {
  const supabase = createClient()

  const hoy = new Date().toISOString().split('T')[0]
  const primerDiaMes = hoy.slice(0, 7) + '-01'

  const [fechaDesde, setFechaDesde] = useState(primerDiaMes)
  const [fechaHasta, setFechaHasta] = useState(hoy)
  const [estado, setEstado] = useState('')
  const [moneda, setMoneda] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [ingresos, setIngresos] = useState<Ingreso[]>([])
  const [loading, setLoading] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('ingresos')
      .select('id, numero_recibo, placa, concepto, monto, moneda, metodo_pago, referencia, fecha_pago, estado, tasa_cambio, monto_bs, clientes(nombre, cedula_rif)')
      .gte('fecha_pago', fechaDesde)
      .lte('fecha_pago', fechaHasta)
      .neq('estado', 'anulado')
      .order('concepto')
      .order('fecha_pago')

    if (estado) q = q.eq('estado', estado)
    if (moneda) q = q.eq('moneda', moneda)
    if (metodoPago) q = q.eq('metodo_pago', metodoPago)

    const { data } = await q
    setIngresos((data ?? []) as unknown as Ingreso[])
    setLoading(false)
  }, [fechaDesde, fechaHasta, estado, moneda, metodoPago])

  useEffect(() => { cargar() }, [cargar])

  // Agrupar por concepto
  const grupos: Record<string, Ingreso[]> = {}
  for (const i of ingresos) {
    const k = i.concepto ?? 'Otros'
    if (!grupos[k]) grupos[k] = []
    grupos[k].push(i)
  }

  const totalUSD = ingresos.reduce((s, i) => s + montoUSD(i), 0)
  const totalVES = ingresos.filter(i => i.moneda === 'VES').reduce((s, i) => s + i.monto, 0)
  const hayVES = ingresos.some(i => i.moneda === 'VES')

  function imprimir() {
    const etiquetaDesde = fmtDate(fechaDesde)
    const etiquetaHasta = fmtDate(fechaHasta)
    const etiquetaEst = estado ? (ESTADOS_LABEL[estado] ?? estado) : 'Todos los estados'
    const etiquetaMon = moneda || 'Todas las monedas'
    const etiquetaMet = metodoPago || 'Todos los métodos'

    const filas = Object.entries(grupos).map(([concepto, items]) => {
      const subUSD = items.reduce((s, i) => s + montoUSD(i), 0)
      const subVES = items.filter(i => i.moneda === 'VES').reduce((s, i) => s + i.monto, 0)

      const filasItems = items.map(i => `
        <tr>
          <td class="mono">${escapeHtml(i.numero_recibo)}</td>
          <td>${escapeHtml(i.clientes?.nombre ?? '—')}</td>
          <td class="mono">${escapeHtml(i.placa ?? '—')}</td>
          <td>${escapeHtml(i.metodo_pago ?? '—')}</td>
          <td class="mono">${escapeHtml(i.referencia ?? '—')}</td>
          <td>${fmtDate(i.fecha_pago)}</td>
          <td class="num">${i.moneda !== 'VES' ? fmtUSD(i.monto) : (i.tasa_cambio ? fmtUSD(i.monto / i.tasa_cambio) : '—')}</td>
          ${hayVES ? `<td class="num">${i.moneda === 'VES' ? fmtBS(i.monto) : (i.monto_bs ? fmtBS(i.monto_bs) : '—')}</td>` : ''}
        </tr>`).join('')

      const colspan = hayVES ? 6 : 6

      return `
        <tr class="cat-header">
          <td colspan="${hayVES ? 9 : 8}">${escapeHtml(concepto)}</td>
        </tr>
        ${filasItems}
        <tr class="subtotal">
          <td colspan="${hayVES ? 6 : 6}">Subtotal — ${escapeHtml(concepto)}</td>
          <td class="num">${fmtUSD(subUSD)}</td>
          ${hayVES ? `<td class="num">${subVES > 0 ? fmtBS(subVES) : '—'}</td>` : ''}
        </tr>`
    }).join('')

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Reporte de Ingresos</title>
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
    <div class="report-title">REPORTE DE INGRESOS</div>
    <div class="meta">Período: <span>${escapeHtml(etiquetaDesde)}</span> al <span>${escapeHtml(etiquetaHasta)}</span></div>
    <div class="meta">Estado: <span>${escapeHtml(etiquetaEst)}</span> &nbsp;·&nbsp; Moneda: <span>${escapeHtml(etiquetaMon)}</span></div>
    <div class="meta">Método: <span>${escapeHtml(etiquetaMet)}</span></div>
    <div class="meta" style="margin-top:4px">Generado: ${new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
  </div>
</div>

<div class="summary">
  <div class="summary-item">
    <div class="label">Total registros</div>
    <div class="value">${ingresos.length}</div>
  </div>
  <div class="summary-item">
    <div class="label">Total USD / USDT</div>
    <div class="value">${fmtUSD(totalUSD)}</div>
  </div>
  ${hayVES ? `<div class="summary-item">
    <div class="label">Total VES (Bs.)</div>
    <div class="value">${fmtBS(totalVES)}</div>
  </div>` : ''}
  <div class="summary-item">
    <div class="label">Conceptos</div>
    <div class="value">${Object.keys(grupos).length}</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:120px">N° Recibo</th>
      <th style="width:160px">Cliente</th>
      <th style="width:70px">Placa</th>
      <th style="width:90px">Método pago</th>
      <th style="width:90px">Referencia</th>
      <th style="width:72px">Fecha</th>
      <th class="num" style="width:110px">Monto USD</th>
      ${hayVES ? '<th class="num" style="width:110px">Monto Bs.</th>' : ''}
    </tr>
  </thead>
  <tbody>
    ${filas}
    <tr class="total-row">
      <td colspan="${hayVES ? 6 : 6}">TOTAL GENERAL</td>
      <td class="num">${fmtUSD(totalUSD)}</td>
      ${hayVES ? `<td class="num">${totalVES > 0 ? fmtBS(totalVES) : '—'}</td>` : ''}
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
        <Link href="/ingresos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-oriental-black">Reporte de Ingresos</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Listado por concepto con totales</p>
        </div>
        <button
          onClick={imprimir}
          disabled={loading || ingresos.length === 0}
          className="btn-primary flex items-center gap-2"
        >
          <Printer size={16} />
          Imprimir reporte
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="label">Desde</label>
            <input type="date" className="input" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" className="input" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="select" value={estado} onChange={e => setEstado(e.target.value)}>
              <option value="">Todos</option>
              <option value="pendiente_aprobacion">Pend. Aprobación</option>
              <option value="aprobado">Aprobado</option>
              <option value="enviado_carla">Enviado Carla</option>
              <option value="enviado_deposito">En depósito</option>
              <option value="depositado">Depositado</option>
              <option value="entregado_carla">Entregado Carla</option>
              <option value="reportado_vehimotors">Vehimotors</option>
              <option value="rechazado">Rechazado</option>
            </select>
          </div>
          <div>
            <label className="label">Moneda</label>
            <select className="select" value={moneda} onChange={e => setMoneda(e.target.value)}>
              <option value="">Todas</option>
              <option value="USD">USD</option>
              <option value="USDT">USDT</option>
              <option value="VES">VES (Bs.)</option>
            </select>
          </div>
          <div>
            <label className="label">Método de pago</label>
            <select className="select" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
              <option value="">Todos los métodos</option>
              {METODOS_PAGO.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Resumen */}
      {!loading && ingresos.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-xs text-oriental-gray uppercase tracking-wider mb-1">Registros</p>
            <p className="text-2xl font-bold text-oriental-black">{ingresos.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-oriental-gray uppercase tracking-wider mb-1">Total USD / USDT</p>
            <p className="text-2xl font-bold text-oriental-black">{fmtUSD(totalUSD)}</p>
          </div>
          {hayVES && (
            <div className="card p-4">
              <p className="text-xs text-oriental-gray uppercase tracking-wider mb-1">Total VES</p>
              <p className="text-2xl font-bold text-oriental-black">{fmtBS(totalVES)}</p>
            </div>
          )}
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="card p-12 text-center text-oriental-gray text-sm">Cargando...</div>
      ) : ingresos.length === 0 ? (
        <div className="card p-12 text-center">
          <Search size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-oriental-gray text-sm">No hay ingresos en el período seleccionado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grupos).map(([concepto, items]) => {
            const subUSD = items.reduce((s, i) => s + montoUSD(i), 0)
            const subVES = items.filter(i => i.moneda === 'VES').reduce((s, i) => s + i.monto, 0)
            return (
              <div key={concepto} className="card overflow-hidden">
                <div className="px-4 py-2.5 bg-oriental-bg border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-oriental-black">{concepto}</h3>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-semibold text-oriental-black">{fmtUSD(subUSD)}</span>
                    {subVES > 0 && <span className="font-semibold text-oriental-black">{fmtBS(subVES)}</span>}
                    <span className="text-oriental-gray">({items.length})</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">N° Recibo</th>
                        <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Cliente</th>
                        <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Placa</th>
                        <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Método</th>
                        <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Referencia</th>
                        <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Fecha</th>
                        <th className="text-right px-4 py-2 font-medium text-oriental-gray text-xs">Monto</th>
                        <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {items.map(i => (
                        <tr key={i.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-xs text-oriental-gray">{i.numero_recibo}</td>
                          <td className="px-4 py-2.5">
                            <p className="text-oriental-black text-sm">{i.clientes?.nombre ?? '—'}</p>
                            {i.clientes?.cedula_rif && <p className="text-xs text-oriental-gray font-mono">{i.clientes.cedula_rif}</p>}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{i.placa ?? '—'}</span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-oriental-gray">{i.metodo_pago ?? '—'}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-oriental-gray">{i.referencia ?? '—'}</td>
                          <td className="px-4 py-2.5 text-xs text-oriental-gray whitespace-nowrap">{formatDate(i.fecha_pago)}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-oriental-black whitespace-nowrap">
                            {i.moneda === 'VES'
                              ? <span>
                                  {i.tasa_cambio ? <span className="block text-sm">{fmtUSD(i.monto / i.tasa_cambio)}</span> : null}
                                  <span className="block text-xs font-normal text-oriental-gray">{fmtBS(i.monto)}</span>
                                </span>
                              : <span>
                                  <span className="block text-sm">{fmtUSD(i.monto)}</span>
                                  {i.monto_bs ? <span className="block text-xs font-normal text-oriental-gray">{fmtBS(i.monto_bs)}</span> : null}
                                </span>
                            }
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs font-medium text-oriental-gray">{ESTADOS_LABEL[i.estado] ?? i.estado}</span>
                          </td>
                        </tr>
                      ))}
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
              <span className="font-bold text-lg">{fmtUSD(totalUSD)}</span>
              {hayVES && <span className="font-bold text-lg">{fmtBS(totalVES)}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
