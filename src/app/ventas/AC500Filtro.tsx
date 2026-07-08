'use client'

import { useState } from 'react'

export interface AC500Vehiculo {
  id: string
  brand: 'MG' | 'MAXUS'
  model: string
  img_url: string | null
  colores: string | null
  reserva: number | null
  p6_activo: boolean
  p6_c1: number | null; p6_c2: number | null; p6_c3: number | null
  p6_c4: number | null; p6_c5: number | null; p6_c6: number | null
  p6_total: number | null
  p9_activo: boolean
  p9_c1: number | null; p9_c2: number | null; p9_c3: number | null
  p9_c4: number | null; p9_c5: number | null; p9_c6: number | null
  p9_c7: number | null; p9_c8: number | null; p9_c9: number | null
  p9_total: number | null
}

const WA = '584149989010'

const COLOR_MAP: Record<string, string> = {
  blanco: '#ffffff', negro: '#111827', gris: '#9ca3af',
  plata: '#d1d5db', rojo: '#ef4444', azul: '#3b82f6',
}

function money(n: number | null | undefined) {
  return '$ ' + Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(Number(n || 0))*100)%100===0?0:2, maximumFractionDigits: 2 })
}
function cap(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s }

function transNote(model: string) {
  const m = model.toUpperCase()
  if (m.includes('AT LUX') && m.includes('ZS')) return 'Motor Turbo'
  if (m.includes(' MT ')) return 'Sincrónico'
  if (m.includes(' AT ') || m.includes(' CVT ') || m.includes(' DCT ')) return 'Automático'
  return ''
}

type Mode = '6' | '9'
type Filtro = 'ALL' | 'MG' | 'MAXUS'

function has(v: AC500Vehiculo, mode: Mode) { return mode === '6' ? v.p6_activo : v.p9_activo }
function defaultMode(v: AC500Vehiculo): Mode { return v.p6_activo ? '6' : '9' }

function schedule(v: AC500Vehiculo, mode: Mode) {
  if (mode === '6') {
    return [
      { label: 'Cuota 0 - Reserva', val: v.reserva, highlight: true },
      { label: 'Cuota 1 - Día 0', val: v.p6_c1 },
      { label: 'Cuota 2 - Día 30', val: v.p6_c2 },
      { label: 'Cuota 3 - Día 60', val: v.p6_c3 },
      { label: 'Cuota 4 - Día 90', val: v.p6_c4 },
      { label: 'Cuota 5 - Día 120', val: v.p6_c5 },
      { label: 'Cuota 6 - Día 150 a 180', val: v.p6_c6, delivery: true },
    ]
  }
  return [
    { label: 'Cuota 0 - Reserva', val: v.reserva, highlight: true },
    { label: 'Cuota 1 - Día 0', val: v.p9_c1 },
    { label: 'Cuota 2 - Día 30', val: v.p9_c2 },
    { label: 'Cuota 3 - Día 60', val: v.p9_c3 },
    { label: 'Cuota 4 - Día 90', val: v.p9_c4 },
    { label: 'Cuota 5 - Día 120', val: v.p9_c5 },
    { label: 'Cuota 6 - Día 150', val: v.p9_c6 },
    { label: 'Cuota 7 - Día 180', val: v.p9_c7 },
    { label: 'Cuota 8 - Día 210', val: v.p9_c8 },
    { label: 'Cuota 9 - Día 240', val: v.p9_c9, delivery: true },
  ]
}

