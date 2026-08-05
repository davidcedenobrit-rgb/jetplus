'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Check, ChevronDown, Search, Sparkles, X } from 'lucide-react'
import { CUENTAS_MOVIMIENTO, cuentasPorClase, nombreClase, nombreDeCuenta } from '@/lib/contabilidad/cuentas-selector'

const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

type Props = {
  afecta: boolean
  onAfectaChange: (v: boolean) => void
  value: string                    // código de cuenta seleccionado ('' si ninguno)
  onChange: (codigo: string) => void
  sugerencia?: string | null       // código sugerido por categoría/concepto
}

export default function CuentaContablePicker({ afecta, onAfectaChange, value, onChange, sugerencia }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)

  const seleccionNombre = nombreDeCuenta(value)
  const sugerenciaNombre = sugerencia ? nombreDeCuenta(sugerencia) : null
  const mostrarSugerencia = !!sugerencia && sugerencia !== value

  // Cerrar al hacer click fuera
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const grupos = useMemo(() => {
    const q = norm(query.trim())
    if (!q) return cuentasPorClase()
    const filtradas = CUENTAS_MOVIMIENTO.filter(c => norm(c.codigo + ' ' + c.nombre).includes(q))
    const byClase = new Map<string, typeof filtradas>()
    for (const c of filtradas) {
      if (!byClase.has(c.clase)) byClase.set(c.clase, [])
      byClase.get(c.clase)!.push(c)
    }
    return [...byClase.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([clase, cuentas]) => ({ clase, nombre: nombreClase(clase), cuentas }))
  }, [query])

  function seleccionar(codigo: string) {
    onChange(codigo)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="rounded-xl border-2 border-gray-200 overflow-hidden">
      <label className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${afecta ? 'bg-oriental-red/5' : 'bg-white'}`}>
        <input
          type="checkbox"
          checked={afecta}
          onChange={e => onAfectaChange(e.target.checked)}
          className="w-5 h-5 accent-oriental-red"
        />
        <span className="flex items-center gap-2 text-sm font-semibold text-oriental-black">
          <BookOpen size={16} className="text-oriental-red" />
          Afecta al plan de cuentas
        </span>
      </label>

      {afecta && (
        <div className="p-3 pt-0" ref={boxRef}>
          <p className="text-[11px] text-oriental-gray mb-2">
            Selecciona la cuenta contable que alimenta este movimiento.
          </p>

          {/* Sugerencia */}
          {mostrarSugerencia && (
            <button
              type="button"
              onClick={() => seleccionar(sugerencia!)}
              className="mb-2 w-full flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-left hover:bg-amber-100 transition-colors"
            >
              <Sparkles size={14} className="text-amber-600 flex-shrink-0" />
              <span className="text-xs text-amber-800">
                Sugerida: <span className="font-mono font-semibold">{sugerencia}</span> — {sugerenciaNombre}
                <span className="ml-1 font-semibold underline">Usar</span>
              </span>
            </button>
          )}

          {/* Selector */}
          <div className="relative">
            {value ? (
              <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
                <Check size={15} className="text-green-600 flex-shrink-0" />
                <span className="flex-1 text-sm text-oriental-black truncate">
                  <span className="font-mono font-semibold">{value}</span> — {seleccionNombre ?? 'Cuenta no encontrada'}
                </span>
                <button type="button" onClick={() => onChange('')} className="text-gray-400 hover:text-oriental-red" aria-label="Quitar cuenta">
                  <X size={15} />
                </button>
                <button type="button" onClick={() => setOpen(o => !o)} className="text-gray-400 hover:text-oriental-black" aria-label="Cambiar cuenta">
                  <ChevronDown size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-oriental-gray hover:border-gray-400"
              >
                <span>Seleccionar cuenta…</span>
                <ChevronDown size={16} />
              </button>
            )}

            {open && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-oriental-gray" />
                    <input
                      autoFocus
                      type="text"
                      className="input pl-8 py-1.5 text-sm"
                      placeholder="Buscar por código o nombre…"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="max-h-72 overflow-auto">
                  {grupos.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-oriental-gray text-center">Sin resultados</p>
                  ) : (
                    grupos.map(g => (
                      <div key={g.clase}>
                        <p className="sticky top-0 bg-gray-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-oriental-gray">
                          {g.clase} · {g.nombre}
                        </p>
                        {g.cuentas.map(c => (
                          <button
                            key={c.codigo}
                            type="button"
                            onClick={() => seleccionar(c.codigo)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-oriental-red/5 transition-colors flex items-center gap-2 ${c.codigo === value ? 'bg-green-50' : ''}`}
                          >
                            <span className="font-mono text-xs font-semibold text-oriental-red flex-shrink-0">{c.codigo}</span>
                            <span className="text-oriental-black truncate">{c.nombre}</span>
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
