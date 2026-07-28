'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ListChecks, Plus, Trash2, X, Loader2, Check, User, Clock, Flag, AlertCircle, LayoutGrid, List } from 'lucide-react'

type Usuario = { id: string; nombre: string; rol: string }

type Tarea = {
  id: string
  titulo: string
  descripcion: string | null
  asignado_a: string | null
  creado_por: string | null
  prioridad: 'baja' | 'media' | 'alta'
  estado: 'pendiente' | 'en_curso' | 'hecha'
  fecha_limite: string | null
  completado_at: string | null
  created_at: string
}

const COLUMNAS: { estado: Tarea['estado']; label: string; head: string }[] = [
  { estado: 'pendiente', label: 'Por hacer', head: 'bg-gray-100 text-gray-700' },
  { estado: 'en_curso', label: 'En curso', head: 'bg-blue-100 text-blue-700' },
  { estado: 'hecha', label: 'Hecha', head: 'bg-green-100 text-green-700' },
]

const PRIORIDADES: Record<Tarea['prioridad'], { label: string; cls: string }> = {
  alta: { label: 'Alta', cls: 'bg-red-100 text-red-700 border-red-200' },
  media: { label: 'Media', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  baja: { label: 'Baja', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
}

// Color determinístico por responsable
const PALETA = ['#C41E3A', '#2563eb', '#059669', '#7c3aed', '#d97706', '#0891b2', '#db2777', '#4b5563', '#65a30d', '#e11d48']
function colorDe(id?: string | null) {
  if (!id) return '#9ca3af'
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PALETA[h % PALETA.length]
}

const EMPTY = { titulo: '', descripcion: '', asignado_a: '', prioridad: 'media' as Tarea['prioridad'], fecha_limite: '' }
type Form = typeof EMPTY

function fmtFecha(d: string | null) {
  if (!d) return null
  return new Date(d + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })
}

export default function TareasClient({ currentUserId, puedeAsignar, usuarios }: {
  currentUserId: string
  puedeAsignar: boolean
  usuarios: Usuario[]
}) {
  const supabase = createClient()
  const [items, setItems] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [modo, setModo] = useState<'tablero' | 'lista'>('tablero')
  const [vista, setVista] = useState<'mias' | 'asignadas' | 'todas'>(puedeAsignar ? 'todas' : 'mias')
  const [creando, setCreando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<Form>(EMPTY)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<string | null>(null)

  const nombreDe = useMemo(() => {
    const m: Record<string, string> = {}
    usuarios.forEach(u => { m[u.id] = u.nombre })
    return m
  }, [usuarios])

  async function load() {
    const { data } = await supabase.from('tareas').select('*').order('created_at', { ascending: false })
    setItems((data as Tarea[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' })

  const filtradas = useMemo(() => {
    let base = items
    if (vista === 'mias') base = items.filter(t => t.asignado_a === currentUserId)
    else if (vista === 'asignadas') base = items.filter(t => t.creado_por === currentUserId)
    const prioRank = { alta: 0, media: 1, baja: 2 }
    return [...base].sort((a, b) => {
      if (prioRank[a.prioridad] !== prioRank[b.prioridad]) return prioRank[a.prioridad] - prioRank[b.prioridad]
      return (a.fecha_limite ?? '9999').localeCompare(b.fecha_limite ?? '9999')
    })
  }, [items, vista, currentUserId])

  const pendientesMias = useMemo(
    () => items.filter(t => t.asignado_a === currentUserId && t.estado !== 'hecha').length,
    [items, currentUserId]
  )

  function abrirNuevo() { setForm(EMPTY); setCreando(true); setError('') }

  async function guardar() {
    setError('')
    if (!form.titulo.trim()) { setError('El título es requerido'); return }
    if (!form.asignado_a) { setError('Selecciona a quién se le asigna'); return }
    setGuardando(true)
    const { error: err } = await supabase.from('tareas').insert({
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      asignado_a: form.asignado_a,
      creado_por: currentUserId,
      prioridad: form.prioridad,
      fecha_limite: form.fecha_limite || null,
      estado: 'pendiente',
    })
    if (err) { setError(err.message); setGuardando(false); return }
    setGuardando(false); setCreando(false); load()
  }

  const puedeMover = (t: Tarea) => t.asignado_a === currentUserId || puedeAsignar

  async function moverA(id: string, estado: Tarea['estado']) {
    const t = items.find(x => x.id === id)
    if (!t || t.estado === estado || !puedeMover(t)) return
    setItems(prev => prev.map(x => x.id === id ? { ...x, estado } : x))
    await supabase.from('tareas').update({
      estado,
      completado_at: estado === 'hecha' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    load()
  }

  async function borrar(id: string) {
    if (!confirm('¿Eliminar esta tarea?')) return
    await supabase.from('tareas').delete().eq('id', id)
    load()
  }

  const vistas: { k: typeof vista; label: string }[] = puedeAsignar
    ? [{ k: 'todas', label: 'Todas' }, { k: 'mias', label: 'Mis tareas' }, { k: 'asignadas', label: 'Asignadas por mí' }]
    : [{ k: 'mias', label: 'Mis tareas' }]

  function Tarjeta({ t }: { t: Tarea }) {
    const prio = PRIORIDADES[t.prioridad]
    const vencida = t.fecha_limite && t.fecha_limite < hoy && t.estado !== 'hecha'
    const color = colorDe(t.asignado_a)
    const movible = puedeMover(t)
    return (
      <div
        draggable={movible}
        onDragStart={e => { setDragId(t.id); e.dataTransfer.effectAllowed = 'move' }}
        onDragEnd={() => { setDragId(null); setOverCol(null) }}
        className={`bg-white rounded-xl border border-gray-200 p-3 shadow-sm ${movible ? 'cursor-grab active:cursor-grabbing' : ''} ${dragId === t.id ? 'opacity-40' : ''} ${t.estado === 'hecha' ? 'opacity-75' : ''}`}
        style={{ borderLeft: `4px solid ${color}` }}>
        <div className="flex items-start gap-2">
          <p className={`flex-1 font-semibold text-oriental-black text-sm leading-snug ${t.estado === 'hecha' ? 'line-through text-oriental-gray' : ''}`}>{t.titulo}</p>
          {puedeAsignar && (
            <button onClick={() => borrar(t.id)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 flex-shrink-0"><Trash2 size={12} className="text-red-400" /></button>
          )}
        </div>
        {t.descripcion && <p className="text-xs text-oriental-gray mt-1 line-clamp-2">{t.descripcion}</p>}
        <div className="flex items-center gap-2 flex-wrap mt-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${prio.cls}`}><Flag size={9} /> {prio.label}</span>
          {t.fecha_limite && (
            <span className={`text-[10px] inline-flex items-center gap-1 ${vencida ? 'text-red-600 font-bold' : 'text-oriental-gray'}`}>
              {vencida ? <AlertCircle size={10} /> : <Clock size={10} />} {fmtFecha(t.fecha_limite)}
            </span>
          )}
        </div>
        {t.asignado_a && (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-50">
            <span className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: color }}>
              {(nombreDe[t.asignado_a] ?? '?').charAt(0).toUpperCase()}
            </span>
            <span className="text-[11px] text-oriental-gray truncate">{nombreDe[t.asignado_a] ?? 'Usuario'}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {vistas.map(v => (
          <button key={v.k} onClick={() => setVista(v.k)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors inline-flex items-center gap-1.5 ${vista === v.k ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'}`}>
            {v.label}
            {v.k === 'mias' && pendientesMias > 0 && (
              <span className={`text-[10px] font-bold px-1.5 rounded-full ${vista === v.k ? 'bg-white text-oriental-black' : 'bg-oriental-red text-white'}`}>{pendientesMias}</span>
            )}
          </button>
        ))}
        {/* Toggle tablero / lista */}
        <div className="flex items-center gap-1 ml-auto bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setModo('tablero')} title="Tablero" className={`w-8 h-7 flex items-center justify-center rounded-md ${modo === 'tablero' ? 'bg-white shadow-sm text-oriental-black' : 'text-oriental-gray'}`}><LayoutGrid size={15} /></button>
          <button onClick={() => setModo('lista')} title="Lista" className={`w-8 h-7 flex items-center justify-center rounded-md ${modo === 'lista' ? 'bg-white shadow-sm text-oriental-black' : 'text-oriental-gray'}`}><List size={15} /></button>
        </div>
        {puedeAsignar && (
          <button onClick={abrirNuevo} className="btn-primary flex items-center gap-2"><Plus size={16} /> Asignar tarea</button>
        )}
      </div>

      {loading ? (
        <div className="card p-12 text-center text-oriental-gray text-sm">Cargando…</div>
      ) : modo === 'tablero' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {COLUMNAS.map(col => {
            const tareasCol = filtradas.filter(t => t.estado === col.estado)
            return (
              <div key={col.estado}
                onDragOver={e => { e.preventDefault(); setOverCol(col.estado) }}
                onDragLeave={() => setOverCol(prev => prev === col.estado ? null : prev)}
                onDrop={() => { if (dragId) moverA(dragId, col.estado); setDragId(null); setOverCol(null) }}
                className={`rounded-xl p-2.5 transition-colors ${overCol === col.estado ? 'bg-oriental-red/5 ring-2 ring-oriental-red/30' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.head}`}>{col.label}</span>
                  <span className="text-xs font-semibold text-oriental-gray">{tareasCol.length}</span>
                </div>
                <div className="space-y-2 min-h-[80px]">
                  {tareasCol.map(t => <Tarjeta key={t.id} t={t} />)}
                  {tareasCol.length === 0 && <p className="text-[11px] text-gray-400 text-center py-6">Arrastra tareas aquí</p>}
                </div>
              </div>
            )
          })}
        </div>
      ) : filtradas.length === 0 ? (
        <div className="card p-12 text-center">
          <ListChecks size={30} className="mx-auto text-gray-300 mb-3" />
          <p className="text-oriental-gray text-sm">Sin tareas.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map(t => <div key={t.id}><Tarjeta t={t} /></div>)}
        </div>
      )}

      {!loading && modo === 'tablero' && (
        <p className="text-[11px] text-oriental-gray mt-3">Arrastra las tarjetas entre columnas para cambiar su estado. El color identifica al responsable.</p>
      )}

      {creando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !guardando && setCreando(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-oriental-black text-lg">Asignar tarea</h2>
              <button onClick={() => !guardando && setCreando(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X size={16} className="text-oriental-gray" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2"><label className="label">Título *</label><input className="input" value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ej: Llamar al cliente Jonathan" /></div>
              <div className="md:col-span-2"><label className="label">Descripción</label><textarea className="textarea" rows={2} value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} /></div>
              <div className="md:col-span-2">
                <label className="label">Responsable *</label>
                <select className="select" value={form.asignado_a} onChange={e => setForm(p => ({ ...p, asignado_a: e.target.value }))}>
                  <option value="">Seleccionar usuario…</option>
                  {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}{u.rol ? ` · ${u.rol}` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Prioridad</label>
                <select className="select" value={form.prioridad} onChange={e => setForm(p => ({ ...p, prioridad: e.target.value as Tarea['prioridad'] }))}>
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </div>
              <div><label className="label">Fecha límite</label><input className="input" type="date" value={form.fecha_limite} onChange={e => setForm(p => ({ ...p, fecha_limite: e.target.value }))} /></div>
            </div>
            {error && <p className="text-xs text-oriental-red mt-2">{error}</p>}
            <div className="flex gap-2 pt-4">
              <button onClick={() => !guardando && setCreando(false)} className="flex-1 btn-secondary py-2.5">Cancelar</button>
              <button onClick={guardar} disabled={guardando} className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2">
                {guardando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Asignar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
