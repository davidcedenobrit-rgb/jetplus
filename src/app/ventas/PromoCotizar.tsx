'use client'

import { useState } from 'react'
import CotizacionModal from './CotizacionModal'

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

export default function PromoCotizar({ promo, tasas }: { promo: PromoVehiculo; tasas: { bcv: number; usdt: number } }) {
  const [open, setOpen] = useState(false)

  // Se mapea la promo a la forma de vehículo del catálogo para reusar el modal:
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
      <button
        onClick={() => setOpen(true)}
        style={{ width: '100%', padding: '11px', background: '#dc2626', color: '#fff', border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'sans-serif' }}
      >
        📄 Cotizar esta promoción
      </button>
    </>
  )
}
