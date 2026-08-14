'use client'

import { useState } from 'react'

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function hoyISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' })
}
function fechaISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export default function Calendario({ value, onChange }: { value: string; onChange: (fecha: string) => void }) {
  const hoy = hoyISO()
  const hoyDate = new Date(hoy + 'T00:00:00')
  const [mesVisible, setMesVisible] = useState(() => {
    const base = value ? new Date(value + 'T00:00:00') : hoyDate
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })

  const y = mesVisible.getFullYear()
  const m = mesVisible.getMonth()
  const primerDiaSemana = new Date(y, m, 1).getDay() // 0=domingo
  const offset = (primerDiaSemana + 6) % 7 // que la semana empiece en lunes
  const diasEnMes = new Date(y, m + 1, 0).getDate()

  const celdas: (number | null)[] = []
  for (let i = 0; i < offset; i++) celdas.push(null)
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d)

  const enMesActual = y === hoyDate.getFullYear() && m === hoyDate.getMonth()

  const btnNav: React.CSSProperties = {
    width: 30, height: 30, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15, color: '#374151',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button type="button" disabled={enMesActual} onClick={() => setMesVisible(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          style={{ ...btnNav, opacity: enMesActual ? 0.35 : 1, cursor: enMesActual ? 'not-allowed' : 'pointer' }}>‹</button>
        <span style={{ fontWeight: 800, fontSize: 14, textTransform: 'capitalize', color: '#111827' }}>
          {mesVisible.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })}
        </span>
        <button type="button" onClick={() => setMesVisible(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} style={btnNav}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {DIAS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#9ca3af', padding: '2px 0' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {celdas.map((dia, i) => {
          if (dia === null) return <div key={i} />
          const iso = fechaISO(y, m, dia)
          const dow = new Date(y, m, dia).getDay()
          const finDeSemana = dow === 0 || dow === 6
          const pasado = iso < hoy
          const deshabilitado = finDeSemana || pasado
          const seleccionado = value === iso
          return (
            <button key={i} type="button" disabled={deshabilitado} onClick={() => onChange(iso)}
              style={{
                aspectRatio: '1', borderRadius: 9, fontFamily: 'inherit',
                border: seleccionado ? '2px solid #C41E3A' : '1px solid #e5e7eb',
                background: seleccionado ? '#C41E3A' : deshabilitado ? '#f9fafb' : '#fff',
                color: seleccionado ? '#fff' : deshabilitado ? '#d1d5db' : '#111827',
                fontSize: 13, fontWeight: seleccionado ? 800 : 600,
                cursor: deshabilitado ? 'not-allowed' : 'pointer',
              }}>
              {dia}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 11, color: '#6b7280' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: '#C41E3A', display: 'inline-block' }} /> Seleccionado
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: '#f9fafb', border: '1px solid #e5e7eb', display: 'inline-block' }} /> No disponible (fin de semana / pasado)
        </span>
      </div>
    </div>
  )
}
