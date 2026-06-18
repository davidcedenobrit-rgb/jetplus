'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { CreditCard, Search, X } from 'lucide-react'
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
  tipo === 'inicial_la_oriental'     ? 'bg-purple-100 text-purple-700' :
  tipo === 'financiamiento_vehimotors' ? 'bg-indigo-100 text-indigo-700' :
  tipo === 'cuota_especial'           ? 'bg-teal-100 text-teal-700' :
  'bg-gray-100 text-gray-500'

const planLabel = (tipo: string | null) =>
  tipo === 'inicial_la_oriental'      ? 'La Oriental' :
  tipo === 'financiamiento_vehimotors' ? 'Vehimotors' :
  tipo === 'cuota_especial'            ? 'C. Especial' : 'Sin clasificar'

const estadoColors: Record<string, string> = {
  activo:    'bg-green-100 text-green-800',
  pagado:    'bg-blue-100 text-blue-800',
  mora:      'bg-red-100 text-red-800',
  cancelado: 'bg-gray-200 text-gray-400',
}

function categorizarGrupo(grupo: any[]): FiltroPlan {
  const primero = grupo[0]
  const planes = grupo.map((c: any) => c.plan_tipo).filter(Boolean)
  const tieneInicial     = planes.includes('inicial_la_oriental')
  const tieneVehimotors  = planes.includes('financiamiento_vehimotors')
  const tipoCarro        = (primero as any).vehiculos?.tipo_compra

  // AC500 = sin placa cargada
  if (!primero.placa || primero.placa.trim() === '') return 'ac500'
  if (tipoCarro === 'contado') return 'contado'
  if (tieneInicial) return 'f_lao_vehi'
  if (tieneVehimotors) return 'f_vehimotor'
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

export default function CreditosClient({
  grupos,
  cuotasObj,
}: {
  grupos: any[][]
  cuotasObj: Record<string, any[]>
}) {
  const [filtroPlan, setFiltroPlan] = useState<FiltroPlan>('todos')
  const [busqueda, setBusqueda] = useState('')

  const gruposConCategoria = useMemo(() =>
    grupos.map(g => ({ grupo: g, categoria: categorizarGrupo(g) })),
  [grupos])

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

  return (
    <div>
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
                <th className="text-right px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Total financiado</th>
                <th className="text-right px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Saldo total</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Cuotas</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map(({ grupo }) => {
                const primero = grupo[0]
                const cliente = (primero as any).clientes

                const totalFinanciado = grupo.reduce((s: number, c: any) => s + Number(c.monto_financiado), 0)
                const totalSaldo      = calcSaldo(grupo, cuotasObj)
                const totalCuotas     = grupo.reduce((s: number, c: any) => s + Number(c.num_cuotas), 0)
                const porcentajePagado = totalFinanciado > 0
                  ? ((totalFinanciado - totalSaldo) / totalFinanciado) * 100 : 0

                const estadoGeneral = grupo.some((c: any) => c.estado === 'mora') ? 'mora'
                  : grupo.every((c: any) => c.estado === 'pagado') ? 'pagado'
                  : 'activo'

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
                        {(!primero.placa || primero.placa.trim() === '') && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
                            AC500
                          </span>
                        )}
                        {tipos.filter(Boolean).map(tipo => (
                          <span key={tipo} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${planBadge(tipo)}`}>
                            {planLabel(tipo)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-oriental-black">
                      {formatCurrency(totalFinanciado, primero.moneda)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-bold text-oriental-red">{formatCurrency(totalSaldo, primero.moneda)}</p>
                      <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                        <div className="bg-green-500 h-1 rounded-full" style={{ width: `${Math.min(100, porcentajePagado)}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-oriental-gray">{totalCuotas} cuotas</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${estadoColors[estadoGeneral] ?? 'bg-gray-100 text-gray-700'}`}>
                        {estadoGeneral}
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
                  <td colSpan={8} className="px-4 py-16 text-center">
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
    </div>
  )
}
