'use client'

import { useState, useMemo, useEffect } from 'react'
import { Wrench, Plus, Loader2, X, Pencil, Trash2, Upload, ExternalLink, TrendingUp, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Servicio {
  id: string
  numero: string
  numero_externo: string | null
  fecha_servicio: string
  km: number
  concepto: string
  comprobante_url: string | null
  observaciones: string | null
  registrado_por_email: string | null
  created_at: string
}

interface Props {
  vehiculoId: string
  puedeGestionar: boolean
}

function fmtFecha(iso: string) {
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return iso }
}

function fmtKm(km: number) {
  return km.toLocaleString('es-VE')
}

// Calcula el próximo servicio estimado basado en el patrón del cliente.
// Si hay ≥2 servicios: intervalo promedio en km + ritmo mensual → fecha estimada.
// Si hay 1 servicio: se sugiere +5000 km como default automotor.
function calcularProximoServicio(servicios: Servicio[]): {
  proximoKm: number | null
  fechaEstimada: string | null
  intervaloPromedioKm: number | null
  ritmoMensualKm: number | null
} {
  if (servicios.length === 0) {
    return { proximoKm: null, fechaEstimada: null, intervaloPromedioKm: null, ritmoMensualKm: null }
  }

  // Ordenar ascendente por fecha
  const orden = [...servicios].sort((a, b) => a.fecha_servicio.localeCompare(b.fecha_servicio))
  const ultimo = orden[orden.length - 1]

  if (orden.length === 1) {
    // Un solo servicio: default +5000 km
    return {
      proximoKm: ultimo.km + 5000,
      fechaEstimada: null,
      intervaloPromedioKm: null,
      ritmoMensualKm: null,
    }
  }

  // Intervalo promedio de km entre servicios
  const intervalos: number[] = []
  const dias: number[] = []
  for (let i = 1; i < orden.length; i++) {
    const dkm = orden[i].km - orden[i - 1].km
    if (dkm > 0) intervalos.push(dkm)

    const d1 = new Date(orden[i - 1].fecha_servicio + 'T12:00:00')
    const d2 = new Date(orden[i].fecha_servicio + 'T12:00:00')
    const ddias = Math.round((d2.getTime() - d1.getTime()) / 86400000)
    if (ddias > 0) dias.push(ddias)
  }

  const intervaloPromedioKm = intervalos.length ? Math.round(intervalos.reduce((a, b) => a + b, 0) / intervalos.length) : 5000
  const proximoKm = ultimo.km + intervaloPromedioKm

  // Ritmo mensual de km = kmTotal / (dias * 30)
  const totalKm = orden[orden.length - 1].km - orden[0].km
  const totalDias = dias.reduce((a, b) => a + b, 0)
  const ritmoMensualKm = totalDias > 0 ? Math.round((totalKm / totalDias) * 30) : null

  // Fecha estimada = fecha del último servicio + intervaloPromedioKm / ritmo_diario
  let fechaEstimada: string | null = null
  if (ritmoMensualKm && ritmoMensualKm > 0) {
    const diasHasta = Math.round(intervaloPromedioKm / (ritmoMensualKm / 30))
    const fechaBase = new Date(ultimo.fecha_servicio + 'T12:00:00')
    fechaBase.setDate(fechaBase.getDate() + diasHasta)
    fechaEstimada = fechaBase.toISOString().slice(0, 10)
  }

  return { proximoKm, fechaEstimada, intervaloPromedioKm, ritmoMensualKm }
}

