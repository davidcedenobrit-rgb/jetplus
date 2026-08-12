'use client'

import { useState } from 'react'

interface Inicial {
  nombre: string
  cedula: string
  telefono: string
  correo: string
  correoEmpresa: string
  fechaIngreso: string
  cargo: string
  departamento: string
  reportaA: string
}

interface Props {
  // Modo 'token': cada empleado con su enlace único. Modo 'publico': enlace base
  // compartible (auto-registro) que crea al empleado al enviar.
  modo?: 'token' | 'publico'
  token?: string
  vencido?: boolean
  venceAt?: string | null
  inicial?: Inicial
}

const LOGO = 'https://assets.cdn.filesafe.space/XZDJ4aSOAL1crWRCXyY6/media/698367bc1dfc0253b24abd7a.png'

const label: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.03em' }
const input: React.CSSProperties = { width: '100%', borderRadius: 10, border: '1.5px solid #d1d5db', padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#fff' }
const textarea: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 84 }
const seccion: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '22px 22px', marginBottom: 16 }
const secTitle: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: '#C41E3A', textTransform: 'uppercase', letterSpacing: '.05em', margin: '0 0 16px' }

const INICIAL_VACIO: Inicial = { nombre: '', cedula: '', telefono: '', correo: '', correoEmpresa: '', fechaIngreso: '', cargo: '', departamento: '', reportaA: '' }

