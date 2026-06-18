'use client'

import { useState, useEffect, useCallback } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */

interface PromoVehiculo {
  id: string
  vehiculo_id: string | null
  marca: string
  modelo: string
  img_url: string | null
  precio_base: number
  gastos_label: string
  gastos_contado: number
  mostrar_credito: boolean
  gastos_credito: number
  cuota_mensual: number
  orden: number
}

interface Promo {
  id: string
  activa: boolean
  titulo: string
  subtitulo: string | null
}

function n(v: string) { return parseFloat(v.replace(',', '.')) || 0 }

function fmt(v: number) {
  return v.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const DEFAULT_LABEL = 'Póliza Seguro Vehículo, Traslado, Gastos, INTT, Gastos Notaría'

/* ── Preview card (mimics the printed promo sheet) ── */
function PromoCard({ v }: { v: PromoVehiculo }) {
  const iva = v.precio_base * 0.16
  const totalContado = v.precio_base + iva + v.gastos_contado
  const ini40 = v.precio_base * 0.40
  const fin60 = v.precio_base * 0.60
  const totalInicial = ini40 + iva + v.gastos_credito

  const tdH = { padding: '6px 10px', fontFamily: 'sans-serif', fontSize: 12, fontWeight: 800, color: '#fff', background: '#1a1a1a' }
  const tdL = { padding: '5px 10px', fontFamily: 'sans-serif', fontSize: 11.5, color: '#374151', borderBottom: '1px solid #e5e7eb' }
  const tdV = { padding: '5px 10px', fontFamily: 'sans-serif', fontSize: 11.5, color: '#111827', fontWeight: 700, textAlign: 'right' as const, borderBottom: '1px solid #e5e7eb' }
  const tdSH = { padding: '6px 10px', fontFamily: 'sans-serif', fontSize: 11.5, fontWeight: 800, color: '#fff', background: '#ca8a04', textAlign: 'center' as const }
  const tdTotal = { padding: '7px 10px', fontFamily: 'sans-serif', fontSize: 13, fontWeight: 900, color: '#111827', background: '#fef9c3' }
  const tdTotalV = { padding: '7px 10px', fontFamily: 'sans-serif', fontSize: 13, fontWeight: 900, color: '#111827', background: '#fef9c3', textAlign: 'right' as const }

  return (
    <div style={{ border: '2px solid #1a1a1a', borderRadius: 6, overflow: 'hidden', width: '100%', maxWidth: 340 }}>
      {v.img_url && (
        <div style={{ background: '#f9fafb', height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
          <img src={v.img_url} alt={v.modelo} style={{ maxHeight: 90, maxWidth: '100%', objectFit: 'contain' }} />
        </div>
      )}
      <table width="100%" cellPadding={0} cellSpacing={0}>
        <tbody>
          <tr><td colSpan={2} style={tdH}>VEHÍCULO</td></tr>
          <tr><td style={tdL}>MARCA:</td><td style={tdV}>{v.marca}</td></tr>
          <tr><td style={tdL}>MODELO:</td><td style={tdV}>{v.modelo}</td></tr>
          <tr><td colSpan={2} style={tdSH}>MODALIDAD DE CONTADO</td></tr>
          <tr><td style={tdL}>100% PRECIO BASE:</td><td style={tdV}>{fmt(v.precio_base)}</td></tr>
          <tr><td style={tdL}>I.V.A. (16%):</td><td style={tdV}>{fmt(iva)}</td></tr>
          <tr><td style={tdL}>{v.gastos_label}</td><td style={tdV}>{fmt(v.gastos_contado)}</td></tr>
          <tr><td style={tdTotal}>TOTAL A PAGAR</td><td style={tdTotalV}>{fmt(totalContado)}</td></tr>
          {v.mostrar_credito && (
            <>
              <tr><td colSpan={2} style={tdSH}>MODALIDAD CRÉDITO 24 MESES (40% INICIAL)</td></tr>
              <tr><td style={tdL}>40% PRECIO BASE:</td><td style={tdV}>{fmt(ini40)}</td></tr>
              <tr><td style={tdL}>I.V.A. (16%):</td><td style={tdV}>{fmt(iva)}</td></tr>
              <tr><td style={tdL}>{v.gastos_label}</td><td style={tdV}>{fmt(v.gastos_credito)}</td></tr>
              <tr><td style={tdTotal}>TOTAL INICIAL A PAGAR</td><td style={tdTotalV}>{fmt(totalInicial)}</td></tr>
              <tr><td style={tdL}>FINANCIAMIENTO 60%</td><td style={tdV}>{fmt(fin60)} $</td></tr>
              <tr><td style={tdTotal}>24 CUOTAS MENSUALES:</td><td style={tdTotalV}>{fmt(v.cuota_mensual)}</td></tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ── Edit form for a promo vehicle ── */
function VehiculoForm({
  v,
  catalogo,
  onSave,
  onDelete,
  onCancel,
  isNew,
}: {
  v: PromoVehiculo
  catalogo: any[]
  onSave: (data: Partial<PromoVehiculo>) => Promise<void>
  onDelete?: () => Promise<void>
  onCancel?: () => void
  isNew?: boolean
}) {
  const [f, setF] = useState({
    vehiculo_id: v.vehiculo_id ?? '',
    marca: v.marca,
    modelo: v.modelo,
    img_url: v.img_url ?? '',
    precio_base: String(v.precio_base || ''),
    gastos_label: v.gastos_label || DEFAULT_LABEL,
    gastos_contado: String(v.gastos_contado || ''),
    mostrar_credito: v.mostrar_credito,
    gastos_credito: String(v.gastos_credito || ''),
    cuota_mensual: String(v.cuota_mensual || ''),
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [err, setErr] = useState('')

  // Auto-fill when catalog vehicle selected
  function onSelectVehiculo(id: string) {
    const found = catalogo.find((c: any) => c.id === id)
    if (found) {
      setF(p => ({
        ...p,
        vehiculo_id: id,
        marca: found.brand ?? found.marca ?? p.marca,
        modelo: found.model ?? found.modelo ?? p.modelo,
        img_url: found.img_url ?? p.img_url,
        precio_base: String(found.cash ?? found.precio_base ?? p.precio_base),
      }))
    } else {
      setF(p => ({ ...p, vehiculo_id: id }))
    }
  }

  const precioBase = n(f.precio_base)
  const iva = precioBase * 0.16
  const totalContado = precioBase + iva + n(f.gastos_contado)
  const totalInicial = precioBase * 0.40 + iva + n(f.gastos_credito)
  const fin60 = precioBase * 0.60

  async function handleSave() {
    if (!f.marca.trim() || !f.modelo.trim()) { setErr('Marca y modelo son obligatorios'); return }
    if (!precioBase || precioBase <= 0) { setErr('El precio base debe ser mayor a 0'); return }
    setSaving(true); setErr('')
    await onSave({
      vehiculo_id: f.vehiculo_id || null,
      marca: f.marca.trim(),
      modelo: f.modelo.trim(),
      img_url: f.img_url.trim() || null,
      precio_base: precioBase,
      gastos_label: f.gastos_label.trim() || DEFAULT_LABEL,
      gastos_contado: n(f.gastos_contado),
      mostrar_credito: f.mostrar_credito,
      gastos_credito: n(f.gastos_credito),
      cuota_mensual: n(f.cuota_mensual),
    })
    setSaving(false)
  }

  const inCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red bg-white'
  const readCls = 'w-full px-3 py-2 border border-gray-100 rounded-lg text-sm bg-gray-50 text-oriental-black font-bold cursor-not-allowed'

  return (
    <div className="space-y-4">
      {/* Selector de catálogo */}
      <div>
        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Vehículo del catálogo (opcional — pre-rellena datos)</label>
        <select className={inCls} value={f.vehiculo_id} onChange={e => onSelectVehiculo(e.target.value)}>
          <option value="">— Ingresar manualmente —</option>
          {catalogo.map((c: any) => (
            <option key={c.id} value={c.id}>{c.brand ?? c.marca} {c.model ?? c.modelo}</option>
          ))}
        </select>
      </div>

      {/* Marca + Modelo */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Marca *</label>
          <input className={inCls} value={f.marca} onChange={e => setF(p => ({ ...p, marca: e.target.value }))} placeholder="MG" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Modelo *</label>
          <input className={inCls} value={f.modelo} onChange={e => setF(p => ({ ...p, modelo: e.target.value }))} placeholder="MG3 NEW AUTOMÁTICO" />
        </div>
      </div>

      {/* Imagen */}
      <div>
        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">URL imagen del vehículo</label>
        <input className={inCls} value={f.img_url} onChange={e => setF(p => ({ ...p, img_url: e.target.value }))} placeholder="https://..." />
      </div>

      {/* Precio base */}
      <div>
        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Precio base ($) *</label>
        <input type="number" step="0.01" className={inCls} value={f.precio_base} onChange={e => setF(p => ({ ...p, precio_base: e.target.value }))} placeholder="22990" />
      </div>

      {/* IVA (auto) */}
      <div>
        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">I.V.A. 16% (automático)</label>
        <div className={readCls}>${fmt(iva)}</div>
      </div>

      {/* Label de gastos */}
      <div>
        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Descripción de gastos</label>
        <input className={inCls} value={f.gastos_label} onChange={e => setF(p => ({ ...p, gastos_label: e.target.value }))} placeholder={DEFAULT_LABEL} />
      </div>

      {/* Gastos contado */}
      <div>
        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Gastos contado ($)</label>
        <input type="number" step="0.01" className={inCls} value={f.gastos_contado} onChange={e => setF(p => ({ ...p, gastos_contado: e.target.value }))} placeholder="2000" />
      </div>

      {/* Total contado (auto) */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-amber-800 uppercase">Total a pagar (Contado)</span>
          <span className="text-base font-extrabold text-amber-900">${fmt(totalContado)}</span>
        </div>
      </div>

      {/* Toggle crédito */}
      <label className="flex items-center gap-3 cursor-pointer py-2 border-t border-gray-100">
        <div
          onClick={() => setF(p => ({ ...p, mostrar_credito: !p.mostrar_credito }))}
          className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${f.mostrar_credito ? 'bg-oriental-red' : 'bg-gray-300'}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${f.mostrar_credito ? 'translate-x-4' : 'translate-x-0'}`} />
        </div>
        <span className="text-sm font-semibold text-gray-700">Mostrar modalidad Crédito 24 meses</span>
      </label>

      {f.mostrar_credito && (
        <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Modalidad Crédito 24m (40% inicial)</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">40% inicial (auto)</label>
              <div className={readCls}>${fmt(precioBase * 0.40)}</div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">I.V.A. 16% (auto)</label>
              <div className={readCls}>${fmt(iva)}</div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Gastos crédito ($)</label>
            <input type="number" step="0.01" className={inCls} value={f.gastos_credito} onChange={e => setF(p => ({ ...p, gastos_credito: e.target.value }))} placeholder="4586.58" />
          </div>

          <div className="bg-white border border-blue-200 rounded-lg px-3 py-2 flex justify-between items-center">
            <span className="text-xs font-bold text-blue-800 uppercase">Total inicial a pagar</span>
            <span className="text-sm font-extrabold text-blue-900">${fmt(totalInicial)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Financiamiento 60% (auto)</label>
              <div className={readCls}>${fmt(fin60)}</div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Cuota mensual × 24 ($)</label>
              <input type="number" step="0.01" className={inCls} value={f.cuota_mensual} onChange={e => setF(p => ({ ...p, cuota_mensual: e.target.value }))} placeholder="731.03" />
            </div>
          </div>
        </div>
      )}

      {err && <p className="text-xs text-red-600 font-semibold">{err}</p>}

      <div className="flex gap-2 pt-2">
        {onCancel && (
          <button onClick={onCancel} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">
            Cancelar
          </button>
        )}
        {onDelete && (
          <button
            onClick={async () => { if (!confirm('¿Eliminar este vehículo de la promoción?')) return; setDeleting(true); await onDelete(); setDeleting(false) }}
            disabled={deleting}
            className="px-4 py-2 border-2 border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? '...' : '🗑 Eliminar'}
          </button>
        )}
        <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-oriental-red text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50">
          {saving ? 'Guardando...' : isNew ? '+ Agregar a promoción' : '✓ Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

/* ── Main Tab ── */
export default function PromocionesTab({ catalogo }: { catalogo: any[] }) {
  const [promo, setPromo] = useState<Promo | null>(null)
  const [vehiculos, setVehiculos] = useState<PromoVehiculo[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editTitulo, setEditTitulo] = useState(false)
  const [tituloVal, setTituloVal] = useState('')
  const [subtituloVal, setSubtituloVal] = useState('')
  const [savingTitulo, setSavingTitulo] = useState(false)

  const load = useCallback(async () => {
    const r = await fetch('/api/promociones')
    const j = await r.json()
    setPromo(j.promo ?? null)
    setVehiculos(j.vehiculos ?? [])
    setTituloVal(j.promo?.titulo ?? 'Promociones Especiales')
    setSubtituloVal(j.promo?.subtitulo ?? '')
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function toggleActiva() {
    if (!promo) return
    setToggling(true)
    await fetch('/api/promociones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activa: !promo.activa }) })
    setPromo(p => p ? { ...p, activa: !p.activa } : p)
    setToggling(false)
  }

  async function saveTitulo() {
    setSavingTitulo(true)
    await fetch('/api/promociones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ titulo: tituloVal, subtitulo: subtituloVal || null }) })
    setPromo(p => p ? { ...p, titulo: tituloVal, subtitulo: subtituloVal || null } : p)
    setSavingTitulo(false)
    setEditTitulo(false)
  }

  async function addVehiculo(data: Partial<PromoVehiculo>) {
    const r = await fetch('/api/promociones/vehiculos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, orden: vehiculos.length }) })
    const j = await r.json()
    if (j.ok) { setVehiculos(prev => [...prev, j.data]); setShowAddForm(false) }
  }

  async function updateVehiculo(id: string, data: Partial<PromoVehiculo>) {
    await fetch(`/api/promociones/vehiculos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    setVehiculos(prev => prev.map(v => v.id === id ? { ...v, ...data } as PromoVehiculo : v))
    setExpandedId(null)
  }

  async function deleteVehiculo(id: string) {
    await fetch(`/api/promociones/vehiculos/${id}`, { method: 'DELETE' })
    setVehiculos(prev => prev.filter(v => v.id !== id))
    setExpandedId(null)
  }

  const newVehiculo: PromoVehiculo = {
    id: '', vehiculo_id: null, marca: '', modelo: '', img_url: null,
    precio_base: 0, gastos_label: DEFAULT_LABEL, gastos_contado: 0,
    mostrar_credito: false, gastos_credito: 0, cuota_mensual: 0, orden: 0,
  }

  if (loading) return <div className="card p-8 text-center text-oriental-gray text-sm">Cargando...</div>

  return (
    <div className="space-y-6">
      {/* Header / Toggle */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-oriental-black mb-1">Promociones Especiales</h2>
            <p className="text-xs text-gray-400">Configura los vehículos en promoción y habilita la sección en la página pública.</p>
          </div>
          <button
            onClick={toggleActiva}
            disabled={toggling}
            className={`flex items-center gap-3 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              promo?.activa ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            } disabled:opacity-50`}
          >
            <div className={`w-4 h-4 rounded-full border-2 ${promo?.activa ? 'bg-white border-white' : 'border-gray-500'}`} />
            {promo?.activa ? 'Promoción ACTIVA — visible en web' : 'Promoción INACTIVA — oculta en web'}
          </button>
        </div>

        {/* Título editable */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          {editTitulo ? (
            <div className="space-y-2">
              <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value={tituloVal} onChange={e => setTituloVal(e.target.value)} placeholder="Título de la sección" />
              <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value={subtituloVal} onChange={e => setSubtituloVal(e.target.value)} placeholder="Subtítulo opcional (ej: 'Temporada de verano 2026')" />
              <div className="flex gap-2">
                <button onClick={() => setEditTitulo(false)} className="px-4 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500">Cancelar</button>
                <button onClick={saveTitulo} disabled={savingTitulo} className="px-4 py-1.5 bg-oriental-black text-white rounded-lg text-xs font-bold disabled:opacity-50">
                  {savingTitulo ? '...' : 'Guardar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm font-bold text-oriental-black">{promo?.titulo}</p>
                {promo?.subtitulo && <p className="text-xs text-gray-400">{promo.subtitulo}</p>}
              </div>
              <button onClick={() => setEditTitulo(true)} className="text-xs text-oriental-red hover:underline">Editar título</button>
            </div>
          )}
        </div>
      </div>

      {/* Preview de la sección pública */}
      {vehiculos.length > 0 && (
        <div className="card p-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">Vista previa — cómo se verá en la web</p>
          <div className="flex gap-4 flex-wrap">
            {vehiculos.map(v => <PromoCard key={v.id} v={v} />)}
          </div>
        </div>
      )}

      {/* Lista de vehículos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-oriental-black">{vehiculos.length} vehículo{vehiculos.length !== 1 ? 's' : ''} en promoción</p>
          {!showAddForm && (
            <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 px-4 py-2 bg-oriental-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors">
              + Agregar vehículo
            </button>
          )}
        </div>

        {/* Formulario de nuevo vehículo */}
        {showAddForm && (
          <div className="card p-5 border-2 border-oriental-red">
            <p className="text-sm font-bold text-oriental-black mb-4">Agregar vehículo a la promoción</p>
            <VehiculoForm
              v={newVehiculo}
              catalogo={catalogo}
              onSave={addVehiculo}
              onCancel={() => setShowAddForm(false)}
              isNew
            />
          </div>
        )}

        {vehiculos.map(v => (
          <div key={v.id} className="card overflow-hidden">
            {/* Header del vehículo */}
            <button
              onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {v.img_url && <img src={v.img_url} alt={v.modelo} className="w-12 h-8 object-contain" />}
                <div className="text-left">
                  <p className="text-xs font-bold text-oriental-red uppercase tracking-wider">{v.marca}</p>
                  <p className="text-sm font-bold text-oriental-black">{v.modelo}</p>
                </div>
                <div className="flex gap-2 ml-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    Contado: ${(v.precio_base + v.precio_base * 0.16 + v.gastos_contado).toLocaleString('es-VE', { maximumFractionDigits: 0 })}
                  </span>
                  {v.mostrar_credito && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">+ Crédito 24m</span>
                  )}
                </div>
              </div>
              <span className="text-gray-400 text-sm">{expandedId === v.id ? '▲' : '▼'}</span>
            </button>

            {/* Formulario expandido */}
            {expandedId === v.id && (
              <div className="px-5 pb-5 pt-2 border-t border-gray-100">
                <VehiculoForm
                  v={v}
                  catalogo={catalogo}
                  onSave={data => updateVehiculo(v.id, data)}
                  onDelete={() => deleteVehiculo(v.id)}
                />
              </div>
            )}
          </div>
        ))}

        {vehiculos.length === 0 && !showAddForm && (
          <div className="card p-12 text-center text-oriental-gray">
            <p className="text-2xl mb-3">🏷️</p>
            <p className="font-semibold text-sm">No hay vehículos en la promoción todavía.</p>
            <p className="text-xs mt-1">Agrega vehículos y activa la promoción para que aparezca en la web.</p>
          </div>
        )}
      </div>
    </div>
  )
}
