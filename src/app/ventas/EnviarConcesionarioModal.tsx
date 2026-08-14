'use client'

import { useState } from 'react'

const WA_JETPLUS = '584248705174'
const ORIGEN_OPCIONES = ['Instagram', 'TikTok', 'Facebook', 'WhatsApp', 'Otro']

interface Props {
  variante: 'aliado' | 'publico'
  vehiculoLabel: string
  marca: string
  modelo: string
  onClose: () => void
  // aliado
  aliadoCodigo?: string
  aliadoNombre?: string
  // publico (redes sociales)
  origen?: string
  concesionario?: string
}

export default function EnviarConcesionarioModal({ variante, vehiculoLabel, marca, modelo, onClose, aliadoCodigo, aliadoNombre, origen, concesionario }: Props) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [tieneInicial, setTieneInicial] = useState(false)
  const [inicialMonto, setInicialMonto] = useState('')
  const [origenSel, setOrigenSel] = useState(() => {
    const norm = (origen || '').trim()
    return ORIGEN_OPCIONES.includes(norm) ? norm : ''
  })
  const [origenOtro, setOrigenOtro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const origenFinal = origenSel === 'Otro' ? (origenOtro.trim() || 'Otro') : origenSel

  async function enviar() {
    if (!nombre.trim() || !telefono.trim()) { setError('Nombre y teléfono son obligatorios.'); return }
    if (variante === 'publico' && !origenSel) { setError('Selecciona desde dónde nos escribes.'); return }
    setEnviando(true); setError('')

    // Best-effort: si falla el guardado en el panel, igual se deja mandar el
    // WhatsApp (no se pierde el contacto con el cliente por un error nuestro).
    try {
      if (variante === 'aliado') {
        await fetch('/api/aliados/lead', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aliadoCodigo,
            clienteNombre: nombre.trim(),
            clienteTelefono: telefono.trim(),
            vehiculoInteres: vehiculoLabel,
            tieneInicial,
            inicialMonto: tieneInicial && inicialMonto.trim() ? Number(inicialMonto) : null,
          }),
        })
      } else {
        await fetch('/api/leads', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: nombre.trim(), telefono: telefono.trim(), marca, modelo,
            origen: origenFinal || 'redes_sociales', concesionario,
          }),
        })
      }
    } catch { /* best-effort */ }

    const ahora = new Date()
    const fecha = ahora.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const hora = ahora.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })

    const texto = variante === 'aliado'
      ? [
          '🤝 *Cliente referido — Aliado*',
          '',
          `👤 Cliente: ${nombre.trim()}`,
          `📱 Tel: ${telefono.trim()}`,
          `🚗 Interés: ${vehiculoLabel}`,
          `💵 Inicial disponible: ${tieneInicial ? (inicialMonto.trim() ? `$${inicialMonto.trim()}` : 'Sí, monto sin indicar') : 'No indicó'}`,
          `🏢 Aliado: ${aliadoNombre ?? '—'} (${aliadoCodigo ?? '—'})`,
          `📅 Fecha: ${fecha} · 🕐 Hora: ${hora}`,
        ].join('\n')
      : [
          `Hola, quiero información sobre el ${vehiculoLabel}.`,
          '',
          `👤 Nombre: ${nombre.trim()}`,
          `📱 Tel: ${telefono.trim()}`,
          ...(origenFinal ? [`📲 Vengo de: ${origenFinal}`] : []),
          `📅 Fecha: ${fecha} · 🕐 Hora: ${hora}`,
        ].join('\n')

    const waUrl = `https://wa.me/${WA_JETPLUS}?text=${encodeURIComponent(texto)}`
    window.open(waUrl, '_blank', 'noopener,noreferrer')
    setEnviando(false)
    onClose()
  }

  const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: '0.4px' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 420, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
              {variante === 'aliado' ? 'Enviar a concesionario' : 'Ir a concesionario virtual'}
            </p>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#111', margin: 0 }}>{vehiculoLabel}</h2>
          </div>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, lineHeight: '32px', textAlign: 'center' }}>×</button>
        </div>

        <div style={{ padding: '20px 24px 24px' }}>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 18, lineHeight: 1.5 }}>
            Deja los datos del interesado y se abre WhatsApp con el mensaje listo para enviárselo a Jetplus.
          </p>

          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={label}>Nombre del cliente *</label>
              <input style={inp} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre y apellido" />
            </div>
            <div>
              <label style={label}>Teléfono / WhatsApp *</label>
              <input style={inp} value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="0414-..." />
            </div>

            {variante === 'aliado' && (
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 600, marginBottom: tieneInicial ? 10 : 0 }}>
                  <input type="checkbox" checked={tieneInicial} onChange={e => setTieneInicial(e.target.checked)} style={{ width: 16, height: 16 }} />
                  El cliente tiene inicial disponible
                </label>
                {tieneInicial && (
                  <input style={inp} type="number" min={0} value={inicialMonto} onChange={e => setInicialMonto(e.target.value)} placeholder="Monto aprox. en $ (opcional)" />
                )}
              </div>
            )}

            {variante === 'publico' && (
              <div>
                <label style={label}>¿Desde dónde nos escribes? *</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ORIGEN_OPCIONES.map(o => (
                    <button key={o} type="button" onClick={() => setOrigenSel(o)}
                      style={{
                        padding: '8px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        border: origenSel === o ? '1.5px solid #16a34a' : '1.5px solid #d1d5db',
                        background: origenSel === o ? '#f0fdf4' : '#fff',
                        color: origenSel === o ? '#15803d' : '#374151',
                      }}>
                      {o}
                    </button>
                  ))}
                </div>
                {origenSel === 'Otro' && (
                  <input style={{ ...inp, marginTop: 8 }} value={origenOtro} onChange={e => setOrigenOtro(e.target.value)} placeholder="¿Cuál?" />
                )}
              </div>
            )}
          </div>

          {error && (
            <div style={{ marginTop: 14, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px' }}>
              <p style={{ fontSize: 13, color: '#dc2626', fontWeight: 600, margin: 0 }}>{error}</p>
            </div>
          )}

          <button
            onClick={enviar}
            disabled={enviando}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '13px', marginTop: 20, background: enviando ? '#9ca3af' : '#16a34a', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: enviando ? 'default' : 'pointer', fontFamily: 'inherit', transition: 'background .15s' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
            {enviando ? 'Enviando…' : 'Enviar por WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  )
}
