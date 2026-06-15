'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Car, MapPin, CheckCircle2, Lock, Tag, Wrench, Pencil, Search, X } from 'lucide-react'
import ShowroomDeleteButton from './ShowroomDeleteButton'
import type { VehiculoShowroom } from '@/types/database'

const ESTADOS: Record<string, { label: string; color: string; bg: string; step: number }> = {
  llegada:        { label: 'Recibido',        color: 'text-blue-700',   bg: 'bg-blue-100',   step: 1 },
  por_enviar_pdi: { label: 'Por enviar a PDI', color: 'text-yellow-700', bg: 'bg-yellow-100', step: 2 },
  en_taller:      { label: 'En taller (PDI)',  color: 'text-orange-700', bg: 'bg-orange-100', step: 3 },
  en_agencia:     { label: 'Disponible',       color: 'text-green-700',  bg: 'bg-green-100',  step: 4 },
  reservado:      { label: 'Reservado',        color: 'text-purple-700', bg: 'bg-purple-100', step: 5 },
  vendido:        { label: 'Vendido',          color: 'text-gray-600',   bg: 'bg-gray-100',   step: 6 },
}

function ProgressBar({ estado }: { estado: string }) {
  const step = ESTADOS[estado]?.step ?? 1
  const pct = Math.round(((step - 1) / 5) * 100)
  return (
    <div className="mt-3">
      <div className="flex justify-between text-[10px] text-oriental-gray mb-1">
        <span>Recibido</span><span>Vendido</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${estado === 'vendido' ? 'bg-gray-400' : estado === 'reservado' ? 'bg-purple-500' : estado === 'en_agencia' ? 'bg-green-500' : 'bg-oriental-red'}`}
          style={{ width: `${pct === 0 ? 4 : pct}%` }}
        />
      </div>
      <p className="text-[10px] text-oriental-gray mt-0.5">{pct}% completado</p>
    </div>
  )
}

function PillBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all whitespace-nowrap ${
        active ? 'border-oriental-black bg-oriental-black text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
      }`}
    >
      {children}
    </button>
  )
}

