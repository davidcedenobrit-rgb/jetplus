'use client'

import { useEffect, useState } from 'react'
import Calendario from './Calendario'

const WA_JETPLUS = '584248705174'
const SLOTS = ['07:00', '08:30', '10:00', '11:30', '13:00', '14:30']

function fmtHora12(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h >= 12 ? 'p.m.' : 'a.m.'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}
function sumarMin(hhmm: string, min: number) {
  const [h, m] = hhmm.split(':').map(Number)
  const total = h * 60 + m + min
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
function esFinDeSemana(f: string) {
  if (!f) return false
  const [y, m, d] = f.split('-').map(Number)
  const dow = new Date(y, m - 1, d).getDay()
  return dow === 0 || dow === 6
}
function fmtFechaLarga(f: string) {
  if (!f) return f
  const [y, m, d] = f.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-VE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

export default function CitasForm() {
  const [fecha, setFecha] = useState('')
  const [ocupadas, setOcupadas] = useState<string[]>([])
  const [cargandoSlots, setCargandoSlots] = useState(false)
  const [horaInicio, setHoraInicio] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [placa, setPlaca] = useState('')
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState<{ fecha: string; horaInicio: string; horaFin: string } | null>(null)

  useEffect(() => {
    setHoraInicio('')
    if (!fecha || esFinDeSemana(fecha)) { setOcupadas([]); return }
    setCargandoSlots(true)
    fetch(`/api/citas/disponibilidad?fecha=${fecha}`)
      .then(r => r.ok ? r.json() : { ocupadas: [] })
      .then(d => setOcupadas(d.ocupadas ?? []))
      .catch(() => setOcupadas([]))
      .finally(() => setCargandoSlots(false))
  }, [fecha])

  async function agendar() {
    setError('')
    if (!nombre.trim() || telefono.trim().length < 6) { setError('Nombre y teléfono son obligatorios.'); return }
    if (!/^\S+@\S+\.\S+$/.test(correo)) { setError('Ingresa un correo válido — ahí te llega la confirmación.'); return }
    if (!fecha || esFinDeSemana(fecha)) { setError('Elige una fecha de lunes a viernes.'); return }
    if (!horaInicio) { setError('Elige un horario disponible.'); return }

    setEnviando(true)
    try {
      const r = await fetch('/api/citas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, telefono, correo, fecha, horaInicio, marca, modelo, placa, motivo }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setError(j.error || 'No se pudo agendar la cita.'); setEnviando(false); return }

      const hFin = j.horaFin || sumarMin(horaInicio, 90)
      const texto = [
        '🔧 *Nueva cita de taller*',
        '',
        `👤 Cliente: ${nombre.trim()}`,
        `📱 Tel: ${telefono.trim()}`,
        `📧 Correo: ${correo.trim()}`,
        (marca || modelo) ? `🚗 Vehículo: ${[marca, modelo].filter(Boolean).join(' ')}${placa ? ` (${placa})` : ''}` : '',
        motivo ? `📝 Motivo: ${motivo}` : '',
        `📅 Fecha: ${fmtFechaLarga(fecha)}`,
        `🕐 Hora: ${fmtHora12(horaInicio)} – ${fmtHora12(hFin)}`,
      ].filter(Boolean).join('\n')
      window.open(`https://wa.me/${WA_JETPLUS}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer')

      setExito({ fecha, horaInicio, horaFin: hFin })
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  if (exito) {
    return (
      <div className="lo-glass" style={{ padding: '40px 30px', textAlign: 'center' }}>
        <p style={{ fontSize: 44, marginBottom: 10 }}>✅</p>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#111827', marginBottom: 8 }}>¡Cita confirmada!</h2>
        <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, textTransform: 'capitalize' }}>
          Te esperamos el <strong>{fmtFechaLarga(exito.fecha)}</strong>
        </p>
        <p style={{ fontSize: 18, fontWeight: 800, color: '#a16207', marginTop: 4 }}>
          {fmtHora12(exito.horaInicio)} – {fmtHora12(exito.horaFin)}
        </p>
        <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 14 }}>Te enviamos la confirmación a tu correo.</p>
      </div>
    )
  }

  const inp: React.CSSProperties = { width: '100%', padding: '11px 14px', border: '1.5px solid #d1d5db', borderRadius: 12, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.4px' }
  const finDeSemana = esFinDeSemana(fecha)

  return (
    <div className="lo-glass" style={{ padding: '30px 30px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9ca3af', marginBottom: 4 }}>Servicio JETPLUS</p>
      <h2 style={{ fontSize: 20, fontWeight: 900, color: '#111827', marginBottom: 4 }}>Agenda tu cita</h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Lunes a viernes · 7:00 a.m. a 5:00 p.m. · Citas de 1 hora y media.</p>

      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <label style={label}>Fecha *</label>
          <Calendario value={fecha} onChange={setFecha} />
        </div>

        {fecha && !finDeSemana && (
          <div>
            <label style={label}>Horario disponible *</label>
            {cargandoSlots ? (
              <p style={{ fontSize: 13, color: '#9ca3af' }}>Consultando disponibilidad…</p>
            ) : (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {SLOTS.map(s => {
                    const ocupado = ocupadas.includes(s)
                    const activo = horaInicio === s
                    return (
                      <button key={s} type="button" disabled={ocupado} onClick={() => setHoraInicio(s)}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                          padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                          cursor: ocupado ? 'not-allowed' : 'pointer',
                          border: activo ? '1.5px solid #C41E3A' : '1.5px solid #d1d5db',
                          background: ocupado ? '#f3f4f6' : activo ? '#fef2f2' : '#fff',
                          color: ocupado ? '#9ca3af' : activo ? '#C41E3A' : '#374151',
                          textDecoration: ocupado ? 'line-through' : 'none',
                        }}>
                        {fmtHora12(s)}
                        {ocupado && <span style={{ fontSize: 9, fontWeight: 800, textDecoration: 'none', letterSpacing: '.3px' }}>OCUPADO</span>}
                      </button>
                    )
                  })}
                </div>
                {ocupadas.length > 0 && (
                  <p style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 8 }}>
                    {ocupadas.length} de {SLOTS.length} horarios ya están reservados por otros clientes ese día.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <div>
          <label style={label}>Nombre y apellido *</label>
          <input style={inp} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre completo" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={label}>Teléfono / WhatsApp *</label>
            <input style={inp} value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="0414-..." />
          </div>
          <div>
            <label style={label}>Correo *</label>
            <input style={inp} type="email" value={correo} onChange={e => setCorreo(e.target.value)} placeholder="tu@correo.com" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div>
            <label style={label}>Marca</label>
            <input style={inp} value={marca} onChange={e => setMarca(e.target.value)} placeholder="MG / MAXUS" />
          </div>
          <div>
            <label style={label}>Modelo</label>
            <input style={inp} value={modelo} onChange={e => setModelo(e.target.value)} placeholder="MG3, T60..." />
          </div>
          <div>
            <label style={label}>Placa</label>
            <input style={inp} value={placa} onChange={e => setPlaca(e.target.value)} placeholder="Opcional" />
          </div>
        </div>
        <div>
          <label style={label}>Motivo de la visita</label>
          <textarea style={{ ...inp, resize: 'none' }} rows={2} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Mantenimiento, revisión, garantía… (opcional)" />
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 14, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px' }}>
          <p style={{ fontSize: 13, color: '#dc2626', fontWeight: 600, margin: 0 }}>{error}</p>
        </div>
      )}

      <button onClick={agendar} disabled={enviando} className="lo-btn-gold" style={{ width: '100%', padding: '14px 0', marginTop: 20, opacity: enviando ? 0.7 : 1 }}>
        {enviando ? 'Agendando…' : 'Confirmar cita →'}
      </button>
    </div>
  )
}
