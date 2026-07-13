'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { CreditCard, Search, X, Trophy, CalendarClock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

/* eslint-disable @typescript-eslint/no-explicit-any */

type FiltroPlan = 'todos' | 'lao' | 'vehimotor' | 'combinado' | 'ac500' | 'contado' | 'aldia'

const FILTROS_PLAN: { value: FiltroPlan; label: string; activeClass: string }[] = [
  { value: 'todos',     label: 'Todos',       activeClass: 'bg-oriental-black text-white border-oriental-black' },
  { value: 'lao',       label: 'La Oriental', activeClass: 'bg-purple-600 text-white border-purple-600' },
  { value: 'vehimotor', label: 'Vehimotors',  activeClass: 'bg-indigo-600 text-white border-indigo-600' },
  { value: 'combinado', label: 'Combinado',   activeClass: 'bg-fuchsia-600 text-white border-fuchsia-600' },
  { value: 'ac500',     label: 'AC500',       activeClass: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'contado',   label: 'Contado',     activeClass: 'bg-blue-600 text-white border-blue-600' },
  { value: 'aldia',     label: 'Al día',      activeClass: 'bg-green-600 text-white border-green-600' },
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

const tieneTipo = (grupo: any[], tipo: string) => grupo.some((c: any) => c.plan_tipo === tipo)

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
  const [ordenMejores, setOrdenMejores] = useState(false)

  const filtrados = useMemo(() => {
    const all = grupos.flat()

    // 1. Seleccionar SOLO los créditos del tipo filtrado (para que la fila
    //    muestre únicamente ese financiamiento, no el combinado del vehículo).
    let creditos: any[]
    if (filtroPlan === 'lao')            creditos = all.filter((c: any) => c.plan_tipo === 'inicial_la_oriental')
    else if (filtroPlan === 'vehimotor') creditos = all.filter((c: any) => c.plan_tipo === 'financiamiento_vehimotors')
    else if (filtroPlan === 'ac500')     creditos = all.filter((c: any) => c.plan_tipo === 'asegurate_500')
    else if (filtroPlan === 'contado')   creditos = all.filter((c: any) => !['inicial_la_oriental', 'financiamiento_vehimotors', 'asegurate_500'].includes(c.plan_tipo))
    else                                 creditos = all // todos, combinado, aldia

    // 2. Agrupar por vehículo
    const map = new Map<string, any[]>()
    for (const c of creditos) {
      const key = c.vehiculo_id ?? c.id
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(c)
    }
    let gruposDisplay = Array.from(map.values())

    // 3. Combinado: vehículos que tienen La Oriental Y Vehimotors. La fila
    //    suma SOLO esos dos créditos (no otros como cuota especial), para que
    //    el total cuadre con La Oriental + Vehimotors.
    if (filtroPlan === 'combinado') {
      gruposDisplay = gruposDisplay
        .filter(g => tieneTipo(g, 'inicial_la_oriental') && tieneTipo(g, 'financiamiento_vehimotors'))
        .map(g => g.filter((c: any) =>
          c.plan_tipo === 'inicial_la_oriental' || c.plan_tipo === 'financiamiento_vehimotors'))
    }

    let res = gruposDisplay.map(g => ({ grupo: g, m: calcMetrics(g, cuotasObj) }))

    // 4. Al día: solo activos que no están en mora
    if (filtroPlan === 'aldia') res = res.filter(r => r.m.estadoGeneral === 'activo')

    // 5. Búsqueda
    const q = busqueda.trim().toLowerCase()
    if (q) {
      res = res.filter(({ grupo }) => {
        const primero = grupo[0]
        const cliente = (primero as any).clientes
        const haystack = [
          primero.placa, cliente?.nombre, cliente?.cedula_rif,
          ...grupo.map((c: any) => c.plan_tipo),
        ].filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(q)
      })
    }
    return res
  }, [grupos, cuotasObj, filtroPlan, busqueda])

  // Orden: por mejor pagador (al día primero, luego mayor % pagado) o por defecto.
  const visible = useMemo(() => {
    if (!ordenMejores) return filtrados
    return [...filtrados].sort((a, b) =>
      (Number(a.m.estadoGeneral === 'mora') - Number(b.m.estadoGeneral === 'mora')) ||
      (b.m.pct - a.m.pct) ||
      (b.m.montoPagado - a.m.montoPagado))
  }, [filtrados, ordenMejores])

  // Cobro mensual estimado: suma de las cuotas mensuales de la cartera activa
  // mostrada (solo créditos en USD para no mezclar monedas).
  const cobroMensual = useMemo(() =>
    visible.reduce((s, { grupo, m }) => {
      const moneda = (grupo[0] as any).moneda ?? 'USD'
      if (m.estadoGeneral === 'pagado' || moneda !== 'USD') return s
      return s + m.cuotaMensual
    }, 0),
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
          onClick={() => setOrdenMejores(v => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors border-2 ${
            ordenMejores
              ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500'
              : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
          }`}
        >
          <Trophy size={16} /> Mejores pagadores {ordenMejores && '✓'}
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

      {(filtroPlan !== 'todos' || busqueda || ordenMejores) && (
        <p className="text-xs text-oriental-gray mb-3">
          Mostrando <strong className="text-oriental-black">{visible.length}</strong> de {grupos.length} vehículos
          {ordenMejores && <span className="text-amber-700 font-semibold"> · ordenado por mejor pagador</span>}
          <button
            onClick={() => { setFiltroPlan('todos'); setBusqueda(''); setOrdenMejores(false) }}
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
              {visible.map(({ grupo, m }, idx) => {
                const primero = grupo[0]
                const cliente = (primero as any).clientes
                const tipos = [...new Set(grupo.map((c: any) => c.plan_tipo))]
                const detailLink = `/creditos/${primero.id}`

                return (
                  <tr key={primero.vehiculo_id ?? primero.id} className="hover:bg-oriental-bg/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {ordenMejores && (
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 ${
                            idx === 0 ? 'bg-amber-400 text-white' : idx === 1 ? 'bg-gray-300 text-white' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-500'
                          }`}>{idx + 1}</span>
                        )}
                        <div>
                          <p className="font-medium text-oriental-black">{cliente?.nombre}</p>
                          <p className="text-xs text-oriental-gray">{cliente?.cedula_rif}</p>
                        </div>
                      </div>
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
                      onClick={() => { setFiltroPlan('todos'); setBusqueda(''); setOrdenMejores(false) }}
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
    </div>
  )
}
