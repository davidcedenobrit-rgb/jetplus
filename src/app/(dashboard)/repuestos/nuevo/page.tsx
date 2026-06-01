'use client'

import { useState, useEffect, useRef } from 'react'
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

export default function NuevaSolicitudPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState<Item[]>([{ descripcion: '', referencia: '', cantidad: 1 }])

  // Catálogo
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([])
  const [busqueda, setBusqueda] = useState<string[]>([])  // búsqueda por ítem
  const [resultados, setResultados] = useState<CatalogoItem[][]>([])
  const [showDropdown, setShowDropdown] = useState<boolean[]>([])
  const searchRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    supabase.from('catalogo_repuestos').select('*').eq('activo', true).order('marca').order('categoria').order('nombre')
      .then(({ data }) => setCatalogo(data ?? []))
  }, [])

  function buscarRepuesto(query: string, idx: number) {
    const q = query.toLowerCase().trim()
    const newBusqueda = [...busqueda]
    newBusqueda[idx] = query
    setBusqueda(newBusqueda)

    const newShow = [...showDropdown]
    if (q.length < 2) {
      const newRes = [...resultados]
      newRes[idx] = []
      setResultados(newRes)
      newShow[idx] = false
      setShowDropdown(newShow)
      return
    }

    const filtered = catalogo.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      c.categoria.toLowerCase().includes(q) ||
      c.modelo.toLowerCase().includes(q) ||
      (c.codigo ?? '').toLowerCase().includes(q)
    ).slice(0, 12)

    const newRes = [...resultados]
    newRes[idx] = filtered
    setResultados(newRes)
    newShow[idx] = filtered.length > 0
    setShowDropdown(newShow)
  }

  function seleccionarDelCatalogo(item: CatalogoItem, idx: number) {
    const newItems = [...items]
    newItems[idx] = {
      descripcion: item.nombre,
      referencia: item.codigo ?? '',
      cantidad: newItems[idx].cantidad,
      catalogoId: item.id,
    }
    setItems(newItems)
    const newBusqueda = [...busqueda]
    newBusqueda[idx] = ''
    setBusqueda(newBusqueda)
    const newShow = [...showDropdown]
    newShow[idx] = false
    setShowDropdown(newShow)
  }

  function addItem() {
    setItems(prev => [...prev, { descripcion: '', referencia: '', cantidad: 1 }])
    setBusqueda(prev => [...prev, ''])
    setResultados(prev => [...prev, []])
    setShowDropdown(prev => [...prev, false])
  }

  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
    setBusqueda(prev => prev.filter((_, idx) => idx !== i))
    setResultados(prev => prev.filter((_, idx) => idx !== i))
    setShowDropdown(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateItem(i: number, field: keyof Item, val: string | number) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  }

  function clearItem(i: number) {
    setItems(prev => prev.map((it, idx) => idx === i ? { descripcion: '', referencia: '', cantidad: it.cantidad } : it))
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

  const frecuenciaColor: Record<string, string> = {
    'ALTA ROTACION':  'bg-red-100 text-red-700',
    'MEDIA ROTACION': 'bg-yellow-100 text-yellow-700',
    'BAJA ROTACION':  'bg-blue-100 text-blue-700',
    'CARROCERIA':     'bg-purple-100 text-purple-700',
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/repuestos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Nueva solicitud de repuestos</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Busca del catálogo MG & Maxus — {catalogo.length} repuestos disponibles</p>
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
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 size={13} className="text-red-400" />
                    </button>
                  )}
                </div>

                {/* Buscador del catálogo */}
                {!item.descripcion ? (
                  <div className="relative mb-3">
                    <label className="label">Buscar en catálogo *</label>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray" />
                      <input
                        type="text"
                        className="input pl-9"
                        placeholder="Buscar por nombre, categoría, modelo o código…"
                        value={busqueda[i] ?? ''}
                        onChange={e => buscarRepuesto(e.target.value, i)}
                        ref={el => { searchRefs.current[i] = el }}
                        autoComplete="off"
                      />
                    </div>

                    {/* Dropdown resultados */}
                    {showDropdown[i] && (resultados[i] ?? []).length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto">
                        {(resultados[i] ?? []).map(r => (
                          <button key={r.id} type="button"
                            onClick={() => seleccionarDelCatalogo(r, i)}
                            className="w-full text-left px-4 py-3 hover:bg-oriental-bg transition-colors border-b border-gray-50 last:border-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-oriental-black truncate">{r.nombre}</p>
                                <p className="text-xs text-oriental-gray mt-0.5">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mr-1.5 ${r.marca === 'MG' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{r.marca}</span>
                                  {r.modelo} · {r.categoria}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
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
                    )}

                    {/* Opción: escribir manualmente */}
                    <p className="text-xs text-oriental-gray mt-2">
                      ¿No está en el catálogo?{' '}
                      <button type="button" className="text-oriental-red font-semibold hover:underline"
                        onClick={() => { updateItem(i, 'descripcion', ' '); setTimeout(() => updateItem(i, 'descripcion', ''), 0) }}>
                        Escribir manualmente
                      </button>
                    </p>
                  </div>
                ) : (
                  /* Repuesto seleccionado */
                  <div className="mb-3">
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-oriental-black truncate">{item.descripcion}</p>
                        {item.referencia && (
                          <p className="text-xs font-mono text-oriental-gray mt-0.5">Cód: {item.referencia}</p>
                        )}
                      </div>
                      <button type="button" onClick={() => clearItem(i)}
                        className="ml-2 text-xs text-oriental-gray hover:text-oriental-red font-semibold flex items-center gap-1">
                        <X size={12} /> Cambiar
                      </button>
                    </div>
                  </div>
                )}

                {/* Campos manuales si no hay catalogo */}
                {item.descripcion && !item.catalogoId && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="col-span-2">
                      <label className="label">Descripción *</label>
                      <input type="text" className="input" placeholder="Nombre del repuesto" value={item.descripcion}
                        onChange={e => updateItem(i, 'descripcion', e.target.value)} required />
                    </div>
                    <div>
                      <label className="label">Referencia / Código</label>
                      <input type="text" className="input font-mono text-sm" placeholder="Código" value={item.referencia}
                        onChange={e => updateItem(i, 'referencia', e.target.value)} />
                    </div>
                  </div>
                )}

                {/* Cantidad */}
                <div className="flex items-center gap-3">
                  <label className="label mb-0 flex-shrink-0">Cantidad:</label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => updateItem(i, 'cantidad', Math.max(1, item.cantidad - 1))}
                      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-oriental-black">−</button>
                    <span className="w-10 text-center font-bold text-oriental-black text-sm">{item.cantidad}</span>
                    <button type="button" onClick={() => updateItem(i, 'cantidad', item.cantidad + 1)}
                      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-oriental-black">+</button>
                  </div>
                </div>
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
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
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
  )
}
