'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ClipboardCheck, Plus, X, Loader2, ChevronDown, Truck, Wrench, BadgeCheck } from 'lucide-react'
import { PLANTILLAS, TIPO_LABEL, type Plantilla } from '@/lib/inspecciones'

type ItemGuardado = { clave: string; label: string; estado: string; nota: string }
type Inspeccion = {
  id: string; tipo: string; datos: Record<string, string>; items: ItemGuardado[]
  realizado_por: string | null; notas: string | null; created_at: string
}

const TONO: Record<string, string> = {
  ok: 'bg-green-100 text-green-700', warn: 'bg-amber-100 text-amber-700',
  bad: 'bg-red-100 text-red-700', muted: 'bg-gray-100 text-gray-500',
}
const ICON: Record<string, typeof Truck> = { recepcion: Truck, chequeo: Wrench, pdi: BadgeCheck }

function fecha(d: string) { return new Date(d).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) }

export default function InspeccionesVehiculo({ showroomId, puedeGestionar }: { showroomId: string; puedeGestionar: boolean }) {
  const supabase = createClient()
  const [lista, setLista] = useState<Inspeccion[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Plantilla | null>(null)
  const [abierto, setAbierto] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('inspecciones_vehiculo')
      .select('id, tipo, datos, items, realizado_por, notas, created_at')
      .eq('showroom_vehiculo_id', showroomId).order('created_at', { ascending: false })
    setLista((data as Inspeccion[]) ?? [])
    setLoading(false)
  }, [showroomId])

  useEffect(() => { cargar() }, [cargar])

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-bold text-oriental-black flex items-center gap-2"><ClipboardCheck size={18} className="text-oriental-gray" /> Inspecciones</h2>
        {puedeGestionar && (
          <div className="flex gap-2 flex-wrap">
            {(['recepcion', 'chequeo', 'pdi'] as const).map(t => {
              const Ic = ICON[t]
              return (
                <button key={t} onClick={() => setModal(PLANTILLAS[t])} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-oriental-gray hover:border-oriental-red hover:text-oriental-red transition-colors">
                  <Ic size={14} /> {PLANTILLAS[t].titulo}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-oriental-gray py-4 text-center">Cargando…</p>
      ) : lista.length === 0 ? (
        <p className="text-sm text-oriental-gray py-6 text-center">Sin inspecciones registradas para este vehículo.</p>
      ) : (
        <div className="space-y-2">
          {lista.map(insp => {
            const plant = PLANTILLAS[insp.tipo as Plantilla['tipo']]
            const obs = insp.items.filter(i => i.estado !== 'ok' && i.estado !== 'na').length
            const Ic = ICON[insp.tipo] ?? ClipboardCheck
            const open = abierto === insp.id
            return (
              <div key={insp.id} className="border border-gray-100 rounded-xl overflow-hidden">
                <button onClick={() => setAbierto(open ? null : insp.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left">
                  <div className="w-8 h-8 rounded-lg bg-oriental-red/10 flex items-center justify-center flex-shrink-0"><Ic size={16} className="text-oriental-red" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-oriental-black text-sm">{TIPO_LABEL[insp.tipo] ?? insp.tipo}</p>
                    <p className="text-[11px] text-oriental-gray">{fecha(insp.datos?.fecha || insp.created_at)}{insp.realizado_por ? ` · ${insp.realizado_por}` : ''}</p>
                  </div>
                  {obs > 0
                    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{obs} observ.</span>
                    : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Conforme</span>}
                  <ChevronDown size={16} className={`text-oriental-gray transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    <div className="flex flex-wrap gap-x-6 gap-y-1 mb-3 text-xs">
                      {plant?.campos.map(c => insp.datos?.[c.clave] ? (
                        <span key={c.clave} className="text-oriental-gray">{c.label}: <b className="text-oriental-black">{insp.datos[c.clave]}</b></span>
                      ) : null)}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {insp.items.map(it => {
                        const est = plant?.estados.find(e => e.value === it.estado)
                        return (
                          <div key={it.clave} className="flex items-center gap-2 text-xs">
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${TONO[est?.tono ?? 'muted']}`}>{est?.label ?? it.estado}</span>
                            <span className="text-oriental-black">{it.label}</span>
                            {it.nota && <span className="text-oriental-gray">· {it.nota}</span>}
                          </div>
                        )
                      })}
                    </div>
                    {insp.notas && <p className="text-xs text-oriental-gray mt-3">Notas: {insp.notas}</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modal && <ModalInspeccion plantilla={modal} showroomId={showroomId} onClose={() => setModal(null)} onSaved={() => { setModal(null); cargar() }} />}
    </div>
  )
}

function ModalInspeccion({ plantilla, showroomId, onClose, onSaved }: { plantilla: Plantilla; showroomId: string; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient()
  const [campos, setCampos] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const c of plantilla.campos) init[c.clave] = c.tipo === 'date' ? new Date().toISOString().slice(0, 10) : ''
    return init
  })
  const [items, setItems] = useState<Record<string, { estado: string; nota: string }>>(() => {
    const init: Record<string, { estado: string; nota: string }> = {}
    for (const it of plantilla.items) init[it.clave] = { estado: plantilla.estados[0].value, nota: '' }
    return init
  })
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function guardar() {
    setGuardando(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const realizadoPor = campos['recibido_por'] || campos['realizado_por'] || user?.email || null
    const itemsPayload = plantilla.items.map(it => ({ clave: it.clave, label: it.label, estado: items[it.clave].estado, nota: items[it.clave].nota.trim() }))
    const { error: e } = await supabase.from('inspecciones_vehiculo').insert({
      showroom_vehiculo_id: showroomId, tipo: plantilla.tipo, datos: campos, items: itemsPayload,
      realizado_por: realizadoPor, notas: notas.trim() || null,
    })
    setGuardando(false)
    if (e) { setError(e.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-oriental-black">{plantilla.titulo}</h3>
            <p className="text-xs text-oriental-gray">{plantilla.descripcion}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X size={16} className="text-oriental-gray" /></button>
        </div>

        <div className="p-5">
          {/* Campos generales */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {plantilla.campos.map(c => (
              <div key={c.clave}>
                <label className="label">{c.label}</label>
                {c.tipo === 'select' ? (
                  <select className="select" value={campos[c.clave]} onChange={e => setCampos({ ...campos, [c.clave]: e.target.value })}>
                    <option value="">—</option>
                    {c.opciones?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={c.tipo} className="input" value={campos[c.clave]} onChange={e => setCampos({ ...campos, [c.clave]: e.target.value })} />
                )}
              </div>
            ))}
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            {plantilla.items.map(it => (
              <div key={it.clave} className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-oriental-black w-44 flex-shrink-0">{it.label}</span>
                <div className="flex gap-1">
                  {plantilla.estados.map(es => (
                    <button key={es.value} onClick={() => setItems({ ...items, [it.clave]: { ...items[it.clave], estado: es.value } })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${items[it.clave].estado === es.value ? `${TONO[es.tono]} border-transparent` : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'}`}>
                      {es.label}
                    </button>
                  ))}
                </div>
                <input type="text" placeholder="Nota (opcional)" value={items[it.clave].nota} onChange={e => setItems({ ...items, [it.clave]: { ...items[it.clave], nota: e.target.value } })} className="input py-1 text-xs flex-1 min-w-[120px]" />
              </div>
            ))}
          </div>

          <div className="mt-4">
            <label className="label">Observaciones generales</label>
            <textarea className="input" rows={2} value={notas} onChange={e => setNotas(e.target.value)} />
          </div>

          {error && <p className="text-sm text-oriental-red mt-3">{error}</p>}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-3 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button onClick={guardar} disabled={guardando} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
            {guardando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Guardar {plantilla.titulo.toLowerCase()}
          </button>
        </div>
      </div>
    </div>
  )
}
