'use client'

import { useState, useEffect } from 'react'
import { waCotizacionUrl } from '@/lib/whatsapp-cotizacion'

type ClienteBuscado = { nombre: string; ci_rif: string; correo: string; telefono: string; direccion: string; ciudad_estado: string; codigo_postal: string; fuente: string }

const CONCES_CORTO: Record<string, string> = {
  'la-oriental': 'La Oriental', 'autosurca': 'Autosurca', 'capital-motors': 'Capital Motors', 'kiauto': 'Ki Auto',
}

interface Vehiculo {
  id: string
  brand: string
  model: string
  cash: number | null
  gc: number | null
  gcr: number | null
  tasa_credito: number | null
  placa_monto?: number | null
  poliza_vehiculo_banco?: number | null
  poliza_vida_banco?: number | null
  honorarios_banco?: number | null
  gastos_internos_banco?: number | null
  alfombras_banco?: number | null
  transporte_banco?: number | null
  accesorios_banco?: number | null
  igtf_banco?: number | null
  diferencial_pct?: number | null
  tasa_banco_pct?: number | null
  diferencial_c_activo?: boolean | null
  diferencial_cr_activo?: boolean | null
  diferencial_banco_activo?: boolean | null
}

type Step = 'pin' | 'form' | 'sending' | 'success' | 'error'
type Modalidad = 'contado' | 'credito_24'
type Plan = 'vehimotors' | 'banco_100'

function fmt(n: number | null | undefined) {
  if (!n) return '0,00'
  return n.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(n)*100)%100===0?0:2, maximumFractionDigits: 2 })
}

function calcular(v: Vehiculo, modalidad: Modalidad, plan: Plan, tasas: { bcv: number; usdt: number }) {
  const precio = v.cash ?? 0
  const iva = precio * 0.16
  // Diferencial cambiario = (USDT - BCV) / BCV. Se activa por vehículo (Rojas decide).
  const difPct = (tasas.bcv > 0 && tasas.usdt > tasas.bcv) ? (tasas.usdt - tasas.bcv) / tasas.bcv : 0
  if (modalidad === 'contado') {
    // gc ya incluye los ítems manuales (transporte, accesorios, IGTF, etc.).
    const diferencial = v.diferencial_c_activo ? precio * difPct : 0
    const gastos = (v.gc ?? 0) + diferencial
    return { iva, gastos, totalVehiculo: null, inicialBanco: null, totalInicial: precio + iva + gastos, financiamiento: null, cuota: null, costoTotal: precio + iva + gastos }
  }
  if (plan === 'banco_100') {
    const placaMonto = v.placa_monto ?? 400
    const totalVehiculo = precio + iva + placaMonto
    const financiamientoBanco = totalVehiculo * 0.70
    const diferencial = (v.diferencial_banco_activo !== false) ? financiamientoBanco * difPct : 0
    const gastosBanco = (v.poliza_vehiculo_banco ?? 0) + (v.poliza_vida_banco ?? 0) + (v.honorarios_banco ?? 0) + (v.gastos_internos_banco ?? 0) + (v.alfombras_banco ?? 0) + (v.transporte_banco ?? 0) + (v.accesorios_banco ?? 0) + (v.igtf_banco ?? 0)
    const gastos = gastosBanco + diferencial
    const inicialBanco = totalVehiculo * 0.30
    const totalInicial = inicialBanco + gastos
    const financiamiento = totalVehiculo * 0.70
    const tasaBanco = v.tasa_banco_pct ?? 16
    const r = tasaBanco / 100 / 12
    const cuota = financiamiento * r * Math.pow(1 + r, 24) / (Math.pow(1 + r, 24) - 1)
    return { iva, gastos, totalVehiculo, inicialBanco, totalInicial, financiamiento, cuota, costoTotal: totalInicial + cuota * 24 }
  }
  // Crédito Vehimotors — gcr ya incluye los ítems manuales.
  const diferencial = v.diferencial_cr_activo ? precio * difPct : 0
  const gastos = (v.gcr ?? 0) + diferencial
  const totalInicial = precio * 0.4 + iva + gastos
  const financiamiento = precio * 0.6
  const cuota = v.tasa_credito ?? 0
  return { iva, gastos, totalVehiculo: null, inicialBanco: null, totalInicial, financiamiento, cuota, costoTotal: totalInicial + cuota * 24 }
}

