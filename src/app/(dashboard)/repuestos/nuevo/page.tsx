'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Trash2, Save, Search, X, ChevronDown } from 'lucide-react'
import Link from 'next/link'

interface CatalogoItem {
  id: string
  marca: string
  modelo: string
  categoria: string
  frecuencia: string
  codigo: string | null
  nombre: string
}

interface Item {
  descripcion: string
  referencia: string
  cantidad: number
  catalogoId?: string
}

const frecuenciaColor: Record<string, string> = {
  'ALTA ROTACION':  'bg-red-100 text-red-700',
  'MEDIA ROTACION': 'bg-yellow-100 text-yellow-700',
  'BAJA ROTACION':  'bg-blue-100 text-blue-700',
  'CARROCERIA':     'bg-purple-100 text-purple-700',
}

// Modal de selección del catálogo
function CatalogoModal({
  catalogo,
  onSelect,
  onClose,
}: {
  catalogo: CatalogoItem[]
  onSelect: (item: CatalogoItem) => void
  onClose: () => void
}) {
  const [marcaFiltro, setMarcaFiltro] = useState<'TODOS' | 'MG' | 'MAXUS'>('TODOS')
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('')
  const [busqueda, setBusqueda] = useState('')

  const marcas = ['TODOS', 'MG', 'MAXUS']
  const categorias = ['', ...Array.from(new Set(catalogo.map(c => c.categoria))).sort()]

  const filtrados = catalogo.filter(c => {
    if (marcaFiltro !== 'TODOS' && c.marca !== marcaFiltro) return false
    if (categoriaFiltro && c.categoria !== categoriaFiltro) return false
    if (busqueda.trim().length >= 2) {
      const q = busqueda.toLowerCase()
      return c.nombre.toLowerCase().includes(q) ||
             c.modelo.toLowerCase().includes(q) ||
             (c.codigo ?? '').toLowerCase().includes(q)
    }
    return true
  }).slice(0, 80)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col" style={{ maxHeight: '85vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-oriental-black">Seleccionar del catálogo</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X size={16} className="text-oriental-gray" />
          </button>
        </div>

        {/* Filtros */}
        <div className="px-5 py-3 border-b border-gray-100 space-y-3">

          {/* Marca */}
          <div className="flex gap-2">
            {marcas.map(m => (
              <button key={m} type="button"
                onClick={() => setMarcaFiltro(m as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  marcaFiltro === m
                    ? m === 'MG' ? 'bg-red-600 text-white border-red-600'
                      : m === 'MAXUS' ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-oriental-black text-white border-oriental-black'
                    : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
                }`}>
                {m}
              </button>
            ))}
          </div>

          {/* Categoría */}
          <div className="relative">
            <select
              className="input text-sm pr-8 appearance-none"
              value={categoriaFiltro}
              onChange={e => setCategoriaFiltro(e.target.value)}
            >
              <option value="">— Todas las categorías ({categorias.length - 1}) —</option>
              {categorias.slice(1).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-oriental-gray pointer-events-none" />
          </div>

          {/* Búsqueda */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray" />
            <input
              type="text"
              className="input pl-9 text-sm"
              placeholder="Buscar por nombre, modelo o código…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              autoFocus
            />
          </div>

          <p className="text-xs text-oriental-gray">
            {filtrados.length === 80 ? 'Mostrando los primeros 80 — usa los filtros para afinar' : `${filtrados.length} resultado${filtrados.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filtrados.length === 0 ? (
            <div className="p-8 text-center text-oriental-gray text-sm">Sin resultados para los filtros actuales</div>
          ) : filtrados.map(r => (
            <button key={r.id} type="button"
              onClick={() => { onSelect(r); onClose() }}
              className="w-full text-left px-5 py-3 hover:bg-oriental-bg transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-oriental-black">{r.nombre}</p>
                  <p className="text-xs text-oriental-gray mt-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mr-1 ${r.marca === 'MG' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {r.marca}
                    </span>
                    {r.modelo} · <span className="text-oriental-gray">{r.categoria}</span>
                  </p>
                </div>
                <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                  {r.codigo && r.codigo !== 'N/A' && (
                    <p className="text-[11px] font-mono font-bold text-oriental-black">{r.codigo}</p>
                  )}
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${frecuenciaColor[r.frecuencia] ?? 'bg-gray-100 text-gray-600'}`}>
                    {r.frecuencia}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function NuevaSolicitudPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState<Item[]>([{ descripcion: '', referencia: '', cantidad: 1 }])
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([])
  const [modalAbierto, setModalAbierto] = useState<number | null>(null) // índice del ítem que abrió el modal

  useEffect(() => {
    supabase.from('catalogo_repuestos').select('*').eq('activo', true)
      .order('marca').order('categoria').order('nombre')
      .then(({ data }) => setCatalogo(data ?? []))
  }, [])

  function seleccionarDelCatalogo(item: CatalogoItem, idx: number) {
    setItems(prev => prev.map((it, i) => i === idx ? {
      ...it,
      descripcion: item.nombre,
      referencia: item.codigo ?? '',
      catalogoId: item.id,
    } : it))
    setModalAbierto(null)
  }

  function clearItem(i: number) {
    setItems(prev => prev.map((it, idx) => idx === i
      ? { descripcion: '', referencia: '', cantidad: it.cantidad }
      : it
    ))
  }

  function addItem() {
    setItems(prev => [...prev, { descripcion: '', referencia: '', cantidad: 1 }])
  }

  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateItem(i: number, field: keyof Item, val: string | number) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validos = items.filter(it => it.descripcion.trim())
    if (validos.length === 0) { setError('Agrega al menos un repuesto'); return }

    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Sesión expirada'); setLoading(false); return }

    const numero = `REP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`
    const { data: solicitud, error: err } = await supabase
      .from('solicitudes_repuestos')
      .insert({ numero, estado: 'solicitado', solicitado_por_id: user.id, solicitado_por_email: user.email, notas_almacenista: notas || null })
      .select().single()

    if (err || !solicitud) { setError(err?.message ?? 'Error al crear'); setLoading(false); return }

    await supabase.from('repuestos_items').insert(
      validos.map(it => ({
        solicitud_id: solicitud.id,
        descripcion: it.descripcion.trim(),
        referencia: it.referencia.trim() || null,
        cantidad: it.cantidad,
      }))
    )
    await supabase.from('repuestos_historial').insert({
      solicitud_id: solicitud.id, estado_nuevo: 'solicitado',
      usuario_email: user.email,
      notas: `Solicitud creada con ${validos.length} repuesto${validos.length !== 1 ? 's' : ''}`,
    })

    router.push(`/repuestos/${solicitud.id}`)
    router.refresh()
  }

  return (
    <>
      {/* Modal catálogo */}
      {modalAbierto !== null && (
        <CatalogoModal
          catalogo={catalogo}
          onSelect={(item) => seleccionarDelCatalogo(item, modalAbierto)}
          onClose={() => setModalAbierto(null)}
        />
      )}

      <div className="p-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/repuestos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50">
            <ArrowLeft size={18} className="text-oriental-gray" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Nueva solicitud de repuestos</h1>
            <p className="text-oriental-gray text-sm mt-0.5">{catalogo.length} repuestos disponibles en catálogo</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card p-6">
            <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-oriental-red rounded-full" />
              Repuestos solicitados
            </h2>

            <div className="space-y-4">
              {items.map((item, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-oriental-gray uppercase tracking-wider">Repuesto {i + 1}</span>
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50">
                        <Trash2 size={13} className="text-red-400" />
                      </button>
                    )}
                  </div>

                  {!item.descripcion ? (
                    /* Sin selección: botón para abrir catálogo */
                    <div className="space-y-2">
                      <button type="button"
                        onClick={() => setModalAbierto(i)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-dashed border-oriental-red/30 hover:border-oriental-red hover:bg-red-50 transition-all text-sm font-semibold text-oriental-red">
                        <span className="flex items-center gap-2">
                          <Search size={15} /> Seleccionar del catálogo
                        </span>
                        <ChevronDown size={15} />
                      </button>
                      <p className="text-xs text-oriental-gray text-center">
                        o{' '}
                        <button type="button" className="text-oriental-red font-semibold hover:underline"
                          onClick={() => updateItem(i, 'descripcion', 'manual')}>
                          escribir manualmente
                        </button>
                      </p>
                    </div>
                  ) : item.catalogoId ? (
                    /* Seleccionado del catálogo */
                    <div className="mb-3">
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-oriental-black truncate">{item.descripcion}</p>
                          {item.referencia && item.referencia !== 'N/A' && (
                            <p className="text-xs font-mono text-oriental-gray mt-0.5">Cód: {item.referencia}</p>
                          )}
                        </div>
                        <button type="button" onClick={() => clearItem(i)}
                          className="ml-2 text-xs text-oriental-gray hover:text-oriental-red font-semibold flex items-center gap-1 flex-shrink-0">
                          <X size={11} /> Cambiar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Manual */
                    <div className="space-y-2 mb-3">
                      <div>
                        <label className="label">Descripción *</label>
                        <input type="text" className="input" placeholder="Nombre del repuesto" value={item.descripcion === 'manual' ? '' : item.descripcion}
                          onChange={e => updateItem(i, 'descripcion', e.target.value)} autoFocus />
                      </div>
                      <div>
                        <label className="label">Referencia / Código</label>
                        <input type="text" className="input font-mono text-sm" placeholder="Código opcional" value={item.referencia}
                          onChange={e => updateItem(i, 'referencia', e.target.value)} />
                      </div>
                      <button type="button" onClick={() => clearItem(i)}
                        className="text-xs text-oriental-gray hover:text-oriental-red font-semibold flex items-center gap-1">
                        <X size={11} /> Seleccionar del catálogo en cambio
                      </button>
                    </div>
                  )}

                  {/* Cantidad */}
                  {item.descripcion && (
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-oriental-gray font-semibold">Cantidad:</span>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => updateItem(i, 'cantidad', Math.max(1, item.cantidad - 1))}
                          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 font-bold text-oriental-black text-sm">−</button>
                        <span className="w-8 text-center font-bold text-oriental-black text-sm">{item.cantidad}</span>
                        <button type="button" onClick={() => updateItem(i, 'cantidad', item.cantidad + 1)}
                          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 font-bold text-oriental-black text-sm">+</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button type="button" onClick={addItem}
              className="mt-4 flex items-center gap-2 text-sm text-oriental-red font-semibold hover:underline">
              <Plus size={14} /> Agregar otro repuesto
            </button>
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-oriental-red rounded-full" />
              Notas adicionales
            </h2>
            <textarea className="textarea" rows={3} placeholder="Observaciones, urgencia, detalles del vehículo, etc."
              value={notas} onChange={e => setNotas(e.target.value)} />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-oriental-red text-sm">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary flex items-center gap-2 py-3 px-6" disabled={loading}>
              <Save size={16} />
              {loading ? 'Guardando...' : 'Crear solicitud'}
            </button>
            <Link href="/repuestos" className="btn-secondary py-3 px-6">Cancelar</Link>
          </div>
        </form>
      </div>
    </>
  )
}
