'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Vehiculo {
  id: string
  brand: 'MG' | 'MAXUS'
  model: string
  img_url: string | null
  cash: number | null
  gc: number | null
  gcr: number | null
  tasa_credito: number | null
  stock: number | null
  colores: string | null
}

const CMAP: Record<string, string> = {
  blanco:'#f8f8f8',blanca:'#f8f8f8',negro:'#1a1a1a',negra:'#1a1a1a',
  rojo:'#dc2626',roja:'#dc2626',gris:'#9ca3af',grises:'#9ca3af',
  plata:'#c0c0c0',plateado:'#c0c0c0',plateada:'#c0c0c0',
  azul:'#2563eb',azules:'#2563eb',verde:'#16a34a',verdes:'#16a34a',
  amarillo:'#eab308',naranja:'#ea580c',beige:'#d4c5a9',
  marron:'#78350f','marrón':'#78350f',dorado:'#b8860b',
  celeste:'#7dd3fc','borgoña':'#7f1d1d',vino:'#7f1d1d',perla:'#f1f0eb',
}
function cHex(n: string) { return CMAP[n.trim().toLowerCase()] ?? '#6b7280' }
function fm(n: number | null) { return n ? Number(n).toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—' }

const WA = 'https://wa.me/584120000000'

type Filtro = 'todos' | 'MG' | 'MAXUS'

export default function VehiculosFiltro({ vehiculos }: { vehiculos: Vehiculo[] }) {
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const lista = filtro === 'todos' ? vehiculos : vehiculos.filter(v => v.brand === filtro)

  return (
    <div>
      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        {(['todos', 'MG', 'MAXUS'] as Filtro[]).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              filtro === f ? 'bg-red-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
            }`}
          >
            {f === 'todos' ? 'Todos' : f}
          </button>
        ))}
      </div>

      {/* Grid de vehículos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {lista.map(v => {
          const colorsArr = (v.colores || '').split(',').map(c => c.trim()).filter(Boolean)
          return (
            <div key={v.id} className="bg-[#1a1a1a] border border-white/8 rounded-2xl overflow-hidden hover:border-white/15 transition-colors">
              {/* Imagen */}
              <div className="relative h-44 bg-[#111] flex items-center justify-center overflow-hidden">
                {v.img_url ? (
                  <img src={v.img_url} alt={v.model} className="w-full h-full object-contain p-4" />
                ) : (
                  <div className="text-white/20 text-5xl">🚗</div>
                )}
                <div className="absolute top-3 left-3 flex gap-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest ${v.brand === 'MG' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                    {v.brand}
                  </span>
                  {v.stock !== null && v.stock > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-600/20 text-green-400 border border-green-600/30">
                      {v.stock} en stock
                    </span>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-bold text-white text-base mb-3">{v.model}</h3>

                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Precio base</span>
                    <span className="font-bold text-white">${fm(v.cash)}</span>
                  </div>
                  {v.gc && v.gc > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/40">Gastos contado</span>
                      <span className="text-white/70">${fm(v.gc)}</span>
                    </div>
                  )}
                  {v.gcr && v.gcr > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/40">Gastos crédito</span>
                      <span className="text-white/70">${fm(v.gcr)}</span>
                    </div>
                  )}
                  {v.tasa_credito && v.tasa_credito > 0 && (
                    <div className="flex justify-between text-sm pt-1 border-t border-white/8">
                      <span className="text-white/40">Cuota 24 meses</span>
                      <span className="font-bold text-red-400">${fm(v.tasa_credito)}/mes</span>
                    </div>
                  )}
                </div>

                {/* Colores */}
                {colorsArr.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mb-4">
                    {colorsArr.map(c => (
                      <div
                        key={c}
                        title={c}
                        className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0"
                        style={{ background: cHex(c) }}
                      />
                    ))}
                  </div>
                )}

                <a
                  href={`${WA}?text=Hola, me interesa el ${v.model}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-2.5 rounded-xl bg-white/8 text-white/80 text-sm font-semibold hover:bg-white/15 hover:text-white transition-colors border border-white/10"
                >
                  Consultar por WhatsApp
                </a>
              </div>
            </div>
          )
        })}
      </div>

      {lista.length === 0 && (
        <p className="text-center text-white/40 py-12">No hay vehículos disponibles en este momento.</p>
      )}
    </div>
  )
}
