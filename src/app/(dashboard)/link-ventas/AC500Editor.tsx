'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Check, X, ChevronDown, ChevronUp } from 'lucide-react'

interface AC500 {
  id: string
  brand: 'MG' | 'MAXUS'
  model: string
  img_url: string | null
  colores: string | null
  orden: number | null
  disponible: boolean | null
  reserva: number | null
  p6_activo: boolean | null
  p6_c1: number | null; p6_c2: number | null; p6_c3: number | null
  p6_c4: number | null; p6_c5: number | null; p6_c6: number | null
  p6_total: number | null
  p9_activo: boolean | null
  p9_c1: number | null; p9_c2: number | null; p9_c3: number | null
  p9_c4: number | null; p9_c5: number | null; p9_c6: number | null
  p9_c7: number | null; p9_c8: number | null; p9_c9: number | null
  p9_total: number | null
  p12_activo: boolean | null
  p12_c1: number | null; p12_c2: number | null; p12_c3: number | null
  p12_c4: number | null; p12_c5: number | null; p12_c6: number | null
  p12_c7: number | null; p12_c8: number | null; p12_c9: number | null
  p12_c10: number | null; p12_c11: number | null; p12_c12: number | null
  p12_total: number | null
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-10 h-6 rounded-full relative transition-colors ${on ? 'bg-oriental-red' : 'bg-gray-300'}`}>
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? 'left-5' : 'left-1'}`} />
    </button>
  )
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg text-white ${ok ? 'bg-green-600' : 'bg-red-600'}`}>{msg}</div>
  )
}

const P6_FIELDS: (keyof AC500)[] = ['p6_c1', 'p6_c2', 'p6_c3', 'p6_c4', 'p6_c5', 'p6_c6']
const P6_LABELS = ['Cuota 1 (Día 0)', 'Cuota 2 (Día 30)', 'Cuota 3 (Día 60)', 'Cuota 4 (Día 90)', 'Cuota 5 (Día 120)', 'Cuota 6 (Entrega)']
const P9_FIELDS: (keyof AC500)[] = ['p9_c1', 'p9_c2', 'p9_c3', 'p9_c4', 'p9_c5', 'p9_c6', 'p9_c7', 'p9_c8', 'p9_c9']
const P9_LABELS = ['Cuota 1 (Día 0)', 'Cuota 2 (Día 30)', 'Cuota 3 (Día 60)', 'Cuota 4 (Día 90)', 'Cuota 5 (Día 120)', 'Cuota 6 (Día 150)', 'Cuota 7 (Día 180)', 'Cuota 8 (Día 210)', 'Cuota 9 (Entrega)']
const P12_FIELDS: (keyof AC500)[] = ['p12_c1','p12_c2','p12_c3','p12_c4','p12_c5','p12_c6','p12_c7','p12_c8','p12_c9','p12_c10','p12_c11','p12_c12']
const P12_LABELS = ['Cuota 1 (Día 0)', 'Cuota 2 (Día 30)', 'Cuota 3 (Día 60)', 'Cuota 4 (Día 90)', 'Cuota 5 (Día 120)', 'Cuota 6 (Día 150)', 'Cuota 7 (Día 180)', 'Cuota 8 (Día 210)', 'Cuota 9 (Día 240)', 'Cuota 10 (Día 270)', 'Cuota 11 (Día 300)', 'Cuota 12 (Entrega)']

const EMPTY: Omit<AC500, 'id'> = {
  brand: 'MG', model: '', img_url: '', colores: 'plata,gris,negro,blanco', orden: 99, disponible: true, reserva: 500,
  p6_activo: false, p6_c1: null, p6_c2: null, p6_c3: null, p6_c4: null, p6_c5: null, p6_c6: null, p6_total: null,
  p9_activo: false, p9_c1: null, p9_c2: null, p9_c3: null, p9_c4: null, p9_c5: null, p9_c6: null, p9_c7: null, p9_c8: null, p9_c9: null, p9_total: null,
  p12_activo: false, p12_c1: null, p12_c2: null, p12_c3: null, p12_c4: null, p12_c5: null, p12_c6: null, p12_c7: null, p12_c8: null, p12_c9: null, p12_c10: null, p12_c11: null, p12_c12: null, p12_total: null,
}

function sumPlan(v: AC500, fields: (keyof AC500)[]) {
  const cuotas = fields.reduce((s, f) => s + (Number(v[f]) || 0), 0)
  return cuotas + (Number(v.reserva) || 0)
}

export default function AC500Editor({ initial }: { initial: AC500[] }) {
  const [items, setItems] = useState<AC500[]>(initial)
  const [dirty, setDirty] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [newV, setNewV] = useState<{ id: string } & typeof EMPTY>({ id: '', ...EMPTY })
  const [savingNew, setSavingNew] = useState(false)
  const supabase = createClient()
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    if (toastRef.current) clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(null), 2800)
  }

  function update(id: string, field: keyof AC500, value: unknown) {
    setItems(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v))
    setDirty(prev => ({ ...prev, [id]: true }))
    setSaved(prev => ({ ...prev, [id]: false }))
  }

  // Recalcula el total del plan automáticamente al guardar (reserva + cuotas)
  async function save(id: string) {
    const v = items.find(x => x.id === id)
    if (!v) return
    setSaving(prev => ({ ...prev, [id]: true }))
    const p6_total = v.p6_activo ? sumPlan(v, P6_FIELDS) : null
    const p9_total = v.p9_activo ? sumPlan(v, P9_FIELDS) : null
    const p12_total = v.p12_activo ? sumPlan(v, P12_FIELDS) : null
    setItems(prev => prev.map(x => x.id === id ? { ...x, p6_total, p9_total, p12_total } : x))
    const { error } = await supabase.from('ac500_vehiculos').update({
      brand: v.brand, model: v.model, img_url: v.img_url, colores: v.colores,
      orden: v.orden, disponible: v.disponible, reserva: v.reserva,
      p6_activo: v.p6_activo, p6_c1: v.p6_c1, p6_c2: v.p6_c2, p6_c3: v.p6_c3, p6_c4: v.p6_c4, p6_c5: v.p6_c5, p6_c6: v.p6_c6, p6_total,
      p9_activo: v.p9_activo, p9_c1: v.p9_c1, p9_c2: v.p9_c2, p9_c3: v.p9_c3, p9_c4: v.p9_c4, p9_c5: v.p9_c5, p9_c6: v.p9_c6, p9_c7: v.p9_c7, p9_c8: v.p9_c8, p9_c9: v.p9_c9, p9_total,
      p12_activo: v.p12_activo, p12_c1: v.p12_c1, p12_c2: v.p12_c2, p12_c3: v.p12_c3, p12_c4: v.p12_c4, p12_c5: v.p12_c5, p12_c6: v.p12_c6, p12_c7: v.p12_c7, p12_c8: v.p12_c8, p12_c9: v.p12_c9, p12_c10: v.p12_c10, p12_c11: v.p12_c11, p12_c12: v.p12_c12, p12_total,
    }).eq('id', id)
    setSaving(prev => ({ ...prev, [id]: false }))
    if (error) { showToast('Error al guardar', false); return }
    setDirty(prev => ({ ...prev, [id]: false }))
    setSaved(prev => ({ ...prev, [id]: true }))
    showToast(`✓ ${v.model} guardado`, true)
    setTimeout(() => setSaved(prev => ({ ...prev, [id]: false })), 2000)
  }

  async function toggleDisp(id: string) {
    const v = items.find(x => x.id === id)
    if (!v) return
    const newVal = !v.disponible
    setItems(prev => prev.map(x => x.id === id ? { ...x, disponible: newVal } : x))
    const { error } = await supabase.from('ac500_vehiculos').update({ disponible: newVal }).eq('id', id)
    if (error) {
      setItems(prev => prev.map(x => x.id === id ? { ...x, disponible: !newVal } : x))
      showToast('Error al actualizar', false)
    } else showToast(newVal ? '✓ Activado' : 'Desactivado', newVal)
  }

  async function saveNew() {
    if (!newV.id || !newV.model) { showToast('ID y Modelo son obligatorios', false); return }
    setSavingNew(true)
    const { error } = await supabase.from('ac500_vehiculos').insert([{
      id: newV.id.trim().toLowerCase().replace(/\s+/g, '-'),
      brand: newV.brand, model: newV.model, img_url: newV.img_url || null,
      colores: newV.colores || 'plata,gris,negro,blanco', orden: newV.orden ?? 99,
      disponible: true, reserva: newV.reserva ?? 500,
      p6_activo: false, p9_activo: false,
    }]).select().single()
    setSavingNew(false)
    if (error) { showToast('Error: ' + error.message, false); return }
    showToast('✓ Vehículo AC500 agregado', true)
    setShowModal(false)
    setNewV({ id: '', ...EMPTY })
    const { data } = await supabase.from('ac500_vehiculos').select('*').order('orden')
    if (data) setItems(data)
  }

  const inputCls = 'w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-oriental-black focus:outline-none focus:border-oriental-red transition-colors'
  const modalInputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red'

  const NumField = ({ v, field, label }: { v: AC500; field: keyof AC500; label: string }) => (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
      <input className={inputCls} type="number" step="0.01" value={(v[field] as number | null) ?? ''} placeholder="—"
        onChange={e => update(v.id, field, e.target.value ? parseFloat(e.target.value) : null)} />
    </div>
  )

  return (
    <>
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-oriental-black">
          Planes Asegúrate con $500
          <span className="ml-2 text-xs font-normal text-oriental-gray">({items.length} vehículos)</span>
        </h2>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-3 py-2 bg-oriental-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors">
          <Plus size={14} /> Agregar vehículo AC500
        </button>
      </div>

      <div className="space-y-3">
        {items.map(v => {
          const isDirty = dirty[v.id], isSaving = saving[v.id], isSaved = saved[v.id], open = expanded[v.id]
          const live6 = v.p6_activo ? sumPlan(v, P6_FIELDS) : null
          const live9 = v.p9_activo ? sumPlan(v, P9_FIELDS) : null
          const live12 = v.p12_activo ? sumPlan(v, P12_FIELDS) : null

          return (
            <div key={v.id} className={`card p-4 transition-all ${isDirty ? 'border-2 border-orange-300' : 'border border-gray-200'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${v.brand === 'MG' ? 'text-oriental-red' : 'text-blue-600'}`}>{v.brand}</span>
                  <p className="font-bold text-oriental-black text-base">{v.model}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">ID: {v.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{v.disponible ? 'Visible' : 'Oculto'}</span>
                  <Toggle on={!!v.disponible} onClick={() => toggleDisp(v.id)} />
                </div>
              </div>

              {/* Datos base */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reserva ($)</span>
                  <input className={inputCls} type="number" step="0.01" value={v.reserva ?? ''} onChange={e => update(v.id, 'reserva', e.target.value ? parseFloat(e.target.value) : null)} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Colores (coma)</span>
                  <input className={inputCls} type="text" value={v.colores ?? ''} placeholder="plata,gris,negro" onChange={e => update(v.id, 'colores', e.target.value)} />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">URL de imagen</span>
                  <input className={inputCls} type="text" value={v.img_url ?? ''} placeholder="https://..." onChange={e => update(v.id, 'img_url', e.target.value || null)} />
                </div>
              </div>

              <button onClick={() => setExpanded(prev => ({ ...prev, [v.id]: !prev[v.id] }))} className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-oriental-black transition-colors">
                {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                Editar cronograma de cuotas
                {v.p6_activo && <span className="bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">6m</span>}
                {v.p9_activo && <span className="bg-oriental-gold text-white text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#ca8a04' }}>9m</span>}
                {v.p12_activo && <span className="text-white text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#1e3a5f' }}>12m</span>}
              </button>

              {open && (
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Plan 6 meses */}
                  <div className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-oriental-black">Plan 6 meses</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{v.p6_activo ? 'Activo' : 'Inactivo'}</span>
                        <Toggle on={!!v.p6_activo} onClick={() => update(v.id, 'p6_activo', !v.p6_activo)} />
                      </div>
                    </div>
                    {v.p6_activo ? (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {P6_FIELDS.map((f, i) => <NumField key={f} v={v} field={f} label={P6_LABELS[i]} />)}
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 text-sm">
                          <span className="text-gray-500">Total (reserva + cuotas)</span>
                          <span className="font-bold text-green-700">${(live6 ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    ) : <p className="text-xs text-gray-400">Plan desactivado. Actívalo para editar las cuotas.</p>}
                  </div>

                  {/* Plan 9 meses */}
                  <div className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-oriental-black">Plan 9 meses</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{v.p9_activo ? 'Activo' : 'Inactivo'}</span>
                        <Toggle on={!!v.p9_activo} onClick={() => update(v.id, 'p9_activo', !v.p9_activo)} />
                      </div>
                    </div>
                    {v.p9_activo ? (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {P9_FIELDS.map((f, i) => <NumField key={f} v={v} field={f} label={P9_LABELS[i]} />)}
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 text-sm">
                          <span className="text-gray-500">Total (reserva + cuotas)</span>
                          <span className="font-bold text-green-700">${(live9 ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    ) : <p className="text-xs text-gray-400">Plan desactivado. Actívalo para editar las cuotas.</p>}
                  </div>

                  {/* Plan 12 meses */}
                  <div className="border border-gray-200 rounded-xl p-4 lg:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-oriental-black">Plan 12 meses</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{v.p12_activo ? 'Activo' : 'Inactivo'}</span>
                        <Toggle on={!!v.p12_activo} onClick={() => update(v.id, 'p12_activo', !v.p12_activo)} />
                      </div>
                    </div>
                    {v.p12_activo ? (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {P12_FIELDS.map((f, i) => <NumField key={f} v={v} field={f} label={P12_LABELS[i]} />)}
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 text-sm">
                          <span className="text-gray-500">Total (reserva + cuotas)</span>
                          <span className="font-bold text-green-700">${(live12 ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    ) : <p className="text-xs text-gray-400">Plan desactivado. Actívalo para editar las cuotas.</p>}
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-4">
                <button onClick={() => save(v.id)} disabled={isSaving || !isDirty}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                    isSaved ? 'bg-green-600 text-white' :
                    isDirty ? 'bg-oriental-red text-white hover:bg-oriental-red-dark' :
                    'bg-gray-100 text-gray-400 cursor-default'}`}>
                  {isSaving ? 'Guardando...' : isSaved ? <><Check size={13} /> Guardado</> : 'Guardar cambios'}
                </button>
              </div>
            </div>
          )
        })}

        {items.length === 0 && (
          <div className="card p-16 text-center text-oriental-gray">
            <p className="mb-2">No hay vehículos AC500 registrados.</p>
            <button onClick={() => setShowModal(true)} className="text-oriental-red text-sm font-semibold hover:underline">Agregar el primero</button>
          </div>
        )}
      </div>

      {/* Modal nuevo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <h3 className="font-bold text-oriental-black text-lg">Nuevo vehículo AC500</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-oriental-black"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Marca *</label>
                  <select className={modalInputCls} value={newV.brand} onChange={e => setNewV(p => ({ ...p, brand: e.target.value as 'MG' | 'MAXUS' }))}>
                    <option value="MG">MG</option>
                    <option value="MAXUS">MAXUS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">ID único *</label>
                  <input className={modalInputCls} type="text" value={newV.id} onChange={e => setNewV(p => ({ ...p, id: e.target.value }))} placeholder="ac500-mg-hs" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Modelo *</label>
                <input className={modalInputCls} type="text" value={newV.model} onChange={e => setNewV(p => ({ ...p, model: e.target.value }))} placeholder="MG HS 1.5T AT" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">URL de imagen</label>
                <input className={modalInputCls} type="text" value={newV.img_url ?? ''} onChange={e => setNewV(p => ({ ...p, img_url: e.target.value || null }))} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Reserva ($)</label>
                  <input className={modalInputCls} type="number" step="0.01" value={newV.reserva ?? ''} onChange={e => setNewV(p => ({ ...p, reserva: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Orden</label>
                  <input className={modalInputCls} type="number" step="1" value={newV.orden ?? 99} onChange={e => setNewV(p => ({ ...p, orden: parseInt(e.target.value) || 99 }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Colores</label>
                  <input className={modalInputCls} type="text" value={newV.colores ?? ''} onChange={e => setNewV(p => ({ ...p, colores: e.target.value }))} placeholder="plata,gris" />
                </div>
              </div>
              <p className="text-xs text-gray-400">Luego de crearlo, activa el plan 6 o 9 meses y edita las cuotas una por una.</p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={saveNew} disabled={savingNew} className="flex-1 px-4 py-2.5 bg-oriental-black text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50">
                {savingNew ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