export default function ServiciosVehiculo({ vehiculoId, puedeGestionar }: Props) {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Servicio | null>(null)

  async function cargar() {
    setLoading(true)
    try {
      const r = await fetch(`/api/servicios-vehiculo?vehiculo_id=${vehiculoId}`)
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Error')
      setServicios(j.servicios ?? [])
    } catch (e: any) {
      setError(e?.message ?? 'Error al cargar servicios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() /* eslint-disable-next-line */ }, [vehiculoId])

  const proximo = useMemo(() => calcularProximoServicio(servicios), [servicios])

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este servicio? Esta acción no se puede deshacer.')) return
    const r = await fetch(`/api/servicios-vehiculo/${id}`, { method: 'DELETE' })
    if (!r.ok) {
      const j = await r.json()
      alert(`Error: ${j.error ?? 'no se pudo eliminar'}`)
      return
    }
    await cargar()
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-oriental-black flex items-center gap-2">
          <Wrench size={18} className="text-oriental-gray" /> Servicios al vehículo
        </h2>
        {puedeGestionar && (
          <button
            onClick={() => { setEditando(null); setModalOpen(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-oriental-red text-white text-xs font-semibold rounded-lg hover:bg-red-700"
          >
            <Plus size={13} /> Registrar servicio
          </button>
        )}
      </div>

      {/* Próximo servicio estimado */}
      {servicios.length > 0 && proximo.proximoKm && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={15} className="text-blue-700" />
            <p className="text-xs font-bold text-blue-900 uppercase tracking-wide">Próximo servicio estimado</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <p className="text-[10px] text-blue-700 uppercase font-semibold">Kilometraje</p>
              <p className="text-sm font-bold text-blue-900">{fmtKm(proximo.proximoKm)} km</p>
            </div>
            {proximo.fechaEstimada && (
              <div>
                <p className="text-[10px] text-blue-700 uppercase font-semibold">Fecha aprox.</p>
                <p className="text-sm font-bold text-blue-900">{fmtFecha(proximo.fechaEstimada)}</p>
              </div>
            )}
            {proximo.intervaloPromedioKm && (
              <div>
                <p className="text-[10px] text-blue-700 uppercase font-semibold">Intervalo prom.</p>
                <p className="text-sm font-bold text-blue-900">{fmtKm(proximo.intervaloPromedioKm)} km</p>
              </div>
            )}
            {proximo.ritmoMensualKm && (
              <div>
                <p className="text-[10px] text-blue-700 uppercase font-semibold">Uso mensual</p>
                <p className="text-sm font-bold text-blue-900">≈ {fmtKm(proximo.ritmoMensualKm)} km/mes</p>
              </div>
            )}
          </div>
          {!proximo.fechaEstimada && servicios.length === 1 && (
            <p className="text-[11px] text-blue-700 mt-2 italic">Cuando se registre otro servicio se estimará la fecha con el ritmo real de uso.</p>
          )}
        </div>
      )}

      {loading && (
        <div className="py-6 flex items-center justify-center gap-2 text-oriental-gray text-sm">
          <Loader2 size={14} className="animate-spin" /> Cargando…
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {!loading && servicios.length === 0 && (
        <p className="text-oriental-gray text-sm py-8 text-center">
          Aún no hay servicios registrados para este vehículo.
          {puedeGestionar && ' Registra el primero para comenzar el historial.'}
        </p>
      )}

      {!loading && servicios.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-oriental-bg border-b border-gray-200">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">N.° servicio</th>
                <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Fecha</th>
                <th className="text-right px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Km</th>
                <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Concepto</th>
                <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Comprobante</th>
                {puedeGestionar && <th className="text-right px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {servicios.map(s => (
                <tr key={s.id} className="hover:bg-oriental-bg/50 transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="font-mono text-xs font-bold text-oriental-red">{s.numero}</p>
                    {s.numero_externo && <p className="text-[10px] text-oriental-gray">Ext: {s.numero_externo}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-oriental-gray flex items-center gap-1">
                    <Calendar size={11} className="text-gray-400" /> {fmtFecha(s.fecha_servicio)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-oriental-black">{fmtKm(s.km)}</td>
                  <td className="px-3 py-2.5 text-oriental-black">
                    <p className="line-clamp-2">{s.concepto}</p>
                    {s.observaciones && <p className="text-[11px] text-oriental-gray mt-0.5 line-clamp-1">{s.observaciones}</p>}
                  </td>
                  <td className="px-3 py-2.5">
                    {s.comprobante_url ? (
                      <a href={s.comprobante_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-oriental-red hover:underline">
                        <ExternalLink size={11} /> Ver
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  {puedeGestionar && (
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditando(s); setModalOpen(true) }}
                          className="p-1.5 hover:bg-gray-100 rounded text-oriental-gray hover:text-oriental-black"
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => eliminar(s.id)}
                          className="p-1.5 hover:bg-red-50 rounded text-oriental-gray hover:text-red-600"
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && puedeGestionar && (
        <ServicioModal
          vehiculoId={vehiculoId}
          servicio={editando}
          onClose={() => setModalOpen(false)}
          onSaved={async () => { setModalOpen(false); await cargar() }}
        />
      )}
    </div>
  )
}

function ServicioModal({
  vehiculoId, servicio, onClose, onSaved,
}: {
  vehiculoId: string
  servicio: Servicio | null
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const supabase = createClient()
  const [form, setForm] = useState({
    fechaServicio: servicio?.fecha_servicio ?? new Date().toISOString().slice(0, 10),
    km: servicio?.km ? String(servicio.km) : '',
    concepto: servicio?.concepto ?? '',
    numeroExterno: servicio?.numero_externo ?? '',
    observaciones: servicio?.observaciones ?? '',
    comprobanteUrl: servicio?.comprobante_url ?? '',
  })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function subirComprobante(file: File) {
    setUploading(true); setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesión expirada')
      const path = `servicios/${vehiculoId}/${Date.now()}.${file.name.split('.').pop()}`
      const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, file, { upsert: false })
      if (upErr) throw new Error(upErr.message)
      const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(path)
      setForm(p => ({ ...p, comprobanteUrl: urlData.publicUrl }))
    } catch (e: any) {
      setError(e?.message ?? 'Error subiendo archivo')
    } finally {
      setUploading(false)
    }
  }

  async function guardar() {
    setSaving(true); setError(null)
    const kmNum = parseInt(form.km.replace(/\D/g, ''))
    if (!form.fechaServicio) { setError('Fecha requerida'); setSaving(false); return }
    if (isNaN(kmNum) || kmNum < 0) { setError('Kilometraje inválido'); setSaving(false); return }
    if (!form.concepto.trim()) { setError('Concepto requerido'); setSaving(false); return }

    const payload = {
      vehiculoId,
      fechaServicio: form.fechaServicio,
      km: kmNum,
      concepto: form.concepto,
      numeroExterno: form.numeroExterno || null,
      comprobanteUrl: form.comprobanteUrl || null,
      observaciones: form.observaciones || null,
    }

    const url = servicio ? `/api/servicios-vehiculo/${servicio.id}` : '/api/servicios-vehiculo'
    const method = servicio ? 'PATCH' : 'POST'
    const r = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!r.ok) {
      const j = await r.json()
      setError(j.error ?? 'Error al guardar')
      return
    }
    await onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-bold text-oriental-black">{servicio ? 'Editar servicio' : 'Registrar servicio'}</h3>
            <p className="text-xs text-oriental-gray">{servicio ? servicio.numero : 'Se generará un número automático al guardar'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-oriental-gray mb-1">Fecha del servicio *</label>
              <input type="date" value={form.fechaServicio} onChange={e => setForm(p => ({ ...p, fechaServicio: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-oriental-gray mb-1">Kilometraje *</label>
              <input type="text" inputMode="numeric" value={form.km} onChange={e => setForm(p => ({ ...p, km: e.target.value }))}
                placeholder="42500"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-oriental-gray mb-1">Concepto del servicio *</label>
            <textarea value={form.concepto} onChange={e => setForm(p => ({ ...p, concepto: e.target.value }))}
              rows={2} placeholder="Ej: Cambio de aceite, filtro y revisión de frenos"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-oriental-gray mb-1">N.° externo del taller (opcional)</label>
            <input type="text" value={form.numeroExterno} onChange={e => setForm(p => ({ ...p, numeroExterno: e.target.value }))}
              placeholder="Ej: OT-45789 (referencia externa)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-oriental-gray mb-1">Observaciones (opcional)</label>
            <textarea value={form.observaciones} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-oriental-gray mb-1">Comprobante / Factura (opcional)</label>
            {form.comprobanteUrl ? (
              <div className="flex items-center justify-between gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <a href={form.comprobanteUrl} target="_blank" rel="noreferrer" className="text-xs text-green-800 hover:underline flex items-center gap-1 truncate">
                  <ExternalLink size={11} /> Ver comprobante
                </a>
                <button onClick={() => setForm(p => ({ ...p, comprobanteUrl: '' }))} className="text-xs text-red-600 hover:underline">Quitar</button>
              </div>
            ) : (
              <label className="cursor-pointer flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 text-oriental-gray text-xs">
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {uploading ? 'Subiendo…' : 'Subir factura / comprobante'}
                <input type="file" className="hidden" accept="image/*,application/pdf"
                  onChange={e => e.target.files?.[0] && subirComprobante(e.target.files[0])} />
              </label>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose} disabled={saving} className="flex-1 px-4 py-2 border border-gray-200 text-sm font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={guardar} disabled={saving || uploading} className="flex-1 px-4 py-2 bg-oriental-red text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Guardando…' : (servicio ? 'Guardar cambios' : 'Registrar servicio')}
          </button>
        </div>
      </div>
    </div>
  )
}
