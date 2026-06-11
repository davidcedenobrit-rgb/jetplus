'use client'

import { useState } from 'react'

interface Vehiculo {
  id: string
  brand: 'MG' | 'MAXUS'
  model: string
  img_url: string | null
  cash: number | null
  gc: number | null
  gcr: number | null
  tasa_credito: number | null
  stock: number | null
  colores: string | null
  transmision: string | null
  ano: number | null
}

const CMAP: Record<string, string> = {
  blanco:'#f0f0f0',blanca:'#f0f0f0',negro:'#1a1a1a',negra:'#1a1a1a',
  rojo:'#dc2626',roja:'#dc2626',gris:'#9ca3af',grises:'#9ca3af',
  plata:'#c0c0c0',plateado:'#c0c0c0',plateada:'#c0c0c0',
  azul:'#2563eb',azules:'#2563eb',verde:'#16a34a',verdes:'#16a34a',
  amarillo:'#eab308',naranja:'#ea580c',beige:'#d4c5a9',
  marron:'#78350f','marrón':'#78350f',dorado:'#b8860b',
  celeste:'#7dd3fc','borgoña':'#7f1d1d',vino:'#7f1d1d',perla:'#f1f0eb',
}
function cHex(n: string) { return CMAP[n.trim().toLowerCase()] ?? '#6b7280' }
function fm(n: number | null | undefined) {
  if (!n) return '—'
  return Number(n).toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const WA_BASE = 'https://wa.me/584149989010'

type Filtro = 'todos' | 'MG' | 'MAXUS'

export default function VehiculosFiltro({ vehiculos }: { vehiculos: Vehiculo[] }) {
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const lista = filtro === 'todos' ? vehiculos : vehiculos.filter(v => v.brand === filtro)

  function handleShare(v: Vehiculo) {
    const text = `🚗 ${v.model} — ${v.brand}\nPrecio base: $${fm(v.cash)}\nVer más en La Oriental Automotors`
    if (navigator.share) {
      navigator.share({ title: v.model, text }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text).catch(() => {})
    }
  }

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {(['todos', 'MG', 'MAXUS'] as Filtro[]).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`lo-filter${filtro === f ? ' active' : ''}`}
          >
            {f === 'todos' ? 'Todos' : f}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {lista.map(v => {
          const colorsArr = (v.colores || '').split(',').map(c => c.trim()).filter(Boolean)
          const inicial = v.cash ? Math.round(v.cash * 0.4) : null

          return (
            <div key={v.id} className="lo-car-card">
              {/* Imagen */}
              <div style={{ height: 185, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                {v.img_url ? (
                  <img
                    src={v.img_url}
                    alt={v.model}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 14 }}
                  />
                ) : (
                  <span style={{ fontSize: 50, opacity: 0.13 }}>🚗</span>
                )}

                {/* Brand badge */}
                <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 5 }}>
                  <span style={{
                    background: v.brand === 'MG' ? '#dc2626' : '#1d4ed8',
                    color: '#fff', fontSize: 10, fontWeight: 800,
                    padding: '2px 8px', borderRadius: 999, letterSpacing: '0.5px'
                  }}>{v.brand}</span>
                  {v.stock !== null && v.stock > 0 && (
                    <span style={{ background: 'rgba(22,163,74,0.85)', color: '#fff', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>
                      {v.stock} en stock
                    </span>
                  )}
                </div>

                {/* Año */}
                {v.ano && (
                  <span style={{ position: 'absolute', top: 10, right: 10, color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600 }}>
                    {v.ano}
                  </span>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <p style={{ fontWeight: 800, fontSize: 15, color: '#111827', marginBottom: 2 }}>{v.model}</p>
                {v.transmision && v.transmision !== 'Ambos' && (
                  <p style={{ color: '#9ca3af', fontSize: 11, marginBottom: 12, fontWeight: 500 }}>{v.transmision}</p>
                )}

                {/* Precio base */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Precio base (contado)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: '#111827' }}>${fm(v.cash)}</span>
                    {v.gc && v.gc > 0 && (
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>G. contado ${fm(v.gc)}</span>
                    )}
                  </div>
                </div>

                {/* Plan 40% inicial */}
                {(inicial || v.tasa_credito) && (
                  <div className="lo-plan-box">
                    <p style={{ fontSize: 10, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>
                      Plan 40% inicial + cuotas
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {inicial && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span style={{ color: '#92400e', fontWeight: 600 }}>Inicial (40%)</span>
                          <span style={{ fontWeight: 800, color: '#78350f' }}>${fm(inicial)}</span>
                        </div>
                      )}
                      {v.tasa_credito && v.tasa_credito > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span style={{ color: '#92400e', fontWeight: 600 }}>Cuota mensual (24 m)</span>
                          <span style={{ fontWeight: 800, color: '#dc2626' }}>${fm(v.tasa_credito)}/mes</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Colores */}
                {colorsArr.length > 0 && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 12 }}>
                    {colorsArr.map(c => (
                      <div
                        key={c}
                        title={c}
                        className="lo-color-dot"
                        style={{ background: cHex(c) }}
                      />
                    ))}
                  </div>
                )}

                <div style={{ flex: 1 }} />

                {/* Botones */}
                <div style={{ display: 'flex', gap: 8, marginTop: 14, flexDirection: 'column' }}>
                  {/* WhatsApp + Compartir */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a
                      href={`${WA_BASE}?text=${encodeURIComponent(`Hola 👋 vengo de la web de La Oriental y quiero información sobre el ${v.model}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="lo-card-wa"
                      style={{ textDecoration: 'none' }}
                    >
                      WhatsApp
                    </a>
                    <button
                      onClick={() => handleShare(v)}
                      className="lo-card-share"
                    >
                      Compartir
                    </button>
                  </div>
                  {/* Generar cotización */}
                  <a
                    href={`${WA_BASE}?text=${encodeURIComponent(`Hola 👋 vengo de la web de La Oriental y quiero una cotización formal del ${v.model} con precio base $${fm(v.cash)}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lo-card-cot"
                    style={{ textDecoration: 'none' }}
                  >
                    Generar cotización
                  </a>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {lista.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🚗</p>
          <p style={{ fontWeight: 600 }}>No hay vehículos disponibles en este momento.</p>
        </div>
      )}

      <p style={{ color: '#9ca3af', fontSize: 11, textAlign: 'center', marginTop: 28 }}>
        * Precio base y plan 40% inicial + cuotas fijas disponibles en cada modelo.
      </p>
    </div>
  )
}
