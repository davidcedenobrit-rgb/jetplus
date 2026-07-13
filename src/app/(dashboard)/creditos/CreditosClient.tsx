'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { CreditCard, Search, X, Trophy, CalendarClock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

/* eslint-disable @typescript-eslint/no-explicit-any */

type FiltroPlan = 'todos' | 'ac500' | 'contado' | 'f_lao_vehi' | 'f_vehimotor'

const FILTROS_PLAN: { value: FiltroPlan; label: string; activeClass: string }[] = [
  { value: 'todos',       label: 'Todos',          activeClass: 'bg-oriental-black text-white border-oriental-black' },
  { value: 'ac500',       label: 'AC500',           activeClass: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'contado',     label: 'Contado',         activeClass: 'bg-blue-600 text-white border-blue-600' },
  { value: 'f_lao_vehi',  label: 'F. LAO + Vehi',  activeClass: 'bg-purple-600 text-white border-purple-600' },
  { value: 'f_vehimotor', label: 'F. Vehimotor',   activeClass: 'bg-indigo-600 text-white border-indigo-600' },
]

const planBadge = (tipo: string | null) =>
  tipo === 'inicial_la_oriental'       ? 'bg-purple-100 text-purple-700' :
  tipo === 'financiamiento_vehimotors' ? 'bg-indigo-100 text-indigo-700' :
  tipo === 'cuota_especial'            ? 'bg-teal-100 text-teal-700' :
  tipo === 'asegurate_500'             ? 'bg-yellow-100 text-yellow-700' :
  tipo === 'credito_40_60'             ? 'bg-orange-100 text-orange-700' :
  'bg-gray-100 text-gray-500'

const planLabel = (tipo: string | null) =>
  tipo === 'inicial_la_oriental'       ? 'La Oriental' :
  tipo === 'financiamiento_vehimotors' ? 'Vehimotors' :
  tipo === 'cuota_especial'            ? 'C. Especial' :
  tipo === 'asegurate_500'             ? 'Aseg. $500' :
  tipo === 'credito_40_60'             ? '40/60' : 'Sin clasificar'

const estadoColors: Record<string, string> = {
  activo:    'bg-green-100 text-green-800',
  pagado:    'bg-blue-100 text-blue-800',
  mora:      'bg-red-100 text-red-800',
  cancelado: 'bg-gray-200 text-gray-400',
}

function categorizarGrupo(grupo: any[]): FiltroPlan {
  const primero = grupo[0]
  const planes = grupo.map((c: any) => c.plan_tipo).filter(Boolean)
  const tieneAC500       = planes.includes('asegurate_500')
  const tieneInicial     = planes.includes('inicial_la_oriental')
  const tieneVehimotors  = planes.includes('financiamiento_vehimotors')
  const tipoCarro        = (primero as any).vehiculos?.tipo_compra

  if (tieneAC500) return 'ac500'
  if (tieneInicial) return 'f_lao_vehi'
  if (tieneVehimotors) return 'f_vehimotor'
  if (tipoCarro === 'contado') return 'contado'
  return 'contado'
}

function calcSaldo(grupo: any[], cuotasObj: Record<string, any[]>) {
  return grupo.reduce((s: number, c: any) => {
    const qs = cuotasObj[c.id] ?? []
    return s + qs.reduce((acc: number, q: any) => {
      if (q.estado === 'pendiente' || q.estado === 'vencida') return acc + Number(q.monto)
      if (q.estado === 'abono_parcial') return acc + Math.max(0, Number(q.monto) - Number(q.monto_pagado ?? 0))
      return acc
    }, 0)
  }, 0)
}

// Cuota mensual representativa de un crédito: el monto que más se repite entre
// sus cuotas (todas suelen ser iguales); si no hay cuotas, monto_financiado/num_cuotas.
function cuotaRepresentativa(qs: any[], credito: any): number {
  if (qs && qs.length) {
    const freq: Record<string, number> = {}
    let best: number | null = null, bestN = 0
    for (const q of qs) {
      const m = Number(q.monto)
      const k = String(m)
      freq[k] = (freq[k] ?? 0) + 1
      if (freq[k] > bestN) { bestN = freq[k]; best = m }
    }
    if (best != null) return best
  }
  const n = Number(credito.num_cuotas) || 0
  return n > 0 ? Number(credito.monto_financiado) / n : 0
}

