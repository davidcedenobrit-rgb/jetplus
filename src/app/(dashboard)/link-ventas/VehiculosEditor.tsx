'use client'

import { useState, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Check, X, RefreshCw } from 'lucide-react'

type ShowroomItem = { marca: string; modelo: string; unidades: number }

// Extrae el código clave de un nombre de modelo (RX5, D60, MG3, ZS, etc.)
function extractKey(model: string): string {
  const m = model.toUpperCase().replace(/[()]/g, '')
  const codes = ['MG3','MG5','MG6','MG7','RX5','RX8','RX9','D60','D90','D60','S80','T60','T90','T50','ZS','HS','HS5']
  for (const c of codes) {
    if (m.includes(c)) return c
  }
  return m.split(/\s+/).find(t => /^[A-Z][A-Z0-9]{1,4}$/.test(t)) ?? m.split(' ')[0]
}

function tieneStock(brand: string, model: string, stock: ShowroomItem[]): number {
  const key = extractKey(model)
  return stock
    .filter(s => s.marca.toUpperCase() === brand.toUpperCase() && extractKey(s.modelo) === key)
    .reduce((sum, s) => sum + s.unidades, 0)
}

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
  placa_monto: number | null
  gcr_banco: number | null
  cuota_banco: number | null
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
  placa_monto: 400, gcr_banco: null, cuota_banco: null,
}

export default function VehiculosEditor({ initialVehiculos, showroomStock }: { initialVehiculos: Vehiculo[]; showroomStock: ShowroomItem[] }) {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>(initialVehiculos)
  const [dirty, setDirty] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // Ordenar: primero los que tienen stock en showroom, luego el resto
  const vehiculosOrdenados = useMemo(() => {
    const conStock = vehiculos.filter(v => tieneStock(v.brand, v.model, showroomStock) > 0)
    const sinStock = vehiculos.filter(v => tieneStock(v.brand, v.model, showroomStock) === 0)
    return [...conStock, ...sinStock]
  }, [vehiculos, showroomStock])

  const modelosEnShowroom = useMemo(
    () => vehiculos.filter(v => tieneStock(v.brand, v.model, showroomStock) > 0),
    [vehiculos, showroomStock]
  )
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
      placa_monto: v.placa_monto, gcr_banco: v.gcr_banco, cuota_banco: v.cuota_banco,
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

  async function sincronizarShowroom() {
    setSyncing(true)
    let ok = 0, fail = 0
    for (const v of vehiculos) {
      const stock = tieneStock(v.brand, v.model, showroomStock)
      const nuevoDisp = stock > 0
      if (!!v.disponible === nuevoDisp) continue // ya está correcto
      const { error } = await supabase.from('catalogo_ventas').update({ disponible: nuevoDisp }).eq('id', v.id)
      if (error) { fail++; continue }
      ok++
      setVehiculos(prev => prev.map(x => x.id === v.id ? { ...x, disponible: nuevoDisp } : x))
    }
    setSyncing(false)
    if (fail > 0) showToast(`Sincronizado con ${fail} error(es)`, false)
    else showToast(`✓ Catálogo sincronizado con showroom (${ok} cambio${ok !== 1 ? 's' : ''})`, true)
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
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-oriental-black">
          Catálogo de vehículos
          <span className="ml-2 text-xs font-normal text-oriental-gray">({vehiculos.length} modelos)</span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={sincronizarShowroom}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-2 border border-orange-300 bg-orange-50 text-orange-700 text-xs font-semibold rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50"
            title="Activa los modelos con stock en showroom y desactiva los que no tienen"
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            Sync showroom
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-oriental-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus size={14} /> Agregar
          </button>
        </div>
      </div>

      {/* Banner showroom */}
      {modelosEnShowroom.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-lg">🏪</span>
          <div className="flex-1">
            <p className="text-xs font-bold text-amber-800">
              {modelosEnShowroom.length} modelo{modelosEnShowroom.length !== 1 ? 's' : ''} en showroom con stock disponible
            </p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Aparecen primero — verifica que los precios y gastos estén actualizados antes de activarlos en el catálogo público.
            </p>
          </div>
          <button
            onClick={sincronizarShowroom}
            disabled={syncing}
            className="flex-shrink-0 px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
          </button>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-3">
        {vehiculosOrdenados.map(v => {
          const colorsArr = (v.colores || '').split(',').map(c => c.trim()).filter(Boolean)
          const isDirty = dirty[v.id]
          const isSaving = saving[v.id]
          const isSaved = saved[v.id]
          const unidadesShowroom = tieneStock(v.brand, v.model, showroomStock)
          const enShowroom = unidadesShowroom > 0

          return (
            <div key={v.id} className={`card p-4 transition-all ${
              enShowroom && isDirty ? 'border-2 border-orange-400' :
              enShowroom ? 'border-2 border-amber-300 bg-amber-50/30' :
              isDirty ? 'border-2 border-orange-300' : 'border border-gray-200'
            }`}>
              {/* Banner showroom en la card */}
              {enShowroom && (
                <div className="flex items-center gap-2 mb-3 px-2.5 py-1.5 bg-amber-100 border border-amber-200 rounded-lg">
                  <span className="text-sm">🏪</span>
                  <span className="text-[11px] font-bold text-amber-800">
                    {unidadesShowroom} unidad{unidadesShowroom !== 1 ? 'es' : ''} en showroom — verifica precios antes de activar
                  </span>
                </div>
              )}
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

              {/* Plan 100% Banco */}
              <div className="border-t border-dashed border-gray-200 pt-3 mt-1 mb-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Plan 100% Banco (crédito bancario)</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Placa ($)">
                    <input className={inputCls} type="number" step="0.01" value={v.placa_monto ?? 400} onChange={e => update(v.id, 'placa_monto', e.target.value ? parseFloat(e.target.value) : null)} placeholder="400" />
                  </Field>
                  <Field label="Gastos Banco ($)">
                    <input className={inputCls} type="number" step="0.01" value={v.gcr_banco ?? ''} onChange={e => update(v.id, 'gcr_banco', e.target.value ? parseFloat(e.target.value) : null)} placeholder="0" />
                  </Field>
                  <Field label="Cuota Banco ($/mes)">
                    <input className={inputCls} type="number" step="0.01" value={v.cuota_banco ?? ''} onChange={e => update(v.id, 'cuota_banco', e.target.value ? parseFloat(e.target.value) : null)} placeholder="0" />
                  </Field>
                </div>
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
