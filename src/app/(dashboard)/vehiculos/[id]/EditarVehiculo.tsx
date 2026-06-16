'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Pencil, X, Loader2 } from 'lucide-react'

interface VehiculoEditable {
  marca: 'MG' | 'MAXUS'
  modelo: string
  version: string | null
  anio: number | null
  color: string | null
  placa: string | null
  vin: string | null
  serial_motor: string | null
  tipo_compra: string
  estado: string
  fecha_entrega: string | null
  observaciones: string | null
}

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red'

export default function EditarVehiculo({ vehiculoId, vehiculo }: { vehiculoId: string; vehiculo: VehiculoEditable }) {
  const supabase = createClient()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<VehiculoEditable>(vehiculo)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function field<K extends keyof VehiculoEditable>(key: K, value: VehiculoEditable[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function guardar() {
    setSaving(true); setError('')
    const { error: err } = await supabase
      .from('vehiculos')
      .update({
        marca: form.marca,
        modelo: form.modelo.trim(),
        version: form.version?.trim() || null,
        anio: form.anio,
        color: form.color?.trim() || null,
        placa: form.placa?.trim() || null,
        vin: form.vin?.trim() || null,
        serial_motor: form.serial_motor?.trim() || null,
        tipo_compra: form.tipo_compra,
        estado: form.estado,
        fecha_entrega: form.fecha_entrega || null,
        observaciones: form.observaciones?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vehiculoId)
    setSaving(false)
    if (err) { setError(err.message); return }
    setEditing(false)
    router.refresh()
  }

  if (!editing) {
    return (
      <button
        onClick={() => { setForm(vehiculo); setEditing(true) }}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-oriental-gray text-xs font-semibold hover:bg-gray-50 hover:text-oriental-black transition-colors"
      >
        <Pencil size={13} /> Editar vehículo
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Marca</label>
          <select className={inputCls} value={form.marca} onChange={e => field('marca', e.target.value as 'MG' | 'MAXUS')}>
            <option value="MG">MG</option>
            <option value="MAXUS">MAXUS</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Modelo</label>
          <input className={inputCls} type="text" value={form.modelo} onChange={e => field('modelo', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Versión</label>
          <input className={inputCls} type="text" value={form.version ?? ''} onChange={e => field('version', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Año</label>
          <input className={inputCls} type="number" step="1" value={form.anio ?? ''} onChange={e => field('anio', e.target.value ? parseInt(e.target.value) : null)} />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-gray-500 mb-1">Color</label>
        <input className={inputCls} type="text" value={form.color ?? ''} onChange={e => field('color', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Placa</label>
          <input className={inputCls} type="text" value={form.placa ?? ''} onChange={e => field('placa', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">VIN / Chasis</label>
          <input className={inputCls} type="text" value={form.vin ?? ''} onChange={e => field('vin', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-gray-500 mb-1">Serial motor</label>
        <input className={inputCls} type="text" value={form.serial_motor ?? ''} onChange={e => field('serial_motor', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Tipo de compra</label>
          <select className={inputCls} value={form.tipo_compra} onChange={e => field('tipo_compra', e.target.value)}>
            <option value="contado">Contado</option>
            <option value="credito">Crédito</option>
            <option value="financiamiento">Financiamiento</option>
            <option value="financiado">Financiado</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Estado</label>
          <select className={inputCls} value={form.estado} onChange={e => field('estado', e.target.value)}>
            <option value="activo">Activo</option>
            <option value="entregado">Entregado</option>
            <option value="en_transito">En tránsito</option>
            <option value="reservado">Reservado</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-gray-500 mb-1">Fecha de entrega</label>
        <input className={inputCls} type="date" value={form.fecha_entrega ?? ''} onChange={e => field('fecha_entrega', e.target.value || null)} />
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-gray-500 mb-1">Observaciones</label>
        <textarea className={`${inputCls} resize-none`} rows={2} value={form.observaciones ?? ''} onChange={e => field('observaciones', e.target.value)} />
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={guardar} disabled={saving}
          className="flex-1 py-2 rounded-lg bg-oriental-red hover:bg-oriental-red-dark text-white font-bold text-xs transition-colors flex items-center justify-center gap-1 disabled:opacity-60">
          {saving ? <Loader2 size={12} className="animate-spin" /> : null} Guardar
        </button>
        <button onClick={() => setEditing(false)} className="flex-1 btn-secondary py-2 text-xs flex items-center justify-center gap-1">
          <X size={12} /> Cancelar
        </button>
      </div>
    </div>
  )
}
