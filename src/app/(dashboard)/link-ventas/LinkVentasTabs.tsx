'use client'

import { useState } from 'react'
import VehiculosEditor from './VehiculosEditor'
import AC500Editor from './AC500Editor'

// Tipos laxos: cada editor define su forma interna
/* eslint-disable @typescript-eslint/no-explicit-any */
export default function LinkVentasTabs({ catalogo, ac500 }: { catalogo: any[]; ac500: any[] }) {
  const [tab, setTab] = useState<'catalogo' | 'ac500'>('catalogo')

  return (
    <div>
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setTab('catalogo')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            tab === 'catalogo' ? 'border-oriental-red text-oriental-red' : 'border-transparent text-gray-500 hover:text-oriental-black'
          }`}
        >
          Catálogo de vehículos
        </button>
        <button
          onClick={() => setTab('ac500')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            tab === 'ac500' ? 'border-oriental-red text-oriental-red' : 'border-transparent text-gray-500 hover:text-oriental-black'
          }`}
        >
          Asegúrate con $500
        </button>
      </div>

      {tab === 'catalogo' ? <VehiculosEditor initialVehiculos={catalogo} /> : <AC500Editor initial={ac500} />}
    </div>
  )
}
