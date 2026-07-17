'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Scale, TrendingUp, TrendingDown, Coins, AlertTriangle, Info } from 'lucide-react'
import Link from 'next/link'

const POR_COBRAR = new Set(['pendiente', 'vencida', 'abono_parcial'])

function usd(m: number, moneda: string, t: number | null): number { return moneda === 'VES' ? (t && t > 0 ? m / t : 0) : m }
function fmt(n: number): string { return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const PAGE = 1000; let out: T[] = []
  for (let i = 0; ; i++) { const { data } = await build(i * PAGE, i * PAGE + PAGE - 1); if (!data || data.length === 0) break; out = out.concat(data); if (data.length < PAGE) break }
  return out
}

export default function PosicionFinancieraClient() {
  const supabase = createClient()
  const [cuotas, setCuotas] = useState<{ monto: number; monto_pagado: number | null; estado: string }[]>([])
  const [cxp, setCxp] = useState<{ monto: number; moneda: string; tasa_cambio: number | null }[]>([])
  const [custodia, setCustodia] = useState<{ monto: number; moneda: string; tasa_cambio: number | null; estado: string; confirmado_vehimotors_at: string | null }[]>([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    const [cuo, pag, cus] = await Promise.all([
      fetchAll<Record<string, unknown>>((f, t) => supabase.from('cuotas').select('monto, monto_pagado, estado').range(f, t)),
      fetchAll<Record<string, unknown>>((f, t) => supabase.from('cuentas_por_pagar').select('monto, moneda, tasa_cambio').eq('estado', 'pendiente').range(f, t)),
      fetchAll<Record<string, unknown>>((f, t) => supabase.from('ingresos').select('monto, moneda, tasa_cambio, estado, titular_fondos, confirmado_vehimotors_at').eq('titular_fondos', 'vehimotors').neq('estado', 'anulado').neq('estado', 'rechazado').range(f, t)),
    ])
    setCuotas(cuo.filter(c => POR_COBRAR.has(String(c.estado))).map(c => ({ monto: Number(c.monto ?? 0), monto_pagado: c.monto_pagado != null ? Number(c.monto_pagado) : null, estado: String(c.estado) })))
    setCxp(pag.map(c => ({ monto: Number(c.monto ?? 0), moneda: String(c.moneda ?? 'USD'), tasa_cambio: c.tasa_cambio != null ? Number(c.tasa_cambio) : null })))
    setCustodia(cus.map(c => ({ monto: Number(c.monto ?? 0), moneda: String(c.moneda ?? 'USD'), tasa_cambio: c.tasa_cambio != null ? Number(c.tasa_cambio) : null, estado: String(c.estado), confirmado_vehimotors_at: (c.confirmado_vehimotors_at as string) ?? null })))
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const d = useMemo(() => {
    let porCobrar = 0, vencido = 0
    for (const c of cuotas) { const saldo = Math.max(0, c.monto - Number(c.monto_pagado ?? 0)); porCobrar += saldo; if (c.estado === 'vencida') vencido += saldo }
    const porPagar = cxp.reduce((s, c) => s + usd(c.monto, c.moneda, c.tasa_cambio), 0)
    // Custodia por entregar = no reportada/confirmada a Vehimotors
    const custodiaPorEntregar = custodia
      .filter(c => c.estado !== 'reportado_vehimotors' && !c.confirmado_vehimotors_at)
      .reduce((s, c) => s + usd(c.monto, c.moneda, c.tasa_cambio), 0)
    const capitalTrabajo = porCobrar - porPagar
    return { porCobrar, vencido, porPagar, custodiaPorEntregar, capitalTrabajo }
  }, [cuotas, cxp, custodia])

  return (
    <div className="p-4 lg:p-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"><ArrowLeft size={18} className="text-oriental-gray" /></Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center"><Scale size={20} className="text-oriental-red" /></div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Posición financiera</h1>
            <p className="text-oriental-gray text-sm">Resumen: lo que nos deben, lo que debemos y fondos de terceros (USD)</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-oriental-gray text-sm">Cargando…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div className="card p-5">
              <div className="flex items-center gap-2 text-green-700 mb-1"><TrendingUp size={16} /><p className="text-xs uppercase tracking-wider font-semibold">Cuentas por cobrar</p></div>
              <p className="text-2xl font-black text-oriental-black">${fmt(d.porCobrar)}</p>
              <p className="text-[11px] text-oriental-gray mt-1">Cuotas de crédito pendientes{d.vencido > 0 && <span className="text-oriental-red font-semibold"> · ${fmt(d.vencido)} vencido</span>}</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2 text-oriental-red mb-1"><TrendingDown size={16} /><p className="text-xs uppercase tracking-wider font-semibold">Cuentas por pagar</p></div>
              <p className="text-2xl font-black text-oriental-black">${fmt(d.porPagar)}</p>
              <p className="text-[11px] text-oriental-gray mt-1">Obligaciones a proveedores pendientes</p>
            </div>
          </div>

          {/* Capital de trabajo aproximado */}
          <div className={`card p-5 mb-5 ${d.capitalTrabajo >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-oriental-gray">Capital de trabajo (aprox.)</p>
                <p className="text-[11px] text-oriental-gray mt-0.5">Por cobrar − Por pagar</p>
              </div>
              <p className={`text-2xl font-black ${d.capitalTrabajo >= 0 ? 'text-green-800' : 'text-oriental-red'}`}>{d.capitalTrabajo < 0 ? '−' : ''}${fmt(Math.abs(d.capitalTrabajo))}</p>
            </div>
          </div>

          {/* Fondos de terceros */}
          <div className="card p-5 mb-6 border-amber-200 bg-amber-50/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins size={16} className="text-amber-700" />
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-amber-700">Fondos de terceros en custodia</p>
                  <p className="text-[11px] text-oriental-gray mt-0.5">Dinero de Vehimotors por entregar (no es nuestro)</p>
                </div>
              </div>
              <p className="text-2xl font-black text-amber-800">${fmt(d.custodiaPorEntregar)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex items-start gap-3">
            <Info size={18} className="text-oriental-gray flex-shrink-0 mt-0.5" />
            <p className="text-sm text-oriental-gray">
              Este es un <b>resumen de posición</b>, no un balance general completo. El estado de situación financiera formal (con caja/bancos reales, inventario, activos fijos y patrimonio) se activa con el <b>motor de asientos</b> (partida doble), pendiente de la validación de la contadora.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
