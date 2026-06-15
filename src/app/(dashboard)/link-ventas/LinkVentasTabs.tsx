'use client'

import { useState } from 'react'
import VehiculosEditor from './VehiculosEditor'
import AC500Editor from './AC500Editor'
import VendedorasEditor from './VendedorasEditor'
import CotizacionesTab from './CotizacionesTab'
import CotizacionCDMTab from './CotizacionCDMTab'
import TasasEditor from './TasasEditor'

type Tab = 'catalogo' | 'ac500' | 'vendedoras' | 'cotizaciones' | 'generar' | 'tasas'

/* eslint-disable @typescript-eslint/no-explicit-any */
type ShowroomItem = { marca: string; modelo: string; unidades: number }

export default function LinkVentasTabs({ catalogo, ac500, showroomStock }: { catalogo: any[]; ac500: any[]; showroomStock: ShowroomItem[] }) {
  const [tab, setTab] = useState<Tab>('catalogo')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'catalogo', label: 'Catálogo de vehículos' },
    { key: 'ac500', label: 'Asegúrate con $500' },
    { key: 'vendedoras', label: 'Vendedoras' },
    { key: 'cotizaciones', label: 'Cotizaciones' },
    { key: 'generar', label: 'Generar cotización' },
    { key: 'tasas', label: 'Tasas' },
  ]

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab === t.key ? 'border-oriental-red text-oriental-red' : 'border-transparent text-gray-500 hover:text-oriental-black'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'catalogo' && <VehiculosEditor initialVehiculos={catalogo} showroomStock={showroomStock} />}
      {tab === 'ac500' && <AC500Editor initial={ac500} />}
      {tab === 'vendedoras' && <VendedorasEditor />}
      {tab === 'cotizaciones' && <CotizacionesTab />}
      {tab === 'generar' && <CotizacionCDMTab catalogo={catalogo} />}
      {tab === 'tasas' && <TasasEditor />}
    </div>
  )
}
