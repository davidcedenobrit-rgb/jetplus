'use client'

import { useEffect, useState } from 'react'

const CAPTACION_OPCIONES = ['Concesionario', 'Sambil', 'Fuera de concesionario', 'Otro']

// Registro rápido de cliente / lead para el link de vendedores.
export default function RegistrarLead({ evento = '', concesionario = '' }: { evento?: string; concesionario?: string }) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [ciRif, setCiRif] = useState('')
  const [direccion, setDireccion] = useState('')
  const [interes, setInteres] = useState('')
  const [presupuesto, setPresupuesto] = useState('')
  const [captacionSel, setCaptacionSel] = useState('')
  const [captacionOtro, setCaptacionOtro] = useState('')
  const [vendedor, setVendedor] = useState('')
  const [vendedores, setVendedores] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/ventas/vendedores').then(r => r.ok ? r.json() : []).then(d => setVendedores(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const captacionFinal = captacionSel === 'Otro' ? (captacionOtro.trim() || 'Otro') : captacionSel

  async function enviar() {
    if (nombre.trim().length < 2 || telefono.trim().length < 6) { setError('Escribe al menos nombre y teléfono.'); return }
    if (!captacionSel) { setError('Indica dónde captaste al cliente.'); return }
    setEnviando(true); setError('')
    try {
      const r = await fetch('/api/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre, telefono, correo, ciRif, direccion, presupuesto, modelo: interes,
          vendedor, evento, concesionario, origen: 'vendedor_lead',
          origenCaptacion: captacionFinal,
        }),
      })
      if (!r.ok) { setError((await r.json().catch(() => ({}))).error ?? 'No se pudo registrar'); setEnviando(false); return }
      setOk(true); setEnviando(false)
      setNombre(''); setTelefono(''); setCorreo(''); setCiRif(''); setDireccion(''); setInteres(''); setPresupuesto(''); setCaptacionSel(''); setCaptacionOtro('')
      setTimeout(() => setOk(false), 4000)
    } catch { setError('Error de conexión'); setEnviando(false) }
  }

  const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', background: '#fff' }

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '22px 24px', boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9ca3af', marginBottom: 4 }}>Herramienta del vendedor</p>
      <h3 style={{ fontSize: 19, fontWeight: 900, color: '#111827', marginBottom: 4 }}>Registrar cliente nuevo</h3>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Captura los datos del cliente que atiendes. Queda registrado en la bandeja de leads.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 10 }}>
        <input style={inp} placeholder="Nombre y apellido *" value={nombre} onChange={e => setNombre(e.target.value)} />
        <input style={inp} placeholder="Teléfono / WhatsApp *" inputMode="tel" value={telefono} onChange={e => setTelefono(e.target.value)} />
        <input style={inp} placeholder="Correo (opcional)" value={correo} onChange={e => setCorreo(e.target.value)} />
        <input style={inp} placeholder="C.I./RIF (opcional)" value={ciRif} onChange={e => setCiRif(e.target.value)} />
        <input style={inp} placeholder="Dirección (opcional)" value={direccion} onChange={e => setDireccion(e.target.value)} />
        <input style={inp} placeholder="Vehículo de interés" value={interes} onChange={e => setInteres(e.target.value)} />
        <input style={inp} placeholder="Presupuesto aprox. (opcional)" value={presupuesto} onChange={e => setPresupuesto(e.target.value)} />
        {vendedores.length > 0 ? (
          <select style={{ ...inp, color: vendedor ? '#111' : '#9ca3af' }} value={vendedor} onChange={e => setVendedor(e.target.value)}>
            <option value="">Vendedor *</option>
            {vendedores.map(v => <option key={v} value={v} style={{ color: '#111' }}>{v}</option>)}
          </select>
        ) : (
          <input style={inp} placeholder="Vendedor" value={vendedor} onChange={e => setVendedor(e.target.value)} />
        )}
      </div>

      <div style={{ marginBottom: 10 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>¿Dónde captaste al cliente? *</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CAPTACION_OPCIONES.map(o => (
            <button key={o} type="button" onClick={() => setCaptacionSel(o)}
              style={{
                padding: '8px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                border: captacionSel === o ? '1.5px solid #111827' : '1.5px solid #d1d5db',
                background: captacionSel === o ? '#111827' : '#fff',
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

      {error && <p style={{ fontSize: 12, color: '#C41E3A', margin: '0 0 8px' }}>{error}</p>}
      {ok && <p style={{ fontSize: 13, color: '#065f46', fontWeight: 700, margin: '0 0 8px' }}>✓ Cliente registrado en la bandeja de leads.</p>}

      <button onClick={enviar} disabled={enviando}
        style={{ padding: '11px 22px', borderRadius: 10, border: 'none', background: '#111827', color: '#fff', fontSize: 14, fontWeight: 800, cursor: enviando ? 'default' : 'pointer', opacity: enviando ? 0.6 : 1 }}>
        {enviando ? 'Guardando…' : 'Registrar cliente'}
      </button>
    </div>
  )
}
