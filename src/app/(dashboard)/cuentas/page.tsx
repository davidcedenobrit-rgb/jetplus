'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIAS_EGRESO_LABEL } from '@/lib/utils'
import { ArrowLeft, TrendingDown, TrendingUp, AlertTriangle, Building2, User } from 'lucide-react'
import Link from 'next/link'

// Estados de egreso que representan una obligación aún no pagada
const POR_PAGAR = new Set(['registrado', 'pendiente_aprobacion', 'aprobado', 'correccion_requerida'])
// Estados de cuota que representan saldo por cobrar
const POR_COBRAR = new Set(['pendiente', 'vencida', 'abono_parcial'])

type Egreso = {
  id: string; concepto: string; categoria: string; monto: number; moneda: string
  tasa_cambio: number | null; fecha_egreso: string; estado: string; beneficiario: string | null
}
type Cuota = {
  id: string; estado: string; fecha_vencimiento: string; monto: number
  monto_pagado: number | null; credito_id: string
}
type ClienteRel = { nombre: string; cedula_rif: string | null }
type Credito = { id: string; placa: string | null; clientes: ClienteRel | ClienteRel[] | null }

function primerCliente(c: Credito | undefined): ClienteRel | null {
  if (!c?.clientes) return null
  return Array.isArray(c.clientes) ? (c.clientes[0] ?? null) : c.clientes
}

function usd(m: number, moneda: string, t: number | null): number {
  if (moneda === 'VES') return t && t > 0 ? m / t : 0
  return m
}
function fmt(n: number): string {
  return n.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(n) * 100) % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })
}
function fmtFecha(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: unknown[] | null }>): Promise<T[]> {
  const PAGE = 1000
  let out: T[] = []
  for (let i = 0; ; i++) {
    const { data } = await build(i * PAGE, i * PAGE + PAGE - 1)
    if (!data || data.length === 0) break
    out = out.concat(data as T[])
    if (data.length < PAGE) break
  }
  return out
}

