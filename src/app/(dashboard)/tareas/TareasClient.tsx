'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ListChecks, Plus, Trash2, X, Loader2, Check, User, Clock, Flag, ChevronRight, AlertCircle } from 'lucide-react'

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

const ESTADOS: Record<Tarea['estado'], { label: string; cls: string; dot: string }> = {
  pendiente: { label: 'Pendiente', cls: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  en_curso:  { label: 'En curso',  cls: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  hecha:     { label: 'Hecha',     cls: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
}

const PRIORIDADES: Record<Tarea['prioridad'], { label: string; cls: string }> = {
  alta:  { label: 'Alta',  cls: 'bg-red-100 text-red-700 border-red-200' },
  media: { label: 'Media', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  baja:  { label: 'Baja',  cls: 'bg-gray-100 text-gray-500 border-gray-200' },
}

// Siguiente estado en el ciclo pendiente → en_curso → hecha → pendiente
const NEXT_ESTADO: Record<Tarea['estado'], Tarea['estado']> = {
  pendiente: 'en_curso',
  en_curso: 'hecha',
  hecha: 'pendiente',
}

const EMPTY = { titulo: '', descripcion: '', asignado_a: '', prioridad: 'media' as Tarea['prioridad'], fecha_limite: '' }
type Form = typeof EMPTY

function fmtFecha(d: string | null) {
  if (!d) return null
  return new Date(d + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function TareasClient({ currentUserId, puedeAsignar, usuarios }: {
  currentUserId: string
  puedeAsignar: boolean
  usuarios: Usuario[]
}) {
  const supabase = createClient()
  const [items, setItems] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<'mias' | 'asignadas' | 'todas'>(puedeAsignar ? 'todas' : 'mias')
  const [creando, setCreando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<Form>(EMPTY)

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
    // Orden: no-hechas primero, luego por prioridad (alta→baja), luego por fecha límite
    const prioRank = { alta: 0, media: 1, baja: 2 }
    return [...base].sort((a, b) => {
      if ((a.estado === 'hecha') !== (b.estado === 'hecha')) return a.estado === 'hecha' ? 1 : -1
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

  async function cambiarEstado(t: Tarea) {
    const nuevo = NEXT_ESTADO[t.estado]
    // Actualización optimista
    setItems(prev => prev.map(x => x.id === t.id ? { ...x, estado: nuevo } : x))
    await supabase.from('tareas').update({
      estado: nuevo,
      completado_at: nuevo === 'hecha' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', t.id)
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
        {puedeAsignar && (
          <button onClick={abrirNuevo} className="btn-primary flex items-center gap-2 ml-auto"><Plus size={16} /> Asignar tarea</button>
        )}
      </div>

      {loading ? (
        <div className="card p-12 text-center text-oriental-gray text-sm">Cargando…</div>
      ) : filtradas.length === 0 ? (
        <div className="card p-12 text-center">
          <ListChecks size={30} className="mx-auto text-gray-300 mb-3" />
          <p className="text-oriental-gray text-sm">
            {vista === 'mias' ? 'No tienes tareas asignadas.' : vista === 'asignadas' ? 'No has asignado tareas.' : 'Sin tareas registradas.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map(t => {
            const est = ESTADOS[t.estado]
            const prio = PRIORIDADES[t.prioridad]
            const vencida = t.fecha_limite && t.fecha_limite < hoy && t.estado !== 'hecha'
            const esMia = t.asignado_a === currentUserId
            const puedeCambiar = esMia || puedeAsignar
            return (
              <div key={t.id} className={`card p-4 flex items-start gap-3 group ${t.estado === 'hecha' ? 'opacity-70' : ''}`}>
                {/* Toggle estado */}
                <button
                  onClick={() => puedeCambiar && cambiarEstado(t)}
                  disabled={!puedeCambiar}
                  title={puedeCambiar ? 'Cambiar estado' : 'Solo el responsable puede cambiar el estado'}
                  className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                    t.estado === 'hecha' ? 'bg-green-500 border-green-500' : t.estado === 'en_curso' ? 'border-blue-500' : 'border-gray-300'
                  } ${puedeCambiar ? 'hover:scale-105 cursor-pointer' : 'cursor-default'}`}>
                  {t.estado === 'hecha' ? <Check size={13} className="text-white" strokeWidth={3} />
                    : t.estado === 'en_curso' ? <ChevronRight size={13} className="text-blue-500" />
                    : null}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-semibold text-oriental-black ${t.estado === 'hecha' ? 'line-through text-oriental-gray' : ''}`}>{t.titulo}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${est.cls}`}>{est.label}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${prio.cls}`}><Flag size={9} /> {prio.label}</span>
                  </div>
                  {t.descripcion && <p className="text-xs text-oriental-gray mt-1">{t.descripcion}</p>}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-[11px] text-oriental-gray">
                    {t.asignado_a && (
                      <span className="inline-flex items-center gap-1"><User size={11} /> {nombreDe[t.asignado_a] ?? 'Usuario'}</span>
                    )}
                    {t.fecha_limite && (
                      <span className={`inline-flex items-center gap-1 ${vencida ? 'text-red-600 font-semibold' : ''}`}>
                        {vencida ? <AlertCircle size={11} /> : <Clock size={11} />} {vencida ? 'Venció' : 'Límite'}: {fmtFecha(t.fecha_limite)}
                      </span>
                    )}
                    {t.creado_por && puedeAsignar && t.creado_por !== currentUserId && (
                      <span className="text-oriental-gray/70">· asignó {nombreDe[t.creado_por] ?? '—'}</span>
                    )}
                  </div>
                </div>

                {puedeAsignar && (
                  <button onClick={() => borrar(t.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <Trash2 size={13} className="text-red-400" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
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
