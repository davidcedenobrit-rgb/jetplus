'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, CATEGORIAS_EGRESO_LABEL } from '@/lib/utils'
import {
  TrendingUp, TrendingDown, Wallet, BarChart2, Filter,
  Users, Car, CreditCard, CheckCircle2, AlertCircle, Clock,
  Award, AlertTriangle, DollarSign, Building2, CircleDot,
} from 'lucide-react'

const METODO_LABEL: Record<string, string> = {
  efectivo:         'Efectivo',
  transferencia:    'Transferencia',
  zelle:            'Zelle',
  pago_movil:       'Pago Móvil',
  dolares_efectivo: 'USD Efectivo',
  punto_de_venta:   'Punto de venta',
  cheque:           'Cheque',
  otro:             'Otro',
}

function pct(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

type ClienteCartera = {
  nombre: string; cedula: string; placa: string; creditoId: string
  totalCuotas: number; cuotasPagadas: number; cuotasPendientes: number; cuotasVencidas: number
  montoPagado: number; montoPendiente: number; estadoGeneral: 'pendiente' | 'vencida' | 'pagada'
  tiposCredito?: string[]
}

type FiltroEstado = 'todos' | 'pendiente' | 'vencida' | 'pagada'

function BarRow({ label, value, max, color = 'bg-oriental-red', fmt }: {
  label: string; value: number; max: number; color?: string; fmt: (v: number) => string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-oriental-gray truncate flex-shrink-0" style={{ width: '160px' }}>{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full transition-all`} style={{ width: `${Math.min(100, pct(value, max))}%` }} />
      </div>
      <span className="text-sm font-bold text-oriental-black text-right flex-shrink-0 w-28">{fmt(value)}</span>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, color, isText }: {
  icon: any; label: string; value: number | string; color: string; isText?: boolean
}) {
  const bg: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600', indigo: 'bg-indigo-50 text-indigo-600',
    purple: 'bg-purple-50 text-purple-600', red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600', amber: 'bg-amber-50 text-amber-600',
  }
  const tx: Record<string, string> = {
    blue: 'text-blue-700', indigo: 'text-indigo-700', purple: 'text-purple-700',
    red: 'text-oriental-red', green: 'text-green-700', amber: 'text-amber-700',
  }
  return (
    <div className="card p-5">
      <div className={`w-10 h-10 rounded-xl ${bg[color]} flex items-center justify-center mb-3`}>
        <Icon size={20} />
      </div>
      <p className={`${isText ? 'text-xl' : 'text-3xl'} font-extrabold ${tx[color]}`}>{value}</p>
      <p className="text-xs text-oriental-gray mt-1">{label}</p>
    </div>
  )
}

function StatCard({ value, label, sub, bg, textColor, subColor }: {
  value: number; label: string; sub?: string; bg: string; textColor: string; subColor?: string
}) {
  return (
    <div className={`${bg} rounded-xl p-4 text-center`}>
      <p className={`text-2xl font-extrabold ${textColor}`}>{value}</p>
      <p className={`text-xs font-semibold ${textColor} mt-0.5`}>{label}</p>
      {sub && <p className={`text-[10px] ${subColor ?? textColor} mt-1 leading-tight`}>{sub}</p>}
    </div>
  )
}

// ── Helpers de impresión ──────────────────────────────────────────────────────

