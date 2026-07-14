'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalendarDays, Plus, Pencil, Trash2, X, Loader2, MapPin, User, Clock, Check } from 'lucide-react'

type Evento = {
  id: string
  titulo: string
  descripcion: string | null
  fecha: string
  hora: string | null
  lugar: string | null
  responsable: string | null
  tipo: string | null
  estado: string
  notas: string | null
}

const ESTADOS: Record<string, { label: string; cls: string }> = {
  programado: { label: 'Programado', cls: 'bg-blue-100 text-blue-700' },
  realizado:  { label: 'Realizado',  cls: 'bg-green-100 text-green-700' },
  cancelado:  { label: 'Cancelado',  cls: 'bg-gray-100 text-gray-500' },
}

const EMPTY = { titulo: '', descripcion: '', fecha: new Date().toISOString().slice(0, 10), hora: '', lugar: '', responsable: '', tipo: '', estado: 'programado', notas: '' }
type Form = typeof EMPTY

function fmtMes(mes: string) {
  const [y, m] = mes.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })
}
function fmtDia(d: string) {
  const dt = new Date(d + 'T00:00:00')
  return { dia: dt.toLocaleDateString('es-VE', { day: '2-digit' }), sem: dt.toLocaleDateString('es-VE', { weekday: 'short' }) }
}

