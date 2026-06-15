'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Check, X, RefreshCw, Pencil, ChevronUp } from 'lucide-react'

type ShowroomItem = { marca: string; modelo: string; unidades: number }

function extractKey(model: string): string {
  const m = model.toUpperCase().replace(/[()]/g, '')

  // ZS: diferenciar clásico vs new (el showroom solo tiene NEW MG ZS AT COM)
  if (m.includes('ZS')) {
    if (m.includes('CLASICO') || m.includes('CLÁSICO')) return 'ZS-CLASICO'
    return 'ZS-NEW'
  }

  // MG3: diferenciar automático vs sincrónico (el showroom solo tiene AT)
  if (m.includes('MG3')) {
    if (m.includes(' MT') || m.includes('SINCRONIC') || m.includes('SINCRÓNIC')) return 'MG3-MT'
    return 'MG3-AT'
  }

  const codes = ['MG5','MG6','MG7','RX5','RX8','RX9','D60','D90','S80','T60','T90','T50','HS5','HS']
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
      className={`w-10 h-6 rounded-full relative transition-colors flex-shrink-0 ${on ? 'bg-oriental-red' : 'bg-gray-300'}`}
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">{children}</p>
}

function NumField({ value, onCommit, placeholder, className }: {
  value: number | null
  onCommit: (v: number | null) => void
  placeholder?: string
  className?: string
}) {
  const [raw, setRaw] = useState(value != null ? String(value) : '')
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setRaw(value != null ? String(value) : '')
  }, [value])

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      value={raw}
      placeholder={placeholder ?? '0'}
      onFocus={e => { focused.current = true; e.target.select() }}
      onChange={e => setRaw(e.target.value)}
      onBlur={() => {
        focused.current = false
        const parsed = parseFloat(raw.replace(',', '.'))
        const final = isNaN(parsed) ? null : parsed
        onCommit(final)
        setRaw(final != null ? String(final) : '')
      }}
    />
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [newV, setNewV] = useState<{ id: string } & typeof EMPTY_VEHICULO>({ id: '', ...EMPTY_VEHICULO })
  const [savingNew, setSavingNew] = useState(false)
  const supabase = createClient()
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const vehiculosOrdenados = useMemo(() => {
    const conStock = vehiculos.filter(v => tieneStock(v.brand, v.model, showroomStock) > 0)
    const sinStock = vehiculos.filter(v => tieneStock(v.brand, v.model, showroomStock) === 0)
    return [...conStock, ...sinStock]
  }, [vehiculos, showroomStock])

  const modelosEnShowroom = useMemo(
    () => vehiculos.filter(v => tieneStock(v.brand, v.model, showroomStock) > 0),
    [vehiculos, showroomStock]
  )

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

  function toggleExpand(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
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
      if (!!v.disponible === nuevoDisp) continue
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

  const inputCls = 'w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-oriental-black focus:outline-none focus:border-oriental-red transition-colors'
  const modalInputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red'

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-gray-500">{label}</span>
        {children}
      </div>
    )
  }

  return (
    <>
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* Header */}
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
      <div className="space-y-2">
        {vehiculosOrdenados.map(v => {
          const colorsArr = (v.colores || '').split(',').map(c => c.trim()).filter(Boolean)
          const isDirty = dirty[v.id]
          const isSaving = saving[v.id]
          const isSaved = saved[v.id]
          const isExpanded = expanded[v.id] || false
          const unidadesShowroom = tieneStock(v.brand, v.model, showroomStock)
          const enShowroom = unidadesShowroom > 0

          return (
            <div
              key={v.id}
              className={`rounded-xl border transition-all bg-white ${
                enShowroom && isDirty ? 'border-2 border-orange-400' :
                enShowroom ? 'border-2 border-amber-300' :
                isDirty ? 'border-orange-300 shadow-sm' : 'border-gray-200'
              }`}
            >
              {/* Collapsed row — always visible */}
              <div className="flex items-center gap-3 px-4 py-3">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded flex-shrink-0 ${
                  v.brand === 'MG' ? 'bg-red-50 text-oriental-red' : 'bg-blue-50 text-blue-600'
                }`}>
                  {v.brand}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-oriental-black text-sm truncate">
                      {v.model || <span className="text-gray-400">Sin nombre</span>}
                    </p>
                    {enShowroom && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded flex-shrink-0">
                        🏪 {unidadesShowroom}u showroom
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    {v.cash ? `$${v.cash.toLocaleString('es-VE', { minimumFractionDigits: 0 })}` : 'Sin precio'}
                    {v.stock != null ? ` · ${v.stock} en stock` : ''}
                    {v.ano ? ` · ${v.ano}` : ''}
                  </p>
                </div>

                {isDirty && !isExpanded && (
                  <span className="text-[10px] font-semibold text-orange-500 bg-orange-50 px-2 py-0.5 rounded flex-shrink-0">
                    Sin guardar
                  </span>
                )}

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    v.disponible ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {v.disponible ? 'Activo' : 'Inactivo'}
                  </span>
                  <Toggle on={!!v.disponible} onClick={() => toggleDisp(v.id)} />
                </div>

                <button
                  onClick={() => toggleExpand(v.id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
                    isExpanded
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-oriental-black text-white hover:bg-gray-800'
                  }`}
                >
                  {isExpanded ? <><ChevronUp size={13} /> Cerrar</> : <><Pencil size={12} /> Editar</>}
                </button>
              </div>

              {/* Expanded edit panel */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-5 py-5 space-y-5 bg-gray-50 rounded-b-xl">

                  {enShowroom && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <span>🏪</span>
                      <span className="text-xs font-bold text-amber-800">
                        {unidadesShowroom} unidad{unidadesShowroom !== 1 ? 'es' : ''} en showroom — verifica precios antes de activar
                      </span>
                    </div>
                  )}

                  {/* Identidad */}
                  <div>
                    <SectionLabel>Identidad del vehículo</SectionLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Field label="Marca">
                        <select className={inputCls} value={v.brand} onChange={e => update(v.id, 'brand', e.target.value as 'MG' | 'MAXUS')}>
                          <option value="MG">MG</option>
                          <option value="MAXUS">MAXUS</option>
                        </select>
                      </Field>
                      <Field label="Nombre del modelo">
                        <input className={inputCls} type="text" value={v.model} onChange={e => update(v.id, 'model', e.target.value)} placeholder="MG HS TROPHY" />
                      </Field>
                      <Field label="ID interno">
                        <input className={`${inputCls} bg-gray-100 cursor-not-allowed`} type="text" value={v.id} readOnly />
                      </Field>
                    </div>
                  </div>

                  {/* Precios */}
                  <div>
                    <SectionLabel>Precios y financiamiento</SectionLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <Field label="Precio base ($)">
                        <NumField className={inputCls} value={v.cash} placeholder="30000" onCommit={n => update(v.id, 'cash', n)} />
                      </Field>
                      <Field label="Gastos de contado ($)">
                        <NumField className={inputCls} value={v.gc} placeholder="3500" onCommit={n => update(v.id, 'gc', n)} />
                      </Field>
                      <Field label="Gastos de crédito ($)">
                        <NumField className={inputCls} value={v.gcr} placeholder="5000" onCommit={n => update(v.id, 'gcr', n)} />
                      </Field>
                      <Field label="Cuota a 24 meses ($/mes)">
                        <NumField className={inputCls} value={v.tasa_credito} placeholder="500" onCommit={n => update(v.id, 'tasa_credito', n)} />
                      </Field>
                    </div>
                  </div>

                  {/* Plan banco */}
                  <div>
                    <SectionLabel>Plan 100% banco (crédito bancario)</SectionLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Field label="Monto de placa ($)">
                        <NumField className={inputCls} value={v.placa_monto} placeholder="400" onCommit={n => update(v.id, 'placa_monto', n)} />
                      </Field>
                      <Field label="Gastos del banco ($)">
                        <NumField className={inputCls} value={v.gcr_banco} placeholder="0" onCommit={n => update(v.id, 'gcr_banco', n)} />
                      </Field>
                      <Field label="Cuota mensual banco ($/mes)">
                        <NumField className={inputCls} value={v.cuota_banco} placeholder="0" onCommit={n => update(v.id, 'cuota_banco', n)} />
                      </Field>
                    </div>
                  </div>

                  {/* Info del auto */}
                  <div>
                    <SectionLabel>Información del vehículo</SectionLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <Field label="Año">
                        <NumField className={inputCls} value={v.ano} placeholder="2026" onCommit={n => update(v.id, 'ano', n != null ? Math.round(n) : 2026)} />
                      </Field>
                      <Field label="Transmisión">
                        <select className={inputCls} value={v.transmision ?? 'Automático'} onChange={e => update(v.id, 'transmision', e.target.value)}>
                          <option>Automático</option>
                          <option>Sincrónico</option>
                          <option>Ambos</option>
                        </select>
                      </Field>
                      <Field label="Unidades en stock">
                        <NumField className={inputCls} value={v.stock} placeholder="0" onCommit={n => update(v.id, 'stock', n != null ? Math.round(n) : 0)} />
                      </Field>
                      <Field label="Orden de aparición">
                        <NumField className={inputCls} value={v.orden} placeholder="99" onCommit={n => update(v.id, 'orden', n != null ? Math.round(n) : 99)} />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <Field label="URL de imagen">
                        <input className={inputCls} type="text" value={v.img_url ?? ''} placeholder="https://..." onChange={e => update(v.id, 'img_url', e.target.value || null)} />
                      </Field>
                      <Field label="Colores disponibles (separar por coma)">
                        <input className={inputCls} type="text" value={v.colores ?? ''} placeholder="Blanco, Negro, Rojo..." onChange={e => update(v.id, 'colores', e.target.value)} />
                      </Field>
                    </div>

                    {colorsArr.length > 0 && (
                      <div className="flex gap-2 flex-wrap items-center mt-2">
                        {colorsArr.map(c => (
                          <div key={c} className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0" style={{ background: cHex(c) }} />
                            <span className="text-xs text-gray-500">{c}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Guardar */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-400">ID: <code className="font-mono">{v.id}</code></p>
                    <button
                      onClick={() => save(v.id)}
                      disabled={isSaving || !isDirty}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                        isSaved
                          ? 'bg-green-600 text-white'
                          : isDirty
                          ? 'bg-oriental-red text-white hover:bg-oriental-red-dark'
                          : 'bg-gray-100 text-gray-400 cursor-default'
                      }`}
                    >
                      {isSaving ? 'Guardando...' : isSaved ? <><Check size={15} /> Guardado</> : 'Guardar cambios'}
                    </button>
                  </div>
                </div>
              )}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Precio base ($)</label>
                  <input className={modalInputCls} type="number" step="0.01" value={newV.cash ?? ''} onChange={e => setNewV(p => ({ ...p, cash: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="30000" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Gastos de contado ($)</label>
                  <input className={modalInputCls} type="number" step="0.01" value={newV.gc ?? ''} onChange={e => setNewV(p => ({ ...p, gc: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="3500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Gastos de crédito ($)</label>
                  <input className={modalInputCls} type="number" step="0.01" value={newV.gcr ?? ''} onChange={e => setNewV(p => ({ ...p, gcr: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="5000" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Cuota a 24 meses ($/mes)</label>
                  <input className={modalInputCls} type="number" step="0.01" value={newV.tasa_credito ?? ''} onChange={e => setNewV(p => ({ ...p, tasa_credito: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Stock</label>
                  <input className={modalInputCls} type="number" step="1" min="0" value={newV.stock ?? 0} onChange={e => setNewV(p => ({ ...p, stock: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Año</label>
                  <input className={modalInputCls} type="number" step="1" value={newV.ano ?? 2026} onChange={e => setNewV(p => ({ ...p, ano: parseInt(e.target.value) || 2026 }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Orden</label>
                  <input className={modalInputCls} type="number" step="1" value={newV.orden ?? 99} onChange={e => setNewV(p => ({ ...p, orden: parseInt(e.target.value) || 99 }))} />
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
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Colores (separados por coma)</label>
                  <input className={modalInputCls} type="text" value={newV.colores ?? ''} onChange={e => setNewV(p => ({ ...p, colores: e.target.value }))} placeholder="Blanco, Negro, Rojo" />
                </div>
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
