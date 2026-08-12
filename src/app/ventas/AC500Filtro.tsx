'use client'

import { useState } from 'react'
import CotizacionRapidaModal from './CotizacionRapidaModal'
import CotizacionAC500Modal from './CotizacionAC500Modal'
import type { BrandImg } from './VehiculosFiltro'

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
  p12_activo: boolean
  p12_c1: number | null; p12_c2: number | null; p12_c3: number | null
  p12_c4: number | null; p12_c5: number | null; p12_c6: number | null
  p12_c7: number | null; p12_c8: number | null; p12_c9: number | null
  p12_c10: number | null; p12_c11: number | null; p12_c12: number | null
  p12_total: number | null
}

const WA = '584248705174'

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

export type Mode = '6' | '9' | '12'
type Filtro = 'ALL' | 'MG' | 'MAXUS'

function has(v: AC500Vehiculo, mode: Mode) {
  return mode === '6' ? v.p6_activo : mode === '9' ? v.p9_activo : v.p12_activo
}
export function activeModes(v: AC500Vehiculo): Mode[] {
  const arr: Mode[] = []
  if (v.p6_activo) arr.push('6')
  if (v.p9_activo) arr.push('9')
  if (v.p12_activo) arr.push('12')
  return arr
}
function defaultMode(v: AC500Vehiculo): Mode { return activeModes(v)[0] ?? '6' }

export function planTotal(v: AC500Vehiculo, mode: Mode): number | null {
  return mode === '6' ? v.p6_total : mode === '9' ? v.p9_total : v.p12_total
}

export function schedule(v: AC500Vehiculo, mode: Mode) {
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
  if (mode === '9') {
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
  return [
    { label: 'Cuota 0 - Reserva', val: v.reserva, highlight: true },
    { label: 'Cuota 1 - Día 0', val: v.p12_c1 },
    { label: 'Cuota 2 - Día 30', val: v.p12_c2 },
    { label: 'Cuota 3 - Día 60', val: v.p12_c3 },
    { label: 'Cuota 4 - Día 90', val: v.p12_c4 },
    { label: 'Cuota 5 - Día 120', val: v.p12_c5 },
    { label: 'Cuota 6 - Día 150', val: v.p12_c6 },
    { label: 'Cuota 7 - Día 180', val: v.p12_c7 },
    { label: 'Cuota 8 - Día 210', val: v.p12_c8 },
    { label: 'Cuota 9 - Día 240', val: v.p12_c9 },
    { label: 'Cuota 10 - Día 270', val: v.p12_c10 },
    { label: 'Cuota 11 - Día 300', val: v.p12_c11 },
    { label: 'Cuota 12 - Entrega', val: v.p12_c12, delivery: true },
  ]
}

function AC500Card({ v, waCorp = WA, evento = '', concesionario = '', brand }: { v: AC500Vehiculo; waCorp?: string; evento?: string; concesionario?: string; brand?: BrandImg }) {
  const colors = (v.colores || '').split(',').map(c => c.trim()).filter(Boolean)
  const [mode, setMode] = useState<Mode>(defaultMode(v))
  const [rapida, setRapida] = useState(false)
  const [cotizar, setCotizar] = useState(false)
  const [color, setColor] = useState(colors[0] || '')

  const modes = activeModes(v)
  const note = transNote(v.model)
  const total = mode === '6' ? v.p6_total : mode === '9' ? v.p9_total : v.p12_total
  const entregaMes = mode === '6' ? 6 : mode === '9' ? 9 : 12
  const rows = schedule(v, mode)

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
          {modes.length > 1 ? (
            <div className="plan-toggle">
              {modes.map(m => (
                <button key={m} className={mode === m ? (m === '6' ? 'active' : 'active gold') : ''} onClick={() => setMode(m)}>
                  {m} meses
                </button>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, fontWeight: 700, color: '#111', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 10, padding: '6px 12px', whiteSpace: 'nowrap' }}>
              {modes[0] ?? '6'} meses
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 'auto' }}>
          <button className="lo-cbtn-out" onClick={() => {
            fetch('/api/eventos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evento: 'ac500_interesado', marca: v.brand, modelo: v.model }) }).catch(() => {})
            setRapida(true)
          }}>⚡ Cotización rápida</button>
          <button className="lo-cbtn-red" onClick={() => {
            fetch('/api/eventos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evento: 'ac500_cotizacion_click', marca: v.brand, modelo: v.model }) }).catch(() => {})
            setCotizar(true)
          }}>📄 Cotización</button>
        </div>
      </div>

      {rapida && (
        <CotizacionRapidaModal
          vehiculo={{ brand: v.brand, model: v.model, cash: null, gc: null, gcr: null, tasa_credito: null }}
          onClose={() => setRapida(false)}
          evento={evento} waCorp={waCorp} concesionario={concesionario}
          brandNombre={brand?.nombre} brandLogo={brand?.logo}
          colorPrimario={brand?.colorPrimario} colorSecundario={brand?.colorSecundario}
          financiamiento={false} modalidad="ac500"
          planNota={`Plan Asegúrate $500 · entrega en ${mode} meses${color ? ` · ${cap(color)}` : ''}`}
          ac500={{ meses: mode, color: color ? cap(color) : undefined, rows, total }}
        />
      )}

      {cotizar && (
        <CotizacionAC500Modal
          plan={v}
          defaultMode={mode}
          defaultColor={color ? cap(color) : ''}
          onClose={() => setCotizar(false)}
        />
      )}
    </article>
  )
}

export default function AC500Filtro({ vehiculos, waCorp = WA, evento = '', concesionario = '', brand }: { vehiculos: AC500Vehiculo[]; waCorp?: string; evento?: string; concesionario?: string; brand?: BrandImg }) {
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
        {lista.map(v => <AC500Card key={v.id} v={v} waCorp={waCorp} evento={evento} concesionario={concesionario} brand={brand} />)}
      </div>

      {lista.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
          <p style={{ fontWeight: 600 }}>No hay planes Asegúrate $500 disponibles en este momento.</p>
        </div>
      )}
    </div>
  )
}
