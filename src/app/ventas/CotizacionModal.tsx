'use client'

import { useState, useEffect } from 'react'

type ClienteBuscado = { nombre: string; ci_rif: string; correo: string; telefono: string; direccion: string; ciudad_estado: string; codigo_postal: string; fuente: string }

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
  diferencial_pct?: number | null
  tasa_banco_pct?: number | null
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
  if (modalidad === 'contado') {
    const gastos = v.gc ?? 0
    return { iva, gastos, totalVehiculo: null, inicialBanco: null, totalInicial: precio + iva + gastos, financiamiento: null, cuota: null, costoTotal: precio + iva + gastos }
  }
  if (plan === 'banco_100') {
    const placaMonto = v.placa_monto ?? 400
    const totalVehiculo = precio + iva + placaMonto
    const financiamientoBanco = totalVehiculo * 0.70
    // Diferencial cambiario = (USDT - BCV) / BCV, sobre el monto financiado.
    const difPct = (tasas.bcv > 0 && tasas.usdt > tasas.bcv) ? (tasas.usdt - tasas.bcv) / tasas.bcv : 0
    const diferencial = financiamientoBanco * difPct
    const gastosBanco = (v.poliza_vehiculo_banco ?? 0) + (v.poliza_vida_banco ?? 0) + (v.honorarios_banco ?? 0) + (v.gastos_internos_banco ?? 0) + (v.alfombras_banco ?? 0)
    const gastos = gastosBanco + diferencial
    const inicialBanco = totalVehiculo * 0.30
    const totalInicial = inicialBanco + gastos
    const financiamiento = totalVehiculo * 0.70
    const tasaBanco = v.tasa_banco_pct ?? 16
    const r = tasaBanco / 100 / 12
    const cuota = financiamiento * r * Math.pow(1 + r, 24) / (Math.pow(1 + r, 24) - 1)
    return { iva, gastos, totalVehiculo, inicialBanco, totalInicial, financiamiento, cuota, costoTotal: totalInicial + cuota * 24 }
  }
  const gastos = v.gcr ?? 0
  const totalInicial = precio * 0.4 + iva + gastos
  const financiamiento = precio * 0.6
  const cuota = v.tasa_credito ?? 0
  return { iva, gastos, totalVehiculo: null, inicialBanco: null, totalInicial, financiamiento, cuota, costoTotal: totalInicial + cuota * 24 }
}

export default function CotizacionModal({ vehiculo, tasas, onClose }: { vehiculo: Vehiculo; tasas: { bcv: number; usdt: number }; onClose: () => void }) {
  const [step, setStep] = useState<Step>('pin')
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [vendedoraNombre, setVendedoraNombre] = useState('')
  const [modalidad, setModalidad] = useState<Modalidad>('contado')
  const [plan, setPlan] = useState<Plan>('vehimotors')
  const [form, setForm] = useState({
    clienteNombre: '', clienteCiRif: '', clienteCorreo: '',
    clienteTelefono: '', clienteDireccion: '',
    clienteCiudadEstado: '', clienteCodigoPostal: '',
    agenteRetencion: false,
  })
  const [errorMsg, setErrorMsg] = useState('')
  const [numeroCot, setNumeroCot] = useState('')

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
      fetch(`/api/cotizaciones/clientes-buscar?q=${encodeURIComponent(q)}`)
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
          vehiculoId: vehiculo.id,
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
        }),
      })
      const json = await r.json()
      if (json.ok) {
        setNumeroCot(json.numero)
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

              {/* Plan (solo para crédito) */}
              {modalidad === 'credito_24' && (
                <div style={{ marginBottom: 18 }}>
                  <label style={label}>Plan de financiamiento</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['vehimotors', 'banco_100'] as Plan[]).map(p => (
                      <button key={p} onClick={() => setPlan(p)}
                        style={{ flex: 1, padding: '10px 8px', border: `2px solid ${plan === p ? '#111' : '#e5e7eb'}`, borderRadius: 10, background: plan === p ? '#111' : '#fff', color: plan === p ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                        {p === 'vehimotors' ? 'Plan Vehimotors' : 'Plan 100% Banco'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
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
              <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 24 }}>También recibiste una copia por correo y José Rojas fue notificado.</p>
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
