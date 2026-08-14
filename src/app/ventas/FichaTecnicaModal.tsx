'use client'

import { useState } from 'react'

export default function FichaTecnicaModal({ titulo, imagenUrl, pdfUrl, onClose }: {
  titulo: string
  imagenUrl: string
  pdfUrl: string
  onClose: () => void
}) {
  const [compartiendo, setCompartiendo] = useState(false)

  // Igual que el resto del sistema: en el teléfono usa el compartir nativo
  // (adjunta el PDF de verdad al chat que elija); si no está disponible
  // (típico en escritorio), cae a abrir el PDF en una pestaña nueva.
  async function compartir() {
    if (compartiendo) return
    setCompartiendo(true)
    try {
      if (typeof navigator !== 'undefined' && 'canShare' in navigator) {
        const res = await fetch(`${pdfUrl}?download=1`)
        if (res.ok) {
          const blob = await res.blob()
          const file = new File([blob], `Ficha_${titulo}.pdf`.replace(/[^\w.-]+/g, '_'), { type: 'application/pdf' })
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: `Ficha técnica — ${titulo}` })
            setCompartiendo(false); return
          }
        }
      }
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') { setCompartiendo(false); return }
    }
    window.open(pdfUrl, '_blank', 'noopener,noreferrer')
    setCompartiendo(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,.25)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#111', margin: 0 }}>Ficha técnica · {titulo}</p>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, lineHeight: '32px', textAlign: 'center' }}>×</button>
        </div>
        <div style={{ padding: 16 }}>
          <img src={imagenUrl} alt={`Ficha técnica ${titulo}`} style={{ width: '100%', borderRadius: 10, display: 'block', background: '#f9fafb' }} />
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <a
              href={`${pdfUrl}?download=1`}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', background: '#fff', border: '1.5px solid #d1d5db', borderRadius: 12, fontSize: 13, fontWeight: 700, color: '#111', textDecoration: 'none', fontFamily: 'inherit' }}
            >
              ⬇ Descargar PDF
            </a>
            <button
              onClick={compartir}
              disabled={compartiendo}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: compartiendo ? 'default' : 'pointer', fontFamily: 'inherit' }}
            >
              {compartiendo ? 'Preparando…' : '📤 Enviar por WhatsApp'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
