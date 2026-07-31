'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, FilePlus2, ClipboardList, FileText, Vault, Send, Scale } from 'lucide-react'
import CotizacionCDMTab from '../link-ventas/CotizacionCDMTab'
import PrecompraProformas from './PrecompraProformas'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Vista = 'cotizar' | 'cotizaciones' | 'proforma' | 'venta' | 'division' | 'anexos'

export default function PrecompraHub({ catalogo = [], showroomStock = [], tasas = { bcv: 0, usdt: 0 } }: {
  catalogo?: any[]
  showroomStock?: { marca: string; modelo: string; unidades: number }[]
  tasas?: { bcv: number; usdt: number }
  esRojas?: boolean
}) {
  const router = useRouter()
  const [vista, setVista] = useState<Vista>('cotizar')

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-oriental-black flex items-center gap-2">
            <ShieldCheck size={22} className="text-blue-800" /> Precompra — Asegúrate con $500
          </h1>
          <p className="text-oriental-gray text-sm mt-1">Flujo: cotización → proforma → registro de venta → anexos a Caracas</p>
        </div>
        <button onClick={() => router.push('/vehiculos/nuevo?plan=ac500')}
          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-800 hover:bg-blue-900 text-white text-sm font-bold transition-colors">
          🛡 Registrar venta AC500
        </button>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {([
          ['cotizar', 'Generar cotización', FilePlus2],
          ['cotizaciones', 'Cotizaciones', ClipboardList],
          ['proforma', 'Proformas', FileText],
          ['venta', 'Registro de venta', Vault],
          ['division', 'División contable', Scale],
          ['anexos', 'Anexos (Caracas)', Send],
        ] as const).map(([k, label, Icon]) => (
          <button key={k} onClick={() => setVista(k)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              vista === k ? 'border-blue-800 text-blue-800' : 'border-transparent text-gray-500 hover:text-oriental-black'
            }`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {vista === 'cotizar' && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
            <p className="text-xs text-blue-700 leading-relaxed">
              Paso 1. Genera la cotización del plan <b>Asegúrate $500</b> (6 o 9 meses): elige el modelo y trae su plan de una vez.
              Captura color(es), cédula y RIF para que se arrastren a la proforma y al anexo. Luego pasa a <b>Cotizaciones</b> para convertirla en proforma.
            </p>
          </div>
          <CotizacionCDMTab catalogo={catalogo} showroomStock={showroomStock} tasas={tasas} modo="ac500" />
        </div>
      )}

      {vista === 'cotizaciones' && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
            <p className="text-xs text-blue-700 leading-relaxed">Paso 2. Aquí ves todas las cotizaciones Asegúrate $500. Cuando el cliente reserve, conviértela en <b>proforma</b>.</p>
          </div>
          <PrecompraProformas seccion="cotizaciones" />
        </div>
      )}

      {vista === 'proforma' && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
            <p className="text-xs text-blue-700 leading-relaxed">Paso 3. Completa los datos de la proforma, sube los documentos del cliente y toma la firma digital.</p>
          </div>
          <PrecompraProformas seccion="proforma" />
        </div>
      )}

      {vista === 'venta' && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
            <p className="text-xs text-blue-700 leading-relaxed">Paso 4. Registra el pago de la cuota 1 (reserva): los $500 caen en la bóveda y la comisión va a contabilidad. Abajo ves el depósito que va a Vehimotors.</p>
          </div>
          <PrecompraProformas seccion="venta" />
        </div>
      )}

      {vista === 'division' && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
            <p className="text-xs text-blue-700 leading-relaxed">División contable por venta: ingresos y descuentos de Vehimotors (depósito) y el destino contable (bóveda, comisión a contabilidad, comisión del vendedor e ingreso neto).</p>
          </div>
          <PrecompraProformas seccion="division" />
        </div>
      )}

      {vista === 'anexos' && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
            <p className="text-xs text-blue-700 leading-relaxed">Paso 5. Genera el Anexo A (Oriental / Vehimotors) y envíalo a Caracas por correo, junto con los documentos del cliente.</p>
          </div>
          <PrecompraProformas seccion="anexos" />
        </div>
      )}
    </div>
  )
}