export default function CuentasPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'pagar' | 'cobrar'>('pagar')
  const [egresos, setEgresos] = useState<Egreso[]>([])
  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [creditos, setCreditos] = useState<Record<string, Credito>>({})
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    const [egr, cuo, cre] = await Promise.all([
      fetchAll<Egreso>((f, t) => supabase.from('egresos')
        .select('id, concepto, categoria, monto, moneda, tasa_cambio, fecha_egreso, estado, beneficiario')
        .range(f, t)),
      fetchAll<Cuota>((f, t) => supabase.from('cuotas')
        .select('id, estado, fecha_vencimiento, monto, monto_pagado, credito_id')
        .range(f, t)),
      fetchAll<Credito>((f, t) => supabase.from('creditos')
        .select('id, placa, clientes(nombre, cedula_rif)')
        .range(f, t)),
    ])
    setEgresos(egr.filter(e => POR_PAGAR.has(e.estado)))
    setCuotas(cuo.filter(c => POR_COBRAR.has(c.estado)))
    const map: Record<string, Credito> = {}
    for (const c of cre) map[c.id] = c
    setCreditos(map)
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // ── Por pagar ──
  const totalPorPagar = egresos.reduce((s, e) => s + usd(e.monto, e.moneda, e.tasa_cambio), 0)

  // ── Por cobrar ──
  const hoy = new Date().toISOString().split('T')[0]
  const cxc = cuotas.map(c => {
    const saldo = Math.max(0, c.monto - (c.monto_pagado ?? 0))
    const cred = creditos[c.credito_id]
    const vencida = c.estado === 'vencida' || c.fecha_vencimiento < hoy
    return { ...c, saldo, cred, vencida }
  }).filter(c => c.saldo > 0)
  const totalPorCobrar = cxc.reduce((s, c) => s + c.saldo, 0)
  const totalVencido = cxc.filter(c => c.vencida).reduce((s, c) => s + c.saldo, 0)

  // Agrupar CxC por cliente
  const cxcPorCliente: Record<string, { nombre: string; placa: string | null; saldo: number; vencido: number; cuotas: number }> = {}
  for (const c of cxc) {
    const key = primerCliente(c.cred)?.nombre ?? `Crédito ${c.credito_id.slice(0, 8)}`
    if (!cxcPorCliente[key]) cxcPorCliente[key] = { nombre: key, placa: c.cred?.placa ?? null, saldo: 0, vencido: 0, cuotas: 0 }
    cxcPorCliente[key].saldo += c.saldo
    if (c.vencida) cxcPorCliente[key].vencido += c.saldo
    cxcPorCliente[key].cuotas += 1
  }
  const clientesOrden = Object.values(cxcPorCliente).sort((a, b) => b.vencido - a.vencido || b.saldo - a.saldo)

  // Agrupar CxP por beneficiario
  const cxpPorBenef: Record<string, { nombre: string; total: number; items: number }> = {}
  for (const e of egresos) {
    const key = e.beneficiario?.trim() || 'Sin beneficiario'
    if (!cxpPorBenef[key]) cxpPorBenef[key] = { nombre: key, total: 0, items: 0 }
    cxpPorBenef[key].total += usd(e.monto, e.moneda, e.tasa_cambio)
    cxpPorBenef[key].items += 1
  }
  const benefOrden = Object.values(cxpPorBenef).sort((a, b) => b.total - a.total)

  return (
    <div className="p-4 lg:p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Cuentas por pagar y por cobrar</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Se alimenta solo de los egresos pendientes y las cuotas por cobrar</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-center gap-2 text-oriental-red mb-1"><TrendingDown size={16} /><p className="text-xs uppercase tracking-wider font-semibold">Por pagar</p></div>
          <p className="text-2xl font-bold text-oriental-black">${fmt(totalPorPagar)}</p>
          <p className="text-[11px] text-oriental-gray mt-1">{egresos.length} egresos pendientes</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-green-700 mb-1"><TrendingUp size={16} /><p className="text-xs uppercase tracking-wider font-semibold">Por cobrar</p></div>
          <p className="text-2xl font-bold text-oriental-black">${fmt(totalPorCobrar)}</p>
          <p className="text-[11px] text-oriental-gray mt-1">{cxc.length} cuotas</p>
        </div>
        <div className="card p-5 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 text-oriental-red mb-1"><AlertTriangle size={16} /><p className="text-xs uppercase tracking-wider font-semibold">Vencido por cobrar</p></div>
          <p className="text-2xl font-bold text-oriental-red">${fmt(totalVencido)}</p>
          <p className="text-[11px] text-oriental-gray mt-1">{cxc.filter(c => c.vencida).length} cuotas vencidas</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setTab('pagar')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${tab === 'pagar' ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'}`}>
          <TrendingDown size={15} /> Por pagar
        </button>
        <button onClick={() => setTab('cobrar')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${tab === 'cobrar' ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'}`}>
          <TrendingUp size={15} /> Por cobrar
        </button>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-oriental-gray text-sm">Cargando...</div>
      ) : tab === 'pagar' ? (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 bg-oriental-bg border-b border-gray-200 flex items-center gap-2">
            <Building2 size={15} className="text-oriental-gray" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-oriental-black">Por proveedor / beneficiario</h2>
          </div>
          {benefOrden.length === 0 ? (
            <p className="px-4 py-8 text-sm text-oriental-gray text-center">No hay egresos pendientes de pago</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Beneficiario</th>
                    <th className="text-right px-4 py-2 font-medium text-oriental-gray text-xs">Egresos</th>
                    <th className="text-right px-4 py-2 font-medium text-oriental-gray text-xs">Total por pagar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {benefOrden.map(b => (
                    <tr key={b.nombre} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-semibold text-oriental-black">{b.nombre}</td>
                      <td className="px-4 py-2.5 text-right text-oriental-gray text-xs">{b.items}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-oriental-black">${fmt(b.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-oriental-black text-white">
                    <td className="px-4 py-2.5 font-bold text-sm" colSpan={2}>Total por pagar</td>
                    <td className="px-4 py-2.5 text-right font-bold">${fmt(totalPorPagar)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 bg-oriental-bg border-b border-gray-200 flex items-center gap-2">
            <User size={15} className="text-oriental-gray" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-oriental-black">Por cliente</h2>
          </div>
          {clientesOrden.length === 0 ? (
            <p className="px-4 py-8 text-sm text-oriental-gray text-center">No hay cuotas por cobrar</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Cliente</th>
                    <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Placa</th>
                    <th className="text-right px-4 py-2 font-medium text-oriental-gray text-xs">Cuotas</th>
                    <th className="text-right px-4 py-2 font-medium text-oriental-gray text-xs">Vencido</th>
                    <th className="text-right px-4 py-2 font-medium text-oriental-gray text-xs">Saldo total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clientesOrden.map(c => (
                    <tr key={c.nombre} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-semibold text-oriental-black">{c.nombre}</td>
                      <td className="px-4 py-2.5 text-oriental-gray font-mono text-xs">{c.placa ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right text-oriental-gray text-xs">{c.cuotas}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-oriental-red">{c.vencido > 0 ? `$${fmt(c.vencido)}` : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-oriental-black">${fmt(c.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-oriental-black text-white">
                    <td className="px-4 py-2.5 font-bold text-sm" colSpan={3}>Total por cobrar</td>
                    <td className="px-4 py-2.5 text-right font-semibold">${fmt(totalVencido)}</td>
                    <td className="px-4 py-2.5 text-right font-bold">${fmt(totalPorCobrar)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-oriental-gray mt-4">
        Por pagar: egresos registrados, en aprobación, aprobados o en corrección (no incluye pagados, anulados ni rechazados).
        Por cobrar: cuotas de crédito pendientes, vencidas o con abono parcial (saldo = monto − abonado). Montos en USD.
      </p>
    </div>
  )
}