export default function CotizacionModal({ vehiculo, tasas, onClose, esPromo = false, promoId }: { vehiculo: Vehiculo; tasas: { bcv: number; usdt: number }; onClose: () => void; esPromo?: boolean; promoId?: string }) {
  const [step, setStep] = useState<Step>('pin')
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [vendedoraNombre, setVendedoraNombre] = useState('')
  const [modalidad, setModalidad] = useState<Modalidad>('contado')
  // Plan fijo Vehimotors: el crédito 100% Banco se retiró del cotizador de vendedores.
  const [plan] = useState<Plan>('vehimotors')
  const [form, setForm] = useState({
    clienteNombre: '', clienteCiRif: '', clienteCorreo: '',
    clienteTelefono: '', clienteDireccion: '',
    clienteCiudadEstado: '', clienteCodigoPostal: '',
    agenteRetencion: false,
  })
  const [errorMsg, setErrorMsg] = useState('')
  const [numeroCot, setNumeroCot] = useState('')
  const [cotId, setCotId] = useState('')
  const [compartiendo, setCompartiendo] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Concesionario — solo el código de la casa (R000) puede elegir; el resto va a La Oriental
  const esCasa = pin.trim().toUpperCase() === 'R000'
  const [concesionarios, setConcesionarios] = useState<{ id: string; nombre: string; es_principal: boolean }[]>([])
  const [concesionarioId, setConcesionarioId] = useState('la-oriental')

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
      clienteNombre: c.nombre || '',
      clienteCiRif: c.ci_rif || '',
      clienteCorreo: c.correo || '',
      clienteTelefono: c.telefono || '',
      clienteDireccion: c.direccion || '',
      clienteCiudadEstado: c.ciudad_estado || '',
      clienteCodigoPostal: c.codigo_postal || '',
    }))
    setCliQuery(''); setCliResultados([]); setCliOpen(false); setErrorMsg('')
  }

  const calc = calcular(vehiculo, modalidad, plan, tasas)

  async function verificarPin() {
    if (!/^[A-Za-z]\d{3}$/.test(pin.trim())) { setPinError('El código debe ser una letra seguida de 3 dígitos (ej: D198)'); return }
    setPinLoading(true)
    setPinError('')
    try {
      const r = await fetch('/api/vendedoras/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: pin }),
      })
      const json = await r.json()
      if (json.valida) {
        setVendedoraNombre(json.nombre)
        setStep('form')
        if (pin.trim().toUpperCase() === 'R000') {
          fetch('/api/concesionarios')
            .then(r => r.json())
            .then((d: { id: string; nombre: string; es_principal: boolean }[]) => {
              if (Array.isArray(d) && d.length) {
                setConcesionarios(d)
                const principal = d.find(c => c.es_principal) ?? d[0]
                setConcesionarioId(principal.id)
              }
            })
            .catch(() => {})
        }
      } else {
        setPinError('Código incorrecto. Intenta de nuevo.')
      }
    } catch {
      setPinError('Error de conexión. Intenta de nuevo.')
    } finally {
      setPinLoading(false)
    }
  }

  async function enviar() {
    if (!form.clienteNombre.trim() || !form.clienteCiRif.trim() || !form.clienteCorreo.trim()) {
      setErrorMsg('Nombre, C.I./RIF y correo son obligatorios.')
      return
    }
    if (!/\S+@\S+\.\S+/.test(form.clienteCorreo.trim())) {
      setErrorMsg('El correo no es válido.')
      return
    }
    setStep('sending')
    setErrorMsg('')
    try {
      const r = await fetch('/api/cotizaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: pin,
          ...(esPromo && promoId ? { promoVehiculoId: promoId } : { vehiculoId: vehiculo.id }),
          clienteNombre: form.clienteNombre,
          clienteCiRif: form.clienteCiRif,
          clienteCorreo: form.clienteCorreo,
          clienteTelefono: form.clienteTelefono || null,
          clienteDireccion: form.clienteDireccion || null,
          clienteCiudadEstado: form.clienteCiudadEstado || null,
          clienteCodigoPostal: form.clienteCodigoPostal || null,
          agenteRetencion: form.agenteRetencion,
          modalidad,
          plan: modalidad === 'credito_24' ? plan : 'vehimotors',
          concesionarioId: esCasa ? concesionarioId : 'la-oriental',
        }),
      })
      const json = await r.json()
      if (json.ok) {
        setNumeroCot(json.numero)
        setCotId(json.id ?? '')
        setStep('success')
      } else {
        setErrorMsg(json.error ?? 'Error al generar la cotización.')
        setStep('form')
      }
    } catch {
      setErrorMsg('Error de conexión. Intenta de nuevo.')
      setStep('form')
    }
  }

  const pdfUrl = cotId ? `/api/cotizaciones/${cotId}/pdf` : ''

  // Vista previa del PDF (sin guardar la cotización ni enviar correo). Abre el
  // PDF en una pestaña nueva para que la vendedora lo revise antes de enviar.
  async function verPreview() {
    if (!form.clienteNombre.trim() || !form.clienteCiRif.trim()) {
      setErrorMsg('Nombre y C.I./RIF son obligatorios para la vista previa.')
      return
    }
    setErrorMsg('')
    setPreviewLoading(true)
    // Abrir la pestaña dentro del gesto del usuario (evita bloqueo de pop-ups en móvil).
    const win = typeof window !== 'undefined' ? window.open('', '_blank') : null
    try {
      const r = await fetch('/api/cotizaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preview: true,
          codigo: pin,
          ...(esPromo && promoId ? { promoVehiculoId: promoId } : { vehiculoId: vehiculo.id }),
          clienteNombre: form.clienteNombre,
          clienteCiRif: form.clienteCiRif,
          clienteCorreo: form.clienteCorreo || null,
          clienteTelefono: form.clienteTelefono || null,
          clienteDireccion: form.clienteDireccion || null,
          clienteCiudadEstado: form.clienteCiudadEstado || null,
          clienteCodigoPostal: form.clienteCodigoPostal || null,
          agenteRetencion: form.agenteRetencion,
          modalidad,
          plan: modalidad === 'credito_24' ? plan : 'vehimotors',
          concesionarioId: esCasa ? concesionarioId : 'la-oriental',
        }),
      })
      if (!r.ok) {
        let msg = 'No se pudo generar la vista previa.'
        try { const j = await r.json(); if (j?.error) msg = j.error } catch {}
        if (win) win.close()
        setErrorMsg(msg)
        return
      }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      if (win) win.location.href = url
      else window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch {
      if (win) win.close()
      setErrorMsg('Error de conexión al generar la vista previa.')
    } finally {
      setPreviewLoading(false)
    }
  }

  // Compartir por WhatsApp desde el PDF: en el teléfono usa el compartir nativo
  // (adjunta el PDF de verdad al chat que elija la vendedora). Si el dispositivo
  // no lo soporta (típico en escritorio), cae al enlace wa.me con el link al PDF.
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
            await navigator.share({
              files: [file],
              title: `Cotización ${numeroCot}`,
              text: `Cotización ${numeroCot} — ${vehiculo.brand} ${vehiculo.model}`,
            })
            setCompartiendo(false)
            return
          }
        }
      }
    } catch (e) {
      // Si la vendedora cancela el compartir nativo, no hacemos fallback.
      if ((e as { name?: string })?.name === 'AbortError') { setCompartiendo(false); return }
    }
    // Fallback (escritorio o navegador sin compartir de archivos): enlace wa.me
    const url = waCotizacionUrl({
      numero: numeroCot, marca: vehiculo.brand, modelo: vehiculo.model,
      telefono: form.clienteTelefono, clienteNombre: form.clienteNombre,
      pdfUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}${pdfUrl}`,
    })
    window.open(url, '_blank', 'noopener,noreferrer')
    setCompartiendo(false)
  }

  const inp = 'width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:10px;font-size:13px;outline:none;font-family:inherit;background:#fff;box-sizing:border-box'
  const label = { fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 4, display: 'block' as const, textTransform: 'uppercase' as const, letterSpacing: '0.4px' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
              {step === 'pin' ? 'Acceso vendedora' : step === 'success' ? '¡Cotización enviada!' : `${vehiculo.brand} · ${vendedoraNombre}`}
            </p>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#111', margin: 0 }}>
              {step === 'pin' ? 'Generar cotización' : step === 'success' ? '' : vehiculo.model}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, lineHeight: '32px', textAlign: 'center' }}>×</button>
        </div>

        <div style={{ padding: '20px 24px 24px' }}>

          {/* ── STEP: PIN ── */}
          {step === 'pin' && (
            <div>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 1.5 }}>
                Ingresa tu código de 3 dígitos para continuar.
              </p>
              <div style={{ marginBottom: 16 }}>
                <label style={label}>Código de vendedora</label>
                <input
                  type="text"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={4}
                  value={pin}
                  onChange={e => { setPin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)); setPinError('') }}
                  onKeyDown={e => e.key === 'Enter' && verificarPin()}
                  placeholder="X000"
                  style={{ ...Object.fromEntries(inp.split(';').filter(Boolean).map(p => { const [k, v] = p.split(':'); return [k.trim().replace(/-([a-z])/g, (_,c) => c.toUpperCase()), v?.trim()] })), fontSize: 24, textAlign: 'center', letterSpacing: 12, fontWeight: 800 } as React.CSSProperties}
                  autoFocus
                />
                {pinError && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>{pinError}</p>}
              </div>
              <button
                onClick={verificarPin}
                disabled={pinLoading || pin.length !== 4}
                style={{ width: '100%', padding: '12px', background: pin.length === 4 ? '#111' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: pin.length === 4 ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'background .15s' }}
              >
                {pinLoading ? 'Verificando...' : 'Continuar →'}
              </button>
            </div>
          )}

          {/* ── STEP: FORM ── */}
          {(step === 'form' || step === 'sending') && (
            <div>
              {/* Vehículo info */}
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 14px', marginBottom: 18 }}>
                <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, margin: '0 0 2px' }}>{vehiculo.brand}</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#111', margin: 0 }}>{vehiculo.model}</p>
              </div>

              {/* Concesionario (solo código de la casa R000) */}
              {esCasa && concesionarios.length > 1 && (
                <div style={{ marginBottom: 18 }}>
                  <label style={label}>Concesionario</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {concesionarios.map(c => (
                      <button key={c.id} onClick={() => setConcesionarioId(c.id)}
                        style={{ flex: '1 1 auto', padding: '10px 8px', border: `2px solid ${concesionarioId === c.id ? '#dc2626' : '#e5e7eb'}`, borderRadius: 10, background: concesionarioId === c.id ? '#dc2626' : '#fff', color: concesionarioId === c.id ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                        {CONCES_CORTO[c.id] ?? c.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Modalidad */}
              <div style={{ marginBottom: 18 }}>
                <label style={label}>Modalidad de venta</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {([['contado', 'Contado'], ['credito_24', 'Crédito 24 meses']] as [Modalidad, string][]).map(([val, lbl]) => (
                    <button
                      key={val}
                      onClick={() => setModalidad(val)}
                      style={{ flex: 1, padding: '10px 8px', border: `2px solid ${modalidad === val ? '#111' : '#e5e7eb'}`, borderRadius: 10, background: modalidad === val ? '#111' : '#fff', color: modalidad === val ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview de montos */}
              <div style={{ background: '#fffbeb', border: '1px solid rgba(234,179,8,0.35)', borderRadius: 12, padding: '12px 14px', marginBottom: 18 }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: '#a16207', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                  {modalidad === 'contado' ? 'Resumen contado' : plan === 'banco_100' ? 'Resumen crédito 100% Banco' : 'Resumen crédito 24 meses'}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 0' }}>
                  {modalidad === 'contado' ? (
                    <>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>Precio base</span><span style={{ fontSize: 11, fontWeight: 700, color: '#111', textAlign: 'right' }}>${fmt(vehiculo.cash)}</span>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>IVA 16%</span><span style={{ fontSize: 11, fontWeight: 700, color: '#111', textAlign: 'right' }}>${fmt(calc.iva)}</span>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>Gastos</span><span style={{ fontSize: 11, fontWeight: 700, color: '#111', textAlign: 'right' }}>${fmt(calc.gastos)}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#111', borderTop: '1px solid #fde68a', marginTop: 4, paddingTop: 4 }}>TOTAL</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#92400e', textAlign: 'right', borderTop: '1px solid #fde68a', marginTop: 4, paddingTop: 4 }}>${fmt(calc.totalInicial)}</span>
                    </>
                  ) : plan === 'banco_100' ? (
                    <>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>Total Precio Vehículo</span><span style={{ fontSize: 11, fontWeight: 700, color: '#111', textAlign: 'right' }}>${fmt(calc.totalVehiculo)}</span>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>Inicial 30%</span><span style={{ fontSize: 11, fontWeight: 700, color: '#111', textAlign: 'right' }}>${fmt(calc.inicialBanco)}</span>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>Gastos</span><span style={{ fontSize: 11, fontWeight: 700, color: '#111', textAlign: 'right' }}>${fmt(calc.gastos)}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#111', borderTop: '1px solid #fde68a', marginTop: 4, paddingTop: 4 }}>TOTAL INICIAL</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#92400e', textAlign: 'right', borderTop: '1px solid #fde68a', marginTop: 4, paddingTop: 4 }}>${fmt(calc.totalInicial)}</span>
                      <span style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>Financiamiento 70%</span><span style={{ fontSize: 11, fontWeight: 700, color: '#111', textAlign: 'right', marginTop: 6 }}>${fmt(calc.financiamiento)}</span>
                      {(calc.cuota ?? 0) > 0 && (<><span style={{ fontSize: 11, color: '#6b7280' }}>Cuota mensual × 24</span><span style={{ fontSize: 11, fontWeight: 700, color: '#a16207', textAlign: 'right' }}>${fmt(calc.cuota)}</span></>)}
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>40% Precio base</span><span style={{ fontSize: 11, fontWeight: 700, color: '#111', textAlign: 'right' }}>${fmt((vehiculo.cash ?? 0) * 0.4)}</span>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>IVA 16%</span><span style={{ fontSize: 11, fontWeight: 700, color: '#111', textAlign: 'right' }}>${fmt(calc.iva)}</span>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>Gastos</span><span style={{ fontSize: 11, fontWeight: 700, color: '#111', textAlign: 'right' }}>${fmt(calc.gastos)}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#111', borderTop: '1px solid #fde68a', marginTop: 4, paddingTop: 4 }}>INICIAL</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#92400e', textAlign: 'right', borderTop: '1px solid #fde68a', marginTop: 4, paddingTop: 4 }}>${fmt(calc.totalInicial)}</span>
                      <span style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>Cuota mensual × 24</span><span style={{ fontSize: 11, fontWeight: 700, color: '#a16207', textAlign: 'right', marginTop: 6 }}>${fmt(calc.cuota)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Datos del cliente */}
              <p style={{ fontSize: 12, fontWeight: 800, color: '#111', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>Datos del cliente</p>

              {/* Buscador de cliente existente */}
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <label style={label}>🔍 Buscar cliente existente</label>
                <input
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } as React.CSSProperties}
                  value={cliQuery}
                  onChange={e => { setCliQuery(e.target.value); setCliOpen(true) }}
                  onFocus={() => setCliOpen(true)}
                  placeholder="Nombre, C.I./RIF, correo o teléfono..."
                />
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
                <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, marginBottom: 0 }}>Si el cliente ya cotizó, selecciónalo y se llenan sus datos.</p>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={label}>Nombre completo *</label>
                  <input style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } as React.CSSProperties}
                    value={form.clienteNombre} onChange={e => setForm(p => ({ ...p, clienteNombre: e.target.value }))} placeholder="Nombre del cliente" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={label}>C.I. / RIF *</label>
                    <input style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } as React.CSSProperties}
                      value={form.clienteCiRif} onChange={e => setForm(p => ({ ...p, clienteCiRif: e.target.value }))} placeholder="V-12345678" />
                  </div>
                  <div>
                    <label style={label}>Teléfono</label>
                    <input style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } as React.CSSProperties}
                      value={form.clienteTelefono} onChange={e => setForm(p => ({ ...p, clienteTelefono: e.target.value }))} placeholder="0414-..." />
                  </div>
                </div>
                <div>
                  <label style={label}>Correo electrónico *</label>
                  <input style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } as React.CSSProperties}
                    type="email" value={form.clienteCorreo} onChange={e => setForm(p => ({ ...p, clienteCorreo: e.target.value }))} placeholder="cliente@email.com" />
                </div>
                <div>
                  <label style={label}>Dirección</label>
                  <input style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } as React.CSSProperties}
                    value={form.clienteDireccion} onChange={e => setForm(p => ({ ...p, clienteDireccion: e.target.value }))} placeholder="Av. Principal..." />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                  <div>
                    <label style={label}>Ciudad / Estado</label>
                    <input style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } as React.CSSProperties}
                      value={form.clienteCiudadEstado} onChange={e => setForm(p => ({ ...p, clienteCiudadEstado: e.target.value }))} placeholder="Maturín - Monagas" />
                  </div>
                  <div>
                    <label style={label}>Código Postal</label>
                    <input style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } as React.CSSProperties}
                      value={form.clienteCodigoPostal} onChange={e => setForm(p => ({ ...p, clienteCodigoPostal: e.target.value }))} placeholder="6201" />
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 600 }}>
                  <input type="checkbox" checked={form.agenteRetencion} onChange={e => setForm(p => ({ ...p, agenteRetencion: e.target.checked }))} style={{ width: 16, height: 16 }} />
                  Agente de Retención
                </label>
              </div>

              {errorMsg && (
                <div style={{ marginTop: 14, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px' }}>
                  <p style={{ fontSize: 13, color: '#dc2626', fontWeight: 600, margin: 0 }}>{errorMsg}</p>
                </div>
              )}

              <button
                onClick={verPreview}
                disabled={previewLoading || step === 'sending'}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px', marginTop: 20, background: '#fff', border: '1.5px solid #111', borderRadius: 12, fontSize: 13, fontWeight: 700, color: '#111', cursor: previewLoading ? 'default' : 'pointer', fontFamily: 'inherit', boxSizing: 'border-box' }}
              >
                {previewLoading ? 'Generando vista previa…' : '👁 Ver PDF (vista previa)'}
              </button>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button onClick={onClose} style={{ flex: 1, padding: '12px', background: '#fff', border: '1.5px solid #d1d5db', borderRadius: 12, fontSize: 13, fontWeight: 600, color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancelar
                </button>
                <button
                  onClick={enviar}
                  disabled={step === 'sending'}
                  style={{ flex: 2, padding: '12px', background: step === 'sending' ? '#9ca3af' : '#dc2626', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: step === 'sending' ? 'default' : 'pointer', fontFamily: 'inherit', transition: 'background .15s' }}
                >
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
                Se ha enviado la cotización <strong style={{ color: '#C41E3A' }}>{numeroCot}</strong> al correo del cliente.
              </p>
              <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 20 }}>También recibiste una copia por correo y José Rojas fue notificado.</p>

              {cotId && (
                <>
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px', background: '#fff', color: '#111', border: '1.5px solid #d1d5db', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none', fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box' }}
                  >
                    👁 Ver PDF
                  </a>
                  <button
                    onClick={compartirPorWhatsApp}
                    disabled={compartiendo}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: compartiendo ? 'default' : 'pointer', fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
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
