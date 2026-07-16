'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Send, Upload, Loader2, CheckCircle2, X, ExternalLink, FileText, Truck, Settings } from 'lucide-react'

interface Item { id: string; descripcion: string; referencia?: string | null; cantidad: number }
interface Props {
  solicitud: any
  items: Item[]
  rol: string
  userId: string
  userEmail: string
}

// Verificar, rechazar, enviar cotización, cargar pago, solicitar guía — Ari/Mary/Leysdm/Rojas (NO José)
const ROL_OPERADOR  = ['arianna', 'director', 'admin', 'mary', 'leysdem']
// Aprobar cotización — solo Rojas
const ROL_DIRECTOR  = ['director', 'admin']
// Cargar pago y retención — Mary es quien carga el pago (dirección de respaldo)
const ROL_PAGO      = ['mary', 'director', 'admin']
// Panel admin y acciones internas
const ROL_ADMIN     = ['arianna', 'director', 'admin', 'mary', 'leysdem']

const TODOS_ESTADOS = [
  { key: 'solicitado',             label: 'Solicitado' },
  { key: 'verificado',             label: 'Verificado' },
  { key: 'cotizacion_enviada',     label: 'Cotización enviada' },
  { key: 'cotizacion_recibida',    label: 'Cotización recibida' },
  { key: 'sin_stock',              label: 'Sin stock' },
  { key: 'cotizacion_aprobada',    label: 'Cotización aprobada' },
  { key: 'factura_recibida',       label: 'Factura recibida' },
  { key: 'pago_enviado',           label: 'Pago enviado' },
  { key: 'enviado_almacen',        label: 'Enviado a almacén' },
  { key: 'guia_recibida',          label: 'Guía recibida' },
  { key: 'completado',             label: 'Completado' },
  { key: 'comprado_plaza',         label: 'Comprado en plaza' },
  { key: 'rechazado_verificacion', label: 'Rechazado' },
  { key: 'cancelado',              label: 'Cancelado' },
]

