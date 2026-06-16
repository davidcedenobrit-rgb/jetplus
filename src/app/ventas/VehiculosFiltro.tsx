'use client'

import { useState } from 'react'
import CotizacionModal from './CotizacionModal'
import CotizacionRapidaModal from './CotizacionRapidaModal'

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
  placa_monto?: number | null
  poliza_vehiculo_banco?: number | null
  poliza_vida_banco?: number | null
  honorarios_banco?: number | null
  gastos_internos_banco?: number | null
  alfombras_banco?: number | null
  diferencial_pct?: number | null
  tasa_banco_pct?: number | null
}

const WA = '584149989010'

function fm(n: number | null | undefined) {
  if (!n) return '0'
  return Number(n).toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

type Filtro = 'ALL' | 'MG' | 'MAXUS'

export default function VehiculosFiltro({ vehiculos }: { vehiculos: Vehiculo[] }) {
  const [filtro, setFiltro] = useState<Filtro>('ALL')
  const [modalVehiculo, setModalVehiculo] = useState<Vehiculo | null>(null)
  const [rapidaVehiculo, setRapidaVehiculo] = useState<Vehiculo | null>(null)
  const lista = filtro === 'ALL' ? vehiculos : vehiculos.filter(v => v.brand === filtro)

  function trackEvento(evento: string, brand: string, model: string) {
    fetch('/api/eventos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evento, marca: brand, modelo: model }) }).catch(() => {})
  }

  function goWA(model: string) {
    const msg = `Hola 👋 vengo del perfil de ventas de La Oriental. Me interesa el ${model}.`
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank')
  }
  async function compartir(v: Vehiculo) {
    const url = new URL(window.location.href); url.searchParams.set('car', v.id)
    const link = url.toString()
    if (navigator.share) { try { await navigator.share({ title: `La Oriental | ${v.model}`, url: link }); return } catch {} }
    try { await navigator.clipboard.writeText(link) } catch {}
  }

  return (
    <div>
      {modalVehiculo && (
        <CotizacionModal vehiculo={modalVehiculo} onClose={() => setModalVehiculo(null)} />
      )}
      {rapidaVehiculo && (
        <CotizacionRapidaModal vehiculo={rapidaVehiculo} onClose={() => setRapidaVehiculo(null)} />
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        {(['ALL', 'MG', 'MAXUS'] as Filtro[]).map(f => (
          <button key={f} onClick={() => setFiltro(f)} className={`f-btn${filtro === f ? ' on' : ''}`}>
            {f === 'ALL' ? 'Todos' : f}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 28 }}>
        {lista.map(v => {
          const init = v.cash ? v.cash * 0.4 : 0
          return (
            <div key={v.id} id={`car-${v.id}`} className="lo-card">
              {/* Imagen */}
              <div className="lo-card-imgwrap">
                {v.img_url
                  ? <img src={v.img_url} alt={v.model} className="lo-card-img" loading="lazy" />
                  : <span style={{ fontSize: 52, opacity: .12 }}>🚗</span>}
              </div>

              {/* Cuerpo */}
              <div style={{ padding: '24px 26px 26px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, letterSpacing: '.5px' }}>{v.brand}</p>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111', marginTop: 2, lineHeight: 1.3 }}>{v.model}</h3>

                {/* Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {v.stock && v.stock > 0
                    ? <span className="lo-badge lo-badge-stock">{v.stock} disponible{v.stock > 1 ? 's' : ''}</span>
                    : <span className="lo-badge lo-badge-none">Consultar</span>}
                  {v.transmision && v.transmision !== 'Ambos' && <span className="lo-badge lo-badge-meta">{v.transmision}</span>}
                  {v.ano && <span className="lo-badge lo-badge-meta">{v.ano}</span>}
                </div>

                {/* Precio base */}
                <div style={{ marginTop: 18 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>Precio base (contado)</p>
                  <p style={{ fontSize: 25, fontWeight: 800, color: '#111' }}>${fm(v.cash)}</p>
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>*Sin incluir: IVA, placa, seguro, gastos</p>
                </div>

                {/* Plan 40% */}
                {(init > 0 || (v.tasa_credito && v.tasa_credito > 0)) && (
                  <div className="lo-credit-box" style={{ marginTop: 14 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#a16207', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>Plan 40% inicial + cuotas</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div>
                        <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Inicial (40%)</p>
                        <p style={{ fontSize: 17, fontWeight: 800, color: '#111' }}>${fm(init)}</p>
                      </div>
                      {v.tasa_credito && v.tasa_credito > 0 && (
                        <>
                          <div style={{ width: 1, height: 36, background: '#fde68a' }} />
                          <div>
                            <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Cuota mensual (24m)</p>
                            <p style={{ fontSize: 17, fontWeight: 800, color: '#a16207' }}>${fm(v.tasa_credito)}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ flex: 1 }} />

                {/* Botones */}
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button onClick={() => goWA(v.model)} className="lo-cbtn-dark">WhatsApp</button>
                    <button onClick={() => compartir(v)} className="lo-cbtn-out">Compartir</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button onClick={() => { trackEvento('cotizacion_rapida', v.brand, v.model); setRapidaVehiculo(v) }} className="lo-cbtn-out">
                      📊 Cot. Rápida
                    </button>
                    <button onClick={() => { trackEvento('cotizacion_formal_click', v.brand, v.model); setModalVehiculo(v) }} className="lo-cbtn-red">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>
                      Cotización
                    </button>
                  </div>
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
    </div>
  )
}
