'use client'

import { useRef, useState } from 'react'
import { calcularPresupuestoJetplus } from '@/lib/cotizacion-calc'
import { imprimirPdfBlob, descargarBlob } from '@/lib/pdf-print'

// Misma llave que usa /ventas/panel: si el vendedor ya entró ahí, el rapidito
// no le vuelve a preguntar el código.
const LS_KEY = 'jetplus_vendedora_codigo'

interface Vehiculo {
  brand: string
  model: string
  cash: number | null
  gc: number | null
  gcr: number | null
  tasa_credito: number | null
  placa_monto?: number | null
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

export default function CotizacionRapidaModal({ vehiculo, onClose, concesionario = '', financiamiento = true, planNota = '', brandNombre = 'JETPLUS', brandLogo = '', colorPrimario = '#C41E3A', colorSecundario = '#111827', ac500 = null }: {
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
  const cuota     = vehiculo.tasa_credito ?? 0
  // Jetplus: IVA exonerado (Puerto Libre), IGTF 3% sobre el precio del vehículo,
  // cargos fijos de Gastos Administrativos ($500) y Placa ($390). Sin financiadora
  // aquí (eso es parte del presupuesto formal, no de la cotización rápida).
  const contado  = calcularPresupuestoJetplus({
    precioLista: precio, inicialPct: 100, cargoGastosAdmin: true, cargoPlaca: true,
    gastosAdminMonto: vehiculo.gc, placaMonto: vehiculo.placa_monto,
  })
  const credito  = calcularPresupuestoJetplus({
    precioLista: precio, inicialPct: 40, cargoGastosAdmin: true, cargoPlaca: true,
    gastosAdminMonto: vehiculo.gcr, placaMonto: vehiculo.placa_monto,
  })

  const [compartiendo, setCompartiendo] = useState(false)
  const [imprimiendo, setImprimiendo] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const [error, setError] = useState('')

  // Código de vendedora: se pide AL GENERAR (no al abrir la herramienta) para
  // que el rapidito deje rastro de quién lo produjo. Mirar precios sigue
  // libre; solo se identifica a quien va a producir un documento.
  const [pidiendoCodigo, setPidiendoCodigo] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinVerificando, setPinVerificando] = useState(false)
  const accionPendienteRef = useRef<null | ((codigo: string) => void)>(null)

  async function verificarCodigo(codigo: string): Promise<boolean> {
    try {
      const r = await fetch('/api/vendedoras/verificar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo }),
      })
      const j = await r.json().catch(() => ({}))
      return !!j.valida
    } catch { return false }
  }

