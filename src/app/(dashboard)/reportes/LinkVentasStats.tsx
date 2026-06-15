'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/* eslint-disable @typescript-eslint/no-explicit-any */

function fmt(n: number | null | undefined) {
  if (n == null) return '0,00'
  return Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtFecha(s: string) {
  try { return new Date(s + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return s }
}
function fmtHora(s: string) {
  try { return new Date(s).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}

const ESTADO_CFG: Record<string, { label: string; cls: string }> = {
  sin_respuesta: { label: 'Sin respuesta',  cls: 'bg-gray-100 text-gray-600' },
  aceptada:      { label: 'Aceptada',       cls: 'bg-green-50 text-green-700' },
  pospuesta:     { label: 'Por ahora no',   cls: 'bg-amber-50 text-amber-700' },
  rechazada:     { label: 'No le interesó', cls: 'bg-red-50 text-red-700' },
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-oriental-gray font-semibold uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-oriental-black">{value}</p>
      {sub && <p className="text-xs text-oriental-gray mt-0.5">{sub}</p>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-3 mt-6">{children}</h3>
}

function TopTable({ rows, cols }: { rows: any[]; cols: { key: string; label: string; right?: boolean }[] }) {
  if (rows.length === 0) return <p className="text-xs text-oriental-gray py-4">Sin datos aún.</p>
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {cols.map(c => (
              <th key={c.key} className={`px-4 py-2.5 text-xs font-bold text-oriental-gray uppercase tracking-wide ${c.right ? 'text-right' : 'text-left'}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
              {cols.map(c => (
                <td key={c.key} className={`px-4 py-2.5 text-xs ${c.right ? 'text-right font-bold' : ''}`}>{r[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function LinkVentasStats() {
  const [loading, setLoading] = useState(true)
  const [cotizaciones, setCotizaciones] = useState<any[]>([])
  const [eventos, setEventos] = useState<any[]>([])
  const [dias, setDias] = useState(30)

  const supabase = createClient()

  useEffect(() => {
    const desde = new Date()
    desde.setDate(desde.getDate() - dias)
    const desdeISO = desde.toISOString()

    Promise.all([
      supabase.from('cotizaciones')
        .select('id, numero, fecha, created_at, vendedora_nombre, marca, modelo, modalidad, plan, total_inicial, cuota_mensual, estado, cliente_nombre')
        .gte('created_at', desdeISO)
        .order('created_at', { ascending: false }),
      supabase.from('eventos_link_ventas')
        .select('id, evento, marca, modelo, created_at')
        .gte('created_at', desdeISO)
        .order('created_at', { ascending: false }),
    ]).then(([cots, evts]) => {
      setCotizaciones(cots.data ?? [])
      setEventos(evts.data ?? [])
    }).finally(() => setLoading(false))
  }, [dias])

  if (loading) return <div className="card p-8 text-center text-oriental-gray text-sm">Cargando estadísticas...</div>

  // ── Aggregations ──
  const totalCots = cotizaciones.length
  const totalEventos = eventos.length

  // Por vendedora
  const byVendedora: Record<string, number> = {}
  cotizaciones.forEach(c => { byVendedora[c.vendedora_nombre] = (byVendedora[c.vendedora_nombre] ?? 0) + 1 })
  const rankVendedoras = Object.entries(byVendedora).sort((a, b) => b[1] - a[1]).map(([nombre, total]) => ({ nombre, total }))

  // Por vehículo (cotizaciones)
  const byVehiculo: Record<string, { marca: string; modelo: string; total: number; totalInicial: number[] }> = {}
  cotizaciones.forEach(c => {
    const k = `${c.marca}|${c.modelo}`
    if (!byVehiculo[k]) byVehiculo[k] = { marca: c.marca, modelo: c.modelo, total: 0, totalInicial: [] }
    byVehiculo[k].total++
    byVehiculo[k].totalInicial.push(c.total_inicial)
  })
  const rankVehiculos = Object.values(byVehiculo).sort((a, b) => b.total - a.total).map(v => ({
    modelo: `${v.marca} ${v.modelo}`,
    cotizaciones: v.total,
    inicial_prom: `$${fmt(v.totalInicial.reduce((s, n) => s + n, 0) / v.totalInicial.length)}`,
  }))

  // Estados
  const byEstado: Record<string, number> = { sin_respuesta: 0, aceptada: 0, pospuesta: 0, rechazada: 0 }
  cotizaciones.forEach(c => { byEstado[c.estado ?? 'sin_respuesta'] = (byEstado[c.estado ?? 'sin_respuesta'] ?? 0) + 1 })

  // Por modalidad
  const byModalidad: Record<string, number> = {}
  cotizaciones.forEach(c => {
    const lbl = c.modalidad === 'contado' ? 'Contado' : c.plan === 'banco_100' ? 'Plan 100% Banco' : 'Crédito 24m'
    byModalidad[lbl] = (byModalidad[lbl] ?? 0) + 1
  })

  // Eventos por tipo
  const byEvento: Record<string, number> = {}
  eventos.forEach(e => { byEvento[e.evento] = (byEvento[e.evento] ?? 0) + 1 })

  // Cotizaciones rápidas por vehículo
  const rapidaByVeh: Record<string, number> = {}
  eventos.filter(e => e.evento === 'cotizacion_rapida').forEach(e => {
    const k = `${e.marca} ${e.modelo}`
    rapidaByVeh[k] = (rapidaByVeh[k] ?? 0) + 1
  })
  const rankRapida = Object.entries(rapidaByVeh).sort((a, b) => b[1] - a[1]).map(([modelo, clicks]) => ({ modelo, clicks }))

  // AC500 por vehículo
  const ac500ByVeh: Record<string, number> = {}
  eventos.filter(e => e.evento === 'ac500_whatsapp').forEach(e => {
    const k = `${e.marca} ${e.modelo}`
    ac500ByVeh[k] = (ac500ByVeh[k] ?? 0) + 1
  })
  const rankAC500 = Object.entries(ac500ByVeh).sort((a, b) => b[1] - a[1]).map(([modelo, clicks]) => ({ modelo, clicks }))

  const EVENTO_LABEL: Record<string, string> = {
    cotizacion_rapida: 'Cotización rápida',
    cotizacion_formal_click: 'Clic cotización formal',
    ac500_whatsapp: 'WhatsApp AC500',
  }

  return (
    <div>
      {/* Selector período */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Período</span>
        {[7, 30, 90].map(d => (
          <button key={d} onClick={() => setDias(d)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${dias === d ? 'border-oriental-black bg-oriental-black text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
            {d === 7 ? '7 días' : d === 30 ? '30 días' : '3 meses'}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
        <StatCard label="Cotizaciones generadas" value={totalCots} sub={`Últimos ${dias} días`} />
        <StatCard label="Aceptadas" value={byEstado.aceptada} sub={totalCots > 0 ? `${Math.round(byEstado.aceptada / totalCots * 100)}% del total` : undefined} />
        <StatCard label="Interacciones web" value={totalEventos} sub="Clics rastreados" />
        <StatCard label="Cotizaciones rápidas" value={byEvento['cotizacion_rapida'] ?? 0} sub="Vistas de precios" />
      </div>

      {/* Estados */}
      <SectionTitle>Estado de cotizaciones</SectionTitle>
      <div className="flex gap-3 flex-wrap mb-2">
        {Object.entries(byEstado).map(([estado, count]) => {
          const cfg = ESTADO_CFG[estado] ?? ESTADO_CFG.sin_respuesta
          return (
            <div key={estado} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${cfg.cls} border-current/20`}>
              <span className="text-sm font-bold">{count}</span>
              <span className="text-xs font-semibold">{cfg.label}</span>
              {totalCots > 0 && <span className="text-xs opacity-60">({Math.round(count / totalCots * 100)}%)</span>}
            </div>
          )
        })}
        {Object.entries(byModalidad).map(([lbl, count]) => (
          <div key={lbl} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-700">
            <span className="text-sm font-bold">{count}</span>
            <span className="text-xs font-semibold">{lbl}</span>
          </div>
        ))}
      </div>

      {/* Ranking vendedoras */}
      <SectionTitle>Ranking vendedoras</SectionTitle>
      <TopTable
        rows={rankVendedoras.map((r, i) => ({ pos: `#${i + 1}`, nombre: r.nombre, total: r.total }))}
        cols={[
          { key: 'pos', label: '#' },
          { key: 'nombre', label: 'Vendedora' },
          { key: 'total', label: 'Cotizaciones', right: true },
        ]}
      />

      {/* Por vehículo */}
      <SectionTitle>Cotizaciones por vehículo</SectionTitle>
      <TopTable
        rows={rankVehiculos}
        cols={[
          { key: 'modelo', label: 'Vehículo' },
          { key: 'cotizaciones', label: 'Cotizaciones', right: true },
          { key: 'inicial_prom', label: 'Inicial promedio', right: true },
        ]}
      />

      {/* Interacciones web */}
      <SectionTitle>Interacciones en la web</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {Object.entries(byEvento).map(([ev, count]) => (
          <div key={ev} className="card p-4">
            <p className="text-2xl font-bold text-oriental-black">{count}</p>
            <p className="text-xs text-oriental-gray font-semibold mt-1">{EVENTO_LABEL[ev] ?? ev}</p>
          </div>
        ))}
        {Object.keys(byEvento).length === 0 && <p className="text-xs text-oriental-gray col-span-3">Sin interacciones registradas todavía.</p>}
      </div>

      {/* Cotización rápida por vehículo */}
      {rankRapida.length > 0 && <>
        <SectionTitle>Cotización rápida — vehículos más vistos</SectionTitle>
        <TopTable
          rows={rankRapida}
          cols={[{ key: 'modelo', label: 'Vehículo' }, { key: 'clicks', label: 'Clics', right: true }]}
        />
      </>}

      {/* AC500 por vehículo */}
      {rankAC500.length > 0 && <>
        <SectionTitle>AC500 — vehículos con más interés</SectionTitle>
        <TopTable
          rows={rankAC500}
          cols={[{ key: 'modelo', label: 'Vehículo' }, { key: 'clicks', label: 'Clics WhatsApp', right: true }]}
        />
      </>}

      {/* Historial reciente */}
      <SectionTitle>Cotizaciones recientes</SectionTitle>
      {cotizaciones.length === 0 ? (
        <p className="text-xs text-oriental-gray">Sin cotizaciones en este período.</p>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['N°', 'Fecha', 'Hora', 'Vendedora', 'Vehículo', 'Cliente', 'Modalidad', 'Total inicial', 'Estado'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-xs font-bold text-oriental-gray uppercase tracking-wide text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cotizaciones.slice(0, 50).map(c => {
                const cfg = ESTADO_CFG[c.estado ?? 'sin_respuesta']
                return (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs font-bold text-oriental-red whitespace-nowrap">{c.numero}</td>
                    <td className="px-3 py-2 text-xs text-oriental-gray whitespace-nowrap">{fmtFecha(c.fecha)}</td>
                    <td className="px-3 py-2 text-xs text-oriental-gray whitespace-nowrap">{fmtHora(c.created_at)}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-oriental-black whitespace-nowrap">{c.vendedora_nombre}</td>
                    <td className="px-3 py-2 text-xs text-oriental-black whitespace-nowrap">{c.marca} {c.modelo}</td>
                    <td className="px-3 py-2 text-xs text-oriental-gray">{c.cliente_nombre}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      {c.modalidad === 'contado' ? 'Contado' : c.plan === 'banco_100' ? '100% Banco' : 'Crédito 24m'}
                    </td>
                    <td className="px-3 py-2 text-xs font-bold text-oriental-black whitespace-nowrap">${fmt(c.total_inicial)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg?.cls ?? ''}`}>{cfg?.label ?? c.estado}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
