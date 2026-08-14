'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, CalendarClock } from 'lucide-react'

interface Cita {
  id: string
  cliente_nombre: string
  cliente_telefono: string
  cliente_correo: string
  vehiculo_marca: string | null
  vehiculo_modelo: string | null
  vehiculo_placa: string | null
  motivo: string | null
  fecha: string
  hora_inicio: string
  hora_fin: string
  estado: 'confirmada' | 'cancelada'
  created_at: string
}

function fmtHora(s: string) {
  const [h, m] = s.slice(0, 5).split(':').map(Number)
  const ampm = h >= 12 ? 'p.m.' : 'a.m.'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}
function fmtFechaLarga(f: string) {
  const [y, m, d] = f.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-VE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}
function waLink(telefono: string) {
  const solo = telefono.replace(/\D/g, '')
  const num = solo.startsWith('58') ? solo : solo.startsWith('0') ? '58' + solo.slice(1) : '58' + solo
  return `https://wa.me/${num}`
}

type Filtro = 'proximas' | 'todas' | 'pasadas'

export default function CitasTab() {
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(true)
  const [buscar, setBuscar] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('proximas')

  useEffect(() => {
    fetch('/api/citas').then(r => r.ok ? r.json() : []).then(setCitas).finally(() => setLoading(false))
  }, [])

  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' })
  const q = buscar.trim().toLowerCase()

  const filtradas = useMemo(() => {
    let lista = citas
    if (filtro === 'proximas') lista = lista.filter(c => c.fecha >= hoy)
    if (filtro === 'pasadas') lista = lista.filter(c => c.fecha < hoy)
    if (q) lista = lista.filter(c =>
      c.cliente_nombre.toLowerCase().includes(q) || c.cliente_telefono.includes(q) ||
      `${c.vehiculo_marca ?? ''} ${c.vehiculo_modelo ?? ''}`.toLowerCase().includes(q)
    )
    return lista
  }, [citas, filtro, q, hoy])

  const porFecha = useMemo(() => {
    const g: Record<string, Cita[]> = {}
    filtradas.forEach(c => { if (!g[c.fecha]) g[c.fecha] = []; g[c.fecha].push(c) })
    return Object.entries(g).sort((a, b) => filtro === 'pasadas' ? b[0].localeCompare(a[0]) : a[0].localeCompare(b[0]))
  }, [filtradas, filtro])

  if (loading) return <div className="card p-8 text-center text-oriental-gray text-sm">Cargando...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-base font-bold text-oriental-black flex items-center gap-2"><CalendarClock size={16} className="text-oriental-red" /> Citas de taller</h2>
          <p className="text-xs text-oriental-gray mt-0.5">{citas.length} cita{citas.length === 1 ? '' : 's'} agendada{citas.length === 1 ? '' : 's'} en total.</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/citas/export" className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-oriental-gray hover:bg-gray-50 transition-colors">
            <Download size={13} /> Excel
          </a>
          <a href="/api/citas/export/pdf" className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-oriental-gray hover:bg-gray-50 transition-colors">
            <Download size={13} /> PDF
          </a>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex items-center gap-1.5">
          {([['proximas', 'Próximas'], ['pasadas', 'Pasadas'], ['todas', 'Todas']] as [Filtro, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setFiltro(k)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filtro === k ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'}`}>
              {label}
            </button>
          ))}
        </div>
        <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar por cliente, teléfono o vehículo…"
          className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-oriental-red" />
      </div>

      {porFecha.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-10">No hay citas {filtro === 'proximas' ? 'próximas' : filtro === 'pasadas' ? 'pasadas' : ''} que coincidan.</p>
      ) : (
        <div className="space-y-5">
          {porFecha.map(([fecha, lista]) => (
            <div key={fecha}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-oriental-gray mb-2 capitalize">{fmtFechaLarga(fecha)}</h3>
              <div className="space-y-2">
                {lista.map(c => (
                  <div key={c.id} className="card p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-semibold text-oriental-black text-sm truncate">{c.cliente_nombre}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700">{fmtHora(c.hora_inicio)} – {fmtHora(c.hora_fin)}</span>
                        {c.estado === 'cancelada' && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-50 text-red-600">Cancelada</span>}
                      </div>
                      <p className="text-gray-500 text-xs truncate">
                        {c.cliente_telefono}
                        {(c.vehiculo_marca || c.vehiculo_modelo) ? ` · ${[c.vehiculo_marca, c.vehiculo_modelo].filter(Boolean).join(' ')}${c.vehiculo_placa ? ` (${c.vehiculo_placa})` : ''}` : ''}
                        {c.motivo ? ` · ${c.motivo}` : ''}
                      </p>
                    </div>
                    <a href={waLink(c.cliente_telefono)} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-green-700 hover:bg-green-50">
                      WhatsApp
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
