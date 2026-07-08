'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */

interface PromoVehiculo {
  id: string
  vehiculo_id: string | null
  marca: string
  modelo: string
  img_url: string | null
  precio_base: number
  gastos_label: string
  // Contado
  placa_c: number; poliza_vehiculo_c: number; poliza_vida_c: number
  gastos_vhm_c: number; honorarios_c: number; gastos_int_c: number; alfombras_c: number
  gastos_contado: number
  // Crédito
  mostrar_credito: boolean
  placa_cr: number; poliza_vehiculo_cr: number; poliza_vida_cr: number
  gastos_vhm_cr: number; honorarios_cr: number; gastos_int_cr: number; alfombras_cr: number
  gastos_credito: number; cuota_mensual: number
  tasa_vhm_pct: number | null; cuotas_vhm: number
  // Banco
  mostrar_banco: boolean
  placa_monto: number; poliza_vehiculo_banco: number; poliza_vida_banco: number
  honorarios_banco: number; gastos_internos_banco: number; alfombras_banco: number
  diferencial_pct: number; tasa_banco_pct: number
  orden: number
}

interface Promo {
  id: string; activa: boolean; titulo: string; subtitulo: string | null
}

function n(v: string | number | null | undefined) {
  if (v == null) return 0
  return parseFloat(String(v).replace(',', '.')) || 0
}
function fmt(v: number) {
  return v.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(v)*100)%100===0?0:2, maximumFractionDigits: 2 })
}

// PMT formula
function pmt(rate: number, nper: number, pv: number) {
  if (rate === 0) return pv / nper
  return pv * rate * Math.pow(1 + rate, nper) / (Math.pow(1 + rate, nper) - 1)
}