export default function RepuestosAcciones({ solicitud, items, rol, userId, userEmail }: Props) {
  const supabase  = createClient()
  const router    = useRouter()
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [notasRec, setNotasRec]   = useState(solicitud.rechazo_motivo ?? '')
  const [notasAri, setNotasAri]   = useState(solicitud.notas_arianna ?? '')
  const [showRechazo, setShowRechazo] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)

  // Enviar a almacén
  const CORREOS_ALMACEN = ['jrodriguez@saicve.com', 'armando.eminca@gmail.com']
  const [showAlmacen, setShowAlmacen] = useState(false)
  const [correosAlmacen, setCorreosAlmacen] = useState<boolean[]>([true, true])
  const [numCotizacion, setNumCotizacion] = useState('')
  const [correoAdicionalAlmacen, setCorreoAdicionalAlmacen] = useState('')
  const [enviandoAlmacen, setEnviandoAlmacen] = useState(false)

  // Novedad de recepción
  const [showNovedad, setShowNovedad] = useState(false)
  const [novedadTexto, setNovedadTexto] = useState('')
  const [novedadFoto, setNovedadFoto] = useState<File | null>(null)
  const [enviandoReporte, setEnviandoReporte] = useState(false)

  // Panel admin
  const [showAdmin, setShowAdmin] = useState(false)
  const [adminEstado, setAdminEstado] = useState(solicitud.estado)

  // Aprobación cotización
  const [numCotizacionAprob, setNumCotizacionAprob] = useState('')

  // Cotización Vehimotors al enviar pago
  const [numCotizacionPago, setNumCotizacionPago] = useState('')
  const [montoPago, setMontoPago] = useState('')
  const [correoAdicionalPago, setCorreoAdicionalPago] = useState('')

  const esOperador = ROL_OPERADOR.includes(rol)
  const esDirector = ROL_DIRECTOR.includes(rol)
  const esPago     = ROL_PAGO.includes(rol)
  const estado     = solicitud.estado

  async function log(nuevoEstado: string, notas?: string) {
    await supabase.from('repuestos_historial').insert({
      solicitud_id: solicitud.id, estado_nuevo: nuevoEstado,
      usuario_email: userEmail, notas: notas ?? null,
    })
  }

  async function avanzar(nuevoEstado: string, extra?: object, notaLog?: string) {
    setLoading(true); setError('')
    const { error: err } = await supabase.from('solicitudes_repuestos').update({
      estado: nuevoEstado, updated_at: new Date().toISOString(), ...extra,
    }).eq('id', solicitud.id)
    if (err) { setError(err.message); setLoading(false); return }
    await log(nuevoEstado, notaLog)
    router.refresh()
    setLoading(false)
  }

  // ── Upload helper ──────────────────────────────────────────────
  async function subirArchivo(tipo: string, file: File): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const path = `repuestos/${solicitud.id}/${tipo}-${Date.now()}.${file.name.split('.').pop()}`
    const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, file, { upsert: false })
    if (upErr) { setError(`Error al subir: ${upErr.message}`); return null }
    const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(path)
    return urlData.publicUrl
  }

  async function handleSubirDoc(tipo: 'retencion_url' | 'comprobante_url' | 'otros_docs_url', file: File) {
    setUploading(tipo); setError('')
    const url = await subirArchivo(tipo, file)
    if (url) {
      await supabase.from('solicitudes_repuestos').update({ [tipo]: url, updated_at: new Date().toISOString() }).eq('id', solicitud.id)
      await log(estado, `Documento cargado: ${tipo}`)
      router.refresh()
    }
    setUploading(null)
  }

  async function handleEnviarPago() {
    if (!solicitud.comprobante_url) { setError('Debes cargar el comprobante de pago primero'); return }
    if (!numCotizacionPago.trim()) { setError('Ingresa el número de cotización de Vehimotors'); return }
    const montoNum = parseFloat(montoPago)
    if (isNaN(montoNum) || montoNum <= 0) { setError('Ingresa el monto pagado (mayor a 0)'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/repuestos/enviar-pago', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solicitudId: solicitud.id, comprobanteUrl: solicitud.comprobante_url, numeroCotizacion: numCotizacionPago.trim(), monto: montoNum, correoAdicional: correoAdicionalPago.trim() || null }),
    })
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); setLoading(false); return }
    await log('pago_enviado', 'Pago enviado a Vehimotors')
    router.refresh(); setLoading(false)
  }

  async function handleAprobarCotizacion() {
    if (!numCotizacionAprob.trim()) { setError('Ingresa el número de cotización de Vehimotors'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/repuestos/aprobar-cotizacion', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solicitudId: solicitud.id, userEmail, numeroCotizacion: numCotizacionAprob.trim() }),
    })
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); setLoading(false); return }
    router.refresh(); setLoading(false)
  }

  const pagoListo = solicitud.comprobante_url

  async function handleReporteRecepcion(tieneNovedad: boolean) {
    setEnviandoReporte(true); setError('')
    const fd = new FormData()
    fd.append('solicitudId', solicitud.id)
    fd.append('tieneNovedad', String(tieneNovedad))
    fd.append('userEmail', userEmail)
    if (tieneNovedad && novedadTexto) fd.append('notas', novedadTexto)
    if (tieneNovedad && novedadFoto)  fd.append('foto', novedadFoto)
    const res = await fetch('/api/repuestos/reportar-recepcion', { method: 'POST', body: fd })
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); setEnviandoReporte(false); return }
    router.refresh()
    setEnviandoReporte(false)
  }

  async function handleEnviarAlmacen() {
    const emails = CORREOS_ALMACEN.filter((_, i) => correosAlmacen[i])
    if (!emails.length || !numCotizacion.trim()) {
      setError('Selecciona al menos un correo e ingresa el número de cotización'); return
    }
    setEnviandoAlmacen(true); setError('')
    const res = await fetch('/api/repuestos/enviar-almacen', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solicitudId: solicitud.id, correosAlmacen: emails, numeroCotizacion: numCotizacion.trim(), userEmail, correoAdicional: correoAdicionalAlmacen.trim() || null }),
    })
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); setEnviandoAlmacen(false); return }
    setShowAlmacen(false); router.refresh()
    setEnviandoAlmacen(false)
  }

  return (
    <div className="space-y-4">
      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

      {/* ── PASO 1 → Arianna verifica o rechaza ── */}
      {estado === 'solicitado' && esOperador && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-oriental-black mb-3">Verificar solicitud</h3>
          <div className="mb-3">
            <label className="label">Notas</label>
            <textarea className="textarea text-sm" rows={2} value={notasAri} onChange={e => setNotasAri(e.target.value)} placeholder="Observaciones opcionales…" />
          </div>
          <button onClick={() => avanzar('verificado', { notas_arianna: notasAri || null }, 'Verificado por Arianna')}
            disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 mb-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Verificar ✓
          </button>
          <button onClick={() => setShowRechazo(true)} className="w-full btn-secondary py-2.5 text-oriental-red border-red-200 hover:bg-red-50">
            Rechazar solicitud
          </button>
          {showRechazo && (
            <div className="mt-3 space-y-2">
              <textarea className="textarea text-sm" rows={2} placeholder="Motivo del rechazo *"
                value={notasRec} onChange={e => setNotasRec(e.target.value)} />
              <div className="flex gap-2">
                <button disabled={!notasRec.trim() || loading}
                  onClick={() => avanzar('rechazado_verificacion', { rechazo_motivo: notasRec }, `Rechazado: ${notasRec}`)}
                  className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors disabled:opacity-50">
                  {loading ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Confirmar rechazo'}
                </button>
                <button onClick={() => setShowRechazo(false)} className="flex-1 btn-secondary py-2 text-sm">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Rechazada ── */}
      {estado === 'rechazado_verificacion' && (
        <div className="card p-5 border border-red-200 bg-red-50">
          <p className="font-bold text-red-800 mb-1">Solicitud rechazada</p>
          <p className="text-xs text-red-600">{solicitud.rechazo_motivo}</p>
        </div>
      )}

      {/* ── PASO 2 → Enviar cotización a Vehimotors ── */}
      {estado === 'verificado' && esOperador && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-oriental-black mb-2">Enviar cotización a Vehimotors</h3>
          <button onClick={async () => {
            setLoading(true); setError('')
            const res = await fetch('/api/repuestos/enviar-cotizacion', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ solicitudId: solicitud.id }),
            })
            if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); setLoading(false); return }
            router.refresh(); setLoading(false)
          }} disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2 py-2.5">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Enviar email a Vehimotors
          </button>
        </div>
      )}

      {/* ── PASO 3 → Esperando respuesta ── */}
      {estado === 'cotizacion_enviada' && (
        <div className="card p-5 border border-yellow-200 bg-yellow-50">
          <p className="text-sm font-semibold text-yellow-800 flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" /> Esperando respuesta de Vehimotors…
          </p>
          <p className="text-xs text-yellow-600 mt-1">El sistema actualizará cuando respondan.</p>
          {esOperador && (
            <button
              onClick={async () => {
                setLoading(true); setError('')
                const res = await fetch('/api/repuestos/enviar-cotizacion', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ solicitudId: solicitud.id }),
                })
                if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); setLoading(false); return }
                await log('cotizacion_enviada', 'Email reenviado a Vehimotors')
                router.refresh(); setLoading(false)
              }}
              disabled={loading}
              className="w-full mt-3 px-3 py-2 border border-yellow-300 bg-white text-yellow-800 text-xs font-semibold rounded-lg hover:bg-yellow-100 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Reenviar correo a Vehimotors
            </button>
          )}
          {error && <p className="text-xs text-red-700 mt-2">{error}</p>}
        </div>
      )}

      {/* ── PASO 4 → Cotización recibida → aprobar — SOLO Rojas ── */}
      {estado === 'cotizacion_recibida' && esDirector && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-oriental-black mb-2">Revisar y aprobar cotización</h3>
          {solicitud.cotizacion_url ? (
            <a href={solicitud.cotizacion_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-oriental-red font-semibold hover:underline mb-4">
              <FileText size={14} /> Ver cotización adjunta →
            </a>
          ) : (
            <p className="text-xs text-oriental-gray mb-4">Vehimotors no adjuntó archivo — ver observaciones arriba.</p>
          )}
          {solicitud.cotizacion_observaciones && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs font-semibold text-yellow-800 mb-1">Observaciones de Vehimotors:</p>
              <p className="text-sm text-yellow-700">{solicitud.cotizacion_observaciones}</p>
            </div>
          )}
          <div className="mb-4">
            <label className="label">N° de cotización Vehimotors *</label>
            <input
              className="input text-sm font-mono"
              type="text"
              placeholder="Ej: SA03789"
              value={numCotizacionAprob}
              onChange={e => setNumCotizacionAprob(e.target.value)}
            />
            <p className="text-[11px] text-oriental-gray mt-1">Este número aparecerá en el email de aprobación que recibe Vehimotors.</p>
          </div>
          <button onClick={handleAprobarCotizacion} disabled={loading || !numCotizacionAprob.trim()}
            className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Aprobar cotización ✓
          </button>
        </div>
      )}

      {/* ── PASO 5 → Esperando factura ── */}
      {estado === 'cotizacion_aprobada' && (
        <div className="card p-5 border border-purple-200 bg-purple-50 text-center">
          <Loader2 size={18} className="animate-spin text-purple-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-purple-800">Esperando factura de Vehimotors…</p>
          <p className="text-xs text-purple-600 mt-1">Se les envió el enlace para adjuntar la factura.</p>
        </div>
      )}

      {/* ── PASO 6 → Factura recibida → cargar docs + enviar pago ── */}
      {(estado === 'factura_recibida' || (estado === 'pago_enviado' && !solicitud.comprobante_url)) && esPago && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-oriental-black mb-1">Documentos de pago</h3>
          <p className="text-xs text-oriental-gray mb-4">Carga los documentos y luego envía el pago.</p>

          {solicitud.factura_url && (
            <a href={solicitud.factura_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-oriental-red font-semibold hover:underline mb-4">
              <FileText size={14} /> Ver factura →
            </a>
          )}

          {[
            { campo: 'retencion_url',   label: 'Retenciones',         existente: solicitud.retencion_url },
            { campo: 'comprobante_url', label: 'Comprobante de pago',  existente: solicitud.comprobante_url },
            { campo: 'otros_docs_url',  label: 'Otros documentos',     existente: solicitud.otros_docs_url },
          ].map(({ campo, label, existente }) => (
            <div key={campo} className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">{label}</label>
                {existente && (
                  <a href={existente} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] text-green-600 font-semibold flex items-center gap-1 hover:underline">
                    <CheckCircle2 size={11} /> Cargado →
                  </a>
                )}
              </div>
              <label className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed cursor-pointer text-xs font-medium transition-colors
                ${uploading === campo ? 'border-gray-300 text-gray-400 cursor-not-allowed' : existente ? 'border-green-300 bg-green-50 text-green-700 hover:border-green-400' : 'border-oriental-red/30 text-oriental-red hover:border-oriental-red hover:bg-red-50'}`}>
                {uploading === campo ? <><Loader2 size={12} className="animate-spin" /> Subiendo…</> : <><Upload size={12} /> {existente ? 'Reemplazar' : 'Cargar'}</>}
                <input type="file" className="hidden" accept="image/*,.pdf" disabled={!!uploading}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleSubirDoc(campo as any, f) }} />
              </label>
            </div>
          ))}

          {estado === 'factura_recibida' && (
            <>
              <div className="mb-3">
                <label className="label">N° de cotización Vehimotors *</label>
                <input
                  className="input text-sm font-mono"
                  type="text"
                  placeholder="Ej: SA03789"
                  value={numCotizacionPago}
                  onChange={e => setNumCotizacionPago(e.target.value)}
                />
                <p className="text-[11px] text-oriental-gray mt-1">Aparecerá en el email: "Se ha pagado la cotización XXXXX del pedido SORE-XXXXX".</p>
              </div>
              <div className="mb-3">
                <label className="label">Monto pagado a Vehimotors (USD) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray font-bold text-sm">$</span>
                  <input
                    className="input text-sm font-semibold pl-7"
                    type="number" step="0.01" min="0"
                    placeholder="0.00"
                    value={montoPago}
                    onChange={e => setMontoPago(e.target.value)}
                  />
                </div>
                <p className="text-[11px] text-oriental-gray mt-1">Con este monto se registra automáticamente el egreso a Vehimotors.</p>
              </div>
              <div className="mb-3">
                <label className="label">Correo adicional <span className="text-oriental-gray font-normal">(opcional)</span></label>
                <input className="input text-sm" type="email"
                  placeholder="correo@ejemplo.com"
                  value={correoAdicionalPago} onChange={e => setCorreoAdicionalPago(e.target.value)} />
                <p className="text-[11px] text-oriental-gray mt-1">Recibirá copia del correo de pago que se envía a Vehimotors.</p>
              </div>
              <button onClick={handleEnviarPago} disabled={!pagoListo || !numCotizacionPago.trim() || !(parseFloat(montoPago) > 0) || loading}
                className={`w-full mt-1 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2
                  ${pagoListo && numCotizacionPago.trim() && parseFloat(montoPago) > 0 ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {pagoListo ? 'Enviar pago y registrar egreso' : 'Carga el comprobante para continuar'}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── PASO 7 → Pago enviado → enviar a almacén ── */}
      {estado === 'pago_enviado' && ROL_ADMIN.includes(rol) && (
        <div className="card p-5">
          {!showAlmacen ? (
            <>
              <div className="card p-4 border border-blue-200 bg-blue-50 mb-3">
                <p className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Pago enviado a Vehimotors
                </p>
                <p className="text-xs text-blue-600 mt-1">Cuando tengas los datos, envía al almacén para que registren el despacho.</p>
              </div>
              <button onClick={() => setShowAlmacen(true)}
                className="w-full btn-primary flex items-center justify-center gap-2 py-2.5">
                <Send size={16} /> Enviar a almacén
              </button>
            </>
          ) : (
            <>
              <h3 className="text-sm font-bold text-oriental-black mb-3">Enviar a almacén</h3>
              <div className="mb-3">
                <label className="label">Destinatarios *</label>
                <div className="space-y-2">
                  {CORREOS_ALMACEN.map((email, i) => (
                    <label key={email} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={correosAlmacen[i]}
                        onChange={e => setCorreosAlmacen(prev => prev.map((v, idx) => idx === i ? e.target.checked : v))}
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-oriental-black">{email}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="label">Número de cotización (código Vehimotors) *</label>
                <input className="input text-sm" type="text"
                  placeholder="Ej: COT-2026-00123"
                  value={numCotizacion} onChange={e => setNumCotizacion(e.target.value)} />
              </div>
              <div className="mb-4">
                <label className="label">Correo adicional <span className="text-oriental-gray font-normal">(opcional)</span></label>
                <input className="input text-sm" type="email"
                  placeholder="correo@ejemplo.com"
                  value={correoAdicionalAlmacen} onChange={e => setCorreoAdicionalAlmacen(e.target.value)} />
                <p className="text-[11px] text-oriental-gray mt-1">Se agrega como destinatario junto a los correos de Vehimotors marcados.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleEnviarAlmacen} disabled={enviandoAlmacen}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 py-2.5 disabled:opacity-60">
                  {enviandoAlmacen ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  Enviar email
                </button>
                <button onClick={() => { setShowAlmacen(false); setCorreosAlmacen([true, true]); setNumCotizacion(''); setError('') }}
                  className="flex-1 btn-secondary py-2.5 text-sm">Cancelar</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PASO 7.5 → Enviado a almacén, esperando guía ── */}
      {estado === 'enviado_almacen' && (
        <div className="card p-5 border border-blue-200 bg-blue-50">
          <p className="text-sm font-semibold text-blue-800 flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" /> Enviado a almacén — esperando guía…
          </p>
          {solicitud.correos_almacen && (
            <p className="text-xs text-blue-600 mt-1">Notificado a: {solicitud.correos_almacen}</p>
          )}
          {solicitud.numero_cotizacion_vehimotors && (
            <p className="text-xs text-blue-600 mt-0.5 font-mono font-bold">Cot: {solicitud.numero_cotizacion_vehimotors}</p>
          )}
        </div>
      )}

      {/* ── PASO 8 → Guía recibida → confirmar llegada + reporte a Vehimotors ── */}
      {estado === 'guia_recibida' && esOperador && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-oriental-black mb-2">Confirmar llegada del pedido</h3>
          {solicitud.guia_url && (
            <a href={solicitud.guia_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-oriental-red font-semibold hover:underline mb-3">
              <Truck size={14} /> Ver guía de despacho →
            </a>
          )}

          {!showNovedad ? (
            <div className="space-y-2">
              <button
                onClick={() => handleReporteRecepcion(false)}
                disabled={enviandoReporte}
                className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {enviandoReporte ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Recibido sin novedad — notificar a Vehimotors
              </button>
              <button
                onClick={() => setShowNovedad(true)}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-orange-300 text-orange-700 hover:bg-orange-50 font-bold text-sm transition-colors flex items-center justify-center gap-2">
                ⚠️ Reportar novedad
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-oriental-gray">Describe la novedad y adjunta una foto si es necesario. Se enviará a Vehimotors.</p>
              <div>
                <label className="label">Descripción de la novedad *</label>
                <textarea className="textarea text-sm" rows={3} placeholder="Ej: Llegaron 2 piezas en mal estado, falta 1 filtro…"
                  value={novedadTexto} onChange={e => setNovedadTexto(e.target.value)} />
              </div>
              <div>
                <label className="label">Foto (opcional)</label>
                <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-orange-300 cursor-pointer text-xs font-medium text-orange-700 hover:bg-orange-50 transition-colors">
                  <Upload size={12} /> {novedadFoto ? novedadFoto.name : 'Adjuntar foto'}
                  <input type="file" className="hidden" accept="image/*,.pdf"
                    onChange={e => setNovedadFoto(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleReporteRecepcion(true)}
                  disabled={!novedadTexto.trim() || enviandoReporte}
                  className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {enviandoReporte ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Enviar novedad
                </button>
                <button onClick={() => { setShowNovedad(false); setNovedadTexto(''); setNovedadFoto(null) }}
                  className="flex-1 btn-secondary py-2.5 text-sm">
                  Cancelar
                </button>
              </div>
            </div>
          )}
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

      {/* ── PANEL ADMIN: editar cualquier paso ── */}
      {ROL_ADMIN.includes(rol) && (
        <div className="card p-5 border border-dashed border-gray-300">
          <button
            onClick={() => setShowAdmin(v => !v)}
            className="w-full flex items-center justify-between text-sm font-semibold text-oriental-gray hover:text-oriental-black transition-colors">
            <span className="flex items-center gap-2"><Settings size={14} /> Gestión de trazabilidad</span>
            <span className="text-xs">{showAdmin ? '▲' : '▼'}</span>
          </button>
          {showAdmin && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-oriental-gray">Cambia manualmente el estado de esta solicitud.</p>
              <select
                className="input text-sm"
                value={adminEstado}
                onChange={e => setAdminEstado(e.target.value)}>
                {TODOS_ESTADOS.map(e => (
                  <option key={e.key} value={e.key}>{e.label}</option>
                ))}
              </select>
              <button
                onClick={() => avanzar(adminEstado, {}, `Estado ajustado manualmente por ${userEmail}`)}
                disabled={loading || adminEstado === estado}
                className="w-full btn-secondary py-2 text-sm disabled:opacity-40">
                {loading ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Aplicar cambio de estado'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
