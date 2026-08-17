'use client'

import { useState, useEffect } from 'react'
import { waCotizacionUrl } from '@/lib/whatsapp-cotizacion'
import { AC500Vehiculo, Mode, activeModes, schedule, planTotal } from './AC500Filtro'

type ClienteBuscado = { nombre: string; ci_rif: string; correo: string; telefono: string; direccion: string; ciudad_estado: string; codigo_postal: string; fuente: string }
type Step = 'pin' | 'form' | 'sending' | 'success'

function fmt(n: number | null | undefined) {
  if (n == null || isNaN(n)) return '0,00'
  return n.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(n) * 100) % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })
}
function cap(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s }

const CAPTACION_OPCIONES = ['Concesionario', 'Sambil', 'Fuera de concesionario', 'Otro']

export default function CotizacionAC500Modal({ plan, defaultMode, defaultColor = '', onClose }: {
  plan: AC500Vehiculo
  defaultMode: Mode
  defaultColor?: string
  onClose: () => void
}) {
  const modes = activeModes(plan)
  const [step, setStep] = useState<Step>('pin')
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [vendedoraNombre, setVendedoraNombre] = useState('')
  const [meses, setMeses] = useState<Mode>(defaultMode)
  const colores = (plan.colores || '').split(',').map(c => c.trim()).filter(Boolean)
  const [color, setColor] = useState(defaultColor || colores[0] || '')
  const [form, setForm] = useState({
    clienteNombre: '', clienteCiRif: '', clienteCorreo: '',
    clienteTelefono: '', clienteDireccion: '',
    clienteCiudadEstado: '', clienteCodigoPostal: '',
  })
  const [captacionSel, setCaptacionSel] = useState('')
  const [captacionOtro, setCaptacionOtro] = useState('')
  const captacionFinal = captacionSel === 'Otro' ? (captacionOtro.trim() || 'Otro') : captacionSel
  const [errorMsg, setErrorMsg] = useState('')
  const [numeroCot, setNumeroCot] = useState('')
  const [cotId, setCotId] = useState('')
  const [compartiendo, setCompartiendo] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Buscador de clientes existentes
  const [cliQuery, setCliQuery] = useState('')
  const [cliResultados, setCliResultados] = useState<ClienteBuscado[]>([])
  const [cliBuscando, setCliBuscando] = useState(false)
  const [cliOpen, setCliOpen] = useState(false)

  useEffect(() => {
    const q = cliQuery.trim()
    if (q.length < 2) { setCliResultados([]); setCliBuscando(false); return }
    setCliBuscando(true)
    const t = setTimeout(() => {
      fetch(`/api/cotizaciones/clientes-buscar?q=${encodeURIComponent(q)}&codigo=${encodeURIComponent(pin)}`)
        .then(r => r.json())
        .then(d => { if (Array.isArray(d)) setCliResultados(d) })
        .catch(() => {})
        .finally(() => setCliBuscando(false))
    }, 300)
    return () => clearTimeout(t)
  }, [cliQuery])

  function seleccionarCliente(c: ClienteBuscado) {
    setForm(p => ({
      ...p,
      clienteNombre: c.nombre || '', clienteCiRif: c.ci_rif || '', clienteCorreo: c.correo || '',
      clienteTelefono: c.telefono || '', clienteDireccion: c.direccion || '',
      clienteCiudadEstado: c.ciudad_estado || '', clienteCodigoPostal: c.codigo_postal || '',
    }))
    setCliQuery(''); setCliResultados([]); setCliOpen(false); setErrorMsg('')
  }

  const rows = schedule(plan, meses)
  const total = planTotal(plan, meses)

  async function verificarPin() {
    if (!/^[A-Za-z]\d{3}$/.test(pin.trim())) { setPinError('El código debe ser una letra seguida de 3 dígitos (ej: D198)'); return }
    setPinLoading(true); setPinError('')
    try {
      const r = await fetch('/api/vendedoras/verificar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: pin }),
      })
      const json = await r.json()
      if (json.valida) { setVendedoraNombre(json.nombre); setStep('form') }
      else setPinError('Código incorrecto. Intenta de nuevo.')
    } catch {
      setPinError('Error de conexión. Intenta de nuevo.')
    } finally {
      setPinLoading(false)
    }
  }

  function cuerpoCotizacion(preview: boolean) {
    return {
      preview,
      codigo: pin,
      ac500PlanId: plan.id,
      ac500Meses: Number(meses),
      plan: 'ac500',
      modalidad: 'contado',
      color: color || null,
      clienteNombre: form.clienteNombre,
      clienteCiRif: form.clienteCiRif,
      clienteCorreo: form.clienteCorreo || null,
      clienteTelefono: form.clienteTelefono || null,
      clienteDireccion: form.clienteDireccion || null,
      clienteCiudadEstado: form.clienteCiudadEstado || null,
      clienteCodigoPostal: form.clienteCodigoPostal || null,
      origenCaptacion: captacionFinal,
    }
  }

  async function verPreview() {
    if (!form.clienteNombre.trim() || !form.clienteCiRif.trim()) {
      setErrorMsg('Nombre y C.I./RIF son obligatorios para la vista previa.'); return
    }
    if (!captacionSel) {
      setErrorMsg('Indica dónde captaste al cliente.'); return
    }
    setErrorMsg(''); setPreviewLoading(true)
    const win = typeof window !== 'undefined' ? window.open('', '_blank') : null
    try {
      const r = await fetch('/api/cotizaciones', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpoCotizacion(true)),
      })
      if (!r.ok) {
        let msg = 'No se pudo generar la vista previa.'
        try { const j = await r.json(); if (j?.error) msg = j.error } catch {}
        if (win) win.close()
        setErrorMsg(msg); return
      }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      if (win) win.location.href = url; else window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch {
      if (win) win.close()
      setErrorMsg('Error de conexión al generar la vista previa.')
    } finally {
      setPreviewLoading(false)
    }
  }

  async function enviar() {
    if (!form.clienteNombre.trim() || !form.clienteCiRif.trim()) {
      setErrorMsg('Nombre y C.I./RIF son obligatorios.'); return
    }
    if (!captacionSel) {
      setErrorMsg('Indica dónde captaste al cliente.'); return
    }
    if (form.clienteCorreo.trim() && !/\S+@\S+\.\S+/.test(form.clienteCorreo.trim())) {
      setErrorMsg('El correo no es válido.'); return
    }
    setStep('sending'); setErrorMsg('')
    try {
      const r = await fetch('/api/cotizaciones', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpoCotizacion(false)),
      })
      const json = await r.json()
      if (json.ok) { setNumeroCot(json.numero); setCotId(json.id ?? ''); setStep('success') }
      else { setErrorMsg(json.error ?? 'Error al generar la cotización.'); setStep('form') }
    } catch {
      setErrorMsg('Error de conexión. Intenta de nuevo.'); setStep('form')
    }
  }

  const pdfUrl = cotId ? `/api/cotizaciones/${cotId}/pdf` : ''

  async function compartirPorWhatsApp() {
    if (!cotId || compartiendo) return
    setCompartiendo(true)
    try {
      if (typeof navigator !== 'undefined' && 'canShare' in navigator) {
        const res = await fetch(`${pdfUrl}?download=1`)
        if (res.ok) {
          const blob = await res.blob()
          const file = new File([blob], `Cotizacion-${numeroCot || 'cotizacion'}.pdf`, { type: 'application/pdf' })
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: `Cotización ${numeroCot}`, text: `Cotización ${numeroCot} — ${plan.brand} ${plan.model}` })
            setCompartiendo(false); return
          }
        }
      }
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') { setCompartiendo(false); return }
    }
    const url = waCotizacionUrl({
      numero: numeroCot, marca: plan.brand, modelo: plan.model,
      telefono: form.clienteTelefono, clienteNombre: form.clienteNombre,
      pdfUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}${pdfUrl}`,
    })
    window.open(url, '_blank', 'noopener,noreferrer')
    setCompartiendo(false)
  }

  const label = { fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 4, display: 'block' as const, textTransform: 'uppercase' as const, letterSpacing: '0.4px' }
  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
              {step === 'pin' ? 'Acceso vendedora · Asegúrate $500' : step === 'success' ? '¡Cotización enviada!' : `${plan.brand} · ${vendedoraNombre}`}
            </p>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#111', margin: 0 }}>
              {step === 'pin' ? 'Cotizar plan $500' : step === 'success' ? '' : plan.model}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, lineHeight: '32px', textAlign: 'center' }}>×</button>
        </div>

        <div style={{ padding: '20px 24px 24px' }}>

          {/* ── STEP: PIN ── */}
          {step === 'pin' && (
            <div>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 1.5 }}>
                Ingresa tu código de vendedora para generar la cotización del plan Asegúrate $500.
              </p>
              <label style={label}>Código de vendedora</label>
              <input
                type="text" inputMode="text" autoCapitalize="characters" autoCorrect="off" autoComplete="off" spellCheck={false}
                maxLength={4} value={pin}
                onChange={e => { setPin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)); setPinError('') }}
                onKeyDown={e => e.key === 'Enter' && verificarPin()}
                placeholder="X000"
                style={{ ...inp, fontSize: 24, textAlign: 'center', letterSpacing: 12, fontWeight: 800, marginBottom: 6 }}
                autoFocus
              />
              {pinError && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 6, marginBottom: 0 }}>{pinError}</p>}
              <button onClick={verificarPin} disabled={pinLoading || pin.length !== 4}
                style={{ width: '100%', padding: '12px', marginTop: 16, background: pin.length === 4 ? '#111' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: pin.length === 4 ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                {pinLoading ? 'Verificando...' : 'Continuar →'}
              </button>
            </div>
          )}

          {/* ── STEP: FORM ── */}
          {(step === 'form' || step === 'sending') && (
            <div>
              {/* Vehículo */}
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 14px', marginBottom: 18 }}>
                <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, margin: '0 0 2px' }}>{plan.brand}</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#111', margin: 0 }}>{plan.model}</p>
              </div>

              {/* Meses del plan */}
              {modes.length > 1 && (
                <div style={{ marginBottom: 18 }}>
                  <label style={label}>Cronograma (entrega)</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {modes.map(m => (
                      <button key={m} onClick={() => setMeses(m)}
                        style={{ flex: 1, padding: '10px 8px', border: `2px solid ${meses === m ? '#ca8a04' : '#e5e7eb'}`, borderRadius: 10, background: meses === m ? '#ca8a04' : '#fff', color: meses === m ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {m} meses
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Color */}
              {colores.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <label style={label}>Color</label>
                  <select value={color} onChange={e => setColor(e.target.value)} style={{ ...inp, color: color ? '#111' : '#9ca3af' }}>
                    <option value="">Sin especificar</option>
                    {colores.map(c => <option key={c} value={cap(c)} style={{ color: '#111' }}>{cap(c)}</option>)}
                  </select>
                </div>
              )}

              {/* Resumen del plan */}
              <div style={{ background: '#fffbeb', border: '1px solid rgba(234,179,8,0.35)', borderRadius: 12, padding: '12px 14px', marginBottom: 18 }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: '#a16207', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Plan Asegúrate $500 · {meses} meses</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '3px 0' }}>
                  {rows.map((r, i) => (
                    <span key={i} style={{ display: 'contents' }}>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>{r.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#111', textAlign: 'right' }}>${fmt(r.val)}</span>
                    </span>
                  ))}
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#111', borderTop: '1px solid #fde68a', marginTop: 4, paddingTop: 4 }}>TOTAL</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#92400e', textAlign: 'right', borderTop: '1px solid #fde68a', marginTop: 4, paddingTop: 4 }}>${fmt(total)}</span>
                </div>
              </div>

              {/* Datos del cliente */}
              <p style={{ fontSize: 12, fontWeight: 800, color: '#111', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>Datos del cliente</p>

              <div style={{ position: 'relative', marginBottom: 14 }}>
                <label style={label}>🔍 Buscar cliente existente</label>
                <input style={inp} value={cliQuery} onChange={e => { setCliQuery(e.target.value); setCliOpen(true) }} onFocus={() => setCliOpen(true)} placeholder="Nombre, C.I./RIF, correo o teléfono..." />
                {cliOpen && cliQuery.trim().length >= 2 && (
                  <div style={{ position: 'absolute', zIndex: 10, left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto' }}>
                    {cliBuscando && <p style={{ padding: '8px 12px', fontSize: 12, color: '#9ca3af', margin: 0 }}>Buscando...</p>}
                    {!cliBuscando && cliResultados.length === 0 && <p style={{ padding: '8px 12px', fontSize: 12, color: '#9ca3af', margin: 0 }}>Sin coincidencias. Llena los datos abajo.</p>}
                    {cliResultados.map((c, i) => (
                      <button key={i} type="button" onClick={() => seleccionarCliente(c)}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: '#fff', border: 'none', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', fontFamily: 'inherit' }}>
                        <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#111' }}>{c.nombre || '—'}</span>
                        <span style={{ display: 'block', fontSize: 11, color: '#6b7280' }}>{[c.ci_rif, c.correo, c.telefono].filter(Boolean).join(' · ')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={label}>Nombre completo *</label>
                  <input style={inp} value={form.clienteNombre} onChange={e => setForm(p => ({ ...p, clienteNombre: e.target.value }))} placeholder="Nombre del cliente" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={label}>C.I. / RIF *</label>
                    <input style={inp} value={form.clienteCiRif} onChange={e => setForm(p => ({ ...p, clienteCiRif: e.target.value }))} placeholder="V-12345678" />
                  </div>
                  <div>
                    <label style={label}>Teléfono</label>
                    <input style={inp} value={form.clienteTelefono} onChange={e => setForm(p => ({ ...p, clienteTelefono: e.target.value }))} placeholder="0414-..." />
                  </div>
                </div>
                <div>
                  <label style={label}>Correo electrónico</label>
                  <input style={inp} type="email" value={form.clienteCorreo} onChange={e => setForm(p => ({ ...p, clienteCorreo: e.target.value }))} placeholder="cliente@email.com" />
                </div>
                <div>
                  <label style={label}>Dirección</label>
                  <input style={inp} value={form.clienteDireccion} onChange={e => setForm(p => ({ ...p, clienteDireccion: e.target.value }))} placeholder="Av. Principal..." />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                  <div>
                    <label style={label}>Ciudad / Estado</label>
                    <input style={inp} value={form.clienteCiudadEstado} onChange={e => setForm(p => ({ ...p, clienteCiudadEstado: e.target.value }))} placeholder="Porlamar / Nueva Esparta" />
                  </div>
                  <div>
                    <label style={label}>Código Postal</label>
                    <input style={inp} value={form.clienteCodigoPostal} onChange={e => setForm(p => ({ ...p, clienteCodigoPostal: e.target.value }))} placeholder="6201" />
                  </div>
                </div>
                <div>
                  <label style={label}>¿Dónde captaste al cliente? *</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {CAPTACION_OPCIONES.map(o => (
                      <button key={o} type="button" onClick={() => setCaptacionSel(o)}
                        style={{
                          padding: '8px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                          border: captacionSel === o ? '1.5px solid #111' : '1.5px solid #d1d5db',
                          background: captacionSel === o ? '#111' : '#fff',
                          color: captacionSel === o ? '#fff' : '#374151',
                        }}>
                        {o}
                      </button>
                    ))}
                  </div>
                  {captacionSel === 'Otro' && (
                    <input style={{ ...inp, marginTop: 8 }} value={captacionOtro} onChange={e => setCaptacionOtro(e.target.value)} placeholder="¿Dónde?" />
                  )}
                </div>
              </div>

              {errorMsg && (
                <div style={{ marginTop: 14, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px' }}>
                  <p style={{ fontSize: 13, color: '#dc2626', fontWeight: 600, margin: 0 }}>{errorMsg}</p>
                </div>
              )}

              <button onClick={verPreview} disabled={previewLoading || step === 'sending'}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px', marginTop: 20, background: '#fff', border: '1.5px solid #111', borderRadius: 12, fontSize: 13, fontWeight: 700, color: '#111', cursor: previewLoading ? 'default' : 'pointer', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                {previewLoading ? 'Generando vista previa…' : '👁 Ver PDF (vista previa)'}
              </button>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button onClick={onClose} style={{ flex: 1, padding: '12px', background: '#fff', border: '1.5px solid #d1d5db', borderRadius: 12, fontSize: 13, fontWeight: 600, color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancelar
                </button>
                <button onClick={enviar} disabled={step === 'sending'}
                  style={{ flex: 2, padding: '12px', background: step === 'sending' ? '#9ca3af' : '#dc2626', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: step === 'sending' ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                  {step === 'sending' ? 'Enviando cotización...' : '📄 Enviar cotización al cliente'}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: SUCCESS ── */}
          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '10px 0 8px' }}>
              <div style={{ width: 64, height: 64, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>✓</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111', marginBottom: 6 }}>¡Cotización enviada!</h3>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                Cotización <strong style={{ color: '#C41E3A' }}>{numeroCot}</strong> generada{form.clienteCorreo ? ' y enviada al correo del cliente' : ''}.
              </p>
              <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 20 }}>José Rojas fue notificado.</p>

              {cotId && (
                <>
                  <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px', background: '#fff', color: '#111', border: '1.5px solid #d1d5db', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none', fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box' }}>
                    👁 Ver PDF
                  </a>
                  <button onClick={compartirPorWhatsApp} disabled={compartiendo}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: compartiendo ? 'default' : 'pointer', fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                    {compartiendo ? 'Preparando PDF…' : 'Compartir por WhatsApp'}
                  </button>
                </>
              )}

              <button onClick={onClose} style={{ width: '100%', padding: '12px', background: '#111', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cerrar
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