  // Deja rastro del rapidito. Fire-and-forget: si falla, el vendedor igual se
  // lleva su PDF — anotar nunca debe bloquear la entrega.
  function registrarRapidito(codigo: string) {
    fetch('/api/cotizaciones-rapidas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codigo, marca: vehiculo.brand, modelo: vehiculo.model,
        precioBase: precio, cuotaMensual: cuota, concesionarioId: concesionario || null,
      }),
    }).catch(() => {})
  }

  // Si hay un código guardado y sigue sirviendo, no pregunta nada. Si no hay
  // o dejó de servir, lo olvida y pide uno nuevo antes de generar.
  async function conCodigoVendedora(accion: (codigo: string) => void) {
    const guardado = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null
    if (guardado) {
      const ok = await verificarCodigo(guardado)
      if (ok) { accion(guardado); return }
      localStorage.removeItem(LS_KEY)
    }
    accionPendienteRef.current = accion
    setPinInput(''); setPinError('')
    setPidiendoCodigo(true)
  }

  async function confirmarCodigoVendedora() {
    const cod = pinInput.trim().toUpperCase()
    if (!/^[A-Za-z]\d{3}$/.test(cod)) { setPinError('Formato: 1 letra + 3 números (ej. K101).'); return }
    setPinVerificando(true); setPinError('')
    const ok = await verificarCodigo(cod)
    setPinVerificando(false)
    if (!ok) { setPinError('Código incorrecto o inactivo.'); return }
    localStorage.setItem(LS_KEY, cod)
    setPidiendoCodigo(false)
    const accion = accionPendienteRef.current
    accionPendienteRef.current = null
    if (accion) accion(cod)
  }

  // Payload del PDF que se comparte.
  function payloadBase() {
    return {
      marca: vehiculo.brand, modelo: vehiculo.model, planNota, financiamiento,
      precio, gastosContado: vehiculo.gc ?? 500, gastosCredito: vehiculo.gcr ?? 500, placaMonto: vehiculo.placa_monto ?? 390, cuota,
      brandNombre, brandLogo, colorPrimario, colorSecundario, conc: concesionario,
      ac500: ac500 ? { meses: ac500.meses, color: ac500.color, total: ac500.total, rows: ac500.rows } : null,
    }
  }

  // Compone el resumen en un PDF (en el servidor) y lo comparte por el compartir
  // nativo del teléfono, o lo abre para descargar. Reemplaza la captura de
  // imagen (html2canvas) que a veces se quedaba pegada esperando el logo remoto.
  async function compartirPdf(codigoVendedora: string) {
    if (compartiendo) return
    setCompartiendo(true); setError('')
    try {
      const res = await fetch('/api/cotizacion-rapida/pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadBase()),
      })
      if (!res.ok) throw new Error('pdf')
      const blob = await res.blob()
      registrarRapidito(codigoVendedora)
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

  // Genera el mismo PDF que "Compartir" pero lo imprime o lo descarga directo,
  // en vez de abrir el diálogo de compartir nativo.
  async function generarPdfRapido(): Promise<Blob | null> {
    const res = await fetch('/api/cotizacion-rapida/pdf', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadBase()),
    })
    if (!res.ok) return null
    return res.blob()
  }

  async function imprimirRapido(codigoVendedora: string) {
    if (imprimiendo) return
    setImprimiendo(true); setError('')
    try {
      const blob = await generarPdfRapido()
      if (!blob) throw new Error('pdf')
      registrarRapidito(codigoVendedora)
      imprimirPdfBlob(blob)
    } catch {
      setError('No se pudo generar el PDF. Intenta de nuevo.')
    } finally {
      setImprimiendo(false)
    }
  }

  async function descargarRapido(codigoVendedora: string) {
    if (descargando) return
    setDescargando(true); setError('')
    try {
      const blob = await generarPdfRapido()
      if (!blob) throw new Error('pdf')
      registrarRapidito(codigoVendedora)
      const fileName = `Cotizacion_${vehiculo.brand}_${vehiculo.model}`.replace(/[^\w-]+/g, '_') + '.pdf'
      descargarBlob(blob, fileName)
    } catch {
      setError('No se pudo generar el PDF. Intenta de nuevo.')
    } finally {
      setDescargando(false)
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
        <div style={row}><span style={lbl}>100% Precio Base:</span><span style={val}>${fmt(contado.precioVehiculo)}</span></div>
        <div style={row}><span style={lbl}>I.V.A. (exonerado):</span><span style={val}>$0</span></div>
        <div style={row}><span style={lbl}>IGTF 3%:</span><span style={val}>${fmt(contado.igtf)}</span></div>
        <div style={row}><span style={lbl}>Gastos Administrativos:</span><span style={val}>${fmt(vehiculo.gc ?? 500)}</span></div>
        <div style={row}><span style={lbl}>Placa:</span><span style={val}>${fmt(vehiculo.placa_monto ?? 390)}</span></div>
        <div style={{ ...row, background: '#fef9c3', border: 'none' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#92400e' }}>TOTAL A PAGAR:</span>
          <span style={{ fontSize: 17, fontWeight: 900, color: '#92400e', fontFamily: 'monospace' }}>${fmt(contado.totalInicialAPagar)}</span>
        </div>

        <div style={{ ...hdr('#064e3b', '#6ee7b7'), marginTop: 6 }}>Modalidad Crédito 24 Meses (40% Inicial)</div>
        <div style={row}><span style={lbl}>40% Precio Base:</span><span style={val}>${fmt(credito.inicialVehiculo)}</span></div>
        <div style={row}><span style={lbl}>I.V.A. (exonerado):</span><span style={val}>$0</span></div>
        <div style={row}><span style={lbl}>IGTF 3% (sobre precio base):</span><span style={val}>${fmt(credito.igtf)}</span></div>
        <div style={row}><span style={lbl}>Gastos Administrativos:</span><span style={val}>${fmt(vehiculo.gcr ?? 500)}</span></div>
        <div style={row}><span style={lbl}>Placa:</span><span style={val}>${fmt(vehiculo.placa_monto ?? 390)}</span></div>
        <div style={{ ...row, background: '#dcfce7', border: 'none' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#065f46' }}>TOTAL INICIAL A PAGAR:</span>
          <span style={{ fontSize: 17, fontWeight: 900, color: '#065f46', fontFamily: 'monospace' }}>${fmt(credito.totalInicialAPagar)}</span>
        </div>
        <div style={{ ...row, background: '#f0fdf4' }}>
          <span style={{ fontSize: 12, color: '#6b7280' }}>Financiamiento 60% —</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#111', fontFamily: 'monospace' }}>${fmt(credito.saldoFinanciar)}</span>
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

        {/* Pedir código de vendedora al generar (no al abrir la herramienta) */}
        {pidiendoCodigo ? (
          <div style={{ padding: '18px' }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#111', marginBottom: 4 }}>Tu código de vendedora</p>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Para dejar registrado quién generó esta cotización.</p>
            <input
              type="text" inputMode="text" autoCapitalize="characters" autoCorrect="off" autoComplete="off" spellCheck={false}
              maxLength={4} value={pinInput}
              onChange={e => { setPinInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)); setPinError('') }}
              onKeyDown={e => e.key === 'Enter' && confirmarCodigoVendedora()}
              placeholder="X000" autoFocus
              style={{ width: '100%', padding: '12px', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 22, textAlign: 'center', letterSpacing: 10, fontWeight: 800, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 10 }}
            />
            {pinError && <p style={{ fontSize: 12, color: '#C41E3A', marginBottom: 10 }}>{pinError}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPidiendoCodigo(false)} disabled={pinVerificando}
                style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #d1d5db', background: '#fff', color: '#6b7280', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button onClick={confirmarCodigoVendedora} disabled={pinVerificando || pinInput.length !== 4}
                style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: pinInput.length === 4 ? colorPrimario : '#d1d5db', color: '#fff', fontSize: 13, fontWeight: 800, cursor: pinInput.length === 4 ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                {pinVerificando ? 'Verificando…' : 'Continuar →'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Compartir el resumen como PDF */}
            <div style={{ padding: '14px 18px 18px' }}>
              <button onClick={() => conCodigoVendedora(compartirPdf)} disabled={compartiendo}
                style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: colorPrimario, color: '#fff', fontSize: 14, fontWeight: 800, cursor: compartiendo ? 'default' : 'pointer', opacity: compartiendo ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {compartiendo ? 'Generando PDF…' : '📄 Compartir como PDF'}
              </button>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => conCodigoVendedora(imprimirRapido)} disabled={imprimiendo}
                  style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #d1d5db', background: '#fff', color: '#111', fontSize: 13, fontWeight: 700, cursor: imprimiendo ? 'default' : 'pointer', opacity: imprimiendo ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  🖨 {imprimiendo ? 'Generando…' : 'Imprimir'}
                </button>
                <button onClick={() => conCodigoVendedora(descargarRapido)} disabled={descargando}
                  style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #d1d5db', background: '#fff', color: '#111', fontSize: 13, fontWeight: 700, cursor: descargando ? 'default' : 'pointer', opacity: descargando ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  ⬇ {descargando ? 'Generando…' : 'Descargar'}
                </button>
              </div>
              {error && <p style={{ fontSize: 12, color: '#C41E3A', textAlign: 'center', margin: '8px 0 0' }}>{error}</p>}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
