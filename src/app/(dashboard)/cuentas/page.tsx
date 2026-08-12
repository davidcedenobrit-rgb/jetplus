'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, TrendingDown, TrendingUp, User } from 'lucide-react'
import Link from 'next/link'
import CuentasPorPagarTab, { type CxP } from './CuentasPorPagarTab'
import { cuotaEsPropia } from '@/lib/centros-costo'

// Estados de cuota que representan saldo por cobrar
const POR_COBRAR = new Set(['pendiente', 'vencida', 'abono_parcial'])

type Cuota = {
  id: string; estado: string; fecha_vencimiento: string; monto: number
  monto_pagado: number | null; credito_id: string; numero_cuota: number | null
}
type ClienteRel = { nombre: string; cedula_rif: string | null }
type Credito = { id: string; placa: string | null; plan_tipo: string | null; clientes: ClienteRel | ClienteRel[] | null }

type Titular = 'oriental' | 'vehimotors'

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
  const [titular, setTitular] = useState<Titular>('oriental')
  const [cxp, setCxp] = useState<CxP[]>([])
  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [creditos, setCreditos] = useState<Record<string, Credito>>({})
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    const [cxpData, cuo, cre] = await Promise.all([
      fetchAll<CxP>((f, t) => supabase.from('cuentas_por_pagar')
        .select('id, beneficiario, concepto, categoria, monto, moneda, tasa_cambio, fecha_limite, fecha_emision, proveedor_id, factura_url')
        .eq('estado', 'pendiente')
        .order('fecha_limite', { ascending: true, nullsFirst: false })
        .range(f, t)),
      fetchAll<Cuota>((f, t) => supabase.from('cuotas')
        .select('id, estado, fecha_vencimiento, monto, monto_pagado, credito_id, numero_cuota')
        .range(f, t)),
      fetchAll<Credito>((f, t) => supabase.from('creditos')
        .select('id, placa, plan_tipo, clientes(nombre, cedula_rif)')
        .range(f, t)),
    ])
    setCxp(cxpData)
    setCuotas(cuo.filter(c => POR_COBRAR.has(c.estado)))
    const map: Record<string, Credito> = {}
    for (const c of cre) map[c.id] = c
    setCreditos(map)
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // ── Por pagar (obligaciones pendientes cargadas a mano) ──
  const totalPorPagar = cxp.reduce((s, e) => s + usd(Number(e.monto), e.moneda, e.tasa_cambio), 0)

  // ── Por cobrar ──
  const hoy = new Date().toISOString().split('T')[0]

  // Recordatorios de vencimiento (por pagar)
  const cxpVencidas = cxp.filter(c => c.fecha_limite && c.fecha_limite < hoy).length
  const cxpPorVencer = cxp.filter(c => {
    if (!c.fecha_limite || c.fecha_limite < hoy) return false
    const d = (new Date(c.fecha_limite + 'T00:00:00').getTime() - new Date(hoy + 'T00:00:00').getTime()) / 86400000
    return d <= 7
  }).length
  // Cada cuota se clasifica en "propia" (cobrable por Jetplus) o de
  // Vehimotors (fondos de terceros: financiamiento Vehimotors y mensuales AC500).
  const cxc = cuotas.map(c => {
    const saldo = Math.max(0, c.monto - (c.monto_pagado ?? 0))
    const cred = creditos[c.credito_id]
    const vencida = c.estado === 'vencida' || c.fecha_vencimiento < hoy
    const esPropia = cuotaEsPropia(cred?.plan_tipo, c.numero_cuota)
    return { ...c, saldo, cred, vencida, esPropia }
  }).filter(c => c.saldo > 0)

  // Totales separados por titular (siempre se calculan ambos para los KPIs)
  const sum = (arr: typeof cxc) => arr.reduce((s, c) => s + c.saldo, 0)
  const orientalCuotas = cxc.filter(c => c.esPropia)
  const vehimotorsCuotas = cxc.filter(c => !c.esPropia)
  const porCobrarOriental = sum(orientalCuotas)
  const porCobrarVehimotors = sum(vehimotorsCuotas)
  const vencidoOriental = sum(orientalCuotas.filter(c => c.vencida))
  const vencidoVehimotors = sum(vehimotorsCuotas.filter(c => c.vencida))

  // La tabla por cliente muestra el titular seleccionado
  const cxcSel = titular === 'oriental' ? orientalCuotas : vehimotorsCuotas
  const totalPorCobrar = titular === 'oriental' ? porCobrarOriental : porCobrarVehimotors
  const totalVencido = titular === 'oriental' ? vencidoOriental : vencidoVehimotors

  const cxcPorCliente: Record<string, { nombre: string; placa: string | null; saldo: number; vencido: number; cuotas: number }> = {}
  for (const c of cxcSel) {
    const key = primerCliente(c.cred)?.nombre ?? `Crédito ${c.credito_id.slice(0, 8)}`
    if (!cxcPorCliente[key]) cxcPorCliente[key] = { nombre: key, placa: c.cred?.placa ?? null, saldo: 0, vencido: 0, cuotas: 0 }
    cxcPorCliente[key].saldo += c.saldo
    if (c.vencida) cxcPorCliente[key].vencido += c.saldo
    cxcPorCliente[key].cuotas += 1
  }
  const clientesOrden = Object.values(cxcPorCliente).sort((a, b) => b.vencido - a.vencido || b.saldo - a.saldo)

  return (
    <div className="p-4 lg:p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Cuentas por pagar y por cobrar</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Obligaciones a proveedores cargadas manualmente y cuotas de clientes por cobrar</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-center gap-2 text-oriental-red mb-1"><TrendingDown size={16} /><p className="text-xs uppercase tracking-wider font-semibold">Por pagar</p></div>
          <p className="text-2xl font-bold text-oriental-black">${fmt(totalPorPagar)}</p>
          <p className="text-[11px] text-oriental-gray mt-1">
            {cxp.length} pendientes
            {cxpVencidas > 0 && <span className="text-oriental-red font-semibold"> · {cxpVencidas} vencida{cxpVencidas !== 1 ? 's' : ''}</span>}
            {cxpPorVencer > 0 && <span className="text-amber-600 font-semibold"> · {cxpPorVencer} por vencer</span>}
          </p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-green-700 mb-1"><TrendingUp size={16} /><p className="text-xs uppercase tracking-wider font-semibold">Por cobrar Jetplus</p></div>
          <p className="text-2xl font-bold text-oriental-black">${fmt(porCobrarOriental)}</p>
          <p className="text-[11px] text-oriental-gray mt-1">{orientalCuotas.length} cuotas propias</p>
        </div>
        <div className="card p-5 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 text-amber-700 mb-1"><TrendingUp size={16} /><p className="text-xs uppercase tracking-wider font-semibold">Por cobrar Vehimotors</p></div>
          <p className="text-2xl font-bold text-amber-800">${fmt(porCobrarVehimotors)}</p>
          <p className="text-[11px] text-oriental-gray mt-1">{vehimotorsCuotas.length} cuotas de terceros (no es de Jetplus)</p>
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
        <CuentasPorPagarTab items={cxp} reload={cargar} />
      ) : (
        <>
        {/* Selector de titular: cuentas por cobrar de Jetplus vs de Vehimotors */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setTitular('oriental')} className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${titular === 'oriental' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'}`}>
            Jetplus · ${fmt(porCobrarOriental)}
          </button>
          <button onClick={() => setTitular('vehimotors')} className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${titular === 'vehimotors' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'}`}>
            Vehimotors · ${fmt(porCobrarVehimotors)}
          </button>
          <span className="text-[11px] text-oriental-gray ml-1">Vencido: <span className="font-semibold text-oriental-red">${fmt(totalVencido)}</span></span>
        </div>
        <div className="card overflow-hidden">
          <div className="px-4 py-3 bg-oriental-bg border-b border-gray-200 flex items-center gap-2">
            <User size={15} className="text-oriental-gray" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-oriental-black">
              Por cliente — {titular === 'oriental' ? 'Jetplus' : 'Vehimotors (fondos de terceros)'}
            </h2>
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
        </>
      )}

      <p className="text-[11px] text-oriental-gray mt-4">
        Por pagar: obligaciones a proveedores que se cargan a mano y salen de la lista al marcarlas como pagadas
        (al pagar se registra el egreso automáticamente). Por cobrar: cuotas de crédito pendientes, vencidas o con abono parcial. Montos en USD.
        Las cuotas se separan por titular: <span className="font-semibold">Jetplus</span> (inicial, reserva $500, cuota especial) vs
        <span className="font-semibold"> Vehimotors</span> (financiamiento Vehimotors y cuotas mensuales del plan Asegúrate $500), que son fondos de terceros y no son cuentas por cobrar de Jetplus.
      </p>
    </div>
  )
}
