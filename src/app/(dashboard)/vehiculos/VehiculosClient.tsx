'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Car, X } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const estadoColors: Record<string, string> = {
  activo: 'bg-green-100 text-green-800',
  entregado: 'bg-blue-100 text-blue-800',
  en_transito: 'bg-yellow-100 text-yellow-800',
  reservado: 'bg-purple-100 text-purple-800',
}

type FiltroVenta = 'todos' | 'ac500' | 'contado' | 'f_lao_vehi' | 'f_vehimotor'

const FILTROS: { value: FiltroVenta; label: string; color: string }[] = [
  { value: 'todos',        label: 'Todos',          color: '' },
  { value: 'ac500',        label: 'AC500',           color: 'bg-emerald-50 border-emerald-400 text-emerald-800' },
  { value: 'contado',      label: 'Contado',         color: 'bg-blue-50 border-blue-400 text-blue-800' },
  { value: 'f_lao_vehi',   label: 'F. LAO + Vehi',  color: 'bg-purple-50 border-purple-400 text-purple-800' },
  { value: 'f_vehimotor',  label: 'F. Vehimotor',   color: 'bg-indigo-50 border-indigo-400 text-indigo-800' },
]

function PillBtn({ active, onClick, children, colorClass }: {
  active: boolean; onClick: () => void; children: React.ReactNode; colorClass?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all whitespace-nowrap ${
        active
          ? colorClass
            ? colorClass + ' border-2'
            : 'bg-oriental-black text-white border-oriental-black'
          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  )
}

// Determine sale category for a vehicle
function categorizarVehiculo(v: any, planes: string[]): FiltroVenta {
  const tieneInicial = planes.includes('inicial_la_oriental')
  const tieneVehimotors = planes.includes('financiamiento_vehimotors')

  if (v.tipo_compra === 'contado') return 'contado'
  // La Oriental inicial siempre viene acompañada de Vehimotors → F. LAO + Vehi
  if (tieneInicial && tieneVehimotors) return 'f_lao_vehi'
  if (tieneVehimotors) return 'f_vehimotor'
  return 'contado'
}

const badgeVenta: Record<FiltroVenta, { label: string; cls: string }> = {
  todos:        { label: '',              cls: '' },
  ac500:        { label: 'AC500',         cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  contado:      { label: 'Contado',       cls: 'text-blue-700 bg-blue-50 border-blue-200' },
  f_lao_vehi:   { label: 'F. LAO + Vehi', cls: 'text-purple-700 bg-purple-50 border-purple-200' },
  f_vehimotor:  { label: 'F. Vehimot',   cls: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
}

export default function VehiculosClient({
  vehiculos,
  planesMap = {},
}: {
  vehiculos: any[]
  planesMap?: Record<string, string[]>
}) {
  const [marca, setMarca] = useState<string | null>(null)
  const [modelo, setModelo] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroVenta, setFiltroVenta] = useState<FiltroVenta>('todos')

  const marcas = useMemo(() => {
    const set = new Set(vehiculos.map(v => v.marca).filter(Boolean))
    return Array.from(set).sort()
  }, [vehiculos])

  const modelos = useMemo(() => {
    const fuente = marca ? vehiculos.filter(v => v.marca === marca) : vehiculos
    const set = new Set(fuente.map(v => v.modelo).filter(Boolean))
    return Array.from(set).sort()
  }, [vehiculos, marca])

  // Pre-categorize all vehicles
  const vehiculosConCategoria = useMemo(() =>
    vehiculos.map(v => ({
      ...v,
      _categoria: categorizarVehiculo(v, planesMap[v.id] ?? []),
    })),
  [vehiculos, planesMap])

  const visible = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return vehiculosConCategoria.filter(v => {
      if (marca && v.marca !== marca) return false
      if (modelo && v.modelo !== modelo) return false
      if (filtroVenta !== 'todos' && v._categoria !== filtroVenta) return false
      if (q) {
        const haystack = [v.placa, v.modelo, v.marca, v.version, v.color, v.clientes?.nombre, v.clientes?.cedula_rif]
          .filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [vehiculosConCategoria, marca, modelo, busqueda, filtroVenta])

  function seleccionarMarca(m: string) {
    if (marca === m) { setMarca(null); setModelo(null) }
    else { setMarca(m); setModelo(null) }
  }

  function limpiarTodo() {
    setMarca(null); setModelo(null); setBusqueda(''); setFiltroVenta('todos')
  }

  const hayFiltros = marca || modelo || busqueda.trim() || filtroVenta !== 'todos'

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
            placeholder="Buscar placa, modelo, cliente..."
            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oriental-red bg-white"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Tipo de venta */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-14">Tipo</span>
          {FILTROS.map(f => (
            <PillBtn
              key={f.value}
              active={filtroVenta === f.value}
              onClick={() => setFiltroVenta(f.value)}
              colorClass={f.color}
            >
              {f.label}
            </PillBtn>
          ))}
        </div>

        {/* Marca */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-14">Marca</span>
          <PillBtn active={marca === null} onClick={() => { setMarca(null); setModelo(null) }}>Todas</PillBtn>
          {marcas.map(m => (
            <PillBtn key={m} active={marca === m} onClick={() => seleccionarMarca(m)}>{m}</PillBtn>
          ))}
        </div>

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

      {/* Contador */}
      {hayFiltros && (
        <p className="text-xs text-oriental-gray mb-3">
          Mostrando <strong className="text-oriental-black">{visible.length}</strong> de {vehiculos.length} vehículos
          <button onClick={limpiarTodo} className="ml-2 text-oriental-red hover:underline">
            Limpiar todo
          </button>
        </p>
      )}

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-oriental-bg border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Placa</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Vehículo</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Tipo venta</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visible.map(v => {
                const badge = badgeVenta[v._categoria as FiltroVenta]
                return (
                  <tr key={v.id} className="hover:bg-oriental-bg/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-bold bg-gray-100 text-oriental-black px-2 py-1 rounded">
                        {v.placa ?? 'Sin placa'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-oriental-black">{v.marca} {v.modelo}</p>
                      <p className="text-xs text-oriental-gray">{[v.version, v.anio, v.color].filter(Boolean).join(' · ')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-oriental-black">{v.clientes?.nombre}</p>
                      <p className="text-xs text-oriental-gray">{v.clientes?.cedula_rif}</p>
                    </td>
                    <td className="px-4 py-3">
                      {badge.label ? (
                        <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border ${badge.cls}`}>
                          {badge.label}
                        </span>
                      ) : (
                        <span className="text-oriental-gray text-sm capitalize">{v.tipo_compra}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${estadoColors[v.estado] ?? 'bg-gray-100 text-gray-700'}`}>
                        {v.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/vehiculos/${v.id}`} className="text-oriental-red hover:text-oriental-red-dark font-medium text-xs">
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <Car size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-oriental-gray text-sm">No hay vehículos con estos filtros</p>
                    <button onClick={limpiarTodo} className="text-oriental-red text-sm font-medium hover:underline mt-1">
                      Limpiar filtros
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