function AC500Card({ v }: { v: AC500Vehiculo }) {
  const colors = (v.colores || '').split(',').map(c => c.trim()).filter(Boolean)
  const [mode, setMode] = useState<Mode>(defaultMode(v))
  const [color, setColor] = useState(colors[0] || '')

  const show6 = v.p6_activo, show9 = v.p9_activo, toggle = show6 && show9
  const note = transNote(v.model)
  const total = mode === '6' ? v.p6_total : v.p9_total
  const entregaMes = mode === '6' ? 6 : 9
  const rows = schedule(v, mode)

  function goWA() {
    fetch('/api/eventos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evento: 'ac500_whatsapp', marca: v.brand, modelo: v.model }) }).catch(() => {})
    const colorPart = color ? ` Color: ${color}.` : ''
    const entrega = mode === '6' ? '6 meses' : '9 meses'
    const msg = `Hola 👋 vengo del perfil de ventas de La Oriental. Me interesa el ${v.model} en el Plan Asegúrate con $500 (${entrega}).${colorPart} ¿Me comparten disponibilidad y próximos pasos?`
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank')
  }
  async function compartir() {
    const url = new URL(window.location.href); url.searchParams.set('car', v.id)
    const link = url.toString()
    if (navigator.share) { try { await navigator.share({ title: `La Oriental | AC500 | ${v.model}`, url: link }); return } catch {} }
    try { await navigator.clipboard.writeText(link) } catch {}
  }

  return (
    <article id={`car-${v.id}`} className="lo-card">
      <div className="lo-card-imgwrap" style={{ height: 185 }}>
        {v.img_url
          ? <img src={v.img_url} alt={v.model} className="lo-card-img" loading="lazy" />
          : <span style={{ fontSize: 48, opacity: .12 }}>🚗</span>}
        <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(255,255,255,.92)', border: '1px solid rgba(0,0,0,.08)', borderRadius: 6, padding: '3px 9px', fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>{v.brand}</div>
        <div style={{ position: 'absolute', top: 12, right: 12, background: '#ca8a04', color: '#fff', borderRadius: 6, padding: '3px 9px', fontSize: 9.5, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Asegúrate $500</div>
      </div>

      <div style={{ padding: '18px 18px 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, letterSpacing: '.5px', marginBottom: 3 }}>{v.brand}</p>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: '#111', lineHeight: 1.2, marginBottom: 2 }}>{v.model}</h3>
        {note && <div className="mini-note">{note}</div>}

        {/* Cronograma header + toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 12, gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.8px' }}>Cronograma</span>
          {toggle ? (
            <div className="plan-toggle">
              <button className={mode === '6' ? 'active' : ''} onClick={() => setMode('6')}>6 meses</button>
              <button className={mode === '9' ? 'active gold' : ''} onClick={() => setMode('9')}>9 meses</button>
            </div>
          ) : (
            <div style={{ fontSize: 12, fontWeight: 700, color: '#111', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 10, padding: '6px 12px', whiteSpace: 'nowrap' }}>
              {show6 ? '6 meses' : '9 meses'}
            </div>
          )}
        </div>

        {/* Cronograma */}
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 14, padding: 14, marginBottom: 10 }}>
          <div>
            {rows.map((r, i) => (
              <div key={i} className={`sched-row${r.highlight ? ' highlight' : ''}`}>
                <span className="sr-label">
                  {r.label}
                  {r.delivery && <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, marginLeft: 4 }}>Entrega</span>}
                </span>
                <span className="sr-val">{money(r.val)}</span>
              </div>
            ))}
          </div>
          <div className="total-strip">
            <span className="ts-label">Total · Entrega mes {entregaMes}</span>
            <span className="ts-val">{money(total)}</span>
          </div>
        </div>

        {/* Colores */}
        {colors.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
              <span style={{ fontWeight: 500 }}>Colores disponibles</span>
              <span style={{ fontWeight: 600, color: '#ca8a04' }}>{cap(color || '-')}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {colors.map(c => {
                const hex = COLOR_MAP[c.toLowerCase()] || '#ccc'
                const isWhite = c.toLowerCase() === 'blanco'
                return (
                  <span key={c} title={cap(c)} onClick={() => setColor(c)}
                    className={`lo-cdot${color === c ? ' active' : ''}`}
                    style={{ background: hex, boxShadow: isWhite ? 'inset 0 0 0 2px rgba(0,0,0,.2)' : undefined }} />
                )
              })}
            </div>
          </div>
        )}

        <p style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5, marginBottom: 14 }}>
          ✱ La Cuota 0 (Reserva) asegura y activa el plan.<br />
          ✱ La última cuota puede cancelarse en Bs.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
          <button className="lo-cbtn-dark" onClick={goWA}>Solicitar información</button>
          <button className="lo-cbtn-out" onClick={compartir}>Compartir esta oferta</button>
        </div>
      </div>
    </article>
  )
}

export default function AC500Filtro({ vehiculos }: { vehiculos: AC500Vehiculo[] }) {
  const [filtro, setFiltro] = useState<Filtro>('ALL')
  const lista = filtro === 'ALL' ? vehiculos : vehiculos.filter(v => v.brand === filtro)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        {(['ALL', 'MG', 'MAXUS'] as Filtro[]).map(f => (
          <button key={f} onClick={() => setFiltro(f)} className={`f-btn${filtro === f ? ' on' : ''}`}>
            {f === 'ALL' ? 'Todos' : f}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 28 }}>
        {lista.map(v => <AC500Card key={v.id} v={v} />)}
      </div>

      {lista.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
          <p style={{ fontWeight: 600 }}>No hay planes Asegúrate $500 disponibles en este momento.</p>
        </div>
      )}
    </div>
  )
}
