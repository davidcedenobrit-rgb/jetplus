'use client'

import { useEffect, useState } from 'react'

interface Vehiculo {
  brand: string
  model: string
  cash: number | null
  gc: number | null
  gcr: number | null
  tasa_credito: number | null
}

function fmt(n: number | null | undefined) {
  if (n == null || isNaN(n)) return '0,00'
  return n.toLocaleString('de-DE', { minimumFractionDigits: Math.round(Math.abs(n)*100)%100===0?0:2, maximumFractionDigits: 2 })
}

export default function CotizacionRapidaModal({ vehiculo, onClose, evento = '', waCorp = '584149989010', concesionario = '' }: {
  vehiculo: Vehiculo
  onClose: () => void
  evento?: string
  waCorp?: string
  concesionario?: string
}) {
  const precio    = vehiculo.cash ?? 0
  const iva       = precio * 0.16
  const gc        = vehiculo.gc ?? 0
  const gcr       = vehiculo.gcr ?? 0
  const cuota     = vehiculo.tasa_credito ?? 0
  const total     = precio + iva + gc
  const ini40     = precio * 0.4
  const totalIni  = ini40 + iva + gcr
  const fin60     = precio * 0.6

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [presupuesto, setPresupuesto] = useState('')
  const [vendedor, setVendedor] = useState('')
  const [vendedores, setVendedores] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/ventas/vendedores').then(r => r.ok ? r.json() : []).then(d => setVendedores(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  function waLink() {
    const fecha = new Date().toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    const msg = encodeURIComponent(
      `*Nuevo interesado* 🚗\n` +
      `Cliente: ${nombre}\n` +
      `Teléfono: ${telefono}\n` +
      `Interés en: ${vehiculo.brand} ${vehiculo.model}\n` +
      (presupuesto ? `Presupuesto: ${presupuesto}\n` : '') +
      `Vendedor: ${vendedor}\n` +
      (evento ? `Evento: ${evento}\n` : '') +
      `Fecha: ${fecha}`
    )
    return `https://wa.me/${waCorp}?text=${msg}`
  }

  async function enviar() {
    if (nombre.trim().length < 2 || telefono.trim().length < 6) { setError('Escribe tu nombre y teléfono.'); return }
    if (!vendedor) { setError('Selecciona el vendedor que te atiende.'); return }
    setEnviando(true); setError('')
    try {
      await fetch('/api/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre, telefono, presupuesto,
          marca: vehiculo.brand, modelo: vehiculo.model,
          vendedor, evento, concesionario, origen: 'cotizacion_rapida',
        }),
      })
    } catch { /* aunque falle el guardado, dejamos pasar al WhatsApp */ }
    setEnviando(false); setEnviado(true)
    window.open(waLink(), '_blank', 'noopener,noreferrer')
  }

  const row: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '9px 18px', borderBottom: '1px solid #f3f4f6',
  }
  const lbl: React.CSSProperties = { fontSize: 13, color: '#374151' }
  const val: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#111', fontFamily: 'monospace' }
  const hdr = (bg: string, fg: string): React.CSSProperties => ({
    background: bg, padding: '7px 18px',
    fontSize: 11, fontWeight: 800, color: fg,
    textTransform: 'uppercase', letterSpacing: 1,
  })
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8,
    fontSize: 14, marginBottom: 8, boxSizing: 'border-box',
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.22)' }}>

        {/* Vehicle header */}
        <div style={{ background: '#111', borderRadius: '16px 16px 0 0', padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>VEHICULO · {vehiculo.brand}</p>
            <p style={{ fontSize: 19, fontWeight: 800, color: '#fff', margin: '3px 0 0' }}>{vehiculo.model}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#fff', fontSize: 20, lineHeight: '32px', textAlign: 'center' }}>×</button>
        </div>

        {/* CONTADO */}
        <div style={hdr('#7c2d12', '#fde68a')}>Modalidad de Contado</div>

        <div style={row}><span style={lbl}>100% Precio Base:</span><span style={val}>${fmt(precio)}</span></div>
        <div style={row}><span style={lbl}>I.V.A. (16%):</span><span style={val}>${fmt(iva)}</span></div>
        <div style={{ ...row, alignItems: 'flex-start', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.45, flex: 1 }}>
            Póliza Seguro Vehículo, Traslado,{'\n'}Gastos, INTT, Gastos Notaría
          </span>
          <span style={{ ...val, flexShrink: 0 }}>${fmt(gc)}</span>
        </div>
        <div style={{ ...row, background: '#fef9c3', border: 'none' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#92400e' }}>TOTAL A PAGAR:</span>
          <span style={{ fontSize: 17, fontWeight: 900, color: '#92400e', fontFamily: 'monospace' }}>${fmt(total)}</span>
        </div>

        {/* CRÉDITO 24M */}
        <div style={{ ...hdr('#064e3b', '#6ee7b7'), marginTop: 6 }}>Modalidad Crédito 24 Meses (40% Inicial)</div>

        <div style={row}><span style={lbl}>40% Precio Base:</span><span style={val}>${fmt(ini40)}</span></div>
        <div style={row}><span style={lbl}>I.V.A. (16%):</span><span style={val}>${fmt(iva)}</span></div>
        <div style={{ ...row, alignItems: 'flex-start', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.45, flex: 1 }}>
            Póliza Seguro Vehículo, Traslado,{'\n'}Gastos, INTT, Gastos Notaría
          </span>
          <span style={{ ...val, flexShrink: 0 }}>${fmt(gcr)}</span>
        </div>
        <div style={{ ...row, background: '#dcfce7', border: 'none' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#065f46' }}>TOTAL INICIAL A PAGAR:</span>
          <span style={{ fontSize: 17, fontWeight: 900, color: '#065f46', fontFamily: 'monospace' }}>${fmt(totalIni)}</span>
        </div>
        <div style={{ ...row, background: '#f0fdf4' }}>
          <span style={{ fontSize: 12, color: '#6b7280' }}>Financiamiento 60% —</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#111', fontFamily: 'monospace' }}>${fmt(fin60)}</span>
        </div>
        {cuota > 0 && (
          <div style={{ ...row, background: '#fff1f2', border: 'none' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#C41E3A' }}>24 Cuotas Mensuales:</span>
            <span style={{ fontSize: 17, fontWeight: 900, color: '#C41E3A', fontFamily: 'monospace' }}>${fmt(cuota)}</span>
          </div>
        )}

        {/* Captación de datos del cliente */}
        <div style={{ padding: '14px 18px 8px', borderTop: '6px solid #f3f4f6' }}>
          {enviado ? (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#065f46', margin: '0 0 4px' }}>¡Gracias, {nombre.split(' ')[0]}! 🎉</p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 12px' }}>Un asesor te contactará. Si no se abrió WhatsApp, toca el botón:</p>
              <a href={waLink()} target="_blank" rel="noopener noreferrer" className="lo-btn-wa" style={{ display: 'inline-block' }}>Abrir WhatsApp</a>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#111', margin: '0 0 2px' }}>Interesado en el {vehiculo.brand} {vehiculo.model}</p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 12px' }}>Déjanos tus datos y un asesor te contacta.</p>
              <input style={inputStyle} placeholder="Nombre y apellido *" value={nombre} onChange={e => setNombre(e.target.value)} />
              <input style={inputStyle} placeholder="Teléfono / WhatsApp *" inputMode="tel" value={telefono} onChange={e => setTelefono(e.target.value)} />
              <input style={inputStyle} placeholder="Presupuesto aproximado (opcional)" value={presupuesto} onChange={e => setPresupuesto(e.target.value)} />
              <select style={{ ...inputStyle, color: vendedor ? '#111' : '#9ca3af' }} value={vendedor} onChange={e => setVendedor(e.target.value)}>
                <option value="">Vendedor que te atiende *</option>
                {vendedores.map(v => <option key={v} value={v} style={{ color: '#111' }}>{v}</option>)}
              </select>
              {error && <p style={{ fontSize: 12, color: '#C41E3A', margin: '0 0 8px' }}>{error}</p>}
              <button onClick={enviar} disabled={enviando}
                style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: '#C41E3A', color: '#fff', fontSize: 14, fontWeight: 800, cursor: enviando ? 'default' : 'pointer', opacity: enviando ? 0.6 : 1 }}>
                {enviando ? 'Enviando…' : 'Enviar por WhatsApp'}
              </button>
              <p style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', margin: '8px 0 0' }}>Se registra automáticamente la fecha y hora.</p>
            </>
          )}
        </div>

        <div style={{ padding: '6px 18px 16px' }}>
          <p style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', margin: 0 }}>
            *Precios referenciales sujetos a disponibilidad y cambios sin previo aviso
          </p>
        </div>

      </div>
    </div>
  )
}