function calcMetrics(grupo: any[], cuotasObj: Record<string, any[]>) {
  const totalFinanciado = grupo.reduce((s: number, c: any) => s + Number(c.monto_financiado), 0)
  const totalSaldo      = calcSaldo(grupo, cuotasObj)
  const montoPagado     = Math.max(0, totalFinanciado - totalSaldo)
  const pct             = totalFinanciado > 0 ? (montoPagado / totalFinanciado) * 100 : 0
  const totalCuotas     = grupo.reduce((s: number, c: any) => s + Number(c.num_cuotas), 0)

  let vencidas = 0, cuotaMensual = 0
  for (const c of grupo) {
    const qs = cuotasObj[c.id] ?? []
    vencidas += qs.filter((q: any) => q.estado === 'vencida').length
    cuotaMensual += cuotaRepresentativa(qs, c)
  }

  const estadoGeneral = grupo.some((c: any) => c.estado === 'mora') ? 'mora'
    : grupo.every((c: any) => c.estado === 'pagado') ? 'pagado'
    : 'activo'

  return { totalFinanciado, totalSaldo, montoPagado, pct, totalCuotas, vencidas, cuotaMensual, estadoGeneral }
}

export default function CreditosClient({
  grupos,
  cuotasObj,
}: {
  grupos: any[][]
  cuotasObj: Record<string, any[]>
}) {
  const [filtroPlan, setFiltroPlan] = useState<FiltroPlan>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [showRanking, setShowRanking] = useState(false)

  const gruposConCategoria = useMemo(() =>
    grupos.map(g => ({ grupo: g, categoria: categorizarGrupo(g), m: calcMetrics(g, cuotasObj) })),
  [grupos, cuotasObj])

  const visible = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return gruposConCategoria.filter(({ grupo, categoria }) => {
      if (filtroPlan !== 'todos' && categoria !== filtroPlan) return false
      if (q) {
        const primero = grupo[0]
        const cliente = (primero as any).clientes
        const haystack = [
          primero.placa, cliente?.nombre, cliente?.cedula_rif,
          ...grupo.map((c: any) => c.plan_tipo),
        ].filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [gruposConCategoria, filtroPlan, busqueda])

  // Cobro mensual estimado: suma de las cuotas mensuales de la cartera activa
  // (no pagada). Solo créditos en USD para no mezclar monedas.
  const cobroMensual = useMemo(() =>
    visible.reduce((s, { grupo, m }) => {
      const moneda = (grupo[0] as any).moneda ?? 'USD'
      if (m.estadoGeneral === 'pagado' || moneda !== 'USD') return s
      return s + m.cuotaMensual
    }, 0),
  [visible])

  // Ranking de mejores pagadores: los que NO están en mora primero, luego mayor % pagado.
  const ranking = useMemo(() =>
    [...visible]
      .map(({ grupo, m }) => ({ cliente: (grupo[0] as any).clientes, primero: grupo[0], m }))
      .sort((a, b) =>
        (Number(a.m.estadoGeneral === 'mora') - Number(b.m.estadoGeneral === 'mora')) ||
        (b.m.pct - a.m.pct) ||
        (b.m.montoPagado - a.m.montoPagado))
      .slice(0, 15),
  [visible])

  return (
    <div>
      {/* Resumen: cobro mensual + mejores pagadores */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
            <CalendarClock size={17} className="text-green-700" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-oriental-gray uppercase tracking-wider">Cobro mensual estimado</p>
            <p className="text-lg font-extrabold text-green-700 leading-tight">{formatCurrency(cobroMensual, 'USD')}</p>
          </div>
          <p className="text-[10px] text-gray-400 max-w-[130px] leading-snug hidden sm:block">
            Suma de las cuotas mensuales de la cartera activa mostrada.
          </p>
        </div>
        <button
          onClick={() => setShowRanking(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-sm transition-colors"
        >
          <Trophy size={16} /> Mejores pagadores
        </button>
      </div>

      {/* Filtros de plan */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Plan</span>
        {FILTROS_PLAN.map(f => (
          <button
            key={f.value}
            onClick={() => setFiltroPlan(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all whitespace-nowrap ${
              filtroPlan === f.value
                ? f.activeClass
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative max-w-sm mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar cliente, placa..."
          className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oriental-red bg-white"
        />
        {busqueda && (
          <button onClick={() => setBusqueda('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={13} />
          </button>
        )}
      </div>

      {(filtroPlan !== 'todos' || busqueda) && (
        <p className="text-xs text-oriental-gray mb-3">
          Mostrando <strong className="text-oriental-black">{visible.length}</strong> de {grupos.length} vehículos
          <button
            onClick={() => { setFiltroPlan('todos'); setBusqueda('') }}
            className="ml-2 text-oriental-red hover:underline"
          >
            Limpiar
          </button>
        </p>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-oriental-bg border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Placa</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Financiamiento</th>
                <th className="text-right px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Cuota mensual</th>
                <th className="text-right px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Total financiado</th>
                <th className="text-right px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Saldo total</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Cuotas</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map(({ grupo, m }) => {
                const primero = grupo[0]
                const cliente = (primero as any).clientes
                const tipos = [...new Set(grupo.map((c: any) => c.plan_tipo))]
                const detailLink = `/creditos/${primero.id}`

                return (
                  <tr key={primero.vehiculo_id ?? primero.id} className="hover:bg-oriental-bg/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-oriental-black">{cliente?.nombre}</p>
                      <p className="text-xs text-oriental-gray">{cliente?.cedula_rif}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded font-bold">
                        {primero.placa ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {tipos.filter(Boolean).map(tipo => (
                          <span key={tipo} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${planBadge(tipo)}`}>
                            {planLabel(tipo)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-oriental-black whitespace-nowrap">
                      {m.cuotaMensual > 0 ? formatCurrency(m.cuotaMensual, primero.moneda) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-oriental-black">
                      {formatCurrency(m.totalFinanciado, primero.moneda)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-bold text-oriental-red">{formatCurrency(m.totalSaldo, primero.moneda)}</p>
                      <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                        <div className="bg-green-500 h-1 rounded-full" style={{ width: `${Math.min(100, m.pct)}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-oriental-gray">{m.totalCuotas} cuotas</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${estadoColors[m.estadoGeneral] ?? 'bg-gray-100 text-gray-700'}`}>
                        {m.estadoGeneral}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={detailLink} className="text-oriental-red hover:text-oriental-red-dark font-medium text-xs">
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <CreditCard size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-oriental-gray text-sm">No hay créditos con estos filtros</p>
                    <button
                      onClick={() => { setFiltroPlan('todos'); setBusqueda('') }}
                      className="text-oriental-red text-sm font-medium hover:underline mt-1"
                    >
                      Limpiar filtros
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: mejores pagadores */}
      {showRanking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowRanking(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
                  <Trophy size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-oriental-black text-base">Mejores pagadores</h2>
                  <p className="text-xs text-oriental-gray">Menos cuotas vencidas y mayor % pagado</p>
                </div>
              </div>
              <button onClick={() => setShowRanking(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                <X size={16} className="text-oriental-gray" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2">
              {ranking.length === 0 && (
                <p className="text-sm text-oriental-gray text-center py-8">No hay créditos para mostrar.</p>
              )}
              {ranking.map(({ cliente, primero, m }, i) => (
                <Link
                  key={primero.vehiculo_id ?? primero.id}
                  href={`/creditos/${primero.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-amber-300 hover:bg-amber-50/40 transition-all"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 ${
                    i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-oriental-black text-sm truncate">{cliente?.nombre ?? '—'}</p>
                    <p className="text-[11px] text-oriental-gray">
                      Pagado {formatCurrency(m.montoPagado, primero.moneda)}
                      {m.estadoGeneral === 'mora'
                        ? <span className="text-red-600 font-semibold"> · En mora{m.vencidas > 0 ? ` (${m.vencidas} venc.)` : ''}</span>
                        : m.estadoGeneral === 'pagado'
                        ? <span className="text-blue-600 font-semibold"> · Pagado ✓</span>
                        : <span className="text-green-600 font-semibold"> · Al día</span>}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-extrabold text-green-700">{m.pct.toFixed(0)}%</p>
                    <p className="text-[10px] text-gray-400">pagado</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
