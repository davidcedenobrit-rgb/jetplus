'use client'

import { useState } from 'react'
import CotizacionModal from './CotizacionModal'
import CotizacionRapidaModal from './CotizacionRapidaModal'
import type { BrandImg } from './VehiculosFiltro'

interface PromoVehiculo {
  id: string
  vehiculo_id: string | null
  marca: string
  modelo: string
  precio_base: number
  gastos_contado: number
  gastos_credito: number
  cuota_mensual: number
}

export default function PromoCotizar({ promo, tasas, evento = '', waCorp = '584149989010', concesionario = '', brand }: {
  promo: PromoVehiculo
  tasas: { bcv: number; usdt: number }
  evento?: string
  waCorp?: string
  concesionario?: string
  brand?: BrandImg
}) {
  const [open, setOpen] = useState(false)
  const [rapida, setRapida] = useState(false)

  // Se mapea la promo a la forma de vehículo del catálogo para reusar los modales:
  // gc = gastos contado, gcr = gastos crédito, tasa_credito = cuota mensual.
  const vehiculo = {
    id: promo.vehiculo_id ?? promo.id,
    brand: promo.marca,
    model: promo.modelo,
    cash: Number(promo.precio_base) || 0,
    gc: Number(promo.gastos_contado) || 0,
    gcr: Number(promo.gastos_credito) || 0,
    tasa_credito: Number(promo.cuota_mensual) || 0,
  }

  return (
    <>
      {open && (
        <CotizacionModal vehiculo={vehiculo} tasas={tasas} esPromo promoId={promo.id} onClose={() => setOpen(false)} />
      )}
      {rapida && (
        <CotizacionRapidaModal
          vehiculo={{ brand: vehiculo.brand, model: vehiculo.model, cash: vehiculo.cash, gc: vehiculo.gc, gcr: vehiculo.gcr, tasa_credito: vehiculo.tasa_credito }}
          onClose={() => setRapida(false)}
          evento={evento} waCorp={waCorp} concesionario={concesionario}
          brandNombre={brand?.nombre} brandLogo={brand?.logo}
          colorPrimario={brand?.colorPrimario} colorSecundario={brand?.colorSecundario}
          planNota="Promoción especial"
        />
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        <button
          onClick={() => setRapida(true)}
          style={{ padding: '11px', background: '#fff', color: '#111', border: '1px solid #111', borderRight: 'none', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'sans-serif' }}
        >
          ⚡ Cotización rápida
        </button>
        <button
          onClick={() => setOpen(true)}
          style={{ padding: '11px', background: '#dc2626', color: '#fff', border: 'none', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'sans-serif' }}
        >
          📄 Cotización
        </button>
      </div>
    </>
  )
}
