'use client'

import { useRef, useState } from 'react'
import { ArrowUp, ArrowDown, X, Upload, Loader2, FileText } from 'lucide-react'

export interface PaginaFicha { url: string; orden: number }

// Carga y reordena las páginas de la ficha técnica de un vehículo (una imagen
// por hoja del fabricante). El PDF que ve el cliente se compone al pedirlo a
// partir de esta lista — aquí solo se suben las imágenes y se guarda el orden;
// el "Guardar" del vehículo (fuera de este componente) persiste el cambio.
export default function FichaTecnicaEditor({ vehiculoId, paginas, onChange }: {
  vehiculoId: string
  paginas: PaginaFicha[]
  onChange: (paginas: PaginaFicha[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')

  const ordenadas = [...paginas].sort((a, b) => a.orden - b.orden)

  function reindexar(lista: PaginaFicha[]): PaginaFicha[] {
    return lista.map((p, i) => ({ url: p.url, orden: i + 1 }))
  }

  async function agregar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setSubiendo(true)
    try {
      const fd = new FormData()
      fd.append('vehiculoId', vehiculoId)
      fd.append('file', file)
      const r = await fetch('/api/catalogo/ficha-tecnica/subir', { method: 'POST', body: fd })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setError(j.error ?? 'No se pudo subir la imagen'); return }
      onChange(reindexar([...ordenadas, { url: j.url, orden: ordenadas.length + 1 }]))
    } catch {
      setError('Error de conexión al subir la imagen')
    } finally {
      setSubiendo(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function quitar(idx: number) {
    onChange(reindexar(ordenadas.filter((_, i) => i !== idx)))
  }

  function mover(idx: number, dir: -1 | 1) {
    const destino = idx + dir
    if (destino < 0 || destino >= ordenadas.length) return
    const copia = [...ordenadas]
    ;[copia[idx], copia[destino]] = [copia[destino], copia[idx]]
    onChange(reindexar(copia))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          Ficha técnica {ordenadas.length > 0 ? `(${ordenadas.length} página${ordenadas.length !== 1 ? 's' : ''})` : ''}
        </p>
        {ordenadas.length > 0 && (
          <a href={`/api/catalogo/${vehiculoId}/ficha`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-oriental-red hover:underline">
            Ver PDF
          </a>
        )}
      </div>

      {ordenadas.length === 0 ? (
        <p className="text-[11px] text-gray-400 mb-2">Sin ficha técnica cargada — el botón &quot;Ficha técnica&quot; no aparece en el link hasta que subas al menos una página.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          {ordenadas.map((p, i) => (
            <div key={p.url + i} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              <img src={p.url} alt={`Página ${i + 1}`} className="w-full h-24 object-cover" />
              <span className="absolute top-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">{i + 1}</span>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/50 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="text-white disabled:opacity-30" title="Subir">
                  <ArrowUp size={13} />
                </button>
                <button type="button" onClick={() => mover(i, 1)} disabled={i === ordenadas.length - 1} className="text-white disabled:opacity-30" title="Bajar">
                  <ArrowDown size={13} />
                </button>
                <button type="button" onClick={() => quitar(i)} className="text-white hover:text-red-400" title="Quitar">
                  <X size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={agregar} disabled={subiendo} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={subiendo}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:border-oriental-red hover:text-oriental-red transition-colors disabled:opacity-50"
      >
        {subiendo ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
        {subiendo ? 'Subiendo…' : ordenadas.length > 0 ? 'Agregar otra página' : 'Cargar ficha técnica'}
      </button>
      {error && <p className="text-[11px] text-oriental-red mt-1.5">{error}</p>}
      <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
        <FileText size={11} /> Una imagen por hoja del fabricante, en el orden en que deben salir en el PDF. Recuerda darle &quot;Guardar&quot; al vehículo para que el orden quede persistido.
      </p>
    </div>
  )
}
