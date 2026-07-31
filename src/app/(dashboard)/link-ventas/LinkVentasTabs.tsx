'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import VehiculosEditor from './VehiculosEditor'
import AC500Editor from './AC500Editor'
import VendedorasEditor from './VendedorasEditor'
import PromocionesTab from './PromocionesTab'
import LeadsTab from './LeadsTab'

// Cotizaciones, Proformas, Generar cotización, Tasas e Historial de clientes se
// movieron al módulo Ventas (/gestion-ventas). Concesionarios está en Base de
// datos (/base-datos/concesionarios). Aquí queda el editor del link público
// y la bandeja de clientes captados.
type Tab = 'leads' | 'catalogo' | 'ac500' | 'vendedoras' | 'promociones'

const TABS_VALIDOS: Tab[] = ['leads', 'catalogo', 'ac500', 'vendedoras', 'promociones']

/* eslint-disable @typescript-eslint/no-explicit-any */
type ShowroomItem = { marca: string; modelo: string; unidades: number }

export default function LinkVentasTabs({ catalogo, ac500, showroomStock, tasas }: { catalogo: any[]; ac500: any[]; showroomStock: ShowroomItem[]; tasas: { bcv: number; usdt: number } }) {
  const searchParams = useSearchParams()
  const tabFromUrl = searchParams.get('tab') as Tab | null
  const initialTab: Tab = tabFromUrl && TABS_VALIDOS.includes(tabFromUrl) ? tabFromUrl : 'catalogo'
  const [tab, setTab] = useState<Tab>(initialTab)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'leads', label: 'Clientes captados' },
    { key: 'catalogo', label: 'Catálogo de vehículos' },
    { key: 'ac500', label: 'Asegúrate con $500' },
    { key: 'vendedoras', label: 'Vendedoras' },
    { key: 'promociones', label: 'Promociones Especiales' },
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

      {tab === 'leads' && <LeadsTab />}
      {tab === 'catalogo' && <VehiculosEditor initialVehiculos={catalogo} showroomStock={showroomStock} tasas={tasas} />}
      {tab === 'ac500' && <AC500Editor initial={ac500} />}
      {tab === 'vendedoras' && <VendedorasEditor />}
      {tab === 'promociones' && <PromocionesTab catalogo={catalogo} />}
    </div>
  )
}
