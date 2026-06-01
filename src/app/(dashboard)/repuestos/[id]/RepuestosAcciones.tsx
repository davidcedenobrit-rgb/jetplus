'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronRight, Send, Upload, Loader2, CheckCircle2 } from 'lucide-react'

interface Item { id: string; descripcion: string; referencia?: string | null; cantidad: number }
interface Props {
  solicitud: any
  items: Item[]
  rol: string
  userId: string
  userEmail: string
}

const ROL_ARIANNA  = ['arianna', 'director', 'jose', 'admin', 'mary', 'leysdem']
const ROL_DIRECTOR = ['director', 'jose', 'admin', 'mary', 'leysdem']

export default function RepuestosAcciones({ solicitud, items, rol, userId, userEmail }: Props) {
  const supabase = createClient()
  const router   = useRouter()
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [notasAri, setNotasAri] = useState(solicitud.notas_arianna ?? '')
  const [guia, setGuia]         = useState(solicitud.numero_guia ?? '')
  const [fechaLlegada, setFechaLlegada] = useState(solicitud.fecha_estimada_llegada ?? '')
  const [uploading, setUploading] = useState(false)

  const estado = solicitud.estado
  const esArianna   = ROL_ARIANNA.includes(rol)
  const esAlmacenista = true // todos pueden ver, almacenista solo crea
  const esCompleto  = estado === 'completado' || estado === 'cancelado'

  async function logHistorial(estadoNuevo: string, notas?: string) {
    await supabase.from('repuestos_historial').insert({
      solicitud_id: solicitud.id,
      estado_nuevo: estadoNuevo,
      usuario_email: userEmail,
      notas: notas ?? null,
    })
  }

  async function avanzarEstado(nuevoEstado: string, extra?: object, notaLog?: string) {
    setLoading(true); setError('')
    const { error: err } = await supabase.from('solicitudes_repuestos').update({
      estado: nuevoEstado,
      updated_at: new Date().toISOString(),
      ...extra,
    }).eq('id', solicitud.id)
    if (err) { setError(err.message); setLoading(false); return }
    await logHistorial(nuevoEstado, notaLog)
    router.refresh()
    setLoading(false)
  }

  async function verificar() {
    await avanzarEstado('verificado', { notas_arianna: notasAri || null }, 'Arianna verificó la solicitud')
  }

  async function enviarCotizacion() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/repuestos/enviar-cotizacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitudId: solicitud.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar')
      await logHistorial('cotizacion_enviada', 'Email de cotización enviado a Vehimotors')
      router.refresh()
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  async function subirComprobante(file: File) {
    setUploading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Sesión expirada'); setUploading(false); return }

    const path = `repuestos/${solicitud.id}/comprobante-${Date.now()}.${file.name.split('.').pop()}`
    const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, file, { upsert: false })
    if (upErr) { setError(`Error al subir: ${upErr.message}`); setUploading(false); return }

    const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(path)

    // Enviar comprobante por email y actualizar estado
    const res = await fetch('/api/repuestos/enviar-pago', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solicitudId: solicitud.id, comprobanteUrl: urlData.publicUrl }),
    })
    if (!res.ok) { setError('Error al enviar el comprobante'); setUploading(false); return }

    await supabase.from('solicitudes_repuestos').update({ comprobante_pago_url: urlData.publicUrl, updated_at: new Date().toISOString() }).eq('id', solicitud.id)
    await logHistorial('pago_enviado', 'Comprobante de pago enviado a Vehimotors')
    router.refresh()
    setUploading(false)
  }

  async function registrarGuia() {
    if (!guia.trim()) { setError('Ingresa el número de guía'); return }
    await avanzarEstado('guia_recibida', { numero_guia: guia, fecha_estimada_llegada: fechaLlegada || null }, `Guía recibida: ${guia}`)
  }

  async function confirmarLlegada() {
    await avanzarEstado('completado', {}, 'Pedido recibido y confirmado en taller')
  }

  return (
    <div className="space-y-4">
      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

      {/* ── PASO 1 → 2: Arianna verifica ── */}
      {estado === 'solicitado' && esArianna && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-oriental-black mb-3">Verificar solicitud</h3>
          <div className="mb-3">
            <label className="label">Notas de verificación</label>
            <textarea className="textarea text-sm" rows={2} placeholder="Observaciones opcionales…"
              value={notasAri} onChange={e => setNotasAri(e.target.value)} />
          </div>
          <button onClick={verificar} disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2 py-2.5">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Marcar como verificado
          </button>
        </div>
      )}

      {/* ── PASO 2 → 3: Enviar cotización a Vehimotors ── */}
      {estado === 'verificado' && esArianna && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-oriental-black mb-2">Enviar cotización a Vehimotors</h3>
          <p className="text-xs text-oriental-gray mb-4">Se enviará un email a Vehimotors con los repuestos y botones de respuesta.</p>
          <button onClick={enviarCotizacion} disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2 py-2.5">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Enviar email a Vehimotors
          </button>
        </div>
      )}

      {/* ── PASO 3: Esperando respuesta ── */}
      {estado === 'cotizacion_enviada' && (
        <div className="card p-5 border border-yellow-200 bg-yellow-50">
          <p className="text-sm font-semibold text-yellow-800 flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" /> Esperando respuesta de Vehimotors…
          </p>
          <p className="text-xs text-yellow-600 mt-1">El sistema actualizará automáticamente cuando respondan.</p>
          {solicitud.correo_enviado_at && (
            <p className="text-[10px] text-yellow-600 mt-2">
              Email enviado: {new Date(solicitud.correo_enviado_at).toLocaleString('es-VE')}
            </p>
          )}
        </div>
      )}

      {/* ── PASO 4 → 5: Subir comprobante de pago ── */}
      {estado === 'cotizacion_recibida' && esArianna && solicitud.respuesta_vehimotors !== 'no_hay' && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-oriental-black mb-2">Enviar comprobante de pago</h3>
          <p className="text-xs text-oriental-gray mb-4">Sube el comprobante — se enviará automáticamente a Vehimotors.</p>
          <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors text-sm font-semibold
            ${uploading ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-oriental-red/30 text-oriental-red hover:border-oriental-red hover:bg-red-50'}`}>
            {uploading ? <><Loader2 size={16} className="animate-spin" /> Subiendo…</> : <><Upload size={16} /> Cargar comprobante</>}
            <input type="file" className="hidden" accept="image/*,.pdf" disabled={uploading}
              onChange={e => { const f = e.target.files?.[0]; if (f) subirComprobante(f) }} />
          </label>
          {solicitud.comprobante_pago_url && (
            <a href={solicitud.comprobante_pago_url} target="_blank" rel="noopener noreferrer"
              className="mt-2 text-xs text-oriental-red font-semibold flex items-center gap-1 hover:underline">
              Ver comprobante subido →
            </a>
          )}
        </div>
      )}

      {/* ── PASO 5 → 6: Registrar guía ── */}
      {estado === 'pago_enviado' && esArianna && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-oriental-black mb-3">Registrar guía de despacho</h3>
          <div className="space-y-3">
            <div>
              <label className="label">Número de guía *</label>
              <input type="text" className="input font-mono" placeholder="0000000000"
                value={guia} onChange={e => setGuia(e.target.value)} />
            </div>
            <div>
              <label className="label">Fecha estimada de llegada</label>
              <input type="date" className="input" value={fechaLlegada} onChange={e => setFechaLlegada(e.target.value)} />
            </div>
            <button onClick={registrarGuia} disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 py-2.5">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
              Registrar guía
            </button>
          </div>
        </div>
      )}

      {/* ── PASO 6 → 7: Confirmar llegada ── */}
      {estado === 'guia_recibida' && esArianna && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-oriental-black mb-2">Confirmar llegada del pedido</h3>
          <p className="text-xs text-oriental-gray mb-4">Confirma que los repuestos llegaron al taller.</p>
          <button onClick={confirmarLlegada} disabled={loading}
            className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Confirmar llegada ✓
          </button>
        </div>
      )}

      {/* ── COMPLETADO ── */}
      {estado === 'completado' && (
        <div className="card p-5 border border-green-200 bg-green-50 text-center">
          <CheckCircle2 size={28} className="text-green-600 mx-auto mb-2" />
          <p className="font-bold text-green-800">Pedido completado</p>
          <p className="text-xs text-green-600 mt-1">Los repuestos fueron recibidos en el taller.</p>
        </div>
      )}
    </div>
  )
}
