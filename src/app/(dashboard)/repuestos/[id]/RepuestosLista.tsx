'use client'

import { useState } from 'react'
import { Package } from 'lucide-react'
import ComprarEnPlazaButton from './ComprarEnPlazaButton'

interface Item {
  id: string
  descripcion: string
  referencia?: string | null
  cantidad: number
  disponible?: boolean | null
  cantidad_disponible?: number | null
  precio_cotizado?: number | null
  tiempo_importacion?: string | null
  cotizacion_importacion_url?: string | null
  comprar_plaza?: boolean | null
}

interface Props {
  solicitudId: string
  numero: string
  items: Item[]
  respuestaVM: string | null
  puedeComprarPlaza: boolean
}

// Disponibilidad efectiva por ítem según la respuesta de Vehimotors.
//  true = VM lo tiene · false = VM NO lo tiene (va a plaza) · null = aún sin respuesta
function itemHay(item: Item, respuestaVM: string | null): boolean | null {
  if (respuestaVM === 'hay_todo') return true
  if (respuestaVM === 'no_hay') return false
  if (item.disponible === true) return item.cantidad_disponible == null || item.cantidad_disponible > 0
  if (item.disponible === false) return false
  return null
}

export default function RepuestosLista({ solicitudId, numero, items, respuestaVM, puedeComprarPlaza }: Props) {
  const noHayIds = items.filter(it => itemHay(it, respuestaVM) === false).map(it => it.id)
  const [sel, setSel] = useState<Set<string>>(() => new Set(noHayIds))
  const toggle = (id: string) => setSel(prev => {
    const n = new Set(prev)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  const mostrarCheck = puedeComprarPlaza && noHayIds.length > 0
  const seleccionados = items.filter(it => sel.has(it.id))

  return (
    <div className="card p-6">
      <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
        <Package size={14} className="text-oriental-gray" /> Repuestos
      </h2>
      <div className="space-y-2">
        {items.map(item => {
          const hay = itemHay(item, respuestaVM)
          const esNoHay = hay === false
          return (
            <div key={item.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-3">
                {mostrarCheck && esNoHay && (
                  <input
                    type="checkbox"
                    checked={sel.has(item.id)}
                    onChange={() => toggle(item.id)}
                    className="w-4 h-4 accent-purple-600 cursor-pointer flex-shrink-0"
                    aria-label={`Seleccionar ${item.descripcion} para compra en plaza`}
                  />
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-oriental-black">{item.descripcion}</p>
                  {item.referencia && <p className="text-xs font-mono text-oriental-gray mt-0.5">{item.referencia}</p>}
                  {item.comprar_plaza && (
                    <span className="inline-block mt-1 text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">🛒 A comprar en plaza</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-oriental-black">×{item.cantidad}</span>
                  {item.cantidad_disponible != null && hay === true && (
                    <p className="text-xs text-green-700 font-semibold">Disp: {item.cantidad_disponible}</p>
                  )}
                  {item.precio_cotizado && (
                    <p className="text-xs text-green-700 font-semibold">${Number(item.precio_cotizado).toFixed(2)}</p>
                  )}
                </div>
                {hay !== null && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${hay ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {hay ? '✓ Hay' : '✗ No hay'}
                  </span>
                )}
              </div>
              {hay === false && (item.tiempo_importacion || item.cotizacion_importacion_url) && (
                <div className="mt-2 pt-2 border-t border-gray-200 flex flex-col gap-1">
                  {item.tiempo_importacion && (
                    <p className="text-xs text-orange-700 font-semibold">⏱ Importación: {item.tiempo_importacion}</p>
                  )}
                  {item.cotizacion_importacion_url && (
                    <a href={item.cotizacion_importacion_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-700 font-semibold hover:underline">
                      📦 Ver cotización de importación →
                    </a>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {mostrarCheck && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-oriental-gray mb-2">
            {seleccionados.length > 0
              ? `${seleccionados.length} repuesto${seleccionados.length !== 1 ? 's' : ''} seleccionado${seleccionados.length !== 1 ? 's' : ''} para compra en plaza.`
              : 'Marca los repuestos "No hay" que quieras comprar en plaza.'}
          </p>
          {seleccionados.length > 0 && (
            <ComprarEnPlazaButton
              solicitudId={solicitudId}
              numero={numero}
              items={seleccionados.map(it => ({ id: it.id, descripcion: it.descripcion, referencia: it.referencia, cantidad: it.cantidad }))}
              hideChecklist
              label={`Comprar en plaza (${seleccionados.length})`}
            />
          )}
        </div>
      )}
    </div>
  )
}
