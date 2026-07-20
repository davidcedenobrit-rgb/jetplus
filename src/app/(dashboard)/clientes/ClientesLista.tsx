'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { User, Search, Phone } from 'lucide-react'

export type ClienteLite = {
  id: string
  nombre: string
  cedula_rif: string
  telefono: string | null
  tipo: string
  vehiculos: number
}

// Normaliza para buscar sin importar mayúsculas ni acentos.
function norm(s: string) {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

const FILTROS = [
  { value: '', label: 'Todos' },
  { value: 'natural', label: 'Persona natural' },
  { value: 'juridico', label: 'Persona jurídica' },
]

export default function ClientesLista({
  clientes, initialQ = '', initialTipo = '',
}: {
  clientes: ClienteLite[]
  initialQ?: string
  initialTipo?: string
}) {
  const [q, setQ] = useState(initialQ)
  const [tipo, setTipo] = useState(initialTipo)

  const filtrados = useMemo(() => {
    const nq = norm(q.trim())
    return clientes.filter(c => {
      if (tipo && c.tipo !== tipo) return false
      if (!nq) return true
      return norm(c.nombre).includes(nq) || norm(c.cedula_rif).includes(nq)
    })
  }, [clientes, q, tipo])

  return (
    <>
      {/* Buscador */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar por nombre o cédula / RIF..."
            autoFocus
            className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-oriental-black placeholder-gray-400 focus:outline-none focus:border-oriental-red focus:ring-1 focus:ring-oriental-red/20 transition-colors"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-oriental-red transition-colors"
              title="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>
        {q.trim() && (
          <p className="text-xs text-oriental-gray mt-1.5 ml-1">
            {filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''} para <span className="font-semibold text-oriental-black">&quot;{q}&quot;</span>
          </p>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        {FILTROS.map(f => (
          <button
            key={f.value}
            type="button"
            onClick={() => setTipo(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              tipo === f.value
                ? 'bg-oriental-black text-white border-oriental-black'
                : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtrados.map(cliente => (
          <Link key={cliente.id} href={`/clientes/${cliente.id}`}>
            <div className="card p-5 hover:shadow-md hover:border-gray-200 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-oriental-red/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-oriental-red" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-oriental-black truncate">{cliente.nombre}</p>
                  <p className="text-sm text-oriental-gray">{cliente.cedula_rif}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    {cliente.telefono && (
                      <span className="flex items-center gap-1"><Phone size={10} /> {cliente.telefono}</span>
                    )}
                    <span>{cliente.vehiculos} vehículo(s)</span>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                  cliente.tipo === 'juridico' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {cliente.tipo === 'juridico' ? 'Jurídico' : 'Natural'}
                </span>
              </div>
            </div>
          </Link>
        ))}
        {filtrados.length === 0 && (
          <div className="col-span-full text-center py-16">
            <Search size={32} className="mx-auto text-gray-300 mb-3" />
            {q.trim() ? (
              <>
                <p className="text-oriental-gray text-sm">Sin resultados para <span className="font-semibold text-oriental-black">&quot;{q}&quot;</span></p>
                <button type="button" onClick={() => { setQ(''); setTipo('') }} className="text-oriental-red text-sm font-medium hover:underline mt-1 inline-block">
                  Ver todos los clientes
                </button>
              </>
            ) : (
              <>
                <p className="text-oriental-gray text-sm">No hay clientes en este filtro</p>
                <Link href="/clientes/nuevo" className="text-oriental-red text-sm font-medium hover:underline mt-1 inline-block">
                  Registrar el primero
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}