function NumInput({ value, onChange, placeholder, className }: {
  value: number; onChange: (v: number) => void; placeholder?: string; className?: string
}) {
  const [raw, setRaw] = useState(value > 0 ? String(value) : '')
  const focused = useRef(false)
  useEffect(() => { if (!focused.current) setRaw(value > 0 ? String(value) : '') }, [value])
  return (
    <input
      type="text" inputMode="decimal"
      className={className ?? 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:border-oriental-red bg-white'}
      value={raw} placeholder={placeholder ?? '0'}
      onFocus={e => { focused.current = true; e.target.select() }}
      onChange={e => setRaw(e.target.value)}
      onBlur={() => {
        focused.current = false
        const p = parseFloat(raw.replace(',', '.'))
        const val = isNaN(p) ? 0 : p
        onChange(val)
        setRaw(val > 0 ? String(val) : '')
      }}
    />
  )
}

const EMPTY: Omit<PromoVehiculo, 'id'> = {
  vehiculo_id: null, marca: '', modelo: '', img_url: null,
  precio_base: 0, gastos_label: 'Póliza Seguro Vehículo, Traslado, Gastos, INTT, Gastos Notaría',
  placa_c: 0, poliza_vehiculo_c: 0, poliza_vida_c: 0,
  gastos_vhm_c: 0, honorarios_c: 0, gastos_int_c: 0, alfombras_c: 0, gastos_contado: 0,
  mostrar_credito: false,
  placa_cr: 0, poliza_vehiculo_cr: 0, poliza_vida_cr: 0,
  gastos_vhm_cr: 0, honorarios_cr: 0, gastos_int_cr: 0, alfombras_cr: 0,
  gastos_credito: 0, cuota_mensual: 0, tasa_vhm_pct: null, cuotas_vhm: 24,
  mostrar_banco: false,
  placa_monto: 400, poliza_vehiculo_banco: 0, poliza_vida_banco: 0,
  honorarios_banco: 0, gastos_internos_banco: 0, alfombras_banco: 0,
  diferencial_pct: 30, tasa_banco_pct: 16, orden: 0,
}

/* ─── Editor de un vehículo ──────────────────────────────────────────────── */
function VehiculoEditor({
  v, catalogo, isNew,
  onSave, onDelete, onCancel,
}: {
  v: PromoVehiculo
  catalogo: any[]
  isNew?: boolean
  onSave: (data: Partial<PromoVehiculo>) => Promise<void>
  onDelete?: () => Promise<void>
  onCancel?: () => void
}) {
  const [f, setF] = useState<PromoVehiculo>({ ...v })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [err, setErr] = useState('')

  function set(field: keyof PromoVehiculo, val: unknown) {
    setF(p => ({ ...p, [field]: val }))
  }

  function onSelectCatalogo(id: string) {
    const found = catalogo.find((c: any) => c.id === id)
    if (found) {
      setF(p => ({
        ...p,
        vehiculo_id: id,
        marca: found.brand ?? found.marca ?? p.marca,
        modelo: found.model ?? found.modelo ?? p.modelo,
        img_url: found.img_url ?? p.img_url,
        precio_base: found.cash ?? p.precio_base,
        placa_c: found.placa_c ?? p.placa_c,
        poliza_vehiculo_c: found.poliza_vehiculo_c ?? p.poliza_vehiculo_c,
        poliza_vida_c: found.poliza_vida_c ?? p.poliza_vida_c,
        gastos_vhm_c: found.gastos_vhm_c ?? p.gastos_vhm_c,
        honorarios_c: found.honorarios_c ?? p.honorarios_c,
        gastos_int_c: found.gastos_int_c ?? p.gastos_int_c,
        alfombras_c: found.alfombras_c ?? p.alfombras_c,
        placa_cr: found.placa_cr ?? p.placa_cr,
        poliza_vehiculo_cr: found.poliza_vehiculo_cr ?? p.poliza_vehiculo_cr,
        poliza_vida_cr: found.poliza_vida_cr ?? p.poliza_vida_cr,
        gastos_vhm_cr: found.gastos_vhm_cr ?? p.gastos_vhm_cr,
        honorarios_cr: found.honorarios_cr ?? p.honorarios_cr,
        gastos_int_cr: found.gastos_int_cr ?? p.gastos_int_cr,
        alfombras_cr: found.alfombras_cr ?? p.alfombras_cr,
        cuota_mensual: found.tasa_credito ?? p.cuota_mensual,
        tasa_vhm_pct: found.tasa_vhm_pct ?? p.tasa_vhm_pct,
        cuotas_vhm: found.cuotas_vhm ?? p.cuotas_vhm,
        placa_monto: found.placa_monto ?? p.placa_monto,
        poliza_vehiculo_banco: found.poliza_vehiculo_banco ?? p.poliza_vehiculo_banco,
        poliza_vida_banco: found.poliza_vida_banco ?? p.poliza_vida_banco,
        honorarios_banco: found.honorarios_banco ?? p.honorarios_banco,
        gastos_internos_banco: found.gastos_internos_banco ?? p.gastos_internos_banco,
        alfombras_banco: found.alfombras_banco ?? p.alfombras_banco,
        diferencial_pct: found.diferencial_pct ?? p.diferencial_pct,
        tasa_banco_pct: found.tasa_banco_pct ?? p.tasa_banco_pct,
      }))
    } else {
      setF(p => ({ ...p, vehiculo_id: id || null }))
    }
  }

  // ── Cálculos en vivo ──────────────────────────────────────────────────────
  const precio   = f.precio_base
  const iva      = precio * 0.16
  const gcC      = f.placa_c + f.poliza_vehiculo_c + f.poliza_vida_c + f.gastos_vhm_c + f.honorarios_c + f.gastos_int_c + f.alfombras_c
  const gcCr     = f.placa_cr + f.poliza_vehiculo_cr + f.poliza_vida_cr + f.gastos_vhm_cr + f.honorarios_cr + f.gastos_int_cr + f.alfombras_cr
  const nCuotas  = f.cuotas_vhm || 24
  // Banco
  const placa    = f.placa_monto || 400
  const totalVeh = precio + iva + placa
  const fin70    = totalVeh * 0.70
  const ini30    = totalVeh * 0.30
  const dif      = fin70 * f.diferencial_pct / 100
  const gastosFijosBanco = f.poliza_vehiculo_banco + f.poliza_vida_banco + f.honorarios_banco + f.gastos_internos_banco + f.alfombras_banco
  const totalInicialBanco = ini30 + dif + gastosFijosBanco
  const tasaMensual = (f.tasa_banco_pct || 16) / 100 / 12
  const cuotaBanco = pmt(tasaMensual, 24, fin70)

  async function handleSave() {
    if (!f.marca.trim() || !f.modelo.trim()) { setErr('Marca y modelo son obligatorios'); return }
    if (f.precio_base <= 0) { setErr('El precio base debe ser mayor a 0'); return }
    setSaving(true); setErr('')
    await onSave({
      ...f,
      gastos_contado: gcC,
      gastos_credito: gcCr,
    })
    setSaving(false)
  }

  const inCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red bg-white'
  const readCls = 'w-full px-3 py-2 border border-gray-100 rounded-lg text-sm bg-gray-50 text-oriental-black font-bold text-right cursor-not-allowed'
  const rowLbl = 'text-xs text-gray-500 font-medium pt-1.5'
  const itemCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:border-oriental-red bg-white'

  return (
    <div className="space-y-5">
      {/* Catálogo pre-fill */}
      <div>
        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
          Pre-rellenar desde catálogo (opcional)
        </label>
        <select className={inCls} value={f.vehiculo_id ?? ''} onChange={e => onSelectCatalogo(e.target.value)}>
          <option value="">— Ingresar manualmente —</option>
          {catalogo.map((c: any) => (
            <option key={c.id} value={c.id}>{c.brand ?? c.marca} {c.model ?? c.modelo}</option>
          ))}
        </select>
      </div>

      {/* Identidad */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Marca *</label>
          <input className={inCls} value={f.marca} onChange={e => set('marca', e.target.value)} placeholder="MG" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Modelo *</label>
          <input className={inCls} value={f.modelo} onChange={e => set('modelo', e.target.value)} placeholder="MG RX8 DCT" />
        </div>
      </div>

      {/* Imagen y Precio */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">URL imagen</label>
          <input className={inCls} value={f.img_url ?? ''} onChange={e => set('img_url', e.target.value || null)} placeholder="https://..." />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Precio base ($) *</label>
          <NumInput className={inCls} value={f.precio_base} onChange={v => set('precio_base', v)} placeholder="30000" />
        </div>
      </div>

      {/* Label de gastos */}
      <div>
        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Descripción de gastos (aparece en la hoja)</label>
        <input className={inCls} value={f.gastos_label} onChange={e => set('gastos_label', e.target.value)} />
      </div>

      {/* ── CONTADO + CRÉDITO en paralelo ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Contado */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-amber-800 px-4 py-2">
            <p className="text-[11px] font-bold text-amber-100 uppercase tracking-wider">Modalidad Contado — Gastos</p>
          </div>
          <div className="p-3 space-y-1.5">
            {([
              ['Placa ($)', 'placa_c'],
              ['Póliza vehículo ($)', 'poliza_vehiculo_c'],
              ['Póliza vida ($)', 'poliza_vida_c'],
              ['Gastos Vehimotors ($)', 'gastos_vhm_c'],
              ['Hon. profesionales ($)', 'honorarios_c'],
              ['Gastos internos ($)', 'gastos_int_c'],
              ['Alfombras ($)', 'alfombras_c'],
            ] as [string, keyof PromoVehiculo][]).map(([label, field]) => (
              <div key={field} className="grid grid-cols-2 gap-2 items-center">
                <span className={rowLbl}>{label}</span>
                <NumInput className={itemCls} value={f[field] as number} onChange={v => set(field, v)} />
              </div>
            ))}
            <div className="flex justify-between items-center bg-amber-50 rounded-lg px-3 py-2 mt-1">
              <span className="text-xs font-bold text-amber-800">Total gastos</span>
              <span className="font-mono text-sm font-bold text-amber-800">${fmt(gcC)}</span>
            </div>
          </div>
          {precio > 0 && (
            <div className="bg-gray-800 mx-3 mb-3 rounded-xl p-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-300"><span>100% Precio base</span><span className="font-mono">${fmt(precio)}</span></div>
              <div className="flex justify-between text-gray-300"><span>IVA 16%</span><span className="font-mono">${fmt(iva)}</span></div>
              <div className="flex justify-between text-gray-400"><span>Gastos</span><span className="font-mono">${fmt(gcC)}</span></div>
              <div className="flex justify-between text-yellow-400 font-bold border-t border-gray-600 pt-1.5">
                <span>TOTAL A PAGAR</span><span className="font-mono">${fmt(precio + iva + gcC)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Crédito 24m */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-emerald-900 px-4 py-2 flex items-center justify-between">
            <p className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider">Crédito {nCuotas}m — Gastos</p>
            <button
              type="button"
              onClick={() => set('mostrar_credito', !f.mostrar_credito)}
              className={`w-8 h-5 rounded-full relative transition-colors flex-shrink-0 ${f.mostrar_credito ? 'bg-emerald-400' : 'bg-gray-500'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${f.mostrar_credito ? 'left-3.5' : 'left-0.5'}`} />
            </button>
          </div>
          <div className="p-3 space-y-1.5">
            <div className="grid grid-cols-2 gap-2 items-center">
              <span className={rowLbl}>Cuotas (N)</span>
              <NumInput className={itemCls} value={f.cuotas_vhm} onChange={v => set('cuotas_vhm', Math.round(v) || 24)} placeholder="24" />
            </div>
            <div className="grid grid-cols-2 gap-2 items-center">
              <span className={rowLbl}>Tasa interés (% anual)</span>
              <NumInput className={itemCls} value={f.tasa_vhm_pct ?? 0} onChange={v => set('tasa_vhm_pct', v || null)} placeholder="12" />
            </div>
            <div className="grid grid-cols-2 gap-2 items-center">
              <span className={rowLbl}>Cuota mensual ($)</span>
              <NumInput className={itemCls} value={f.cuota_mensual} onChange={v => set('cuota_mensual', v)} placeholder="731.03" />
            </div>
            {([
              ['Placa ($)', 'placa_cr'],
              ['Póliza vehículo ($)', 'poliza_vehiculo_cr'],
              ['Póliza vida ($)', 'poliza_vida_cr'],
              ['Gastos Vehimotors ($)', 'gastos_vhm_cr'],
              ['Hon. profesionales ($)', 'honorarios_cr'],
              ['Gastos internos ($)', 'gastos_int_cr'],
              ['Alfombras ($)', 'alfombras_cr'],
            ] as [string, keyof PromoVehiculo][]).map(([label, field]) => (
              <div key={field} className="grid grid-cols-2 gap-2 items-center">
                <span className={rowLbl}>{label}</span>
                <NumInput className={itemCls} value={f[field] as number} onChange={v => set(field, v)} />
              </div>
            ))}
            <div className="flex justify-between items-center bg-emerald-50 rounded-lg px-3 py-2 mt-1">
              <span className="text-xs font-bold text-emerald-800">Total gastos crédito</span>
              <span className="font-mono text-sm font-bold text-emerald-800">${fmt(gcCr)}</span>
            </div>
          </div>
          {precio > 0 && (
            <div className="bg-gray-800 mx-3 mb-3 rounded-xl p-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-300"><span>40% Precio base</span><span className="font-mono">${fmt(precio * 0.4)}</span></div>
              <div className="flex justify-between text-gray-300"><span>IVA 16%</span><span className="font-mono">${fmt(iva)}</span></div>
              <div className="flex justify-between text-gray-400"><span>Gastos</span><span className="font-mono">${fmt(gcCr)}</span></div>
              <div className="flex justify-between text-emerald-400 font-bold border-t border-gray-600 pt-1.5">
                <span>TOTAL INICIAL</span><span className="font-mono">${fmt(precio * 0.4 + iva + gcCr)}</span>
              </div>
              <div className="flex justify-between text-gray-400"><span>Financiamiento 60%</span><span className="font-mono">${fmt(precio * 0.6)}</span></div>
              {f.cuota_mensual > 0 && (
                <div className="flex justify-between text-red-400 font-bold border-t border-gray-600 pt-1.5">
                  <span>Cuota × {nCuotas}</span><span className="font-mono">${fmt(f.cuota_mensual)}/mes</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── PLAN 100% BANCO ── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-oriental-black px-4 py-2 flex items-center justify-between">
          <p className="text-[11px] font-bold text-gray-200 uppercase tracking-wider">Plan 100% Banco (crédito bancario)</p>
          <button
            type="button"
            onClick={() => set('mostrar_banco', !f.mostrar_banco)}
            className={`w-8 h-5 rounded-full relative transition-colors flex-shrink-0 ${f.mostrar_banco ? 'bg-oriental-red' : 'bg-gray-500'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${f.mostrar_banco ? 'left-3.5' : 'left-0.5'}`} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Placa ($)</label>
              <NumInput className={inCls} value={f.placa_monto} onChange={v => set('placa_monto', v)} placeholder="400" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Diferencial camb. (%)</label>
              <NumInput className={inCls} value={f.diferencial_pct} onChange={v => set('diferencial_pct', v)} placeholder="30" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Tasa banco (% anual)</label>
              <NumInput className={inCls} value={f.tasa_banco_pct} onChange={v => set('tasa_banco_pct', v)} placeholder="16" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {([
              ['Póliza vehículo ($)', 'poliza_vehiculo_banco'],
              ['Póliza vida ($)', 'poliza_vida_banco'],
              ['Honorarios prof. ($)', 'honorarios_banco'],
              ['Gastos internos ($)', 'gastos_internos_banco'],
              ['Alfombras ($)', 'alfombras_banco'],
            ] as [string, keyof PromoVehiculo][]).map(([label, field]) => (
              <div key={field}>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">{label}</label>
                <NumInput className={inCls} value={f[field] as number} onChange={v => set(field, v)} />
              </div>
            ))}
          </div>

          {precio > 0 && (
            <div className="bg-oriental-black rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
              <div className="text-center">
                <p className="text-gray-400 text-[10px] uppercase tracking-wider">Total vehículo</p>
                <p className="text-white font-bold text-sm">${fmt(totalVeh)}</p>
              </div>
              <div className="text-center border-l border-gray-700">
                <p className="text-gray-400 text-[10px] uppercase tracking-wider">Inicial cliente (30%+)</p>
                <p className="text-white font-bold text-sm">${fmt(totalInicialBanco)}</p>
              </div>
              <div className="text-center border-l border-gray-700">
                <p className="text-gray-400 text-[10px] uppercase tracking-wider">Financiamiento banco (70%)</p>
                <p className="text-white font-bold text-sm">${fmt(fin70)}</p>
              </div>
              <div className="text-center border-l border-gray-700">
                <p className="text-gray-400 text-[10px] uppercase tracking-wider">Cuota mensual ×24</p>
                <p className="text-oriental-red font-extrabold text-sm">${fmt(cuotaBanco)}/mes</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {err && <p className="text-xs text-red-600 font-semibold">{err}</p>}

      <div className="flex gap-2 pt-2 border-t border-gray-100">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">
            Cancelar
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={async () => {
              if (!confirm('¿Eliminar este vehículo de la promoción?')) return
              setDeleting(true); await onDelete(); setDeleting(false)
            }}
            disabled={deleting}
            className="px-4 py-2 border-2 border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? '...' : 'Eliminar'}
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2 bg-oriental-red text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : isNew ? '+ Agregar a la promoción' : '✓ Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

/* ─── Tab principal ──────────────────────────────────────────────────────── */
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
    const r = await fetch('/api/promociones/vehiculos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, orden: vehiculos.length }),
    })
    const j = await r.json()
    if (j.ok) { await load(); setShowAddForm(false) }
  }

  async function updateVehiculo(id: string, data: Partial<PromoVehiculo>) {
    await fetch(`/api/promociones/vehiculos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    await load()
    setExpandedId(null)
  }

  async function deleteVehiculo(id: string) {
    await fetch(`/api/promociones/vehiculos/${id}`, { method: 'DELETE' })
    setVehiculos(prev => prev.filter(v => v.id !== id))
    setExpandedId(null)
  }

  const newVehiculo: PromoVehiculo = { id: '', ...EMPTY }

  if (loading) return <div className="card p-8 text-center text-oriental-gray text-sm">Cargando...</div>

  return (
    <div className="space-y-6">

      {/* Header / Toggle activa */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-oriental-black mb-1">Promociones Especiales</h2>
            <p className="text-xs text-gray-400">Configura los vehículos en promoción y habilita la sección en la página pública.</p>
          </div>
          <button
            onClick={toggleActiva}
            disabled={toggling}
            className={`flex items-center gap-3 px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 ${
              promo?.activa ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
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
              <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value={subtituloVal} onChange={e => setSubtituloVal(e.target.value)} placeholder="Subtítulo opcional" />
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

      {/* Lista de vehículos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-oriental-black">{vehiculos.length} vehículo{vehiculos.length !== 1 ? 's' : ''} en promoción</p>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-oriental-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
            >
              + Agregar vehículo
            </button>
          )}
        </div>

        {/* Formulario de nuevo vehículo */}
        {showAddForm && (
          <div className="card p-5 border-2 border-oriental-red">
            <p className="text-sm font-bold text-oriental-black mb-4">Agregar vehículo a la promoción</p>
            <VehiculoEditor
              v={newVehiculo}
              catalogo={catalogo}
              onSave={addVehiculo}
              onCancel={() => setShowAddForm(false)}
              isNew
            />
          </div>
        )}

        {/* Vehículos existentes */}
        {vehiculos.map(v => {
          const gcC = v.placa_c + v.poliza_vehiculo_c + v.poliza_vida_c + v.gastos_vhm_c + v.honorarios_c + v.gastos_int_c + v.alfombras_c
          const totalContado = v.precio_base + v.precio_base * 0.16 + (gcC > 0 ? gcC : v.gastos_contado)
          return (
            <div key={v.id} className="card overflow-hidden">
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
                  <div className="flex gap-1.5 ml-2 flex-wrap">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Contado: ${totalContado.toLocaleString('es-VE', { maximumFractionDigits: 0 })}
                    </span>
                    {v.mostrar_credito && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Crédito {v.cuotas_vhm ?? 24}m ✓
                      </span>
                    )}
                    {v.mostrar_banco && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-800 text-gray-200">
                        Banco 100% ✓
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-gray-400 text-sm">{expandedId === v.id ? '▲' : '▼'}</span>
              </button>

              {expandedId === v.id && (
                <div className="px-5 pb-5 pt-2 border-t border-gray-100 bg-gray-50">
                  <VehiculoEditor
                    v={v}
                    catalogo={catalogo}
                    onSave={data => updateVehiculo(v.id, data)}
                    onDelete={() => deleteVehiculo(v.id)}
                  />
                </div>
              )}
            </div>
          )
        })}

        {vehiculos.length === 0 && !showAddForm && (
          <div className="card p-12 text-center text-oriental-gray">
            <p className="text-2xl mb-3">🏷️</p>
            <p className="font-semibold text-sm">No hay vehículos en la promoción todavía.</p>
            <p className="text-xs mt-1">Agrega un vehículo y activa la promoción para que aparezca en la web.</p>
          </div>
        )}
      </div>
    </div>
  )
}
