'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchAllRows } from '@/lib/supabase/fetch-all'

interface EventoRedes { id: string; evento: string; marca: string | null; modelo: string | null; metadata: { origen_social?: string } | null; created_at: string }
interface LeadRedes { id: string; nombre: string; telefono: string; correo: string | null; marca: string | null; modelo: string | null; origen: string | null; presupuesto: string | null; created_at: string }

const CLICS_CATALOGO = ['concesionario_virtual_click']
const CLICS_AC500 = ['ac500_concesionario_virtual_click']

function fmtFecha(iso: string) {
  try { return new Date(iso).toLocaleString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return iso }
}

export default function BitacoraRedesTab() {
  const [eventos, setEventos] = useState<EventoRedes[]>([])
  const [leads, setLeads] = useState<LeadRedes[]>([])
  const [loading, setLoading] = useState(true)
  const [dias, setDias] = useState(30)
  const [buscar, setBuscar] = useState('')

  useEffect(() => {
    const supabase = createClient()
    const desde = new Date()
    desde.setDate(desde.getDate() - dias)
    const desdeISO = desde.toISOString()
    setLoading(true)
    Promise.all([
      fetchAllRows<EventoRedes>((f, t) => supabase.from('eventos_link_ventas')
        .select('id, evento, marca, modelo, metadata, created_at')
        .eq('origen', 'redes').gte('created_at', desdeISO)
        .order('created_at', { ascending: false }).range(f, t)),
      fetchAllRows<LeadRedes>((f, t) => supabase.from('leads_captacion')
        .select('id, nombre, telefono, correo, marca, modelo, origen, presupuesto, created_at')
        .neq('origen', 'vendedor_lead').gte('created_at', desdeISO)
        .order('created_at', { ascending: false }).range(f, t)),
    ]).then(([evs, lds]) => { setEventos(evs); setLeads(lds) }).finally(() => setLoading(false))
  }, [dias])

  // "Mapa de calor": ranking de vehículos por clics en "Ir a concesionario
  // virtual" desde /redes, con una barra de intensidad proporcional al máximo.
  const heatmap = useMemo(() => {
    const m: Record<string, number> = {}
    eventos.filter(e => CLICS_CATALOGO.includes(e.evento) || CLICS_AC500.includes(e.evento)).forEach(e => {
      const k = `${e.marca ?? ''} ${e.modelo ?? ''}`.trim() || 'Sin especificar'
      m[k] = (m[k] ?? 0) + 1
    })
    const arr = Object.entries(m).sort((a, b) => b[1] - a[1])
    const max = arr[0]?.[1] ?? 0
    return arr.map(([modelo, clicks]) => ({ modelo, clicks, pct: max ? Math.round((clicks / max) * 100) : 0 }))
  }, [eventos])

  const porOrigenSocial = useMemo(() => {
    const m: Record<string, number> = {}
    leads.forEach(l => { const k = l.origen || 'redes_sociales'; m[k] = (m[k] ?? 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [leads])

  const totalClics = eventos.filter(e => CLICS_CATALOGO.includes(e.evento) || CLICS_AC500.includes(e.evento)).length

  const q = buscar.trim().toLowerCase()
  const leadsFiltrados = q
    ? leads.filter(l => l.nombre.toLowerCase().includes(q) || l.telefono.includes(q) || `${l.marca} ${l.modelo}`.toLowerCase().includes(q))
    : leads

  function waLink(telefono: string) {
    const solo = telefono.replace(/\D/g, '')
    const num = solo.startsWith('58') ? solo : solo.startsWith('0') ? '58' + solo.slice(1) : '58' + solo
    return `https://wa.me/${num}`
  }

  if (loading) return <div className="card p-8 text-center text-oriental-gray text-sm">Cargando...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-oriental-black">Bitácora de redes</h2>
          <p className="text-xs text-oriental-gray mt-0.5">Qué eligen los clientes en el link de redes sociales y los datos que se enviaron a WhatsApp.</p>
        </div>
        <div className="flex items-center gap-1.5">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDias(d)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${dias === d ? 'border-oriental-black bg-oriental-black text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              {d === 7 ? '7 días' : d === 30 ? '30 días' : '3 meses'}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="card p-4">
          <p className="text-xs text-oriental-gray font-semibold uppercase tracking-wider mb-1">Clics &quot;Ir a concesionario&quot;</p>
          <p className="text-2xl font-bold text-oriental-black">{totalClics}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-oriental-gray font-semibold uppercase tracking-wider mb-1">Clientes enviados por WhatsApp</p>
          <p className="text-2xl font-bold text-oriental-black">{leads.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-oriental-gray font-semibold uppercase tracking-wider mb-1">Tasa de conversión</p>
          <p className="text-2xl font-bold text-oriental-black">{totalClics ? Math.round((leads.length / totalClics) * 100) : 0}%</p>
        </div>
      </div>

      {/* Mapa de calor por vehículo */}
      <h3 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-3">Mapa de calor — vehículos más elegidos</h3>
      {heatmap.length === 0 ? (
        <p className="text-xs text-oriental-gray mb-6">Sin clics registrados en este período.</p>
      ) : (
        <div className="card p-4 mb-6 space-y-2.5">
          {heatmap.map(h => (
            <div key={h.modelo} className="flex items-center gap-3">
              <span className="text-xs font-semibold text-oriental-black w-40 shrink-0 truncate">{h.modelo}</span>
              <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{
                  width: `${Math.max(h.pct, 6)}%`,
                  background: `linear-gradient(90deg, #fbbf24, #dc2626)`,
                }} />
              </div>
              <span className="text-xs font-bold text-oriental-black w-8 text-right shrink-0">{h.clicks}</span>
            </div>
          ))}
        </div>
      )}

      {/* Por red social de origen */}
      {porOrigenSocial.length > 0 && (
        <>
          <h3 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-3">Clientes por red de origen</h3>
          <div className="flex gap-3 flex-wrap mb-6">
            {porOrigenSocial.map(([origen, count]) => (
              <div key={origen} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-700">
                <span className="text-sm font-bold">{count}</span>
                <span className="text-xs font-semibold">{origen}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Log de WhatsApp enviados */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-oriental-black uppercase tracking-wider">Clientes enviados a WhatsApp desde redes</h3>
        <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar por nombre, teléfono o vehículo…"
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs w-64 focus:outline-none focus:border-oriental-red" />
      </div>
      {leadsFiltrados.length === 0 ? (
        <p className="text-xs text-oriental-gray py-4">Sin clientes enviados en este período.</p>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Cliente', 'Teléfono', 'Vehículo', 'Origen', 'Fecha', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-xs font-bold text-oriental-gray uppercase tracking-wide text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leadsFiltrados.map(l => (
                <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs font-semibold text-oriental-black whitespace-nowrap">{l.nombre}</td>
                  <td className="px-3 py-2 text-xs text-oriental-gray whitespace-nowrap">{l.telefono}</td>
                  <td className="px-3 py-2 text-xs text-oriental-black whitespace-nowrap">{l.marca} {l.modelo}</td>
                  <td className="px-3 py-2"><span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">{l.origen || 'redes_sociales'}</span></td>
                  <td className="px-3 py-2 text-xs text-oriental-gray whitespace-nowrap">{fmtFecha(l.created_at)}</td>
                  <td className="px-3 py-2">
                    <a href={waLink(l.telefono)} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-green-700 hover:underline whitespace-nowrap">WhatsApp</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
