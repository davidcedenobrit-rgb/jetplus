'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Search, Users, MessageCircle, FileSpreadsheet } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */
const fmtFecha = (s: string) => { try { return new Date(s).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return s } }

export default function LeadsTab() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [evento, setEvento] = useState('')
  const [captacion, setCaptacion] = useState('')

  useEffect(() => {
    fetch('/api/leads').then(r => r.ok ? r.json() : []).then(d => setLeads(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const eventos = useMemo(() => Array.from(new Set(leads.map(l => l.evento).filter(Boolean))), [leads])
  // Reporte interno: cuántos clientes se captaron en cada lugar (concesionario,
  // Sambil, fuera de concesionario, u otro).
  const captaciones = useMemo(() => {
    const m: Record<string, number> = {}
    leads.forEach(l => { const k = l.origen_captacion?.trim() || 'Sin especificar'; m[k] = (m[k] ?? 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [leads])
  const filtrados = useMemo(() => leads.filter(l => {
    if (evento && l.evento !== evento) return false
    if (captacion && (l.origen_captacion?.trim() || 'Sin especificar') !== captacion) return false
    if (!q.trim()) return true
    const t = `${l.nombre} ${l.telefono} ${l.marca} ${l.modelo} ${l.vendedor} ${l.evento}`.toLowerCase()
    return t.includes(q.toLowerCase())
  }), [leads, q, evento, captacion])

  if (loading) return <div className="py-16 text-center text-gray-400"><Loader2 className="animate-spin inline" size={20} /></div>

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 text-oriental-black">
          <Users size={18} className="text-oriental-red" />
          <span className="font-bold">{filtrados.length}</span>
          <span className="text-sm text-gray-500">cliente{filtrados.length === 1 ? '' : 's'} captado{filtrados.length === 1 ? '' : 's'}</span>
        </div>
        <div className="flex-1 min-w-[180px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre, teléfono, modelo…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red" />
        </div>
        {eventos.length > 0 && (
          <select value={evento} onChange={e => setEvento(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="">Todos los eventos</option>
            {eventos.map(ev => <option key={ev} value={ev}>{ev}</option>)}
          </select>
        )}
        {captaciones.length > 1 && (
          <select value={captacion} onChange={e => setCaptacion(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="">Toda captación</option>
            {captaciones.map(([k, count]) => <option key={k} value={k}>{k} ({count})</option>)}
          </select>
        )}
        <a
          href={`/api/leads/export${evento ? `?evento=${encodeURIComponent(evento)}` : ''}`}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-oriental-red text-white hover:opacity-90 transition-opacity whitespace-nowrap"
          title="Descargar en Excel con la guía para rebatir objeciones"
        >
          <FileSpreadsheet size={15} /> Exportar a Excel
        </a>
      </div>

      {filtrados.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-10">Aún no hay clientes captados desde el link de ventas.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left font-bold px-3 py-2">Fecha</th>
                <th className="text-left font-bold px-3 py-2">Cliente</th>
                <th className="text-left font-bold px-3 py-2">Teléfono</th>
                <th className="text-left font-bold px-3 py-2">Interés</th>
                <th className="text-left font-bold px-3 py-2">Presupuesto</th>
                <th className="text-left font-bold px-3 py-2">Vendedor</th>
                <th className="text-left font-bold px-3 py-2">Captación</th>
                <th className="text-left font-bold px-3 py-2">Evento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map(l => (
                <tr key={l.id}>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmtFecha(l.created_at)}</td>
                  <td className="px-3 py-2 font-semibold text-oriental-black">{l.nombre}</td>
                  <td className="px-3 py-2">
                    <a href={`https://wa.me/${String(l.telefono).replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-green-700 hover:underline">
                      <MessageCircle size={12} /> {l.telefono}
                    </a>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{[l.marca, l.modelo].filter(Boolean).join(' ') || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{l.presupuesto || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{l.vendedor || '—'}</td>
                  <td className="px-3 py-2">{l.origen_captacion ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">{l.origen_captacion}</span> : '—'}</td>
                  <td className="px-3 py-2">{l.evento ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">{l.evento}</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