export default function ShowroomClient({
  lista,
  puedeEditar,
}: {
  lista: VehiculoShowroom[]
  puedeEditar: boolean
}) {
  const [marca, setMarca] = useState<string | null>(null)
  const [modelo, setModelo] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const marcas = useMemo(() => {
    const set = new Set(lista.map(v => v.marca).filter(Boolean))
    return Array.from(set).sort()
  }, [lista])

  const modelos = useMemo(() => {
    const fuente = marca ? lista.filter(v => v.marca === marca) : lista
    const set = new Set(fuente.map(v => v.modelo).filter(Boolean))
    return Array.from(set).sort()
  }, [lista, marca])

  const visible = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return lista.filter(v => {
      if (marca && v.marca !== marca) return false
      if (modelo && v.modelo !== modelo) return false
      if (q) {
        const haystack = [v.placa, v.modelo, v.marca, v.color, v.vin, v.serial_motor, v.ubicacion]
          .filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [lista, marca, modelo, busqueda])

  function seleccionarMarca(m: string) {
    if (marca === m) { setMarca(null); setModelo(null) }
    else { setMarca(m); setModelo(null) }
  }

  const hayFiltros = marca || modelo || busqueda.trim()

  return (
    <div>
      {/* Filtros */}
      <div className="mb-5 space-y-3">
        {/* Buscador */}
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar placa, modelo, VIN, color..."
            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oriental-red bg-white"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Marca */}
        {marcas.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-14">Marca</span>
            {marcas.map(m => (
              <PillBtn key={m} active={marca === m} onClick={() => seleccionarMarca(m)}>{m}</PillBtn>
            ))}
            {marca && (
              <button onClick={() => { setMarca(null); setModelo(null) }} className="text-xs text-gray-400 hover:text-gray-600 underline ml-1">Limpiar</button>
            )}
          </div>
        )}

        {/* Modelos */}
        {modelos.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-14">Modelo</span>
            {modelos.map(m => (
              <PillBtn key={m} active={modelo === m} onClick={() => setModelo(modelo === m ? null : m)}>{m}</PillBtn>
            ))}
            {modelo && (
              <button onClick={() => setModelo(null)} className="text-xs text-gray-400 hover:text-gray-600 underline ml-1">Limpiar</button>
            )}
          </div>
        )}
      </div>

      {/* Contador filtrado */}
      {hayFiltros && (
        <p className="text-xs text-oriental-gray mb-4">
          Mostrando <strong className="text-oriental-black">{visible.length}</strong> de {lista.length} vehículos
          <button onClick={() => { setMarca(null); setModelo(null); setBusqueda('') }} className="ml-2 text-oriental-red hover:underline">Limpiar todo</button>
        </p>
      )}

      {/* Grid */}
      {visible.length === 0 ? (
        <div className="card p-16 text-center">
          <p className="text-oriental-gray font-medium">No hay vehículos con estos filtros</p>
          <button onClick={() => { setMarca(null); setModelo(null); setBusqueda('') }} className="text-sm text-oriental-red mt-2 underline">Limpiar filtros</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map(v => {
            const est = ESTADOS[v.estado] ?? ESTADOS.llegada
            const hoy = new Date()
            const vence = v.reserva_vence ? new Date(v.reserva_vence) : null
            const reservaVencida = vence && vence < hoy

            return (
              <div key={v.id} className="card hover:shadow-md transition-shadow overflow-hidden">
                <Link href={`/showroom/${v.id}`} className="block p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.marca === 'MG' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {v.marca}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${est.bg} ${est.color}`}>
                        {est.label}
                      </span>
                    </div>
                    {v.pdi_hecho && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                        <CheckCircle2 size={10} /> PDI ✓
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-oriental-black text-base leading-tight">{v.modelo}</h3>

                  <div className="mt-2 space-y-1.5">
                    {v.placa && (
                      <p className="text-xs text-oriental-gray flex items-center gap-1.5">
                        <Car size={11} className="flex-shrink-0" />
                        <span className="font-mono font-bold text-oriental-black">{v.placa}</span>
                        {v.color && <span>· {v.color}</span>}
                        {v.anio && <span>· {v.anio}</span>}
                      </p>
                    )}
                    {v.ubicacion && (
                      <div className="inline-flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
                        <MapPin size={11} className="text-oriental-red flex-shrink-0" />
                        <span className="text-xs font-semibold text-oriental-black capitalize">
                          {v.ubicacion === 'otro' ? (v.ubicacion_descripcion ?? 'Otro') : v.ubicacion}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Wrench size={11} className={v.pdi_hecho ? 'text-green-600' : 'text-gray-300'} />
                      <span className={`text-[11px] font-semibold ${v.pdi_hecho ? 'text-green-700' : 'text-gray-400'}`}>
                        {v.pdi_hecho ? 'PDI completado' : 'PDI pendiente'}
                      </span>
                    </div>
                    {v.vin && <p className="text-[10px] font-mono text-oriental-gray truncate">VIN: {v.vin}</p>}
                    {v.serial_motor && <p className="text-[10px] font-mono text-oriental-gray truncate">Motor: {v.serial_motor}</p>}
                  </div>

                  {v.estado === 'reservado' && v.reserva_monto && (
                    <div className={`mt-3 rounded-lg px-3 py-2 ${reservaVencida ? 'bg-red-50 border border-red-200' : 'bg-purple-50 border border-purple-100'}`}>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-purple-700">
                          <Lock size={10} /> Reservado
                        </span>
                        <span className="text-[11px] font-bold text-purple-800">
                          ${v.reserva_monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {vence && (
                        <p className={`text-[10px] mt-0.5 ${reservaVencida ? 'text-red-600 font-semibold' : 'text-purple-600'}`}>
                          {reservaVencida ? '⚠ Reserva vencida' : `Vence: ${vence.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                        </p>
                      )}
                    </div>
                  )}

                  {v.estado === 'vendido' && (
                    <div className="mt-3 rounded-lg px-3 py-2 bg-gray-50 border border-gray-200">
                      <p className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                        <Tag size={10} /> Vendido · ciclo cerrado
                      </p>
                    </div>
                  )}

                  <ProgressBar estado={v.estado} />
                </Link>

                {puedeEditar && (
                  <div className="px-5 pb-4 flex gap-2 border-t border-gray-100 pt-3">
                    <Link
                      href={`/showroom/${v.id}/editar`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-gray-200 text-oriental-gray hover:bg-gray-50 text-xs font-semibold transition-colors"
                    >
                      <Pencil size={13} /> Editar
                    </Link>
                    <ShowroomDeleteButton id={v.id} modelo={v.modelo} placa={v.placa} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
