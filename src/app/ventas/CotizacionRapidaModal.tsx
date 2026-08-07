'use client'

import { useState } from 'react'

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

export interface AC500RapidaData {
  meses: string
  color?: string
  rows: { label: string; val: number | null; highlight?: boolean; delivery?: boolean }[]
  total: number | null
}

export default function CotizacionRapidaModal({ vehiculo, onClose, concesionario = '', financiamiento = true, planNota = '', brandNombre = 'La Oriental Automotors', brandLogo = '', colorPrimario = '#C41E3A', colorSecundario = '#111827', ac500 = null }: {
  vehiculo: Vehiculo
  onClose: () => void
  evento?: string
  waCorp?: string
  concesionario?: string
  financiamiento?: boolean   // false = solo captación (p. ej. Asegúrate $500)
  modalidad?: string
  planNota?: string          // línea de contexto del plan cuando no hay desglose
  brandNombre?: string       // membrete del PDF
  brandLogo?: string         // logo del concesionario de turno (data URI)
  colorPrimario?: string     // color TOP del concesionario
  colorSecundario?: string   // color secundario (encabezado del vehículo)
  ac500?: AC500RapidaData | null  // cronograma del plan $500
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

  const [compartiendo, setCompartiendo] = useState(false)
  const [error, setError] = useState('')

  // Payload del PDF que se comparte.
  function payloadBase() {
    return {
      marca: vehiculo.brand, modelo: vehiculo.model, planNota, financiamiento,
      precio, gastosContado: gc, gastosCredito: gcr, cuota,
      brandNombre, brandLogo, colorPrimario, colorSecundario, conc: concesionario,
      ac500: ac500 ? { meses: ac500.meses, color: ac500.color, total: ac500.total, rows: ac500.rows } : null,
    }
  }

  // Compone el resumen en un PDF (en el servidor) y lo comparte por el compartir
  // nativo del teléfono, o lo abre para descargar. Reemplaza la captura de
  // imagen (html2canvas) que a veces se quedaba pegada esperando el logo remoto.
  async function compartirPdf() {
    if (compartiendo) return
    setCompartiendo(true); setError('')
    try {
      const res = await fetch('/api/cotizacion-rapida/pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadBase()),
      })
      if (!res.ok) throw new Error('pdf')
      const blob = await res.blob()
      const fileName = `Cotizacion_${vehiculo.brand}_${vehiculo.model}`.replace(/[^\w-]+/g, '_') + '.pdf'
      const file = new File([blob], fileName, { type: 'application/pdf' })
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean }
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: `${vehiculo.brand} ${vehiculo.model}`, text: `Cotización ${vehiculo.brand} ${vehiculo.model} — ${brandNombre}` } as ShareData)
          setCompartiendo(false); return
        } catch (e) {
          if ((e as Error)?.name === 'AbortError') { setCompartiendo(false); return }
        }
      }
      // Fallback (escritorio o sin compartir de archivos): abrir el PDF.
      const urlobj = URL.createObjectURL(blob)
      window.open(urlobj, '_blank')
      setTimeout(() => URL.revokeObjectURL(urlobj), 60000)
    } catch {
      setError('No se pudo generar el PDF. Intenta de nuevo.')
    } finally {
      setCompartiendo(false)
    }
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

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ position: 'relative', background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.22)' }}>

        <button onClick={onClose} aria-label="Cerrar" style={{ position: 'absolute', top: 10, right: 10, zIndex: 3, background: 'rgba(0,0,0,0.28)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#fff', fontSize: 20, lineHeight: '32px', textAlign: 'center' }}>×</button>

        {/* ── Resumen (se compone igual en el PDF que se comparte) ── */}
        <div style={{ background: '#fff', borderRadius: '16px 16px 0 0' }}>

          {/* Membrete del concesionario de turno */}
          <div style={{ background: colorPrimario, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '16px 16px 0 0' }}>
            {brandLogo ? <img src={brandLogo} alt={brandNombre} style={{ height: 26, maxWidth: 120, objectFit: 'contain', background: '#fff', borderRadius: 4, padding: '2px 4px' }} /> : null}
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 14, letterSpacing: 0.3 }}>{brandNombre}</span>
          </div>

          {/* Vehículo */}
          <div style={{ background: colorSecundario, padding: '16px 18px' }}>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>VEHICULO · {vehiculo.brand}</p>
            <p style={{ fontSize: 19, fontWeight: 800, color: '#fff', margin: '3px 0 0' }}>{vehiculo.model}</p>
          </div>

        {planNota && (
          <div style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '10px 18px', fontSize: 12.5, fontWeight: 700, color: '#92400e' }}>
            🛡️ {planNota}
          </div>
        )}

        {/* Cronograma del plan Asegúrate $500 */}
        {ac500 && <>
          <div style={hdr('#7c2d12', '#fde68a')}>Plan Asegúrate $500 · Entrega mes {ac500.meses}</div>
          {ac500.rows.map((r, i) => (
            <div key={i} style={{ ...row, ...(r.highlight ? { background: '#fffbeb' } : {}) }}>
              <span style={lbl}>
                {r.label}
                {r.delivery && <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, marginLeft: 6 }}>Entrega</span>}
              </span>
              <span style={val}>${fmt(r.val)}</span>
            </div>
          ))}
          <div style={{ ...row, background: '#fef9c3', border: 'none' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#92400e' }}>TOTAL DEL PLAN:</span>
            <span style={{ fontSize: 17, fontWeight: 900, color: '#92400e', fontFamily: 'monospace' }}>${fmt(ac500.total)}</span>
          </div>
          {ac500.color && (
            <div style={{ ...row, border: 'none' }}>
              <span style={lbl}>Color seleccionado:</span>
              <span style={{ ...val, fontFamily: 'inherit' }}>{ac500.color}</span>
            </div>
          )}
        </>}

        {financiamiento && <>
        <div style={hdr('#7c2d12', '#fde68a')}>Modalidad de Contado</div>
        <div style={row}><span style={lbl}>100% Precio Base:</span><span style={val}>${fmt(precio)}</span></div>
        <div style={row}><span style={lbl}>I.V.A. (16%):</span><span style={val}>${fmt(iva)}</span></div>
        <div style={{ ...row, alignItems: 'flex-start', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.45, flex: 1 }}>Póliza auto, Póliza de Vida, Traslado, INTT, Gastos Notaría, IGTF</span>
          <span style={{ ...val, flexShrink: 0 }}>${fmt(gc)}</span>
        </div>
        <div style={{ ...row, background: '#fef9c3', border: 'none' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#92400e' }}>TOTAL A PAGAR:</span>
          <span style={{ fontSize: 17, fontWeight: 900, color: '#92400e', fontFamily: 'monospace' }}>${fmt(total)}</span>
        </div>

        <div style={{ ...hdr('#064e3b', '#6ee7b7'), marginTop: 6 }}>Modalidad Crédito 24 Meses (40% Inicial)</div>
        <div style={row}><span style={lbl}>40% Precio Base:</span><span style={val}>${fmt(ini40)}</span></div>
        <div style={row}><span style={lbl}>I.V.A. (16%):</span><span style={val}>${fmt(iva)}</span></div>
        <div style={{ ...row, alignItems: 'flex-start', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.45, flex: 1 }}>Póliza auto, Póliza de Vida, Traslado, INTT, Gastos Notaría, IGTF</span>
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
        </>}

          <div style={{ padding: '8px 18px 12px' }}>
            <p style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', margin: 0 }}>
              *Precios referenciales sujetos a disponibilidad y cambios sin previo aviso
            </p>
          </div>
        </div>

        {/* Compartir el resumen como PDF */}
        <div style={{ padding: '14px 18px 18px' }}>
          <button onClick={compartirPdf} disabled={compartiendo}
            style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: colorPrimario, color: '#fff', fontSize: 14, fontWeight: 800, cursor: compartiendo ? 'default' : 'pointer', opacity: compartiendo ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {compartiendo ? 'Generando PDF…' : '📄 Compartir como PDF'}
          </button>
          {error && <p style={{ fontSize: 12, color: '#C41E3A', textAlign: 'center', margin: '8px 0 0' }}>{error}</p>}
        </div>

      </div>
    </div>
  )
}
