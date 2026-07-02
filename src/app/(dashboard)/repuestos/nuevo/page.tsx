'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Trash2, Save, Search, X, ChevronDown, BookmarkPlus, Check, Building2, User } from 'lucide-react'
import Link from 'next/link'

interface ClienteLite { id: string; nombre: string; cedula_rif: string }

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
  // campos catálogo (para manual)
  marca: 'MG' | 'MAXUS' | ''
  modelo: string
  categoria: string
  frecuencia: string
  catalogoId?: string
}

const ITEM_VACIO: Item = { descripcion: '', referencia: '', cantidad: 1, marca: '', modelo: '', categoria: '', frecuencia: '' }

const FRECUENCIAS = ['ALTA ROTACION', 'MEDIA ROTACION', 'BAJA ROTACION', 'CARROCERIA']

const frecuenciaColor: Record<string, string> = {
  'ALTA ROTACION':  'bg-red-100 text-red-700',
  'MEDIA ROTACION': 'bg-yellow-100 text-yellow-700',
  'BAJA ROTACION':  'bg-blue-100 text-blue-700',
  'CARROCERIA':     'bg-purple-100 text-purple-700',
}

// Select de categoría: lista existente + opción de escribir
function CategoriaInput({
  value,
  onChange,
  categorias,
}: {
  value: string
  onChange: (v: string) => void
  categorias: string[]
}) {
  const isCustom = value !== '' && !categorias.includes(value)
  const [mode, setMode] = useState<'select' | 'text'>(isCustom ? 'text' : 'select')

  if (mode === 'text') {
    return (
      <div className="flex gap-1">
        <input
          className="input flex-1"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Nueva categoría"
          autoFocus
        />
        <button type="button"
          onClick={() => { onChange(''); setMode('select') }}
          title="Volver a la lista"
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 text-oriental-gray font-bold">
          ↩
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <select
        className="input pr-8 appearance-none"
        value={value}
        onChange={e => {
          if (e.target.value === '__nueva__') { onChange(''); setMode('text') }
          else onChange(e.target.value)
        }}
      >
        <option value="">— Categoría —</option>
        {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        <option value="__nueva__">+ Escribir nueva…</option>
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-oriental-gray" />
    </div>
  )
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
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const categorias = [...new Set(catalogo.map(c => c.categoria))].sort()

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
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-oriental-black">Seleccionar del catálogo</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X size={16} className="text-oriental-gray" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100 space-y-3">
          <div className="flex gap-2">
            {(['TODOS', 'MG', 'MAXUS'] as const).map(m => (
              <button key={m} type="button"
                onClick={() => setMarcaFiltro(m)}
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

          <div className="relative">
            <select className="input text-sm pr-8 appearance-none" value={categoriaFiltro} onChange={e => setCategoriaFiltro(e.target.value)}>
              <option value="">— Todas las categorías ({categorias.length}) —</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-oriental-gray pointer-events-none" />
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray" />
            <input type="text" className="input pl-9 text-sm" placeholder="Buscar por nombre, modelo o código…"
              value={busqueda} onChange={e => setBusqueda(e.target.value)} autoFocus />
          </div>

          <p className="text-xs text-oriental-gray">
            {filtrados.length === 80 ? 'Mostrando los primeros 80 — usa los filtros para afinar' : `${filtrados.length} resultado${filtrados.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filtrados.length === 0 ? (
            <div className="p-8 text-center text-oriental-gray text-sm">Sin resultados</div>
          ) : filtrados.map(r => (
            <button key={r.id} type="button"
              onClick={() => { onSelect(r); onClose() }}
              className="w-full text-left px-5 py-3 hover:bg-oriental-bg transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-oriental-black">{r.nombre}</p>
                  <p className="text-xs text-oriental-gray mt-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mr-1 ${r.marca === 'MG' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{r.marca}</span>
                    {r.modelo} · {r.categoria}
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
  const [items, setItems] = useState<Item[]>([{ ...ITEM_VACIO }])
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([])
  const [modalAbierto, setModalAbierto] = useState<number | null>(null)

  // Destinatario: cliente o La Oriental
  const [destino, setDestino] = useState<'cliente' | 'oriental'>('cliente')
  const [clienteSel, setClienteSel] = useState<ClienteLite | null>(null)
  const [buscaCliente, setBuscaCliente] = useState('')
  const [resultadosClientes, setResultadosClientes] = useState<ClienteLite[]>([])
  const [buscandoClientes, setBuscandoClientes] = useState(false)

  const categoriasCatalogo = [...new Set(catalogo.map(c => c.categoria).filter(Boolean))].sort()

  useEffect(() => {
    supabase.from('catalogo_repuestos').select('*').eq('activo', true)
      .order('marca').order('categoria').order('nombre')
      .then(({ data }) => setCatalogo(data ?? []))
  }, [])

  // Buscar clientes con debounce
  useEffect(() => {
    if (destino !== 'cliente' || clienteSel || !buscaCliente.trim() || buscaCliente.trim().length < 2) {
      setResultadosClientes([])
      return
    }
    const q = buscaCliente.trim().toLowerCase()
    const timer = setTimeout(async () => {
      setBuscandoClientes(true)
      const { data } = await supabase
        .from('clientes')
        .select('id, nombre, cedula_rif')
        .or(`nombre.ilike.%${q}%,cedula_rif.ilike.%${q}%`)
        .eq('activo', true)
        .order('nombre')
        .limit(10)
      setResultadosClientes(data ?? [])
      setBuscandoClientes(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [buscaCliente, destino, clienteSel])

  function seleccionarDelCatalogo(cat: CatalogoItem, idx: number) {
    setItems(prev => prev.map((it, i) => i === idx ? {
      ...it,
      descripcion: cat.nombre,
      referencia: cat.codigo ?? '',
      marca: cat.marca as 'MG' | 'MAXUS',
      modelo: cat.modelo,
      categoria: cat.categoria,
      frecuencia: cat.frecuencia,
      catalogoId: cat.id,
    } : it))
    setModalAbierto(null)
  }

  function clearItem(i: number) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...ITEM_VACIO, cantidad: it.cantidad } : it))
  }

  function addItem() {
    setItems(prev => [...prev, { ...ITEM_VACIO }])
  }

  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateItem(i: number, fields: Partial<Item>) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...fields } : it))
  }

  async function guardarEnCatalogo(i: number) {
    const it = items[i]
    if (!it.marca) { alert('Selecciona la marca (MG o MAXUS) antes de guardar en catálogo'); return }
    const { data, error: err } = await supabase.from('catalogo_repuestos').insert({
      nombre: it.descripcion.trim(),
      codigo: it.referencia.trim() || null,
      marca: it.marca,
      modelo: it.modelo.trim() || null,
      categoria: it.categoria.trim() || null,
      frecuencia: it.frecuencia || null,
      activo: true,
    }).select().single()
    if (err || !data) { alert(err?.message ?? 'Error al guardar'); return }
    updateItem(i, { catalogoId: data.id })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validos = items.filter(it => it.descripcion.trim() && it.descripcion !== 'manual')
    if (validos.length === 0) { setError('Agrega al menos un repuesto'); return }
    if (destino === 'cliente' && !clienteSel) { setError('Selecciona el cliente destinatario o marca la solicitud como interna de La Oriental'); return }

    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Sesión expirada'); setLoading(false); return }

    const año = new Date().getFullYear()
    const { data: lastSol } = await supabase
      .from('solicitudes_repuestos')
      .select('numero')
      .ilike('numero', `SORE-${año}-%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    let seq = 1
    if (lastSol?.numero) {
      const n = parseInt(lastSol.numero.split('-')[2] ?? '0', 10)
      if (!isNaN(n)) seq = n + 1
    }
    const numero = `SORE-${año}-${String(seq).padStart(5, '0')}`
    const { data: solicitud, error: err } = await supabase
      .from('solicitudes_repuestos')
      .insert({
        numero,
        estado: 'solicitado',
        solicitado_por_id: user.id,
        solicitado_por_email: user.email,
        notas_almacenista: notas || null,
        cliente_id: destino === 'cliente' ? clienteSel!.id : null,
        para_la_oriental: destino === 'oriental',
      })
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
      {modalAbierto !== null && (
        <CatalogoModal
          catalogo={catalogo}
          onSelect={(cat) => seleccionarDelCatalogo(cat, modalAbierto)}
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
          {/* Destinatario */}
          <div className="card p-6">
            <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-oriental-red rounded-full" />
              ¿Para quién es el repuesto?
            </h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button type="button"
                onClick={() => { setDestino('cliente'); setClienteSel(null); setBuscaCliente('') }}
                className={`flex flex-col items-center gap-2 px-4 py-4 border-2 rounded-xl transition-colors ${
                  destino === 'cliente' ? 'border-oriental-red bg-red-50 text-oriental-red' : 'border-gray-200 text-oriental-gray hover:border-gray-300'
                }`}>
                <User size={18} />
                <span className="text-xs font-bold uppercase tracking-wide">Cliente</span>
              </button>
              <button type="button"
                onClick={() => { setDestino('oriental'); setClienteSel(null); setBuscaCliente('') }}
                className={`flex flex-col items-center gap-2 px-4 py-4 border-2 rounded-xl transition-colors ${
                  destino === 'oriental' ? 'border-oriental-red bg-red-50 text-oriental-red' : 'border-gray-200 text-oriental-gray hover:border-gray-300'
                }`}>
                <Building2 size={18} />
                <span className="text-xs font-bold uppercase tracking-wide">La Oriental</span>
              </button>
            </div>

            {destino === 'cliente' && (
              <div className="space-y-2">
                {clienteSel ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
                        <User size={16} className="text-green-700" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-oriental-black">{clienteSel.nombre}</p>
                        <p className="text-[11px] text-oriental-gray font-mono">{clienteSel.cedula_rif}</p>
                      </div>
                    </div>
                    <button type="button"
                      onClick={() => { setClienteSel(null); setBuscaCliente('') }}
                      className="text-xs text-oriental-gray hover:text-oriental-red font-semibold flex items-center gap-1">
                      <X size={12} /> Cambiar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray" />
                      <input
                        type="text"
                        className="input pl-9"
                        placeholder="Buscar por nombre o cédula/RIF…"
                        value={buscaCliente}
                        onChange={e => setBuscaCliente(e.target.value)}
                      />
                    </div>
                    {buscaCliente.trim().length >= 2 && (
                      <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-64 overflow-y-auto">
                        {buscandoClientes ? (
                          <p className="text-center text-xs text-oriental-gray py-3">Buscando…</p>
                        ) : resultadosClientes.length === 0 ? (
                          <p className="text-center text-xs text-oriental-gray py-3">Sin resultados</p>
                        ) : resultadosClientes.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setClienteSel(c)}
                            className="w-full text-left px-4 py-2.5 hover:bg-oriental-bg transition-colors"
                          >
                            <p className="text-sm font-semibold text-oriental-black">{c.nombre}</p>
                            <p className="text-[11px] text-oriental-gray font-mono">{c.cedula_rif}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {destino === 'oriental' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Building2 size={16} className="text-blue-700" />
                </div>
                <div>
                  <p className="text-sm font-bold text-oriental-black">La Oriental Automotors</p>
                  <p className="text-[11px] text-oriental-gray">Solicitud interna, no vinculada a un cliente específico.</p>
                </div>
              </div>
            )}
          </div>

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
                    /* Sin selección */
                    <div className="space-y-2">
                      <button type="button"
                        onClick={() => setModalAbierto(i)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-dashed border-oriental-red/30 hover:border-oriental-red hover:bg-red-50 transition-all text-sm font-semibold text-oriental-red">
                        <span className="flex items-center gap-2"><Search size={15} /> Seleccionar del catálogo</span>
                        <ChevronDown size={15} />
                      </button>
                      <p className="text-xs text-oriental-gray text-center">
                        o{' '}
                        <button type="button" className="text-oriental-red font-semibold hover:underline"
                          onClick={() => updateItem(i, { descripcion: 'manual' })}>
                          escribir manualmente
                        </button>
                      </p>
                    </div>

                  ) : item.catalogoId && item.descripcion !== 'manual' ? (
                    /* Del catálogo */
                    <div className="mb-3">
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-oriental-black truncate">{item.descripcion}</p>
                          <p className="text-xs text-oriental-gray mt-0.5 flex items-center gap-1.5">
                            {item.marca && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.marca === 'MG' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                {item.marca}
                              </span>
                            )}
                            {item.referencia && item.referencia !== 'N/A' && `Cód: ${item.referencia}`}
                          </p>
                        </div>
                        <button type="button" onClick={() => clearItem(i)}
                          className="ml-2 text-xs text-oriental-gray hover:text-oriental-red font-semibold flex items-center gap-1 flex-shrink-0">
                          <X size={11} /> Cambiar
                        </button>
                      </div>
                    </div>

                  ) : (
                    /* Manual — mismos campos que el catálogo */
                    <div className="space-y-3 mb-3">
                      {/* Nombre y código */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2">
                          <label className="label">Nombre del repuesto *</label>
                          <input type="text" className="input"
                            placeholder="Ej: Filtro de aceite"
                            value={item.descripcion === 'manual' ? '' : item.descripcion}
                            onChange={e => updateItem(i, { descripcion: e.target.value })}
                            autoFocus />
                        </div>
                        <div>
                          <label className="label">Código / Referencia</label>
                          <input type="text" className="input font-mono text-sm"
                            placeholder="Opcional"
                            value={item.referencia}
                            onChange={e => updateItem(i, { referencia: e.target.value })} />
                        </div>
                        <div>
                          <label className="label">Marca</label>
                          <div className="flex gap-1.5 h-10 items-center">
                            {(['MG', 'MAXUS'] as const).map(m => (
                              <button key={m} type="button"
                                onClick={() => updateItem(i, { marca: item.marca === m ? '' : m })}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                  item.marca === m
                                    ? m === 'MG' ? 'bg-red-600 text-white border-red-600' : 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
                                }`}>
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Modelo y categoría */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="label">Modelo</label>
                          <input type="text" className="input text-sm"
                            placeholder="Ej: ZS, T60"
                            value={item.modelo}
                            onChange={e => updateItem(i, { modelo: e.target.value })} />
                        </div>
                        <div>
                          <label className="label">Categoría</label>
                          <CategoriaInput
                            value={item.categoria}
                            onChange={v => updateItem(i, { categoria: v })}
                            categorias={categoriasCatalogo}
                          />
                        </div>
                      </div>

                      {/* Frecuencia */}
                      <div>
                        <label className="label">Frecuencia</label>
                        <div className="relative">
                          <select className="input pr-8 appearance-none text-sm"
                            value={item.frecuencia}
                            onChange={e => updateItem(i, { frecuencia: e.target.value })}>
                            <option value="">— Seleccionar —</option>
                            {FRECUENCIAS.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-oriental-gray" />
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center justify-between pt-1">
                        <button type="button" onClick={() => clearItem(i)}
                          className="text-xs text-oriental-gray hover:text-oriental-red font-semibold flex items-center gap-1">
                          <X size={11} /> Seleccionar del catálogo
                        </button>
                        {item.descripcion && item.descripcion !== 'manual' && (
                          item.catalogoId ? (
                            <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                              <Check size={11} /> Guardado en catálogo
                            </span>
                          ) : (
                            <button type="button"
                              onClick={() => guardarEnCatalogo(i)}
                              className="text-xs text-oriental-red font-semibold hover:underline flex items-center gap-1">
                              <BookmarkPlus size={11} /> Guardar en catálogo
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cantidad */}
                  {item.descripcion && item.descripcion !== 'manual' && (
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100">
                      <span className="text-xs text-oriental-gray font-semibold">Cantidad:</span>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => updateItem(i, { cantidad: Math.max(1, item.cantidad - 1) })}
                          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 font-bold text-oriental-black text-sm">−</button>
                        <span className="w-8 text-center font-bold text-oriental-black text-sm">{item.cantidad}</span>
                        <button type="button" onClick={() => updateItem(i, { cantidad: item.cantidad + 1 })}
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
            <textarea className="textarea" rows={3}
              placeholder="Observaciones, urgencia, detalles del vehículo, etc."
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