function generarPrintHtml(lista: ClienteCartera[], filtroLabel: string, subtitulo: string, fecha: string, base: string, mostrarTipos = false) {
  const fmt = (n: number) => 'USD ' + n.toLocaleString('es-VE', { minimumFractionDigits: 2 })
  const estadoBadge = (e: string) =>
    e === 'vencida'   ? `<span style="background:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:700">Vencido</span>`
    : e === 'pendiente' ? `<span style="background:#fef9c3;color:#92400e;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:700">Pendiente</span>`
    : `<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:700">Al día</span>`
  const tipoBadge = (t: string) =>
    t === 'inicial_la_oriental' ? `<span style="background:#ede9fe;color:#6d28d9;padding:1px 5px;border-radius:4px;font-size:10px;font-weight:700">La Oriental</span>`
    : t === 'financiamiento_vehimotors' ? `<span style="background:#e0e7ff;color:#3730a3;padding:1px 5px;border-radius:4px;font-size:10px;font-weight:700">Vehimotors</span>`
    : ''
  const filas = lista.map((c, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">
      <td style="padding:9px 11px;border-bottom:1px solid #e5e7eb">${i + 1}</td>
      <td style="padding:9px 11px;border-bottom:1px solid #e5e7eb;font-weight:600">${c.nombre}${mostrarTipos && c.tiposCredito ? '<br><span style="display:flex;gap:3px;margin-top:3px">' + c.tiposCredito.map(tipoBadge).join('') + '</span>' : ''}</td>
      <td style="padding:9px 11px;border-bottom:1px solid #e5e7eb;color:#6b7280">${c.cedula}</td>
      <td style="padding:9px 11px;border-bottom:1px solid #e5e7eb"><span style="font-family:monospace;background:#f3f4f6;padding:2px 6px;border-radius:4px;font-weight:700">${c.placa}</span></td>
      <td style="padding:9px 11px;border-bottom:1px solid #e5e7eb;text-align:center">${c.cuotasPagadas}/${c.totalCuotas}</td>
      <td style="padding:9px 11px;border-bottom:1px solid #e5e7eb;text-align:right;color:#166534;font-weight:700">${fmt(c.montoPagado)}</td>
      <td style="padding:9px 11px;border-bottom:1px solid #e5e7eb;text-align:right;color:#b91c1c;font-weight:700">${fmt(c.montoPendiente)}</td>
      <td style="padding:9px 11px;border-bottom:1px solid #e5e7eb">${estadoBadge(c.estadoGeneral)}</td>
    </tr>`).join('')
  const totalCobrado = fmt(lista.reduce((s, c) => s + c.montoPagado, 0))
  const totalPendiente = fmt(lista.reduce((s, c) => s + c.montoPendiente, 0))
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>${subtitulo} — ${filtroLabel}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:'Segoe UI',system-ui,sans-serif; color:#111; padding:32px; font-size:13px; }
      @media print { @page { margin:1.5cm; size:A4 landscape; } body { padding:0; } .no-print { display:none; } * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; } }
      .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:3px solid #E8001D; padding-bottom:14px; }
      .header-left { display:flex; align-items:center; gap:14px; }
      .header-logo { height:54px; object-fit:contain; }
      .header-text h1 { font-size:18px; font-weight:800; color:#111; }
      .header-text .sub { color:#6b7280; font-size:11px; margin-top:3px; }
      table { width:100%; border-collapse:collapse; font-size:12px; margin-top:4px; }
      th { background:#111111; color:#fff; padding:9px 11px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.05em; }
      th:nth-child(5),th:nth-child(6),th:nth-child(7) { text-align:right; }
      .totales { margin-top:14px; display:flex; gap:16px; }
      .tot-card { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:10px 14px; }
      .tot-label { font-size:10px; color:#6b7280; margin-bottom:2px; text-transform:uppercase; letter-spacing:.04em; }
      .tot-val { font-size:15px; font-weight:800; color:#111; }
      .footer { margin-top:48px; display:flex; align-items:flex-end; justify-content:space-between; }
      .sello-wrap { display:flex; flex-direction:column; align-items:center; gap:6px; }
      .sello-img { width:90px; height:90px; object-fit:contain; opacity:.9; }
      .firmas { display:flex; gap:56px; }
      .firma { text-align:center; }
      .firma-line { width:180px; height:1px; background:#111; margin-bottom:6px; }
      .firma-label { font-size:11px; font-weight:700; color:#111; }
      .firma-sub { font-size:10px; color:#6b7280; margin-top:2px; }
    </style></head><body>
    <div class="header">
      <div class="header-left">
        <img src="${base}/logo-la-oriental.jpg" class="header-logo" alt="Logo" />
        <div class="header-text">
          <h1>La Oriental Automotors MG &amp; MAXUS</h1>
          <p class="sub">${subtitulo} — ${filtroLabel}</p>
          <p class="sub">Fecha: ${fecha} &nbsp;·&nbsp; Para: José · Carla · Carlos</p>
        </div>
      </div>
      <button class="no-print" onclick="window.print()" style="background:#E8001D;color:#fff;border:none;padding:8px 20px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;flex-shrink:0">🖨 Imprimir</button>
    </div>
    <table>
      <thead><tr>
        <th>#</th><th>Cliente</th><th>Cédula / RIF</th><th>Placa</th>
        <th style="text-align:center">Cuotas</th>
        <th style="text-align:right">Cobrado</th>
        <th style="text-align:right">Pendiente</th>
        <th>Estado</th>
      </tr></thead>
      <tbody>${filas}</tbody>
    </table>
    <div class="totales">
      <div class="tot-card"><div class="tot-label">Total cobrado</div><div class="tot-val" style="color:#166534">${totalCobrado}</div></div>
      <div class="tot-card"><div class="tot-label">Total pendiente</div><div class="tot-val" style="color:#b91c1c">${totalPendiente}</div></div>
      <div class="tot-card"><div class="tot-label">Clientes en lista</div><div class="tot-val">${lista.length}</div></div>
    </div>
    <div class="footer">
      <div class="sello-wrap">
        <img src="${base}/sello-la-oriental.jpeg" class="sello-img" alt="Sello" />
      </div>
      <div class="firmas">
        <div class="firma"><div class="firma-line"></div><p class="firma-label">Firma del Director</p><p class="firma-sub">La Oriental Automotors</p></div>
        <div class="firma"><div class="firma-line"></div><p class="firma-label">Firma del Responsable</p><p class="firma-sub">Responsable</p></div>
      </div>
    </div>
  </body></html>`
}

function abrirPrint(html: string) {
  const win = window.open('', '_blank', 'width=1100,height=750')
  win?.document.write(html)
  win?.document.close()
}

function ListaClientesBlock({
  lista, filtro, setFiltro, subtituloImprimir, mostrarTipos = false
}: {
  lista: ClienteCartera[]; filtro: FiltroEstado; setFiltro: (f: FiltroEstado) => void
  subtituloImprimir: string; mostrarTipos?: boolean
}) {
  if (lista.length === 0) return null
  const listaFiltrada = filtro === 'todos' ? lista : lista.filter(c => c.estadoGeneral === filtro)
  const cnt = (f: FiltroEstado) => f === 'todos' ? lista.length : lista.filter(c => c.estadoGeneral === f).length
  const filtros: { key: FiltroEstado; label: string; activeClass: string }[] = [
    { key: 'todos',     label: `Todos (${cnt('todos')})`,                  activeClass: 'bg-oriental-black text-white border-oriental-black' },
    { key: 'pendiente', label: `Pendientes (${cnt('pendiente')})`,          activeClass: 'bg-yellow-500 text-white border-yellow-500' },
    { key: 'vencida',   label: `Vencidos (${cnt('vencida')})`,              activeClass: 'bg-red-600 text-white border-red-600' },
    { key: 'pagada',    label: `Al día (${cnt('pagada')})`,                 activeClass: 'bg-green-600 text-white border-green-600' },
  ]
  return (
    <div className="border-t border-gray-100 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Users size={15} className="text-oriental-gray" />
          <p className="text-xs font-bold text-oriental-gray uppercase tracking-wider">Listado de clientes</p>
          {filtros.map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${filtro === f.key ? f.activeClass : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            const fecha = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })
            const filtroLabel = filtro === 'todos' ? 'Todos los clientes' : filtro === 'pendiente' ? 'Clientes con cuotas pendientes' : filtro === 'vencida' ? 'Clientes con cuotas vencidas' : 'Clientes al día'
            abrirPrint(generarPrintHtml(listaFiltrada, filtroLabel, subtituloImprimir, fecha, window.location.origin, mostrarTipos))
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-oriental-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
          Imprimir listado
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-oriental-gray uppercase tracking-wider">Cliente</th>
              {mostrarTipos && <th className="text-left px-4 py-2.5 text-xs font-semibold text-oriental-gray uppercase tracking-wider">Créditos</th>}
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-oriental-gray uppercase tracking-wider">Placa</th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-oriental-gray uppercase tracking-wider">Cuotas</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-oriental-gray uppercase tracking-wider">Cobrado</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-oriental-gray uppercase tracking-wider">Pendiente</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-oriental-gray uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {listaFiltrada.map((c, i) => (
              <tr key={c.creditoId} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-oriental-black text-sm">{c.nombre}</p>
                  <p className="text-xs text-oriental-gray">{c.cedula}</p>
                </td>
                {mostrarTipos && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tiposCredito?.map(t => (
                        <span key={t} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t === 'inicial_la_oriental' ? 'bg-purple-100 text-purple-700' : t === 'financiamiento_vehimotors' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                          {t === 'inicial_la_oriental' ? 'La Oriental' : t === 'financiamiento_vehimotors' ? 'Vehimotors' : 'Especial'}
                        </span>
                      ))}
                    </div>
                  </td>
                )}
                <td className="px-4 py-3">
                  <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded font-bold">{c.placa}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm font-medium text-oriental-black">{c.cuotasPagadas}/{c.totalCuotas}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-bold text-green-700">{formatCurrency(c.montoPagado)}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-sm font-bold ${c.montoPendiente > 0 ? 'text-oriental-red' : 'text-green-600'}`}>{formatCurrency(c.montoPendiente)}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${c.estadoGeneral === 'vencida' ? 'bg-red-100 text-red-700' : c.estadoGeneral === 'pendiente' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                    {c.estadoGeneral === 'vencida' ? 'Vencido' : c.estadoGeneral === 'pendiente' ? 'Pendiente' : 'Al día'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ReportesPage() {
  const supabase = createClient()
  const hoy = new Date()
  const hoyStr = hoy.toISOString().split('T')[0]
  const en30 = new Date(hoy); en30.setDate(hoy.getDate() + 30)
  const en30Str = en30.toISOString().split('T')[0]

  const [fechaDesde, setFechaDesde] = useState(`${hoy.getFullYear()}-01-01`)
  const [fechaHasta, setFechaHasta] = useState(hoyStr)
  const [loading, setLoading] = useState(true)

  // ── KPIs globales
  const [totalClientes, setTotalClientes] = useState(0)
  const [totalVehiculos, setTotalVehiculos] = useState(0)
  const [totalFinanciado, setTotalFinanciado] = useState(0)
  const [totalSaldoPendiente, setTotalSaldoPendiente] = useState(0)

  // ── Cuotas
  const [cntPagadas, setCntPagadas] = useState(0)
  const [cntPendientes, setCntPendientes] = useState(0)
  const [cntVencidas, setCntVencidas] = useState(0)
  const [cntAbono, setCntAbono] = useState(0)
  const [cntProximas, setCntProximas] = useState(0)
  const [montoPagadoTotal, setMontoPagadoTotal] = useState(0)
  const [montoVencidoTotal, setMontoVencidoTotal] = useState(0)

  // ── Vehimotors
  const [vhPagadas, setVhPagadas] = useState(0)
  const [vhPendientes, setVhPendientes] = useState(0)
  const [vhVencidas, setVhVencidas] = useState(0)
  const [vhMontoPagado, setVhMontoPagado] = useState(0)
  const [vhMontoPendiente, setVhMontoPendiente] = useState(0)

  // ── La Oriental (créditos de inicial)
  const [orPagadas, setOrPagadas] = useState(0)
  const [orPendientes, setOrPendientes] = useState(0)
  const [orVencidas, setOrVencidas] = useState(0)
  const [orMontoPagado, setOrMontoPagado] = useState(0)
  const [orMontoPendiente, setOrMontoPendiente] = useState(0)
  const [orFiltro, setOrFiltro] = useState<FiltroEstado>('todos')
  const [orClienteList, setOrClienteList] = useState<ClienteCartera[]>([])
  const [vhFiltro, setVhFiltro] = useState<FiltroEstado>('todos')
  const [vhClienteList, setVhClienteList] = useState<ClienteCartera[]>([])
  const [generalFiltro, setGeneralFiltro] = useState<FiltroEstado>('todos')
  const [generalClienteList, setGeneralClienteList] = useState<ClienteCartera[]>([])

  // ── Deudores / Pagadores
  const [topDeudores, setTopDeudores] = useState<{ nombre: string; cedula: string; saldo: number; creditos: number }[]>([])
  const [topPagadores, setTopPagadores] = useState<{ nombre: string; cedula: string; pagadas: number; total: number }[]>([])

  // ── Ventas
  const [modelosTop, setModelosTop] = useState<[string, number][]>([])
  const [marcaDist, setMarcaDist] = useState({ MG: 0, MAXUS: 0 })
  const [tipoDist, setTipoDist] = useState({ contado: 0, financiado: 0 })

  // ── Flujo de caja (con filtro fecha)
  const [totalIngresos, setTotalIngresos] = useState(0)
  const [totalEgresos, setTotalEgresos] = useState(0)
  const [cntIngAprobados, setCntIngAprobados] = useState(0)
  const [cntEgrAprobados, setCntEgrAprobados] = useState(0)
  const [cntIngPendientes, setCntIngPendientes] = useState(0)
  const [cntEgrPendientes, setCntEgrPendientes] = useState(0)
  const [metodoPagoMap, setMetodoPagoMap] = useState<[string, number][]>([])
  const [catMap, setCatMap] = useState<[string, number][]>([])
  const [mesesIngresos, setMesesIngresos] = useState<Record<string, number>>({})
  const [mesesEgresos, setMesesEgresos] = useState<Record<string, number>>({})

  const cargar = useCallback(async () => {
    setLoading(true)

    const [
      { data: clientesData },
      { data: vehiculosData },
      { data: creditosData },
      { data: cuotasData },
      { data: ingData },
      { data: egrData },
    ] = await Promise.all([
      supabase.from('clientes').select('id').eq('activo', true),
      supabase.from('vehiculos').select('id, marca, modelo, tipo_compra'),
      supabase.from('creditos').select('id, plan_tipo, saldo, monto_financiado, placa, cliente_id, clientes(id, nombre, cedula_rif)'),
      supabase.from('cuotas').select('id, estado, fecha_vencimiento, monto, monto_pagado, credito_id'),
      supabase.from('ingresos').select('id, monto, metodo_pago, estado, fecha_pago')
        .gte('fecha_pago', fechaDesde).lte('fecha_pago', fechaHasta),
      supabase.from('egresos').select('id, monto, categoria, estado, fecha_egreso')
        .gte('fecha_egreso', fechaDesde).lte('fecha_egreso', fechaHasta),
    ])

    // ── KPIs globales
    setTotalClientes(clientesData?.length ?? 0)
    setTotalVehiculos(vehiculosData?.length ?? 0)

    const creditos = creditosData ?? []
    setTotalFinanciado(creditos.reduce((s: number, c: any) => s + Number(c.monto_financiado ?? 0), 0))
    setTotalSaldoPendiente(creditos.reduce((s: number, c: any) => s + Number(c.saldo ?? 0), 0))

    // ── Mapa credito → plan_tipo y cliente
    const creditoPlanMap: Record<string, string> = {}
    const creditoClienteMap: Record<string, { id: string; nombre: string; cedula: string }> = {}
    creditos.forEach((c: any) => {
      creditoPlanMap[c.id] = c.plan_tipo
      if (c.clientes) creditoClienteMap[c.id] = { id: c.clientes.id, nombre: c.clientes.nombre, cedula: c.clientes.cedula_rif }
    })

    // ── Cuotas
    const cuotas = cuotasData ?? []
    const pagadas   = cuotas.filter((c: any) => c.estado === 'pagada')
    const vencidas  = cuotas.filter((c: any) => c.estado === 'vencida')
    const pendientes = cuotas.filter((c: any) => c.estado === 'pendiente')
    const abono     = cuotas.filter((c: any) => c.estado === 'abono_parcial')
    const proximas  = pendientes.filter((c: any) => c.fecha_vencimiento <= en30Str && c.fecha_vencimiento >= hoyStr)

    setCntPagadas(pagadas.length)
    setCntVencidas(vencidas.length)
    setCntPendientes(pendientes.length)
    setCntAbono(abono.length)
    setCntProximas(proximas.length)
    setMontoPagadoTotal(pagadas.reduce((s: number, c: any) => s + Number(c.monto ?? 0), 0))
    setMontoVencidoTotal(vencidas.reduce((s: number, c: any) => s + Math.max(0, Number(c.monto ?? 0) - Number(c.monto_pagado ?? 0)), 0))

    // ── Vehimotors
    const vhCuotas = cuotas.filter((c: any) => creditoPlanMap[c.credito_id] === 'financiamiento_vehimotors')
    const vhPag  = vhCuotas.filter((c: any) => c.estado === 'pagada')
    const vhPend = vhCuotas.filter((c: any) => c.estado === 'pendiente' || c.estado === 'abono_parcial')
    const vhVenc = vhCuotas.filter((c: any) => c.estado === 'vencida')
    setVhPagadas(vhPag.length)
    setVhPendientes(vhPend.length)
    setVhVencidas(vhVenc.length)
    setVhMontoPagado(vhPag.reduce((s: number, c: any) => s + Number(c.monto ?? 0), 0))
    setVhMontoPendiente([...vhPend, ...vhVenc].reduce((s: number, c: any) =>
      s + Math.max(0, Number(c.monto ?? 0) - Number(c.monto_pagado ?? 0)), 0))

    // ── La Oriental
    const orCreditos = creditos.filter((c: any) => c.plan_tipo === 'inicial_la_oriental')
    const orCreditoIds = new Set(orCreditos.map((c: any) => c.id))
    const orCuotas = cuotas.filter((c: any) => orCreditoIds.has(c.credito_id))
    const orPag  = orCuotas.filter((c: any) => c.estado === 'pagada')
    const orPend = orCuotas.filter((c: any) => c.estado === 'pendiente' || c.estado === 'abono_parcial')
    const orVenc = orCuotas.filter((c: any) => c.estado === 'vencida')
    setOrPagadas(orPag.length)
    setOrPendientes(orPend.length)
    setOrVencidas(orVenc.length)
    setOrMontoPagado(orPag.reduce((s: number, c: any) => s + Number(c.monto ?? 0), 0))
    setOrMontoPendiente([...orPend, ...orVenc].reduce((s: number, c: any) =>
      s + Math.max(0, Number(c.monto ?? 0) - Number(c.monto_pagado ?? 0)), 0))

    // ── Listado de clientes La Oriental por crédito
    const orList: Record<string, any> = {}
    orCreditos.forEach((c: any) => {
      const cl = c.clientes
      if (!cl) return
      const cuotasCred = orCuotas.filter((q: any) => q.credito_id === c.id)
      const cpag  = cuotasCred.filter((q: any) => q.estado === 'pagada')
      const cpend = cuotasCred.filter((q: any) => q.estado === 'pendiente' || q.estado === 'abono_parcial')
      const cvenc = cuotasCred.filter((q: any) => q.estado === 'vencida')
      const estadoGeneral = cvenc.length > 0 ? 'vencida' : cpend.length > 0 ? 'pendiente' : 'pagada'
      orList[c.id] = {
        nombre: cl.nombre, cedula: cl.cedula_rif, placa: c.placa ?? '—', creditoId: c.id,
        totalCuotas: cuotasCred.length,
        cuotasPagadas: cpag.length, cuotasPendientes: cpend.length, cuotasVencidas: cvenc.length,
        montoPagado: cpag.reduce((s: number, q: any) => s + Number(q.monto ?? 0), 0),
        montoPendiente: [...cpend, ...cvenc].reduce((s: number, q: any) =>
          s + Math.max(0, Number(q.monto ?? 0) - Number(q.monto_pagado ?? 0)), 0),
        estadoGeneral,
      }
    })
    setOrClienteList(Object.values(orList))

    // ── Listado clientes Vehimotors
    const vhCreditos2 = creditos.filter((c: any) => c.plan_tipo === 'financiamiento_vehimotors')
    const vhCreditoIds2 = new Set(vhCreditos2.map((c: any) => c.id))
    const vhCuotasAll = cuotas.filter((c: any) => vhCreditoIds2.has(c.credito_id))
    const vhList: Record<string, any> = {}
    vhCreditos2.forEach((c: any) => {
      const cl = c.clientes; if (!cl) return
      const cuotasCred = vhCuotasAll.filter((q: any) => q.credito_id === c.id)
      const cpag  = cuotasCred.filter((q: any) => q.estado === 'pagada')
      const cpend = cuotasCred.filter((q: any) => q.estado === 'pendiente' || q.estado === 'abono_parcial')
      const cvenc = cuotasCred.filter((q: any) => q.estado === 'vencida')
      vhList[c.id] = {
        nombre: cl.nombre, cedula: cl.cedula_rif, placa: c.placa ?? '—', creditoId: c.id,
        totalCuotas: cuotasCred.length,
        cuotasPagadas: cpag.length, cuotasPendientes: cpend.length, cuotasVencidas: cvenc.length,
        montoPagado: cpag.reduce((s: number, q: any) => s + Number(q.monto ?? 0), 0),
        montoPendiente: [...cpend, ...cvenc].reduce((s: number, q: any) =>
          s + Math.max(0, Number(q.monto ?? 0) - Number(q.monto_pagado ?? 0)), 0),
        estadoGeneral: cvenc.length > 0 ? 'vencida' : cpend.length > 0 ? 'pendiente' : 'pagada',
      }
    })
    setVhClienteList(Object.values(vhList))

    // ── Listado general (todos los créditos agrupados por cliente)
    const genMap: Record<string, any> = {}
    creditos.forEach((c: any) => {
      const cl = c.clientes; if (!cl) return
      const cuotasCred = cuotas.filter((q: any) => q.credito_id === c.id)
      const cpag  = cuotasCred.filter((q: any) => q.estado === 'pagada')
      const cpend = cuotasCred.filter((q: any) => q.estado === 'pendiente' || q.estado === 'abono_parcial')
      const cvenc = cuotasCred.filter((q: any) => q.estado === 'vencida')
      if (!genMap[cl.id]) genMap[cl.id] = {
        clienteId: cl.id, nombre: cl.nombre, cedula: cl.cedula_rif, placa: c.placa ?? '—',
        creditoId: c.id, totalCuotas: 0, cuotasPagadas: 0, cuotasPendientes: 0, cuotasVencidas: 0,
        montoPagado: 0, montoPendiente: 0, estadoGeneral: 'pagada', tiposCredito: [],
      }
      genMap[cl.id].totalCuotas    += cuotasCred.length
      genMap[cl.id].cuotasPagadas  += cpag.length
      genMap[cl.id].cuotasPendientes += cpend.length
      genMap[cl.id].cuotasVencidas += cvenc.length
      genMap[cl.id].montoPagado    += cpag.reduce((s: number, q: any) => s + Number(q.monto ?? 0), 0)
      genMap[cl.id].montoPendiente += [...cpend, ...cvenc].reduce((s: number, q: any) =>
        s + Math.max(0, Number(q.monto ?? 0) - Number(q.monto_pagado ?? 0)), 0)
      if (c.plan_tipo && !genMap[cl.id].tiposCredito.includes(c.plan_tipo))
        genMap[cl.id].tiposCredito.push(c.plan_tipo)
    })
    Object.values(genMap).forEach((g: any) => {
      g.estadoGeneral = g.cuotasVencidas > 0 ? 'vencida' : g.cuotasPendientes > 0 ? 'pendiente' : 'pagada'
    })
    setGeneralClienteList(Object.values(genMap))

    // ── Top deudores
    const saldoPorCliente: Record<string, { nombre: string; cedula: string; saldo: number; creditos: number }> = {}
    creditos.forEach((c: any) => {
      const cl = c.clientes
      if (!cl || Number(c.saldo ?? 0) <= 0) return
      if (!saldoPorCliente[cl.id]) saldoPorCliente[cl.id] = { nombre: cl.nombre, cedula: cl.cedula_rif, saldo: 0, creditos: 0 }
      saldoPorCliente[cl.id].saldo += Number(c.saldo ?? 0)
      saldoPorCliente[cl.id].creditos += 1
    })
    setTopDeudores(Object.values(saldoPorCliente).sort((a, b) => b.saldo - a.saldo).slice(0, 8))

    // ── Mejores pagadores
    const pagadoresPorCliente: Record<string, { nombre: string; cedula: string; pagadas: number; total: number }> = {}
    cuotas.forEach((c: any) => {
      const cl = creditoClienteMap[c.credito_id]
      if (!cl) return
      if (!pagadoresPorCliente[cl.id]) pagadoresPorCliente[cl.id] = { nombre: cl.nombre, cedula: cl.cedula, pagadas: 0, total: 0 }
      pagadoresPorCliente[cl.id].total += 1
      if (c.estado === 'pagada') pagadoresPorCliente[cl.id].pagadas += 1
    })
    setTopPagadores(
      Object.values(pagadoresPorCliente)
        .filter(p => p.total > 0)
        .sort((a, b) => pct(b.pagadas, b.total) - pct(a.pagadas, a.total) || b.pagadas - a.pagadas)
        .slice(0, 8)
    )

    // ── Modelos / marcas
    const modeloCnt: Record<string, number> = {}
    const marcaCnt = { MG: 0, MAXUS: 0 }
    const tipoCnt  = { contado: 0, financiado: 0 }
    vehiculosData?.forEach((v: any) => {
      const key = `${v.marca} ${v.modelo}`
      modeloCnt[key] = (modeloCnt[key] ?? 0) + 1
      if (v.marca === 'MG') marcaCnt.MG += 1
      else if (v.marca === 'MAXUS') marcaCnt.MAXUS += 1
      if (v.tipo_compra === 'contado') tipoCnt.contado += 1
      else if (v.tipo_compra === 'financiado') tipoCnt.financiado += 1
    })
    setModelosTop(Object.entries(modeloCnt).sort((a, b) => b[1] - a[1]).slice(0, 10))
    setMarcaDist(marcaCnt)
    setTipoDist(tipoCnt)

    // ── Flujo de caja (filtrado por fecha)
    const ingAprobados = ingData?.filter(i => i.estado === 'aprobado') ?? []
    const egrAprobados = egrData?.filter(e => e.estado === 'aprobado') ?? []

    setTotalIngresos(ingAprobados.reduce((s, i) => s + Number(i.monto), 0))
    setTotalEgresos(egrAprobados.reduce((s, e) => s + Number(e.monto), 0))
    setCntIngAprobados(ingAprobados.length)
    setCntEgrAprobados(egrAprobados.length)
    setCntIngPendientes(ingData?.filter(i => i.estado === 'pendiente_aprobacion').length ?? 0)
    setCntEgrPendientes(egrData?.filter(e => e.estado === 'pendiente_aprobacion').length ?? 0)

    const metodos: Record<string, number> = {}
    ingAprobados.forEach(i => {
      const m = i.metodo_pago ?? 'otro'
      metodos[m] = (metodos[m] ?? 0) + Number(i.monto)
    })
    setMetodoPagoMap(Object.entries(metodos).sort((a, b) => b[1] - a[1]))

    const cats: Record<string, number> = {}
    egrAprobados.forEach(e => { cats[e.categoria] = (cats[e.categoria] ?? 0) + Number(e.monto) })
    setCatMap(Object.entries(cats).sort((a, b) => b[1] - a[1]))

    const mi: Record<string, number> = {}
    const me: Record<string, number> = {}
    ingAprobados.forEach(i => {
      const mes = new Date(i.fecha_pago + 'T12:00:00').toLocaleDateString('es-VE', { month: 'short', year: '2-digit' })
      mi[mes] = (mi[mes] ?? 0) + Number(i.monto)
    })
    egrAprobados.forEach(e => {
      const mes = new Date(e.fecha_egreso + 'T12:00:00').toLocaleDateString('es-VE', { month: 'short', year: '2-digit' })
      me[mes] = (me[mes] ?? 0) + Number(e.monto)
    })
    setMesesIngresos(mi)
    setMesesEgresos(me)

    setLoading(false)
  }, [fechaDesde, fechaHasta])

  useEffect(() => { cargar() }, [cargar])

  const balance = totalIngresos - totalEgresos
  const totalCuotas = cntPagadas + cntVencidas + cntPendientes + cntAbono
  const maxMes = Math.max(...Object.values(mesesIngresos), ...Object.values(mesesEgresos), 1)

  function setPreset(tipo: 'hoy' | 'semana' | 'mes' | 'anio') {
    const h = new Date()
    if (tipo === 'hoy') { setFechaDesde(h.toISOString().split('T')[0]); setFechaHasta(h.toISOString().split('T')[0]) }
    else if (tipo === 'semana') { const d = new Date(h); d.setDate(h.getDate() - 7); setFechaDesde(d.toISOString().split('T')[0]); setFechaHasta(h.toISOString().split('T')[0]) }
    else if (tipo === 'mes') { const d = new Date(h.getFullYear(), h.getMonth(), 1); setFechaDesde(d.toISOString().split('T')[0]); setFechaHasta(h.toISOString().split('T')[0]) }
    else { setFechaDesde(`${h.getFullYear()}-01-01`); setFechaHasta(h.toISOString().split('T')[0]) }
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-oriental-black">Reportes</h1>
        <p className="text-oriental-gray text-sm mt-1">Vista completa del sistema — cartera, ventas y flujo de caja</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-oriental-gray">
          <div className="w-8 h-8 border-2 border-oriental-red border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Cargando estadísticas...
        </div>
      ) : (
        <div className="space-y-8">

          {/* ══ 1. KPIs GLOBALES ══════════════════════════════════════════ */}
          <section>
            <SectionTitle>Resumen global del sistema</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard icon={Users}       label="Clientes activos"      value={totalClientes}                           color="blue"   />
              <KpiCard icon={Car}         label="Vehículos registrados" value={totalVehiculos}                          color="indigo" />
              <KpiCard icon={CreditCard}  label="Total financiado"      value={formatCurrency(totalFinanciado)}         color="purple" isText />
              <KpiCard icon={AlertCircle} label="Saldo por cobrar"      value={formatCurrency(totalSaldoPendiente)}     color="red"    isText />
            </div>
          </section>

          {/* ══ 2. ESTADO DE CUOTAS ═══════════════════════════════════════ */}
          <section>
            <SectionTitle>Estado de la cartera de cuotas</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <StatCard value={cntPagadas}    label="Pagadas"           sub={formatCurrency(montoPagadoTotal)}       bg="bg-green-50"  textColor="text-green-700"  subColor="text-green-600" />
              <StatCard value={cntPendientes} label="Pendientes"        sub={`${cntProximas} vencen en 30 días`}    bg="bg-yellow-50" textColor="text-yellow-700" subColor="text-yellow-600" />
              <StatCard value={cntVencidas}   label="Vencidas"          sub={formatCurrency(montoVencidoTotal)}     bg="bg-red-50"    textColor="text-red-700"    subColor="text-red-500" />
              <StatCard value={cntAbono}      label="Abono parcial"                                                  bg="bg-orange-50" textColor="text-orange-700" />
              <StatCard value={cntProximas}   label="Próx. a vencer"   sub="en los próximos 30 días"               bg="bg-amber-50"  textColor="text-amber-700"  subColor="text-amber-600" />
            </div>
            {/* Barra visual del estado */}
            {totalCuotas > 0 && (
              <div className="card p-4">
                <p className="text-xs text-oriental-gray mb-2 font-semibold">Distribución de cuotas ({totalCuotas} total)</p>
                <div className="flex h-4 rounded-full overflow-hidden gap-px">
                  {cntPagadas > 0    && <div className="bg-green-500"  style={{ width: `${pct(cntPagadas, totalCuotas)}%`    }} title={`Pagadas: ${cntPagadas}`} />}
                  {cntPendientes > 0 && <div className="bg-yellow-400" style={{ width: `${pct(cntPendientes, totalCuotas)}%` }} title={`Pendientes: ${cntPendientes}`} />}
                  {cntAbono > 0      && <div className="bg-orange-400" style={{ width: `${pct(cntAbono, totalCuotas)}%`      }} title={`Abono: ${cntAbono}`} />}
                  {cntVencidas > 0   && <div className="bg-red-500"    style={{ width: `${pct(cntVencidas, totalCuotas)}%`   }} title={`Vencidas: ${cntVencidas}`} />}
                </div>
                <div className="flex gap-4 mt-2 flex-wrap">
                  {[
                    { label: 'Pagadas', cnt: cntPagadas,    color: 'bg-green-500'  },
                    { label: 'Pendientes', cnt: cntPendientes, color: 'bg-yellow-400' },
                    { label: 'Abono parcial', cnt: cntAbono, color: 'bg-orange-400' },
                    { label: 'Vencidas', cnt: cntVencidas,  color: 'bg-red-500'    },
                  ].filter(i => i.cnt > 0).map(item => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
                      <span className="text-xs text-oriental-gray">{item.label} <span className="font-bold text-oriental-black">{item.cnt}</span> ({pct(item.cnt, totalCuotas)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ══ 3. CARTERA VEHIMOTORS ═════════════════════════════════════ */}
          <section>
            <SectionTitle>Cartera Vehimotors — financiamiento externo</SectionTitle>
            <div className="card p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                  <CheckCircle2 size={20} className="text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-700">{vhPagadas}</p>
                  <p className="text-xs text-green-600 font-semibold">Cuotas ya pagadas a Vehimotors</p>
                  <p className="text-sm font-bold text-green-800 mt-1">{formatCurrency(vhMontoPagado)}</p>
                </div>
                <div className="bg-yellow-50 rounded-xl p-4 text-center border border-yellow-100">
                  <Clock size={20} className="text-yellow-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-yellow-700">{vhPendientes}</p>
                  <p className="text-xs text-yellow-600 font-semibold">Cuotas pendientes de cobro</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center border border-red-100">
                  <AlertCircle size={20} className="text-red-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-700">{vhVencidas}</p>
                  <p className="text-xs text-red-600 font-semibold">Cuotas vencidas</p>
                  <p className="text-sm font-bold text-red-800 mt-1">Monto: {formatCurrency(vhMontoPendiente)}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                  <p className="text-xs text-indigo-600 font-semibold">Total remitido a Vehimotors</p>
                  <p className="text-xl font-bold text-indigo-800">{formatCurrency(vhMontoPagado)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                  <p className="text-xs text-red-600 font-semibold">Pendiente de remitir a Vehimotors</p>
                  <p className="text-xl font-bold text-red-800">{formatCurrency(vhMontoPendiente)}</p>
                  <p className="text-[10px] text-red-500">{vhPendientes + vhVencidas} cuotas por cobrar</p>
                </div>
              </div>
              <ListaClientesBlock
                lista={vhClienteList} filtro={vhFiltro} setFiltro={setVhFiltro}
                subtituloImprimir="Reporte Cartera Vehimotors"
              />
            </div>
          </section>

          {/* ══ 4. CARTERA LA ORIENTAL ════════════════════════════════════ */}
          <section>
            <SectionTitle>Cartera La Oriental — financiamiento interno</SectionTitle>
            <div className="card p-6 space-y-5">

              {/* KPIs de cuotas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                  <CheckCircle2 size={20} className="text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-700">{orPagadas}</p>
                  <p className="text-xs text-green-600 font-semibold">Cuotas cobradas a clientes</p>
                  <p className="text-sm font-bold text-green-800 mt-1">{formatCurrency(orMontoPagado)}</p>
                </div>
                <div className="bg-yellow-50 rounded-xl p-4 text-center border border-yellow-100">
                  <Clock size={20} className="text-yellow-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-yellow-700">{orPendientes}</p>
                  <p className="text-xs text-yellow-600 font-semibold">Cuotas pendientes de cobro</p>
                  <p className="text-sm font-bold text-yellow-800 mt-1">{formatCurrency(orMontoPendiente)}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center border border-red-100">
                  <AlertCircle size={20} className="text-red-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-700">{orVencidas}</p>
                  <p className="text-xs text-red-600 font-semibold">Cuotas vencidas</p>
                  <p className="text-sm font-bold text-red-800 mt-1">{orVencidas > 0 ? 'Requieren gestión' : 'Sin vencidas'}</p>
                </div>
              </div>

              {/* Resumen para directores */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 size={15} className="text-purple-500" />
                  <p className="text-xs font-bold text-oriental-gray uppercase tracking-wider">Reporte a Directores La Oriental</p>
                  <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">José · Carla · Carlos</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                    <p className="text-xs text-purple-600 font-semibold mb-1">✓ Ya cobrado — listo para reportar</p>
                    <p className="text-2xl font-extrabold text-purple-800">{formatCurrency(orMontoPagado)}</p>
                    <p className="text-[11px] text-purple-500 mt-1">{orPagadas} cuota{orPagadas !== 1 ? 's' : ''} recibida{orPagadas !== 1 ? 's' : ''} de clientes</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                    <p className="text-xs text-amber-600 font-semibold mb-1">⏳ Pendiente por cobrar a clientes</p>
                    <p className="text-2xl font-extrabold text-amber-800">{formatCurrency(orMontoPendiente)}</p>
                    <p className="text-[11px] text-amber-500 mt-1">{orPendientes + orVencidas} cuota{(orPendientes + orVencidas) !== 1 ? 's' : ''} sin cobrar</p>
                  </div>
                </div>
              </div>

              <ListaClientesBlock
                lista={orClienteList} filtro={orFiltro} setFiltro={setOrFiltro}
                subtituloImprimir="Reporte Cartera La Oriental"
              />
              {orClienteList.length === 0 && !loading && (
                <p className="text-center text-sm text-oriental-gray py-4 border-t border-gray-100">No hay créditos de La Oriental registrados</p>
              )}
            </div>
          </section>

          {/* ══ 5. LISTADO GENERAL ════════════════════════════════════════ */}
          <section>
            <SectionTitle>Listado general de clientes — todos los créditos</SectionTitle>
            <div className="card p-6">
              <p className="text-sm text-oriental-gray mb-4">Vista consolidada: cada cliente aparece una sola vez con el total de todos sus créditos (La Oriental + Vehimotors). El estado refleja el peor estatus activo.</p>
              <ListaClientesBlock
                lista={generalClienteList} filtro={generalFiltro} setFiltro={setGeneralFiltro}
                subtituloImprimir="Reporte General de Clientes"
                mostrarTipos
              />
              {generalClienteList.length === 0 && !loading && (
                <p className="text-center text-sm text-oriental-gray py-6">No hay clientes registrados</p>
              )}
            </div>
          </section>

          {/* ══ 6. DEUDORES Y PAGADORES ═══════════════════════════════════ */}
          <section>
            <SectionTitle>Clientes — análisis de pago</SectionTitle>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top deudores */}
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-5">
                  <AlertTriangle size={18} className="text-red-500" />
                  <h2 className="font-bold text-oriental-black">Mayor saldo pendiente</h2>
                </div>
                {topDeudores.length === 0
                  ? <p className="text-oriental-gray text-sm text-center py-6">Sin deudores activos</p>
                  : (
                  <div className="space-y-3">
                    {topDeudores.map((d, i) => (
                      <div key={d.cedula + i} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          i === 0 ? 'bg-red-100 text-red-700' : i <= 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                        }`}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-oriental-black truncate">{d.nombre}</p>
                          <p className="text-xs text-oriental-gray">{d.cedula} · {d.creditos} crédito{d.creditos !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-oriental-red text-sm">{formatCurrency(d.saldo)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mejores pagadores */}
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Award size={18} className="text-green-500" />
                  <h2 className="font-bold text-oriental-black">Mejores pagadores</h2>
                </div>
                {topPagadores.length === 0
                  ? <p className="text-oriental-gray text-sm text-center py-6">Sin datos</p>
                  : (
                  <div className="space-y-3">
                    {topPagadores.map((p, i) => {
                      const ratio = pct(p.pagadas, p.total)
                      return (
                        <div key={p.cedula + i} className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            i === 0 ? 'bg-green-100 text-green-700' : i <= 2 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          }`}>{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-oriental-black truncate">{p.nombre}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${ratio}%` }} />
                              </div>
                              <span className="text-[10px] text-oriental-gray flex-shrink-0">{p.pagadas}/{p.total}</span>
                            </div>
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                            ratio >= 75 ? 'bg-green-100 text-green-700' : ratio >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                          }`}>{ratio}%</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ══ 6. VENTAS Y VEHÍCULOS ═════════════════════════════════════ */}
          <section>
            <SectionTitle>Ventas — análisis de vehículos</SectionTitle>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Modelos más vendidos */}
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Car size={18} className="text-oriental-gray" />
                  <h2 className="font-bold text-oriental-black">Modelos más vendidos</h2>
                </div>
                <div className="space-y-2.5">
                  {modelosTop.length === 0
                    ? <p className="text-oriental-gray text-sm text-center py-4">Sin datos</p>
                    : modelosTop.map(([modelo, cnt]) => (
                      <BarRow key={modelo} label={modelo} value={cnt} max={modelosTop[0]?.[1] ?? 1} color="bg-oriental-red" fmt={v => `${v} unidad${v !== 1 ? 'es' : ''}`} />
                    ))
                  }
                </div>
              </div>

              {/* Distribución */}
              <div className="space-y-4">
                <div className="card p-6">
                  <h2 className="font-bold text-oriental-black mb-4">Distribución por marca</h2>
                  <div className="space-y-3">
                    {(['MG', 'MAXUS'] as const).map(marca => (
                      <div key={marca} className="flex items-center gap-3">
                        <span className="text-sm font-bold text-oriental-black w-16">{marca}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                          <div
                            className={`${marca === 'MG' ? 'bg-oriental-red' : 'bg-indigo-500'} h-4 rounded-full flex items-center justify-end pr-2 transition-all`}
                            style={{ width: `${pct(marcaDist[marca], totalVehiculos)}%` }}
                          >
                            {pct(marcaDist[marca], totalVehiculos) >= 15 && (
                              <span className="text-[10px] text-white font-bold">{pct(marcaDist[marca], totalVehiculos)}%</span>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-bold text-oriental-black w-20 text-right">{marcaDist[marca]} unid.</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card p-6">
                  <h2 className="font-bold text-oriental-black mb-4">Tipo de compra</h2>
                  <div className="space-y-3">
                    {[
                      { key: 'contado' as const,    label: 'Contado',    color: 'bg-green-500'  },
                      { key: 'financiado' as const, label: 'Financiado', color: 'bg-purple-500' },
                    ].map(({ key, label, color }) => (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-sm text-oriental-gray w-24">{label}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                          <div
                            className={`${color} h-4 rounded-full flex items-center justify-end pr-2 transition-all`}
                            style={{ width: `${pct(tipoDist[key], totalVehiculos)}%` }}
                          >
                            {pct(tipoDist[key], totalVehiculos) >= 15 && (
                              <span className="text-[10px] text-white font-bold">{pct(tipoDist[key], totalVehiculos)}%</span>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-bold text-oriental-black w-20 text-right">{tipoDist[key]} ({pct(tipoDist[key], totalVehiculos)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ══ 7. FLUJO DE CAJA ══════════════════════════════════════════ */}
          <section>
            <SectionTitle>Flujo de caja</SectionTitle>

            {/* Filtro de fecha */}
            <div className="card p-5 mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Filter size={15} className="text-oriental-gray" />
                <span className="text-xs font-bold text-oriental-gray uppercase tracking-wider">Rango de fechas</span>
              </div>
              <div className="flex gap-3 flex-wrap items-end">
                <div>
                  <label className="label">Desde</label>
                  <input type="date" className="input" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
                </div>
                <div>
                  <label className="label">Hasta</label>
                  <input type="date" className="input" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
                </div>
                <button onClick={cargar} className="btn-primary px-5 py-2.5">Aplicar</button>
                <div className="flex gap-2 flex-wrap">
                  {([
                    { key: 'hoy' as const, label: 'Hoy' },
                    { key: 'semana' as const, label: '7 días' },
                    { key: 'mes' as const, label: 'Este mes' },
                    { key: 'anio' as const, label: 'Este año' },
                  ] as const).map(p => (
                    <button key={p.key} onClick={() => setPreset(p.key)}
                      className="px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-oriental-gray hover:border-gray-400 hover:bg-gray-50 transition-colors">
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Balance cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="card p-6 border-l-4 border-green-500">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={16} className="text-green-600" />
                  <p className="text-sm text-oriental-gray">Ingresos aprobados</p>
                </div>
                <p className="text-3xl font-bold text-green-700">{formatCurrency(totalIngresos)}</p>
                <p className="text-xs text-oriental-gray mt-1">{cntIngAprobados} registros · {cntIngPendientes > 0 ? <span className="text-yellow-600 font-semibold">{cntIngPendientes} pendientes</span> : 'ninguno pendiente'}</p>
              </div>
              <div className="card p-6 border-l-4 border-oriental-red">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown size={16} className="text-oriental-red" />
                  <p className="text-sm text-oriental-gray">Egresos aprobados</p>
                </div>
                <p className="text-3xl font-bold text-oriental-red">{formatCurrency(totalEgresos)}</p>
                <p className="text-xs text-oriental-gray mt-1">{cntEgrAprobados} registros · {cntEgrPendientes > 0 ? <span className="text-yellow-600 font-semibold">{cntEgrPendientes} pendientes</span> : 'ninguno pendiente'}</p>
              </div>
              <div className={`card p-6 border-l-4 ${balance >= 0 ? 'border-oriental-black' : 'border-oriental-red'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Wallet size={16} className="text-oriental-black" />
                  <p className="text-sm text-oriental-gray">Balance neto</p>
                </div>
                <p className={`text-3xl font-bold ${balance >= 0 ? 'text-oriental-black' : 'text-oriental-red'}`}>{formatCurrency(balance)}</p>
                <p className="text-xs text-oriental-gray mt-1">{balance >= 0 ? '✓ Positivo' : '⚠ Déficit en el período'}</p>
              </div>
            </div>

            {/* Método de pago + Egresos por categoría */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign size={18} className="text-green-500" />
                  <h2 className="font-bold text-oriental-black">Ingresos por método de pago</h2>
                </div>
                <div className="space-y-2.5">
                  {metodoPagoMap.length === 0
                    ? <p className="text-oriental-gray text-sm text-center py-4">Sin ingresos en este período</p>
                    : metodoPagoMap.map(([met, total]) => (
                      <BarRow key={met} label={METODO_LABEL[met] ?? met} value={total} max={metodoPagoMap[0]?.[1] ?? 1} color="bg-green-500" fmt={v => formatCurrency(v)} />
                    ))
                  }
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 size={18} className="text-oriental-gray" />
                  <h2 className="font-bold text-oriental-black">Egresos por categoría</h2>
                </div>
                <div className="space-y-2.5">
                  {catMap.length === 0
                    ? <p className="text-oriental-gray text-sm text-center py-4">Sin egresos en este período</p>
                    : catMap.map(([cat, total]) => (
                      <BarRow key={cat} label={CATEGORIAS_EGRESO_LABEL[cat] ?? cat} value={total} max={catMap[0]?.[1] ?? 1} color="bg-oriental-red" fmt={v => formatCurrency(v)} />
                    ))
                  }
                </div>
              </div>
            </div>

            {/* Evolución mensual */}
            {(Object.keys(mesesIngresos).length > 0 || Object.keys(mesesEgresos).length > 0) && (
              <div className="card p-6">
                <h2 className="font-bold text-oriental-black mb-5">Evolución mensual</h2>
                <div className="space-y-4">
                  {Array.from(new Set([...Object.keys(mesesIngresos), ...Object.keys(mesesEgresos)])).map(mes => {
                    const ing = mesesIngresos[mes] ?? 0
                    const egr = mesesEgresos[mes] ?? 0
                    return (
                      <div key={mes}>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-sm font-semibold text-oriental-black">{mes}</span>
                          <span className={`text-xs font-bold ${ing - egr >= 0 ? 'text-green-600' : 'text-oriental-red'}`}>
                            Bal: {formatCurrency(ing - egr)}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-oriental-gray w-16">Ingresos</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                              <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${pct(ing, maxMes)}%` }} />
                            </div>
                            <span className="text-xs font-bold text-green-700 w-28 text-right">{formatCurrency(ing)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-oriental-gray w-16">Egresos</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                              <div className="bg-oriental-red h-2.5 rounded-full" style={{ width: `${pct(egr, maxMes)}%` }} />
                            </div>
                            <span className="text-xs font-bold text-oriental-red w-28 text-right">{formatCurrency(egr)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </section>

        </div>
      )}
    </div>
  )
}

// ── Helpers de layout ───────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-1 h-5 bg-oriental-red rounded-full" />
      <p className="text-xs font-bold text-oriental-gray uppercase tracking-wider">{children}</p>
    </div>
  )
}
