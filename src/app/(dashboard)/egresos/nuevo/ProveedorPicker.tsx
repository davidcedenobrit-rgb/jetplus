'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X, Plus, Building2, Loader2 } from 'lucide-react'
import { buscarProveedores, crearProveedor, type Proveedor } from '../actions'

interface Props {
  proveedor: Proveedor | null
  onChange: (p: Proveedor | null) => void
}

export default function ProveedorPicker({ proveedor, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [resultados, setResultados] = useState<Proveedor[]>([])
  const [buscando, setBuscando] = useState(false)
  const [creando, setCreando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Formulario de creación en línea
  const [nombre, setNombre] = useState('')
  const [rif, setRif] = useState('')
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [numeroCuenta, setNumeroCuenta] = useState('')
  const [banco, setBanco] = useState('')

  const boxRef = useRef<HTMLDivElement>(null)

  // Buscar con debounce cuando el dropdown está abierto y no se está creando
  useEffect(() => {
    if (!abierto || creando) return
    let activo = true
    setBuscando(true)
    const t = setTimeout(async () => {
      const { proveedores } = await buscarProveedores(query)
      if (activo) { setResultados(proveedores); setBuscando(false) }
    }, 250)
    return () => { activo = false; clearTimeout(t) }
  }, [query, abierto, creando])

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setAbierto(false); setCreando(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function seleccionar(p: Proveedor) {
    onChange(p)
    setAbierto(false)
    setCreando(false)
    setQuery('')
  }

  function abrirCrear() {
    setCreando(true)
    setNombre(query.trim())
    setError('')
  }

  async function guardarNuevo() {
    setError('')
    if (!nombre.trim()) { setError('El nombre es requerido'); return }
    setGuardando(true)
    const { proveedor: nuevo, error: err } = await crearProveedor({
      nombre, rif, correo, telefono, numero_cuenta: numeroCuenta, banco,
    })
    setGuardando(false)
    if (err || !nuevo) { setError(err ?? 'Error al crear'); return }
    // limpiar el mini-form
    setRif(''); setCorreo(''); setTelefono(''); setNumeroCuenta(''); setBanco('')
    seleccionar(nuevo)
  }

  // ── Proveedor ya seleccionado ──
  if (proveedor) {
    return (
      <div className="flex items-start justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
        <div className="flex items-start gap-2 min-w-0">
          <Building2 size={15} className="text-oriental-gray mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-oriental-black truncate">{proveedor.nombre}</p>
            <p className="text-[11px] text-oriental-gray truncate">
              {[proveedor.rif, proveedor.telefono, proveedor.numero_cuenta ? `Cta. ${proveedor.numero_cuenta}` : null]
                .filter(Boolean).join('  ·  ') || 'Sin datos adicionales'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="flex-shrink-0 text-oriental-gray hover:text-oriental-red transition-colors"
          title="Quitar proveedor"
        >
          <X size={16} />
        </button>
      </div>
    )
  }

  // ── Buscador / creación ──
  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray" />
        <input
          type="text"
          className="input pl-9"
          placeholder="Buscar proveedor por nombre o RIF..."
          value={query}
          onChange={e => { setQuery(e.target.value); setAbierto(true); setCreando(false) }}
          onFocus={() => setAbierto(true)}
        />
      </div>

      {abierto && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
          {!creando ? (
            <>
              <div className="max-h-56 overflow-y-auto">
                {buscando ? (
                  <div className="flex items-center gap-2 px-3 py-3 text-xs text-oriental-gray">
                    <Loader2 size={14} className="animate-spin" /> Buscando...
                  </div>
                ) : resultados.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-oriental-gray">Sin proveedores{query.trim() ? ` para "${query.trim()}"` : ''}</div>
                ) : (
                  resultados.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => seleccionar(p)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                    >
                      <p className="text-sm font-semibold text-oriental-black truncate">{p.nombre}</p>
                      <p className="text-[11px] text-oriental-gray truncate">
                        {[p.rif, p.telefono].filter(Boolean).join('  ·  ') || '—'}
                      </p>
                    </button>
                  ))
                )}
              </div>
              <button
                type="button"
                onClick={abrirCrear}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-oriental-red bg-red-50 hover:bg-red-100 border-t border-gray-100"
              >
                <Plus size={14} /> Crear proveedor nuevo{query.trim() ? ` "${query.trim()}"` : ''}
              </button>
            </>
          ) : (
            <div className="p-3 space-y-2">
              <p className="text-xs font-bold text-oriental-black uppercase tracking-wider">Nuevo proveedor</p>
              <input type="text" className="input" placeholder="Nombre / razón social *" value={nombre} onChange={e => setNombre(e.target.value)} autoFocus />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" className="input font-mono" placeholder="RIF (J-...)" value={rif} onChange={e => setRif(e.target.value)} />
                <input type="text" className="input" placeholder="Teléfono" value={telefono} onChange={e => setTelefono(e.target.value)} />
              </div>
              <input type="email" className="input" placeholder="Correo" value={correo} onChange={e => setCorreo(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" className="input font-mono" placeholder="N° de cuenta" value={numeroCuenta} onChange={e => setNumeroCuenta(e.target.value)} />
                <input type="text" className="input" placeholder="Banco" value={banco} onChange={e => setBanco(e.target.value)} />
              </div>
              {error && <p className="text-[11px] text-oriental-red">{error}</p>}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={guardarNuevo}
                  disabled={guardando}
                  className="btn-primary flex items-center gap-1.5 py-2 px-3 text-xs"
                >
                  {guardando ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  Guardar y usar
                </button>
                <button
                  type="button"
                  onClick={() => setCreando(false)}
                  className="text-xs text-oriental-gray hover:text-oriental-black font-semibold px-2"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
