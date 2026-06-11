'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Check, X } from 'lucide-react'

interface Vehiculo {
  id: string
  brand: 'MG' | 'MAXUS'
  model: string
  img_url: string | null
  cash: number | null
  gc: number | null
  gcr: number | null
  tasa_credito: number | null
  stock: number | null
  ano: number | null
  transmision: string | null
  colores: string | null
  orden: number | null
  disponible: boolean | null
  ac500_visible: boolean | null
  ac500_6m_cuota: number | null
  ac500_9m_cuota: number | null
  ac500_12m_cuota: number | null
}

const CMAP: Record<string, string> = {
  blanco:'#f8f8f8',blanca:'#f8f8f8',negro:'#1a1a1a',negra:'#1a1a1a',
  rojo:'#dc2626',roja:'#dc2626',gris:'#9ca3af',grises:'#9ca3af',
  plata:'#c0c0c0',plateado:'#c0c0c0',plateada:'#c0c0c0',
  azul:'#2563eb',azules:'#2563eb',verde:'#16a34a',verdes:'#16a34a',
  amarillo:'#eab308',naranja:'#ea580c',beige:'#d4c5a9',
  marron:'#78350f','marrón':'#78350f',dorado:'#b8860b',
  celeste:'#7dd3fc','borgoña':'#7f1d1d',vino:'#7f1d1d',perla:'#f1f0eb',
}
function cHex(n: string) { return CMAP[n.trim().toLowerCase()] ?? '#6b7280' }

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-10 h-6 rounded-full relative transition-colors ${on ? 'bg-oriental-red' : 'bg-gray-300'}`}
    >
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? 'left-5' : 'left-1'}`} />
    </button>
  )
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg text-white ${ok ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg}
    </div>
  )
}

const EMPTY_VEHICULO: Omit<Vehiculo, 'id'> = {
  brand: 'MG', model: '', img_url: '', cash: null, gc: null, gcr: null,
  tasa_credito: null, stock: 0, ano: 2026, transmision: 'Automático',
  colores: '', orden: 99, disponible: true,
  ac500_visible: false, ac500_6m_cuota: null, ac500_9m_cuota: null, ac500_12m_cuota: null,
}