export default function CuestionarioForm({ modo = 'token', token, vencido = false, venceAt = null, inicial = INICIAL_VACIO }: Props) {
  const esPublico = modo === 'publico'
  const [f, setF] = useState({
    nombre: inicial.nombre,
    cedula: inicial.cedula,
    telefono: inicial.telefono,
    correo: inicial.correo,
    correoEmpresa: inicial.correoEmpresa,
    fechaIngreso: inicial.fechaIngreso,
    cargo: inicial.cargo,
    departamento: inicial.departamento,
    reportaA: inicial.reportaA,
    responsabilidades: '',
    funciones: '',
    tareasDiarias: '',
    competencias: '',
    herramientas: '',
    observaciones: '',
  })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)

  function set(k: keyof typeof f, v: string) { setF(prev => ({ ...prev, [k]: v })) }

  const venceFmt = venceAt ? (() => {
    try { return new Date(venceAt).toLocaleString('es-VE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
    catch { return '' }
  })() : ''

  async function enviar() {
    setError('')
    if (!f.nombre.trim()) { setError('Escribe tu nombre completo'); return }
    if (!f.cargo.trim()) { setError('Escribe tu cargo'); return }
    if (!f.responsabilidades.trim()) { setError('Describe tus responsabilidades principales'); return }
    setEnviando(true)
    try {
      const endpoint = esPublico ? '/api/corporativo/registro-publico' : '/api/corporativo/cuestionario'
      const payload = esPublico ? f : { token, ...f }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'No se pudo enviar. Intenta de nuevo.'); setEnviando(false); return }
      setListo(true)
    } catch {
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.')
      setEnviando(false)
    }
  }

  if (listo) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', padding: 24 }}>
        <div style={{ textAlign: 'center', color: '#fff', fontFamily: 'system-ui, sans-serif', maxWidth: 420 }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>✅</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>¡Gracias, {f.nombre.split(' ')[0]}!</h1>
          <p style={{ color: '#9ca3af', fontSize: 15, margin: 0 }}>
            Tu descripción de cargo fue enviada a Jetplus. No necesitas hacer nada más.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#C41E3A', padding: '28px 20px', textAlign: 'center' }}>
        <img src={LOGO} alt="JETPLUS" style={{ height: 40, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
        <p style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: '14px 0 2px' }}>Descripción de Cargo</p>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, margin: 0 }}>JETPLUS · MG &amp; MAXUS</p>
      </div>

      <div style={{ maxWidth: 620, margin: '0 auto', padding: '24px 16px 60px' }}>
        {/* Aviso */}
        {esPublico ? (
          <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 14, padding: '14px 18px', marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#1e40af', fontWeight: 600 }}>
              👋 Completa tu descripción de cargo. Al enviarla, quedarás registrado en el sistema de Jetplus.
            </p>
          </div>
        ) : (
          <div style={{ background: vencido ? '#fef2f2' : '#eff6ff', border: `1.5px solid ${vencido ? '#fecaca' : '#bfdbfe'}`, borderRadius: 14, padding: '14px 18px', marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 13, color: vencido ? '#991b1b' : '#1e40af', fontWeight: 600 }}>
              {vencido
                ? '⚠️ El plazo de 72 horas venció, pero aún puedes enviar tu descripción de cargo.'
                : '⏱️ Tienes 72 horas para completar este cuestionario.'}
            </p>
            {venceFmt && (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: vencido ? '#b91c1c' : '#3b82f6' }}>
                Fecha límite: {venceFmt}
              </p>
            )}
          </div>
        )}

        {/* Datos personales */}
        <div style={seccion}>
          <p style={secTitle}>1 · Datos personales</p>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={label}>Nombre completo *</label>
              <input style={input} value={f.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Tu nombre y apellido" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={label}>Cédula</label>
                <input style={input} value={f.cedula} onChange={e => set('cedula', e.target.value)} placeholder="V-12345678" />
              </div>
              <div>
                <label style={label}>Teléfono</label>
                <input style={input} value={f.telefono} onChange={e => set('telefono', e.target.value)} placeholder="0412-0000000" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={label}>Correo personal</label>
                <input style={input} value={f.correo} onChange={e => set('correo', e.target.value)} placeholder="tu@correo.com" />
              </div>
              <div>
                <label style={label}>Correo dentro de la empresa</label>
                <input style={input} value={f.correoEmpresa} onChange={e => set('correoEmpresa', e.target.value)} placeholder="tu@navigroup.co" />
              </div>
            </div>
            <div>
              <label style={label}>Fecha de ingreso</label>
              <input type="date" style={input} value={f.fechaIngreso} onChange={e => set('fechaIngreso', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Cargo y área */}
        <div style={seccion}>
          <p style={secTitle}>2 · Cargo y área</p>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={label}>Nombre del cargo *</label>
              <input style={input} value={f.cargo} onChange={e => set('cargo', e.target.value)} placeholder="Ej: Asesor de ventas" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={label}>Departamento / Área</label>
                <input style={input} value={f.departamento} onChange={e => set('departamento', e.target.value)} placeholder="Ej: Ventas" />
              </div>
              <div>
                <label style={label}>¿A quién reporta?</label>
                <input style={input} value={f.reportaA} onChange={e => set('reportaA', e.target.value)} placeholder="Ej: Gerente de ventas" />
              </div>
            </div>
          </div>
        </div>

        {/* Responsabilidades y funciones */}
        <div style={seccion}>
          <p style={secTitle}>3 · Responsabilidades y funciones</p>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={label}>Responsabilidades principales *</label>
              <textarea style={textarea} value={f.responsabilidades} onChange={e => set('responsabilidades', e.target.value)} placeholder="¿De qué eres responsable en tu cargo?" />
            </div>
            <div>
              <label style={label}>Funciones</label>
              <textarea style={textarea} value={f.funciones} onChange={e => set('funciones', e.target.value)} placeholder="Detalla las funciones de tu cargo" />
            </div>
            <div>
              <label style={label}>Tareas del día a día</label>
              <textarea style={textarea} value={f.tareasDiarias} onChange={e => set('tareasDiarias', e.target.value)} placeholder="¿Qué haces en un día típico de trabajo?" />
            </div>
          </div>
        </div>

        {/* Competencias */}
        <div style={seccion}>
          <p style={secTitle}>4 · Competencias y observaciones</p>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={label}>Habilidades / competencias</label>
              <textarea style={textarea} value={f.competencias} onChange={e => set('competencias', e.target.value)} placeholder="Habilidades necesarias para tu cargo" />
            </div>
            <div>
              <label style={label}>Herramientas / sistemas que usas</label>
              <textarea style={textarea} value={f.herramientas} onChange={e => set('herramientas', e.target.value)} placeholder="Ej: Centro de Mando, WhatsApp, Excel…" />
            </div>
            <div>
              <label style={label}>Observaciones</label>
              <textarea style={textarea} value={f.observaciones} onChange={e => set('observaciones', e.target.value)} placeholder="Cualquier comentario adicional (opcional)" />
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#991b1b', fontWeight: 600 }}>{error}</p>
          </div>
        )}

        <button
          onClick={enviar}
          disabled={enviando}
          style={{ width: '100%', background: enviando ? '#9ca3af' : '#C41E3A', color: '#fff', border: 'none', padding: '15px', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: enviando ? 'default' : 'pointer' }}
        >
          {enviando ? 'Enviando…' : 'Enviar descripción de cargo'}
        </button>
        <p style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', marginTop: 16 }}>
          Al enviar, tu descripción de cargo llegará al equipo de Jetplus.
        </p>
      </div>
    </div>
  )
}
