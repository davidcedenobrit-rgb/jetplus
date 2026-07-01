'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Check, X, RefreshCw, Pencil, ChevronUp, Zap, Send } from 'lucide-react'

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
  // Gastos contado (línea a línea)
  placa_c: number | null
  poliza_vehiculo_c: number | null
  poliza_vida_c: number | null
  gastos_vhm_c: number | null
  honorarios_c: number | null
  gastos_int_c: number | null
  alfombras_c: number | null
  // Gastos crédito (línea a línea)
  placa_cr: number | null
  poliza_vehiculo_cr: number | null
  poliza_vida_cr: number | null
  gastos_vhm_cr: number | null
  honorarios_cr: number | null
  gastos_int_cr: number | null
  alfombras_cr: number | null
  // Plan 100% banco
  placa_monto: number | null
  poliza_vehiculo_banco: number | null
  poliza_vida_banco: number | null
  honorarios_banco: number | null
  gastos_internos_banco: number | null
  alfombras_banco: number | null
  diferencial_pct: number | null
  tasa_banco_pct: number | null
  tasa_vhm_pct: number | null
  cuotas_vhm: number | null
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
  placa_c: null, poliza_vehiculo_c: null, poliza_vida_c: null,
  gastos_vhm_c: null, honorarios_c: null, gastos_int_c: null, alfombras_c: null,
  placa_cr: null, poliza_vehiculo_cr: null, poliza_vida_cr: null,
  gastos_vhm_cr: null, honorarios_cr: null, gastos_int_cr: null, alfombras_cr: null,
  placa_monto: 400,
  poliza_vehiculo_banco: null, poliza_vida_banco: null, honorarios_banco: null,
  gastos_internos_banco: null, alfombras_banco: null,
  diferencial_pct: 30, tasa_banco_pct: 16,
  tasa_vhm_pct: null, cuotas_vhm: 24,
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

  // Quick cotización
  type QModal = 'contado' | 'credito_24' | 'banco_100'
  type QStep = 'preview' | 'email' | 'result'
  const [quickV, setQuickV] = useState<Vehiculo | null>(null)
  const [qStep, setQStep] = useState<QStep>('preview')
  const [qForm, setQForm] = useState({ codigo: 'R000', nombre: '', correo: '', cirif: '', modalidad: 'contado' as QModal })
  const [qSending, setQSending] = useState(false)
  const [qResult, setQResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const captureRef = useRef<HTMLDivElement>(null)

  function openQuick(v: Vehiculo) {
    setQuickV(v); setQStep('preview'); setQResult(null)
    setQForm(p => ({ ...p, nombre: '', correo: '', cirif: '' }))
  }
  function closeQuick() { setQuickV(null); setQStep('preview'); setQResult(null) }

  async function descargarImagen() {
    if (!captureRef.current || !quickV) return
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(captureRef.current, { backgroundColor: '#ffffff', scale: 2, logging: false })
      const link = document.createElement('a')
      link.download = `${quickV.model.replace(/\s+/g, '_')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch { showToast('Error al generar imagen', false) }
  }

  async function enviarRapido() {
    if (!quickV) return
    if (!qForm.nombre.trim() || !qForm.correo.trim() || !qForm.cirif.trim() || !qForm.codigo.trim()) {
      showToast('Completa todos los campos', false); return
    }
    setQSending(true)
    const modalidadAPI = qForm.modalidad === 'banco_100' ? 'credito_24' : qForm.modalidad
    const planAPI = qForm.modalidad === 'banco_100' ? 'banco_100' : 'vehimotors'
    try {
      const res = await fetch('/api/cotizaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: qForm.codigo.trim().toUpperCase(),
          vehiculoId: quickV.id,
          clienteNombre: qForm.nombre.trim(),
          clienteCorreo: qForm.correo.trim(),
          clienteCiRif: qForm.cirif.trim(),
          modalidad: modalidadAPI,
          plan: planAPI,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setQResult({ ok: false, msg: json.error ?? 'Error al enviar' }); setQStep('result') }
      else { setQResult({ ok: true, msg: `✓ Cotización ${json.numero} enviada a ${qForm.correo}` }); setQStep('result') }
    } catch { setQResult({ ok: false, msg: 'Error de conexión' }); setQStep('result') }
    finally { setQSending(false) }
  }

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
    const gcCalc = (v.placa_c ?? 0) + (v.poliza_vehiculo_c ?? 0) + (v.poliza_vida_c ?? 0) +
      (v.gastos_vhm_c ?? 0) + (v.honorarios_c ?? 0) + (v.gastos_int_c ?? 0) + (v.alfombras_c ?? 0)
    const gcrCalc = (v.placa_cr ?? 0) + (v.poliza_vehiculo_cr ?? 0) + (v.poliza_vida_cr ?? 0) +
      (v.gastos_vhm_cr ?? 0) + (v.honorarios_cr ?? 0) + (v.gastos_int_cr ?? 0) + (v.alfombras_cr ?? 0)
    const { error } = await supabase.from('catalogo_ventas').update({
      brand: v.brand, model: v.model, img_url: v.img_url,
      cash: v.cash,
      gc: gcCalc || v.gc, gcr: gcrCalc || v.gcr,
      tasa_credito: v.tasa_credito,
      stock: v.stock, ano: v.ano, transmision: v.transmision, colores: v.colores,
      orden: v.orden, disponible: v.disponible,
      ac500_visible: v.ac500_visible, ac500_6m_cuota: v.ac500_6m_cuota,
      ac500_9m_cuota: v.ac500_9m_cuota, ac500_12m_cuota: v.ac500_12m_cuota,
      placa_c: v.placa_c, poliza_vehiculo_c: v.poliza_vehiculo_c, poliza_vida_c: v.poliza_vida_c,
      gastos_vhm_c: v.gastos_vhm_c, honorarios_c: v.honorarios_c,
      gastos_int_c: v.gastos_int_c, alfombras_c: v.alfombras_c,
      placa_cr: v.placa_cr, poliza_vehiculo_cr: v.poliza_vehiculo_cr, poliza_vida_cr: v.poliza_vida_cr,
      gastos_vhm_cr: v.gastos_vhm_cr, honorarios_cr: v.honorarios_cr,
      gastos_int_cr: v.gastos_int_cr, alfombras_cr: v.alfombras_cr,
      placa_monto: v.placa_monto,
      poliza_vehiculo_banco: v.poliza_vehiculo_banco, poliza_vida_banco: v.poliza_vida_banco,
      honorarios_banco: v.honorarios_banco, gastos_internos_banco: v.gastos_internos_banco,
      alfombras_banco: v.alfombras_banco,
      diferencial_pct: v.diferencial_pct, tasa_banco_pct: v.tasa_banco_pct,
      tasa_vhm_pct: v.tasa_vhm_pct, cuotas_vhm: v.cuotas_vhm ?? 24,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    setSaving(prev => ({ ...prev, [id]: false }))
    if (error) {
      console.error('[catalogo_ventas] error al guardar:', error)
      showToast(`Error: ${error.message}`, false)
      return
    }
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

                {v.disponible && (
                  <button
                    onClick={() => openQuick(v)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors flex-shrink-0"
                  >
                    <Zap size={12} /> Cotizar
                  </button>
                )}

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Precio base ($)">
                        <NumField className={inputCls} value={v.cash} placeholder="30000" onCommit={n => update(v.id, 'cash', n)} />
                      </Field>
                      <Field label={`Cuota Vehimotors ${v.cuotas_vhm ?? 24}m ($/mes)`}>
                        <NumField className={inputCls} value={v.tasa_credito} placeholder="500" onCommit={n => update(v.id, 'tasa_credito', n)} />
                      </Field>
                      <Field label="Tasa de interés Vehimotors (% anual)">
                        <NumField className={inputCls} value={v.tasa_vhm_pct} placeholder="Ej: 12" onCommit={n => update(v.id, 'tasa_vhm_pct', n)} />
                      </Field>
                      <Field label="Cantidad de cuotas Vehimotors">
                        <NumField className={inputCls} value={v.cuotas_vhm} placeholder="24" onCommit={n => update(v.id, 'cuotas_vhm', n != null ? Math.round(n) : 24)} />
                      </Field>
                    </div>

                    {/* Gastos contado + crédito en paralelo */}
                    {(() => {
                      const precio  = v.cash ?? 0
                      const iva     = precio * 0.16
                      const gcC = (v.placa_c ?? 0) + (v.poliza_vehiculo_c ?? 0) + (v.poliza_vida_c ?? 0) +
                        (v.gastos_vhm_c ?? 0) + (v.honorarios_c ?? 0) + (v.gastos_int_c ?? 0) + (v.alfombras_c ?? 0)
                      const gcCr = (v.placa_cr ?? 0) + (v.poliza_vehiculo_cr ?? 0) + (v.poliza_vida_cr ?? 0) +
                        (v.gastos_vhm_cr ?? 0) + (v.honorarios_cr ?? 0) + (v.gastos_int_cr ?? 0) + (v.alfombras_cr ?? 0)
                      const cuota   = v.tasa_credito ?? 0
                      const nCuotas = v.cuotas_vhm ?? 24
                      const fmtN    = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

                      const itemsCls  = `${inputCls} text-right`
                      const rowLbl    = 'text-xs text-gray-500 font-medium pt-2'

                      return (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">

                          {/* ── Contado ── */}
                          <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <div className="bg-amber-800 px-4 py-2">
                              <p className="text-[11px] font-bold text-amber-100 uppercase tracking-wider">Modalidad de Contado — Gastos</p>
                            </div>
                            <div className="p-3 space-y-2">
                              <div className="grid grid-cols-2 gap-2 items-center">
                                <span className={rowLbl}>Placa ($)</span>
                                <NumField className={itemsCls} value={v.placa_c} placeholder="0" onCommit={n => update(v.id, 'placa_c', n)} />
                              </div>
                              <div className="grid grid-cols-2 gap-2 items-center">
                                <span className={rowLbl}>Póliza vehículo ($)</span>
                                <NumField className={itemsCls} value={v.poliza_vehiculo_c} placeholder="0" onCommit={n => update(v.id, 'poliza_vehiculo_c', n)} />
                              </div>
                              <div className="grid grid-cols-2 gap-2 items-center">
                                <span className={rowLbl}>Póliza vida ($)</span>
                                <NumField className={itemsCls} value={v.poliza_vida_c} placeholder="0" onCommit={n => update(v.id, 'poliza_vida_c', n)} />
                              </div>
                              <div className="grid grid-cols-2 gap-2 items-center">
                                <span className={rowLbl}>Gastos Vehimotor ($)</span>
                                <NumField className={itemsCls} value={v.gastos_vhm_c} placeholder="0" onCommit={n => update(v.id, 'gastos_vhm_c', n)} />
                              </div>
                              <div className="grid grid-cols-2 gap-2 items-center">
                                <span className={rowLbl}>Hon. profesionales ($)</span>
                                <NumField className={itemsCls} value={v.honorarios_c} placeholder="0" onCommit={n => update(v.id, 'honorarios_c', n)} />
                              </div>
                              <div className="grid grid-cols-2 gap-2 items-center">
                                <span className={rowLbl}>Gastos internos ($)</span>
                                <NumField className={itemsCls} value={v.gastos_int_c} placeholder="0" onCommit={n => update(v.id, 'gastos_int_c', n)} />
                              </div>
                              <div className="grid grid-cols-2 gap-2 items-center">
                                <span className={rowLbl}>Alfombras ($)</span>
                                <NumField className={itemsCls} value={v.alfombras_c} placeholder="0" onCommit={n => update(v.id, 'alfombras_c', n)} />
                              </div>
                              <div className="flex justify-between items-center bg-amber-50 rounded-lg px-3 py-2 mt-1">
                                <span className="text-xs font-bold text-amber-800">Total gastos contado</span>
                                <span className="font-mono text-sm font-bold text-amber-800">${fmtN(gcC)}</span>
                              </div>
                            </div>

                            {precio > 0 && (
                              <div className="bg-gray-800 mx-3 mb-3 rounded-xl p-3 space-y-1.5 text-xs">
                                <div className="flex justify-between text-gray-300"><span>100% Precio base</span><span className="font-mono">${fmtN(precio)}</span></div>
                                <div className="flex justify-between text-gray-300"><span>IVA 16%</span><span className="font-mono">${fmtN(iva)}</span></div>
                                <div className="flex justify-between text-gray-400 text-[11px]"><span>Gastos (suma)</span><span className="font-mono">${fmtN(gcC)}</span></div>
                                <div className="flex justify-between text-yellow-400 font-bold border-t border-gray-600 pt-1.5">
                                  <span>TOTAL A PAGAR</span><span className="font-mono">${fmtN(precio + iva + gcC)}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ── Crédito 24m ── */}
                          <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <div className="bg-emerald-900 px-4 py-2">
                              <p className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider">Crédito 24m (40% Inicial) — Gastos</p>
                            </div>
                            <div className="p-3 space-y-2">
                              <div className="grid grid-cols-2 gap-2 items-center">
                                <span className={rowLbl}>Placa ($)</span>
                                <NumField className={itemsCls} value={v.placa_cr} placeholder="0" onCommit={n => update(v.id, 'placa_cr', n)} />
                              </div>
                              <div className="grid grid-cols-2 gap-2 items-center">
                                <span className={rowLbl}>Póliza vehículo ($)</span>
                                <NumField className={itemsCls} value={v.poliza_vehiculo_cr} placeholder="0" onCommit={n => update(v.id, 'poliza_vehiculo_cr', n)} />
                              </div>
                              <div className="grid grid-cols-2 gap-2 items-center">
                                <span className={rowLbl}>Póliza vida ($)</span>
                                <NumField className={itemsCls} value={v.poliza_vida_cr} placeholder="0" onCommit={n => update(v.id, 'poliza_vida_cr', n)} />
                              </div>
                              <div className="grid grid-cols-2 gap-2 items-center">
                                <span className={rowLbl}>Gastos Vehimotor ($)</span>
                                <NumField className={itemsCls} value={v.gastos_vhm_cr} placeholder="0" onCommit={n => update(v.id, 'gastos_vhm_cr', n)} />
                              </div>
                              <div className="grid grid-cols-2 gap-2 items-center">
                                <span className={rowLbl}>Hon. profesionales ($)</span>
                                <NumField className={itemsCls} value={v.honorarios_cr} placeholder="0" onCommit={n => update(v.id, 'honorarios_cr', n)} />
                              </div>
                              <div className="grid grid-cols-2 gap-2 items-center">
                                <span className={rowLbl}>Gastos internos ($)</span>
                                <NumField className={itemsCls} value={v.gastos_int_cr} placeholder="0" onCommit={n => update(v.id, 'gastos_int_cr', n)} />
                              </div>
                              <div className="grid grid-cols-2 gap-2 items-center">
                                <span className={rowLbl}>Alfombras ($)</span>
                                <NumField className={itemsCls} value={v.alfombras_cr} placeholder="0" onCommit={n => update(v.id, 'alfombras_cr', n)} />
                              </div>
                              <div className="flex justify-between items-center bg-emerald-50 rounded-lg px-3 py-2 mt-1">
                                <span className="text-xs font-bold text-emerald-800">Total gastos crédito</span>
                                <span className="font-mono text-sm font-bold text-emerald-800">${fmtN(gcCr)}</span>
                              </div>
                            </div>

                            {precio > 0 && (
                              <div className="bg-gray-800 mx-3 mb-3 rounded-xl p-3 space-y-1.5 text-xs">
                                <div className="flex justify-between text-gray-300"><span>40% Precio base</span><span className="font-mono">${fmtN(precio * 0.4)}</span></div>
                                <div className="flex justify-between text-gray-300"><span>IVA 16%</span><span className="font-mono">${fmtN(iva)}</span></div>
                                <div className="flex justify-between text-gray-400 text-[11px]"><span>Gastos (suma)</span><span className="font-mono">${fmtN(gcCr)}</span></div>
                                <div className="flex justify-between text-emerald-400 font-bold border-t border-gray-600 pt-1.5">
                                  <span>TOTAL INICIAL</span><span className="font-mono">${fmtN(precio * 0.4 + iva + gcCr)}</span>
                                </div>
                                <div className="flex justify-between text-gray-400 text-[11px]"><span>Financiamiento 60%</span><span className="font-mono">${fmtN(precio * 0.6)}</span></div>
                                {v.tasa_vhm_pct && <div className="flex justify-between text-gray-400 text-[11px]"><span>Tasa interés</span><span className="font-mono">{v.tasa_vhm_pct}% anual</span></div>}
                                {cuota > 0 && (
                                  <div className="flex justify-between text-red-400 font-bold border-t border-gray-600 pt-1.5">
                                    <span>Cuota mensual × {nCuotas}</span><span className="font-mono">${fmtN(cuota)}/mes</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Plan banco */}
                  <div>
                    <SectionLabel>Plan 100% banco (crédito bancario)</SectionLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Field label="Monto de placa ($)">
                        <NumField className={inputCls} value={v.placa_monto} placeholder="400" onCommit={n => update(v.id, 'placa_monto', n)} />
                      </Field>
                      <Field label="Póliza vehículo ($)">
                        <NumField className={inputCls} value={v.poliza_vehiculo_banco} placeholder="0" onCommit={n => update(v.id, 'poliza_vehiculo_banco', n)} />
                      </Field>
                      <Field label="Póliza vida ($)">
                        <NumField className={inputCls} value={v.poliza_vida_banco} placeholder="0" onCommit={n => update(v.id, 'poliza_vida_banco', n)} />
                      </Field>
                      <Field label="Honorarios profesionales ($)">
                        <NumField className={inputCls} value={v.honorarios_banco} placeholder="0" onCommit={n => update(v.id, 'honorarios_banco', n)} />
                      </Field>
                      <Field label="Gastos internos ($)">
                        <NumField className={inputCls} value={v.gastos_internos_banco} placeholder="0" onCommit={n => update(v.id, 'gastos_internos_banco', n)} />
                      </Field>
                      <Field label="Alfombras ($)">
                        <NumField className={inputCls} value={v.alfombras_banco} placeholder="0" onCommit={n => update(v.id, 'alfombras_banco', n)} />
                      </Field>
                      <Field label="Diferencial cambiario (%)">
                        <NumField className={inputCls} value={v.diferencial_pct} placeholder="30" onCommit={n => update(v.id, 'diferencial_pct', n)} />
                      </Field>
                      <Field label="Tasa banco (% anual)">
                        <NumField className={inputCls} value={v.tasa_banco_pct} placeholder="16" onCommit={n => update(v.id, 'tasa_banco_pct', n)} />
                      </Field>
                    </div>
                    {(() => {
                      const precio = v.cash ?? 0
                      const iva = precio * 0.16
                      const placa = v.placa_monto ?? 400
                      const totalVeh = precio + iva + placa
                      const financiamiento = totalVeh * 0.70
                      const diferencialPct = v.diferencial_pct ?? 30
                      const diferencial = financiamiento * diferencialPct / 100
                      const gastosFijos = (v.poliza_vehiculo_banco ?? 0) + (v.poliza_vida_banco ?? 0) + (v.honorarios_banco ?? 0) + (v.gastos_internos_banco ?? 0) + (v.alfombras_banco ?? 0)
                      const totalGastos = gastosFijos + diferencial
                      const inicial = totalVeh * 0.30
                      const totalInicial = inicial + totalGastos
                      const tasa = (v.tasa_banco_pct ?? 16) / 100 / 12
                      const cuota = tasa > 0 ? financiamiento * tasa * Math.pow(1 + tasa, 24) / (Math.pow(1 + tasa, 24) - 1) : financiamiento / 24
                      const fmtN = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      if (precio <= 0) return null
                      return (
                        <div className="mt-3 bg-oriental-black rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="text-center">
                            <p className="text-gray-400 text-[10px] uppercase tracking-wider">Total vehículo</p>
                            <p className="text-white font-bold text-sm">${fmtN(totalVeh)}</p>
                          </div>
                          <div className="text-center border-l border-gray-700">
                            <p className="text-gray-400 text-[10px] uppercase tracking-wider">Inicial cliente (30%)</p>
                            <p className="text-white font-bold text-sm">${fmtN(totalInicial)}</p>
                          </div>
                          <div className="text-center border-l border-gray-700">
                            <p className="text-gray-400 text-[10px] uppercase tracking-wider">Financiamiento banco (70%)</p>
                            <p className="text-white font-bold text-sm">${fmtN(financiamiento)}</p>
                          </div>
                          <div className="text-center border-l border-gray-700">
                            <p className="text-gray-400 text-[10px] uppercase tracking-wider">Cuota mensual (auto)</p>
                            <p className="text-oriental-red font-extrabold text-sm">${fmtN(cuota)}/mes</p>
                          </div>
                        </div>
                      )
                    })()}
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

      {/* Modal cotización rápida */}
      {quickV && (() => {
        const precio = quickV.cash ?? 0
        const iva    = precio * 0.16
        const cuota  = quickV.tasa_credito ?? 0

        // Gastos contado ítems
        const placa_c       = quickV.placa_c ?? 0
        const poliza_veh_c  = quickV.poliza_vehiculo_c ?? 0
        const poliza_vida_c = quickV.poliza_vida_c ?? 0
        const gvhm_c        = quickV.gastos_vhm_c ?? 0
        const hon_c         = quickV.honorarios_c ?? 0
        const gint_c        = quickV.gastos_int_c ?? 0
        const alfom_c       = quickV.alfombras_c ?? 0
        const gcC           = placa_c + poliza_veh_c + poliza_vida_c + gvhm_c + hon_c + gint_c + alfom_c
        const gc            = gcC > 0 ? gcC : (quickV.gc ?? 0)
        const totalC        = precio + iva + gc

        // Gastos crédito ítems
        const placa_cr       = quickV.placa_cr ?? 0
        const poliza_veh_cr  = quickV.poliza_vehiculo_cr ?? 0
        const poliza_vida_cr = quickV.poliza_vida_cr ?? 0
        const gvhm_cr        = quickV.gastos_vhm_cr ?? 0
        const hon_cr         = quickV.honorarios_cr ?? 0
        const gint_cr        = quickV.gastos_int_cr ?? 0
        const alfom_cr       = quickV.alfombras_cr ?? 0
        const gcCr           = placa_cr + poliza_veh_cr + poliza_vida_cr + gvhm_cr + hon_cr + gint_cr + alfom_cr
        const gcr            = gcCr > 0 ? gcCr : (quickV.gcr ?? 0)
        const ini40          = precio * 0.4
        const totalI         = ini40 + iva + gcr
        const fin60          = precio * 0.6

        const fmtQ   = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

        const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 18px', borderBottom: '1px solid #f3f4f6' }
        const lbl: React.CSSProperties = { fontSize: 12, color: '#374151' }
        const val: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#111', fontFamily: 'monospace' }
        const rowZero = (n: number): React.CSSProperties => n === 0 ? { ...row, opacity: 0.4 } : row

        return (
          <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && closeQuick()}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 420, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.28)' }}>

              {/* Preview: resumen de precios */}
              {qStep === 'preview' && (
                <>
                  <div ref={captureRef} style={{ fontFamily: 'sans-serif' }}>
                    {/* Encabezado */}
                    <div style={{ background: '#111', borderRadius: '20px 20px 0 0', padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>VEHÍCULO · {quickV.brand}</p>
                        <p style={{ fontSize: 19, fontWeight: 800, color: '#fff', margin: '3px 0 0' }}>{quickV.model}</p>
                      </div>
                      <button onClick={closeQuick} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#fff', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    </div>

                    {/* Contado */}
                    <div style={{ background: '#7c2d12', padding: '7px 18px', fontSize: 11, fontWeight: 800, color: '#fde68a', textTransform: 'uppercase', letterSpacing: 1 }}>Modalidad de Contado</div>
                    <div style={row}><span style={lbl}>100% Precio Base:</span><span style={val}>${fmtQ(precio)}</span></div>
                    <div style={row}><span style={lbl}>I.V.A. (16%):</span><span style={val}>${fmtQ(iva)}</span></div>
                    {gcC > 0 ? (
                      <>
                        <div style={rowZero(placa_c)}><span style={lbl}>Placa:</span><span style={val}>${fmtQ(placa_c)}</span></div>
                        <div style={rowZero(poliza_veh_c)}><span style={lbl}>Póliza Vehículo:</span><span style={val}>${fmtQ(poliza_veh_c)}</span></div>
                        <div style={rowZero(poliza_vida_c)}><span style={lbl}>Póliza Vida:</span><span style={val}>${fmtQ(poliza_vida_c)}</span></div>
                        <div style={rowZero(gvhm_c)}><span style={lbl}>Gastos Vehimotor:</span><span style={val}>${fmtQ(gvhm_c)}</span></div>
                        <div style={rowZero(hon_c)}><span style={lbl}>Hon. Profesionales:</span><span style={val}>${fmtQ(hon_c)}</span></div>
                        <div style={rowZero(gint_c)}><span style={lbl}>Gastos Internos:</span><span style={val}>${fmtQ(gint_c)}</span></div>
                        <div style={rowZero(alfom_c)}><span style={lbl}>Alfombras:</span><span style={val}>${fmtQ(alfom_c)}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 18px', background: '#fef3c7', borderBottom: '1px solid #f3f4f6' }}>
                          <span style={{ fontSize: 11, color: '#92400e', fontStyle: 'italic' }}>Póliza Seg. Vehículo, Traslado, Gastos, INTT, Gastos Notaría</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e', fontFamily: 'monospace', flexShrink: 0, marginLeft: 8 }}>${fmtQ(gc)}</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ ...row, alignItems: 'flex-start', gap: 12 }}>
                        <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.45, flex: 1 }}>Póliza Seguro Vehículo, Traslado,{'\n'}Gastos, INTT, Gastos Notaría</span>
                        <span style={{ ...val, flexShrink: 0 }}>${fmtQ(gc)}</span>
                      </div>
                    )}
                    <div style={{ ...row, background: '#fef9c3', border: 'none' }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#92400e' }}>TOTAL A PAGAR:</span>
                      <span style={{ fontSize: 17, fontWeight: 900, color: '#92400e', fontFamily: 'monospace' }}>${fmtQ(totalC)}</span>
                    </div>

                    {/* Crédito 24m */}
                    <div style={{ background: '#064e3b', padding: '7px 18px', fontSize: 11, fontWeight: 800, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: 1, marginTop: 6 }}>Modalidad Crédito 24 Meses (40% Inicial)</div>
                    <div style={row}><span style={lbl}>40% Precio Base:</span><span style={val}>${fmtQ(ini40)}</span></div>
                    <div style={row}><span style={lbl}>I.V.A. (16%):</span><span style={val}>${fmtQ(iva)}</span></div>
                    {gcCr > 0 ? (
                      <>
                        <div style={rowZero(placa_cr)}><span style={lbl}>Placa:</span><span style={val}>${fmtQ(placa_cr)}</span></div>
                        <div style={rowZero(poliza_veh_cr)}><span style={lbl}>Póliza Vehículo:</span><span style={val}>${fmtQ(poliza_veh_cr)}</span></div>
                        <div style={rowZero(poliza_vida_cr)}><span style={lbl}>Póliza Vida:</span><span style={val}>${fmtQ(poliza_vida_cr)}</span></div>
                        <div style={rowZero(gvhm_cr)}><span style={lbl}>Gastos Vehimotor:</span><span style={val}>${fmtQ(gvhm_cr)}</span></div>
                        <div style={rowZero(hon_cr)}><span style={lbl}>Hon. Profesionales:</span><span style={val}>${fmtQ(hon_cr)}</span></div>
                        <div style={rowZero(gint_cr)}><span style={lbl}>Gastos Internos:</span><span style={val}>${fmtQ(gint_cr)}</span></div>
                        <div style={rowZero(alfom_cr)}><span style={lbl}>Alfombras:</span><span style={val}>${fmtQ(alfom_cr)}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 18px', background: '#f0fdf4', borderBottom: '1px solid #f3f4f6' }}>
                          <span style={{ fontSize: 11, color: '#065f46', fontStyle: 'italic' }}>Póliza Seg. Vehículo, Traslado, Gastos, INTT, Gastos Notaría</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#065f46', fontFamily: 'monospace', flexShrink: 0, marginLeft: 8 }}>${fmtQ(gcr)}</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ ...row, alignItems: 'flex-start', gap: 12 }}>
                        <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.45, flex: 1 }}>Póliza Seguro Vehículo, Traslado,{'\n'}Gastos, INTT, Gastos Notaría</span>
                        <span style={{ ...val, flexShrink: 0 }}>${fmtQ(gcr)}</span>
                      </div>
                    )}
                    <div style={{ ...row, background: '#dcfce7', border: 'none' }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#065f46' }}>TOTAL INICIAL A PAGAR:</span>
                      <span style={{ fontSize: 17, fontWeight: 900, color: '#065f46', fontFamily: 'monospace' }}>${fmtQ(totalI)}</span>
                    </div>
                    <div style={{ ...row, background: '#f0fdf4' }}>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>Financiamiento 60% —</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#111', fontFamily: 'monospace' }}>${fmtQ(fin60)}</span>
                    </div>
                    {cuota > 0 && (
                      <div style={{ ...row, background: '#fff1f2', border: 'none' }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#C41E3A' }}>24 Cuotas Mensuales:</span>
                        <span style={{ fontSize: 17, fontWeight: 900, color: '#C41E3A', fontFamily: 'monospace' }}>${fmtQ(cuota)}</span>
                      </div>
                    )}
                    <div style={{ padding: '8px 18px 14px' }}>
                      <p style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', margin: 0 }}>*Precios referenciales sujetos a disponibilidad y cambios sin previo aviso</p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 16px 20px' }}>
                    <button
                      onClick={descargarImagen}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px', background: '#1e3a5f', color: '#fff', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
                    >
                      📥 Descargar imagen
                    </button>
                    <button
                      onClick={() => setQStep('email')}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px', background: '#C41E3A', color: '#fff', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
                    >
                      ✉️ Enviar por correo
                    </button>
                  </div>
                </>
              )}

              {/* Paso 2: Formulario email */}
              {qStep === 'email' && (
                <>
                  <div style={{ background: '#111', borderRadius: '20px 20px 0 0', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>VEHÍCULO · {quickV.brand}</p>
                      <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: '2px 0 0' }}>{quickV.model}</p>
                    </div>
                    <button onClick={() => setQStep('preview')} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 600 }}>← Volver</button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2">Modalidad a cotizar</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {([
                          { v: 'contado', label: 'Contado' },
                          { v: 'credito_24', label: 'Crédito 24m' },
                          { v: 'banco_100', label: '100% Banco' },
                        ] as { v: QModal; label: string }[]).map(opt => (
                          <button key={opt.v} onClick={() => setQForm(p => ({ ...p, modalidad: opt.v }))}
                            className={`py-2 px-2 rounded-lg text-xs font-bold border transition-colors ${qForm.modalidad === opt.v ? 'bg-oriental-red text-white border-oriental-red' : 'border-gray-200 text-gray-600 bg-white hover:border-gray-400'}`}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre del cliente *</label>
                        <input className={modalInputCls} value={qForm.nombre} onChange={e => setQForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Juan Pérez" autoFocus />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Correo electrónico *</label>
                        <input className={modalInputCls} type="email" value={qForm.correo} onChange={e => setQForm(p => ({ ...p, correo: e.target.value }))} placeholder="cliente@email.com" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">C.I. / RIF *</label>
                        <input className={modalInputCls} value={qForm.cirif} onChange={e => setQForm(p => ({ ...p, cirif: e.target.value }))} placeholder="V-12345678" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Código vendedora</label>
                        <input className={modalInputCls} value={qForm.codigo} onChange={e => setQForm(p => ({ ...p, codigo: e.target.value.toUpperCase() }))} placeholder="R000" />
                      </div>
                    </div>
                    <button onClick={enviarRapido} disabled={qSending}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-oriental-red text-white font-bold rounded-xl text-sm hover:bg-oriental-red-dark transition-colors disabled:opacity-50">
                      {qSending ? 'Enviando...' : <><Send size={15} /> Generar y enviar cotización</>}
                    </button>
                  </div>
                </>
              )}

              {/* Paso 3: Resultado */}
              {qStep === 'result' && qResult && (
                <div className="p-10 text-center" style={{ borderRadius: 20 }}>
                  <p className="text-5xl mb-4">{qResult.ok ? '✅' : '❌'}</p>
                  <p className={`font-bold text-sm ${qResult.ok ? 'text-green-700' : 'text-red-600'}`}>{qResult.msg}</p>
                  {qResult.ok && (
                    <button onClick={() => { setQStep('email'); setQForm(p => ({ ...p, nombre: '', correo: '', cirif: '' })) }}
                      className="mt-4 text-xs text-oriental-red font-semibold hover:underline block mx-auto">
                      Enviar otra cotización
                    </button>
                  )}
                  <button onClick={closeQuick} className="mt-3 block mx-auto px-6 py-2 bg-gray-100 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })()}

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