export default function EventosClient() {
  const supabase = createClient()
  const [items, setItems] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'proximos' | 'pasados' | 'todos'>('proximos')
  const [editId, setEditId] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<Form>(EMPTY)

  async function load() {
    const { data } = await supabase.from('eventos_calendario').select('*').order('fecha', { ascending: true })
    setItems(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  // Fecha de hoy en zona Venezuela (evita que un evento de hoy se trate como
  // pasado en la noche cuando UTC ya rodó al día siguiente).
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' })
  const filtrados = useMemo(() => {
    if (filtro === 'proximos') return items.filter(e => e.fecha >= hoy)
    if (filtro === 'pasados') return [...items].filter(e => e.fecha < hoy).reverse()
    return items
  }, [items, filtro, hoy])

  const porMes = useMemo(() => {
    const g: Record<string, Evento[]> = {}
    for (const e of filtrados) {
      const k = e.fecha.slice(0, 7)
      if (!g[k]) g[k] = []
      g[k].push(e)
    }
    return Object.entries(g)
  }, [filtrados])

  function abrirNuevo() { setForm(EMPTY); setCreando(true); setEditId(null); setError('') }
  function abrirEditar(e: Evento) {
    setForm({ titulo: e.titulo, descripcion: e.descripcion ?? '', fecha: e.fecha, hora: e.hora ?? '', lugar: e.lugar ?? '', responsable: e.responsable ?? '', tipo: e.tipo ?? '', estado: e.estado, notas: e.notas ?? '' })
    setEditId(e.id); setCreando(true); setError('')
  }

  async function guardar() {
    setError('')
    if (!form.titulo.trim()) { setError('El título es requerido'); return }
    if (!form.fecha) { setError('La fecha es requerida'); return }
    setGuardando(true)
    const row = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      fecha: form.fecha,
      hora: form.hora.trim() || null,
      lugar: form.lugar.trim() || null,
      responsable: form.responsable.trim() || null,
      tipo: form.tipo.trim() || null,
      estado: form.estado,
      notas: form.notas.trim() || null,
    }
    if (editId) {
      const { error: err } = await supabase.from('eventos_calendario').update({ ...row, updated_at: new Date().toISOString() }).eq('id', editId)
      if (err) { setError(err.message); setGuardando(false); return }
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { error: err } = await supabase.from('eventos_calendario').insert({ ...row, registrado_por: user?.id ?? null })
      if (err) { setError(err.message); setGuardando(false); return }
    }
    setGuardando(false); setCreando(false); setEditId(null); load()
  }

  async function borrar(id: string) {
    if (!confirm('¿Eliminar este evento?')) return
    await supabase.from('eventos_calendario').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {(['proximos', 'pasados', 'todos'] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filtro === f ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'}`}>
            {f === 'proximos' ? 'Próximos' : f === 'pasados' ? 'Pasados' : 'Todos'}
          </button>
        ))}
        <button onClick={abrirNuevo} className="btn-primary flex items-center gap-2 ml-auto"><Plus size={16} /> Nuevo evento</button>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-oriental-gray text-sm">Cargando…</div>
      ) : porMes.length === 0 ? (
        <div className="card p-12 text-center">
          <CalendarDays size={30} className="mx-auto text-gray-300 mb-3" />
          <p className="text-oriental-gray text-sm">Sin eventos {filtro === 'proximos' ? 'próximos' : filtro === 'pasados' ? 'pasados' : 'registrados'}.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {porMes.map(([mes, evs]) => (
            <div key={mes}>
              <h2 className="text-xs font-bold uppercase tracking-wider text-oriental-gray mb-2 capitalize">{fmtMes(mes)}</h2>
              <div className="space-y-2">
                {evs.map(e => {
                  const d = fmtDia(e.fecha)
                  const est = ESTADOS[e.estado] ?? ESTADOS.programado
                  return (
                    <div key={e.id} className="card p-4 flex items-start gap-4 group">
                      <div className="text-center flex-shrink-0 w-12">
                        <p className="text-xl font-bold text-oriental-black leading-none">{d.dia}</p>
                        <p className="text-[10px] uppercase text-oriental-gray">{d.sem}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-oriental-black">{e.titulo}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${est.cls}`}>{est.label}</span>
                          {e.tipo && <span className="text-[10px] font-semibold text-oriental-gray bg-gray-100 px-2 py-0.5 rounded-full">{e.tipo}</span>}
                        </div>
                        {e.descripcion && <p className="text-xs text-oriental-gray mt-1">{e.descripcion}</p>}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-oriental-gray">
                          {e.hora && <span className="inline-flex items-center gap-1"><Clock size={11} /> {e.hora}</span>}
                          {e.lugar && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {e.lugar}</span>}
                          {e.responsable && <span className="inline-flex items-center gap-1"><User size={11} /> {e.responsable}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => abrirEditar(e)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50"><Pencil size={13} className="text-blue-500" /></button>
                        <button onClick={() => borrar(e.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50"><Trash2 size={13} className="text-red-400" /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {creando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !guardando && setCreando(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-oriental-black text-lg">{editId ? 'Editar evento' : 'Nuevo evento'}</h2>
              <button onClick={() => !guardando && setCreando(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X size={16} className="text-oriental-gray" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2"><label className="label">Título *</label><input className="input" value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} /></div>
              <div><label className="label">Fecha *</label><input className="input" type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} /></div>
              <div><label className="label">Hora</label><input className="input" type="time" value={form.hora} onChange={e => setForm(p => ({ ...p, hora: e.target.value }))} /></div>
              <div><label className="label">Lugar</label><input className="input" value={form.lugar} onChange={e => setForm(p => ({ ...p, lugar: e.target.value }))} /></div>
              <div><label className="label">Responsable</label><input className="input" value={form.responsable} onChange={e => setForm(p => ({ ...p, responsable: e.target.value }))} /></div>
              <div><label className="label">Tipo</label><input className="input" value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} placeholder="Reunión, entrega, feria…" /></div>
              <div>
                <label className="label">Estado</label>
                <select className="select" value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}>
                  <option value="programado">Programado</option>
                  <option value="realizado">Realizado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div className="md:col-span-2"><label className="label">Descripción</label><input className="input" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} /></div>
              <div className="md:col-span-2"><label className="label">Notas</label><textarea className="textarea" rows={2} value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} /></div>
            </div>
            {error && <p className="text-xs text-oriental-red mt-2">{error}</p>}
            <div className="flex gap-2 pt-4">
              <button onClick={() => !guardando && setCreando(false)} className="flex-1 btn-secondary py-2.5">Cancelar</button>
              <button onClick={guardar} disabled={guardando} className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2">
                {guardando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