export default function VehiculosEditor({ initialVehiculos }: { initialVehiculos: Vehiculo[] }) {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>(initialVehiculos)
  const [dirty, setDirty] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [newV, setNewV] = useState<{ id: string } & typeof EMPTY_VEHICULO>({ id: '', ...EMPTY_VEHICULO })
  const [savingNew, setSavingNew] = useState(false)
  const supabase = createClient()
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    if (toastRef.current) clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(null), 2800)
  }

  function update(id: string, field: keyof Vehiculo, value: unknown) {
    setVehiculos(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v))
    setDirty(prev => ({ ...prev, [id]: true }))
    setSaved(prev => ({ ...prev, [id]: false }))
  }

  async function save(id: string) {
    const v = vehiculos.find(x => x.id === id)
    if (!v) return
    setSaving(prev => ({ ...prev, [id]: true }))
    const { error } = await supabase.from('catalogo_ventas').update({
      brand: v.brand, model: v.model, img_url: v.img_url,
      cash: v.cash, gc: v.gc, gcr: v.gcr, tasa_credito: v.tasa_credito,
      stock: v.stock, ano: v.ano, transmision: v.transmision, colores: v.colores,
      orden: v.orden, disponible: v.disponible,
      ac500_visible: v.ac500_visible, ac500_6m_cuota: v.ac500_6m_cuota,
      ac500_9m_cuota: v.ac500_9m_cuota, ac500_12m_cuota: v.ac500_12m_cuota,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    setSaving(prev => ({ ...prev, [id]: false }))
    if (error) { showToast('Error al guardar', false); return }
    setDirty(prev => ({ ...prev, [id]: false }))
    setSaved(prev => ({ ...prev, [id]: true }))
    showToast(`✓ ${v.model} guardado`, true)
    setTimeout(() => setSaved(prev => ({ ...prev, [id]: false })), 2000)
  }

  async function toggleDisp(id: string) {
    const v = vehiculos.find(x => x.id === id)
    if (!v) return
    const newVal = !v.disponible
    setVehiculos(prev => prev.map(x => x.id === id ? { ...x, disponible: newVal } : x))
    const { error } = await supabase.from('catalogo_ventas').update({ disponible: newVal }).eq('id', id)
    if (error) {
      setVehiculos(prev => prev.map(x => x.id === id ? { ...x, disponible: !newVal } : x))
      showToast('Error al actualizar', false)
    } else {
      showToast(newVal ? '✓ Vehículo activado' : 'Vehículo desactivado', newVal)
    }
  }

  async function saveNew() {
    if (!newV.id || !newV.model) { showToast('ID y Modelo son obligatorios', false); return }
    setSavingNew(true)
    const { error } = await supabase.from('catalogo_ventas').insert([{
      id: newV.id.trim().toLowerCase().replace(/\s+/g, '-'),
      brand: newV.brand, model: newV.model, img_url: newV.img_url || null,
      cash: newV.cash, gc: newV.gc, gcr: newV.gcr, tasa_credito: newV.tasa_credito,
      stock: newV.stock ?? 0, ano: newV.ano ?? 2026, transmision: newV.transmision,
      colores: newV.colores || '', orden: newV.orden ?? 99, disponible: true,
      ac500_visible: false,
    }]).select().single()
    setSavingNew(false)
    if (error) { showToast('Error: ' + error.message, false); return }
    showToast('✓ Vehículo agregado', true)
    setShowModal(false)
    setNewV({ id: '', ...EMPTY_VEHICULO })
    const { data } = await supabase.from('catalogo_ventas').select('*').order('orden')
    if (data) setVehiculos(data)
  }

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
      {children}
    </div>
  )

  const inputCls = 'w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-oriental-black focus:outline-none focus:border-oriental-red transition-colors'
  const modalInputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red'

  return (
    <>
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* Header del catálogo */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-oriental-black">
          Catálogo de vehículos
          <span className="ml-2 text-xs font-normal text-oriental-gray">({vehiculos.length} modelos)</span>
        </h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-oriental-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus size={14} /> Agregar vehículo
        </button>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {vehiculos.map(v => {
          const colorsArr = (v.colores || '').split(',').map(c => c.trim()).filter(Boolean)
          const isDirty = dirty[v.id]
          const isSaving = saving[v.id]
          const isSaved = saved[v.id]

          return (
            <div key={v.id} className={`card p-4 transition-all ${isDirty ? 'border-2 border-orange-300' : 'border border-gray-200'}`}>
              {/* Top row: brand + model + toggle */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${v.brand === 'MG' ? 'text-oriental-red' : 'text-blue-600'}`}>
                    {v.brand}
                  </span>
                  <p className="font-bold text-oriental-black text-base">{v.model}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">ID: {v.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{v.disponible ? 'Activo' : 'Inactivo'}</span>
                  <Toggle on={!!v.disponible} onClick={() => toggleDisp(v.id)} />
                </div>
              </div>

              {/* Grid de campos */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
                <Field label="Precio Base ($)">
                  <input className={inputCls} type="number" step="0.01" value={v.cash ?? ''} onChange={e => update(v.id, 'cash', e.target.value ? parseFloat(e.target.value) : null)} />
                </Field>
                <Field label="G. Contado ($)">
                  <input className={inputCls} type="number" step="0.01" value={v.gc ?? ''} onChange={e => update(v.id, 'gc', e.target.value ? parseFloat(e.target.value) : null)} />
                </Field>
                <Field label="G. Crédito ($)">
                  <input className={inputCls} type="number" step="0.01" value={v.gcr ?? ''} onChange={e => update(v.id, 'gcr', e.target.value ? parseFloat(e.target.value) : null)} />
                </Field>
                <Field label="Cuota 24m ($/mes)">
                  <input className={inputCls} type="number" step="0.01" value={v.tasa_credito ?? ''} onChange={e => update(v.id, 'tasa_credito', e.target.value ? parseFloat(e.target.value) : null)} />
                </Field>
                <Field label="Stock">
                  <input className={inputCls} type="number" step="1" min="0" value={v.stock ?? 0} onChange={e => update(v.id, 'stock', parseInt(e.target.value) || 0)} />
                </Field>
                <Field label="Año">
                  <input className={inputCls} type="number" step="1" value={v.ano ?? 2026} onChange={e => update(v.id, 'ano', parseInt(e.target.value) || 2026)} />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <Field label="Transmisión">
                  <select className={inputCls} value={v.transmision ?? 'Automático'} onChange={e => update(v.id, 'transmision', e.target.value)}>
                    <option>Automático</option>
                    <option>Sincrónico</option>
                    <option>Ambos</option>
                  </select>
                </Field>
                <Field label="Colores (separados por coma)">
                  <input className={inputCls} type="text" value={v.colores ?? ''} placeholder="Blanco, Negro, Rojo..." onChange={e => update(v.id, 'colores', e.target.value)} />
                </Field>
                <Field label="Vista previa de colores">
                  <div className="flex gap-1.5 flex-wrap items-center h-8">
                    {colorsArr.length ? colorsArr.map(c => (
                      <div key={c} title={c} className="w-5 h-5 rounded-full border border-gray-300 flex-shrink-0" style={{ background: cHex(c) }} />
                    )) : <span className="text-xs text-gray-400">Sin colores</span>}
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <Field label="URL de imagen">
                  <input className={inputCls} type="text" value={v.img_url ?? ''} placeholder="https://..." onChange={e => update(v.id, 'img_url', e.target.value || null)} />
                </Field>
                <Field label="Orden (número menor = aparece primero)">
                  <input className={inputCls} type="number" step="1" value={v.orden ?? 99} onChange={e => update(v.id, 'orden', parseInt(e.target.value) || 99)} />
                </Field>
              </div>

              {/* Bottom: save */}
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => save(v.id)}
                  disabled={isSaving || !isDirty}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                    isSaved ? 'bg-green-600 text-white' :
                    isDirty ? 'bg-oriental-red text-white hover:bg-oriental-red-dark' :
                    'bg-gray-100 text-gray-400 cursor-default'
                  }`}
                >
                  {isSaving ? 'Guardando...' : isSaved ? <><Check size={13} /> Guardado</> : 'Guardar cambios'}
                </button>
              </div>
            </div>
          )
        })}

        {vehiculos.length === 0 && (
          <div className="card p-16 text-center text-oriental-gray">
            <p className="mb-2">No hay vehículos registrados.</p>
            <button onClick={() => setShowModal(true)} className="text-oriental-red text-sm font-semibold hover:underline">
              Agregar el primero
            </button>
          </div>
        )}
      </div>

      {/* Modal agregar vehículo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <h3 className="font-bold text-oriental-black text-lg">Nuevo vehículo</h3>
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
                  <label className="block text-xs font-semibold text-gray-500 mb-1">ID único * <span className="font-normal">(ej: mg-hs-trophy)</span></label>
                  <input className={modalInputCls} type="text" value={newV.id} onChange={e => setNewV(p => ({ ...p, id: e.target.value }))} placeholder="mg-hs-trophy" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Modelo *</label>
                <input className={modalInputCls} type="text" value={newV.model} onChange={e => setNewV(p => ({ ...p, model: e.target.value }))} placeholder="MG HS TROPHY" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">URL de imagen</label>
                <input className={modalInputCls} type="text" value={newV.img_url ?? ''} onChange={e => setNewV(p => ({ ...p, img_url: e.target.value || null }))} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Precio Base ($)</label>
                  <input className={modalInputCls} type="number" step="0.01" value={newV.cash ?? ''} onChange={e => setNewV(p => ({ ...p, cash: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="30000" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">G. Contado ($)</label>
                  <input className={modalInputCls} type="number" step="0.01" value={newV.gc ?? ''} onChange={e => setNewV(p => ({ ...p, gc: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="3500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">G. Crédito ($)</label>
                  <input className={modalInputCls} type="number" step="0.01" value={newV.gcr ?? ''} onChange={e => setNewV(p => ({ ...p, gcr: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="5000" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Cuota 24m ($/mes)</label>
                  <input className={modalInputCls} type="number" step="0.01" value={newV.tasa_credito ?? ''} onChange={e => setNewV(p => ({ ...p, tasa_credito: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Stock</label>
                  <input className={modalInputCls} type="number" step="1" min="0" value={newV.stock ?? 0} onChange={e => setNewV(p => ({ ...p, stock: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Año</label>
                  <input className={modalInputCls} type="number" step="1" value={newV.ano ?? 2026} onChange={e => setNewV(p => ({ ...p, ano: parseInt(e.target.value) || 2026 }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Transmisión</label>
                  <select className={modalInputCls} value={newV.transmision ?? 'Automático'} onChange={e => setNewV(p => ({ ...p, transmision: e.target.value }))}>
                    <option>Automático</option>
                    <option>Sincrónico</option>
                    <option>Ambos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Orden</label>
                  <input className={modalInputCls} type="number" step="1" value={newV.orden ?? 99} onChange={e => setNewV(p => ({ ...p, orden: parseInt(e.target.value) || 99 }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Colores (separados por coma)</label>
                <input className={modalInputCls} type="text" value={newV.colores ?? ''} onChange={e => setNewV(p => ({ ...p, colores: e.target.value }))} placeholder="Blanco, Negro, Rojo" />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={saveNew} disabled={savingNew} className="flex-1 px-4 py-2.5 bg-oriental-black text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50">
                {savingNew ? 'Guardando...' : 'Guardar vehículo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
