'use client'

import { useState, useEffect, useRef } from 'react'

async function safeParseResponse(res: Response): Promise<{ ok: boolean; data: any; text: string }> {
  const text = await res.text()
  let data: any = null
  if (text) {
    try { data = JSON.parse(text) } catch { data = null }
  }
  return { ok: res.ok, data, text }
}

const LOGO = 'https://assets.cdn.filesafe.space/XZDJ4aSOAL1crWRCXyY6/media/698367bc1dfc0253b24abd7a.png'

type Step = 'idle' | 'rechazar_motivo' | 'descuento_form' | 'loading' | 'done' | 'descuento_ok' | 'error'

export default function RespuestaForm({
  token,
  numero,
  marca,
  modelo,
  totalInicial,
  clienteNombre,
  accionInicial,
}: {
  token: string
  numero: string
  marca: string
  modelo: string
  totalInicial: number
  clienteNombre: string
  accionInicial?: 'aceptada' | 'pospuesta' | 'rechazar_motivo' | 'descuento_form'
}) {
  const [step, setStep] = useState<Step>(
    accionInicial === 'rechazar_motivo' ? 'rechazar_motivo'
    : accionInicial === 'descuento_form' ? 'descuento_form'
    : 'idle'
  )
  const autoEnviadoRef = useRef(false)

  useEffect(() => {
    if (autoEnviadoRef.current) return
    if (accionInicial === 'aceptada' || accionInicial === 'pospuesta') {
      autoEnviadoRef.current = true
      enviar(accionInicial)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [motivo, setMotivo] = useState('')
  const [motivoDescuento, setMotivoDescuento] = useState('')
  const [respuestaLabel, setRespuestaLabel] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  async function enviar(estado: 'aceptada' | 'rechazada' | 'pospuesta', mot?: string) {
    setStep('loading')
    try {
      const res = await fetch('/api/cotizaciones/responder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, estado, motivo: mot }),
      })
      const parsed = await safeParseResponse(res)
      if (!parsed.ok) {
        throw new Error(
          parsed.data?.error
          ?? (parsed.text ? parsed.text.slice(0, 120) : `El servidor no respondió correctamente (código ${res.status}). Vuelve a intentarlo en unos segundos.`)
        )
      }
      setRespuestaLabel(
        estado === 'aceptada' ? 'Aceptada' :
        estado === 'pospuesta' ? 'Por ahora no compraré' :
        'No me interesa'
      )
      setStep('done')
    } catch (e: any) {
      autoEnviadoRef.current = false
      setErrorMsg(e?.message || 'No pudimos registrar tu respuesta. Verifica tu conexión e intenta de nuevo.')
      setStep('error')
    }
  }

  async function solicitarDescuento() {
    setStep('loading')
    try {
      const res = await fetch('/api/cotizaciones/solicitar-descuento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, motivo: motivoDescuento.trim() || null }),
      })
      const parsed = await safeParseResponse(res)
      if (!parsed.ok) {
        throw new Error(
          parsed.data?.error
          ?? (parsed.text ? parsed.text.slice(0, 120) : `El servidor no respondió correctamente (código ${res.status}). Vuelve a intentarlo en unos segundos.`)
        )
      }
      setStep('descuento_ok')
    } catch (e: any) {
      setErrorMsg(e?.message || 'No pudimos registrar tu solicitud. Verifica tu conexión e intenta de nuevo.')
      setStep('error')
    }
  }

  const fmt = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(n)*100)%100===0?0:2, maximumFractionDigits: 2 })

  if (step === 'done') {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 8 }}>¡Gracias, {clienteNombre.split(' ')[0]}!</h2>
        <p style={{ color: '#6b7280', fontSize: 15, marginBottom: 8 }}>
          Tu respuesta <strong style={{ color: '#111' }}>"{respuestaLabel}"</strong> fue registrada.
        </p>
        <p style={{ color: '#9ca3af', fontSize: 13 }}>Un asesor de La Oriental se pondrá en contacto contigo pronto.</p>
      </div>
    )
  }

  if (step === 'descuento_ok') {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>💬</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 8 }}>¡Solicitud enviada!</h2>
        <p style={{ color: '#6b7280', fontSize: 15, marginBottom: 8 }}>
          Hemos notificado a nuestro equipo. Te contactaremos con una propuesta actualizada pronto.
        </p>
        <p style={{ color: '#9ca3af', fontSize: 13 }}>La Oriental Automotors · MG &amp; MAXUS</p>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <p style={{ color: '#dc2626', fontWeight: 600, marginBottom: 8 }}>{errorMsg}</p>
        <button onClick={() => setStep('idle')} style={{ background: '#111', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Intentar de nuevo</button>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 520, margin: '0 auto', padding: '24px 20px 40px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <img src={LOGO} alt="La Oriental" style={{ height: 36, objectFit: 'contain', marginBottom: 16 }} />
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9ca3af', marginBottom: 4 }}>Cotización oficial</p>
        <p style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 800, color: '#C41E3A', marginBottom: 0 }}>{numero}</p>
      </div>

      {/* Resumen del vehículo */}
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 16, padding: '20px 22px', marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>Tu cotización</p>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>{marca}</p>
        <p style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 10 }}>{modelo}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb', paddingTop: 10 }}>
          <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Total / Inicial</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>${fmt(totalInicial)}</span>
        </div>
      </div>

      {/* Pregunta */}
      <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', textAlign: 'center', marginBottom: 18 }}>
        {clienteNombre.split(' ')[0]}, ¿cómo vas con esta cotización?
      </p>

      {step === 'rechazar_motivo' ? (
        <div>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>Cuéntanos brevemente por qué no es lo que buscas (opcional pero nos ayuda mucho):</p>
          <textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Ej: el precio está fuera de mi presupuesto, prefiero otro modelo..."
            rows={3}
            style={{ width: '100%', borderRadius: 12, border: '1.5px solid #d1d5db', padding: '10px 14px', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button onClick={() => setStep('idle')} style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>← Volver</button>
            <button
              onClick={() => {
                if (!motivo.trim()) enviar('rechazada', '(Sin motivo indicado)')
                else enviar('rechazada', motivo.trim())
              }}
              style={{ flex: 2, background: '#dc2626', color: '#fff', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
            >
              Confirmar rechazo
            </button>
          </div>
        </div>
      ) : step === 'descuento_form' ? (
        <div>
          <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 14, padding: '16px 18px', marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#92400e', margin: '0 0 6px' }}>💬 Solicitar revisión de precio</p>
            <p style={{ fontSize: 13, color: '#78350f', margin: 0 }}>Cuéntanos qué precio se adapta mejor a ti y nuestro equipo te enviará una propuesta actualizada.</p>
          </div>
          <textarea
            value={motivoDescuento}
            onChange={e => setMotivoDescuento(e.target.value)}
            placeholder="Ej: el precio está un poco alto para mi presupuesto, ¿hay algún descuento disponible?"
            rows={3}
            style={{ width: '100%', borderRadius: 12, border: '1.5px solid #fde68a', padding: '10px 14px', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep('idle')} style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>← Volver</button>
            <button
              onClick={solicitarDescuento}
              style={{ flex: 2, background: '#92400e', color: '#fff', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
            >
              Enviar solicitud
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Aceptar */}
          <button
            disabled={step === 'loading'}
            onClick={() => enviar('aceptada')}
            style={{ width: '100%', background: '#16a34a', color: '#fff', border: 'none', padding: '16px 20px', borderRadius: 14, fontWeight: 800, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: step === 'loading' ? .6 : 1 }}
          >
            ✅ Sí, acepto esta cotización
          </button>

          {/* Posponer */}
          <button
            disabled={step === 'loading'}
            onClick={() => enviar('pospuesta')}
            style={{ width: '100%', background: '#fff', color: '#374151', border: '2px solid #d1d5db', padding: '14px 20px', borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: step === 'loading' ? .6 : 1 }}
          >
            ⏸ Por ahora no compraré
          </button>

          {/* Rechazar */}
          <button
            disabled={step === 'loading'}
            onClick={() => setStep('rechazar_motivo')}
            style={{ width: '100%', background: '#fff', color: '#dc2626', border: '2px solid #fecaca', padding: '14px 20px', borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: step === 'loading' ? .6 : 1 }}
          >
            ❌ No me interesa / Rechazar
          </button>

          {step === 'loading' && <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Guardando tu respuesta...</p>}
        </div>
      )}

      <p style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', marginTop: 28 }}>
        La Oriental Automotors · MG &amp; MAXUS · Maturín, Venezuela
      </p>
    </div>
  )
}
