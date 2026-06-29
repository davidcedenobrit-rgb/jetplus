'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import RepuestosCardDeleteBtn from './RepuestosCardDeleteBtn'

const ESTADOS: Record<string, { label: string; color: string; bg: string; step: number }> = {
  solicitado:           { label: 'Solicitado',         color: 'text-blue-700',   bg: 'bg-blue-100',   step: 1 },
  verificado:           { label: 'Verificado',         color: 'text-purple-700', bg: 'bg-purple-100', step: 2 },
  cotizacion_enviada:   { label: 'Cotización enviada', color: 'text-yellow-700', bg: 'bg-yellow-100', step: 3 },
  cotizacion_recibida:  { label: 'Cotización recibida',color: 'text-orange-700', bg: 'bg-orange-100', step: 4 },
  pago_enviado:         { label: 'Pago enviado',       color: 'text-indigo-700', bg: 'bg-indigo-100', step: 5 },
  guia_recibida:        { label: 'Guía recibida',      color: 'text-teal-700',   bg: 'bg-teal-100',   step: 6 },
  completado:           { label: 'Completado',         color: 'text-green-700',  bg: 'bg-green-100',  step: 7 },
  cancelado:            { label: 'Cancelado',          color: 'text-gray-500',   bg: 'bg-gray-100',   step: 0 },
  sin_stock:            { label: 'Sin stock',          color: 'text-red-700',    bg: 'bg-red-100',    step: 0 },
}

function ProgressBar({ estado }: { estado: string }) {
  const step = ESTADOS[estado]?.step ?? 0
  const pct = Math.round(((step - 1) / 6) * 100)
  return (
    <div className="mt-3">
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${estado === 'completado' ? 'bg-green-500' : (estado === 'cancelado' || estado === 'sin_stock') ? 'bg-gray-300' : 'bg-oriental-red'}`}
          style={{ width: `${Math.max(pct, 3)}%`, transition: 'width 0.3s' }} />
      </div>
      <p className="text-[10px] text-oriental-gray mt-0.5">{pct}% completado</p>
    </div>
  )
}

type Solicitud = {
  id: string
  numero: string
  estado: string
  created_at: string
  respuesta_vehimotors: string | null
  repuestos_items?: { id: string }[]
}

interface Props {
  solicitudes: Solicitud[]
  puedeEliminar: boolean
}

const FILTROS_ESTATUS: { value: string; label: string }[] = [
  { value: '',                    label: 'Todos'              },
  { value: 'solicitado',          label: 'Solicitado'         },
  { value: 'verificado',          label: 'Verificado'         },
  { value: 'cotizacion_enviada',  label: 'Cotización enviada' },
  { value: 'cotizacion_recibida', label: 'Cotización recibida'},
  { value: 'pago_enviado',        label: 'Pago enviado'       },
  { value: 'guia_recibida',       label: 'Guía recibida'      },
  { value: 'sin_stock',           label: 'Sin stock'          },
]

export default function RepuestosActivasGrid({ solicitudes, puedeEliminar }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [estatus, setEstatus] = useState('')

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return solicitudes.filter(s => {
      if (estatus && s.estado !== estatus) return false
      if (q && !s.numero.toLowerCase().includes(q)) return false
      return true
    })
  }, [solicitudes, busqueda, estatus])

  const hayFiltro = busqueda.trim() !== '' || estatus !== ''

  function limpiar() {
    setBusqueda('')
    setEstatus('')
  }

  return (
    <div>
      {/* Buscador + filtros */}
      <div className="card p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray" />
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por número (ej: SORE-2026-00015)"
              className="input pl-9"
            />
          </div>
          {hayFiltro && (
            <button
              onClick={limpiar}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-oriental-gray hover:bg-gray-50 text-xs font-semibold whitespace-nowrap"
            >
              <X size={13} /> Limpiar
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTROS_ESTATUS.map(f => (
            <button
              key={f.value || 'todos'}
              onClick={() => setEstatus(f.value)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
                estatus === f.value
                  ? 'bg-oriental-black text-white border-oriental-black'
                  : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {hayFiltro && (
          <p className="text-[11px] text-oriental-gray mt-3">
            Mostrando <span className="font-bold text-oriental-black">{filtradas.length}</span> de {solicitudes.length} solicitudes
          </p>
        )}
      </div>

      {/* Grid */}
      {filtradas.length === 0 ? (
        <div className="card p-12 text-center">
          <Search size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-oriental-gray text-sm">Sin resultados con los filtros aplicados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtradas.map(s => {
            const est = ESTADOS[s.estado]
            const itemCount = (s.repuestos_items ?? []).length
            return (
              <div key={s.id} className="relative card hover:shadow-md transition-shadow">
                {puedeEliminar && <RepuestosCardDeleteBtn solicitudId={s.id} numero={s.numero} />}
                <Link href={`/repuestos/${s.id}`} className="block p-5">
                  <div className="flex items-start justify-between mb-2 pr-6">
                    <span className="font-mono text-xs font-bold text-oriental-gray bg-gray-100 px-2 py-0.5 rounded">{s.numero}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${est?.bg} ${est?.color}`}>{est?.label}</span>
                  </div>
                  <p className="text-sm font-semibold text-oriental-black mt-2">{itemCount} repuesto{itemCount !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-oriental-gray mt-0.5">
                    {new Date(s.created_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  {s.respuesta_vehimotors && (
                    <div className={`mt-2 text-[11px] font-semibold px-2 py-1 rounded-lg w-fit
                      ${s.respuesta_vehimotors === 'hay_todo' ? 'bg-green-50 text-green-700' :
                        s.respuesta_vehimotors === 'no_hay' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
                      {s.respuesta_vehimotors === 'hay_todo' ? '✅ Hay todo' : s.respuesta_vehimotors === 'no_hay' ? '❌ Sin stock' : '⚠️ Parcial'}
                    </div>
                  )}
                  <ProgressBar estado={s.estado} />
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
