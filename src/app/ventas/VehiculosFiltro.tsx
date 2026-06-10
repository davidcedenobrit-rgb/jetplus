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

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {(['todos', 'MG', 'MAXUS'] as Filtro[]).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`v-filter${filtro === f ? ' active' : ''}`}
          >
            {f === 'todos' ? 'Todos' : f}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {lista.map(v => {
          const colorsArr = (v.colores || '').split(',').map(c => c.trim()).filter(Boolean)
          return (
            <div key={v.id} className="v-card">
              {/* Imagen */}
              <div style={{ height: 190, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                {v.img_url ? (
                  <img
                    src={v.img_url}
                    alt={v.model}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 16 }}
                  />
                ) : (
                  <span style={{ fontSize: 52, opacity: 0.15 }}>🚗</span>
                )}
                {/* Badges */}
                <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
                  <span className={`v-tag ${v.brand === 'MG' ? 'v-tag-mg' : 'v-tag-maxus'}`}>{v.brand}</span>
                  {v.stock !== null && v.stock > 0 && (
                    <span style={{ background: 'rgba(22,163,74,0.85)', color: '#fff', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>
                      {v.stock} en stock
                    </span>
                  )}
                </div>
                {/* Año badge */}
                {v.ano && (
                  <span style={{ position: 'absolute', top: 12, right: 12, color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600 }}>
                    {v.ano}
                  </span>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: '16px 18px 18px' }}>
                <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 2, color: '#fff' }}>{v.model}</p>
                {v.transmision && v.transmision !== 'Ambos' && (
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginBottom: 14 }}>{v.transmision}</p>
                )}

                {/* Precios */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>Precio base</span>
                    <span style={{ fontWeight: 800, color: '#fff' }}>${fm(v.cash)}</span>
                  </div>
                  {v.gc && v.gc > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'rgba(255,255,255,0.35)' }}>G. Contado</span>
                      <span style={{ color: 'rgba(255,255,255,0.6)' }}>${fm(v.gc)}</span>
                    </div>
                  )}
                  {v.gcr && v.gcr > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'rgba(255,255,255,0.35)' }}>G. Crédito</span>
                      <span style={{ color: 'rgba(255,255,255,0.6)' }}>${fm(v.gcr)}</span>
                    </div>
                  )}
                  {v.tasa_credito && v.tasa_credito > 0 && (
                    <>
                      <div className="v-sep" />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>Cuota 24 meses</span>
                        <span style={{ fontWeight: 800, color: '#ef4444' }}>${fm(v.tasa_credito)}/mes</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Colores */}
                {colorsArr.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                    {colorsArr.map(c => (
                      <div
                        key={c}
                        title={c}
                        style={{
                          width: 16, height: 16, borderRadius: '50%',
                          background: cHex(c),
                          border: c.toLowerCase().includes('blanco') || c.toLowerCase().includes('blanca') || c.toLowerCase().includes('perla')
                            ? '1px solid rgba(0,0,0,0.25)'
                            : '1px solid rgba(255,255,255,0.15)',
                          flexShrink: 0,
                        }}
                      />
                    ))}
                  </div>
                )}

                <a
                  href={`${WA_BASE}?text=${encodeURIComponent(`Hola 👋 vengo de la web de La Oriental y quiero información sobre el ${v.model}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="v-btn-wa"
                >
                  Consultar por WhatsApp
                </a>
              </div>
            </div>
          )
        })}
      </div>

      {lista.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.25)' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🚗</p>
          <p>No hay vehículos disponibles en este momento.</p>
        </div>
      )}

      <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, textAlign: 'center', marginTop: 28 }}>
        *Precio base y plan 40% inicial + cuotas fijas disponibles en cada modelo.
      </p>
    </div>
  )
}
