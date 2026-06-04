'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, Plus, Pencil, Check, X, Trash2, ChevronDown, Search } from 'lucide-react'

interface CatalogoItem {
  id: string
  marca: string
  modelo: string | null
  categoria: string | null
  frecuencia: string | null
  codigo: string | null
  nombre: string
  activo: boolean
}

const FRECUENCIAS = ['ALTA ROTACION', 'MEDIA ROTACION', 'BAJA ROTACION', 'CARROCERIA']

const frecuenciaColor: Record<string, string> = {
  'ALTA ROTACION':  'bg-red-100 text-red-700',
  'MEDIA ROTACION': 'bg-yellow-100 text-yellow-700',
  'BAJA ROTACION':  'bg-blue-100 text-blue-700',
  'CARROCERIA':     'bg-purple-100 text-purple-700',
}

const EMPTY_FORM = { nombre: '', codigo: '', modelo: '', categoria: '', frecuencia: '' }

function ItemRow({
  item,
  categorias,
  onSave,
  onDelete,
}: {
  item: CatalogoItem
  categorias: string[]
  onSave: (id: string, data: Partial<CatalogoItem>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    nombre: item.nombre,
    codigo: item.codigo ?? '',
    modelo: item.modelo ?? '',
    categoria: item.categoria ?? '',
    frecuencia: item.frecuencia ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.nombre.trim()) return
    setSaving(true)
    await onSave(item.id, {
      nombre: form.nombre.trim(),
      codigo: form.codigo.trim() || null,
      modelo: form.modelo.trim() || null,
      categoria: form.categoria.trim() || null,
      frecuencia: form.frecuencia || null,
    })
    setSaving(false)
    setEditing(false)
  }

  function handleCancel() {
    setForm({
      nombre: item.nombre,
      codigo: item.codigo ?? '',
      modelo: item.modelo ?? '',
      categoria: item.categoria ?? '',
      frecuencia: item.frecuencia ?? '',
    })
    setEditing(false)
  }

  if (editing) {
    return (
      <tr className="bg-blue-50/40">
        <td className="px-3 py-2">
          <input
            className="input text-sm py-1.5"
            value={form.nombre}
            onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
            placeholder="Nombre del repuesto"
            autoFocus
          />
        </td>
        <td className="px-3 py-2">
          <input
            className="input text-sm py-1.5 font-mono"
            value={form.codigo}
            onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))}
            placeholder="Código"
          />
        </td>
        <td className="px-3 py-2">
          <input
            className="input text-sm py-1.5"
            value={form.modelo}
            onChange={e => setForm(p => ({ ...p, modelo: e.target.value }))}
            placeholder="Modelo"
          />
        </td>
        <td className="px-3 py-2">
          <input
            className="input text-sm py-1.5"
            list="categorias-list"
            value={form.categoria}
            onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
            placeholder="Categoría"
          />
          <datalist id="categorias-list">
            {categorias.map(c => <option key={c} value={c} />)}
          </datalist>
        </td>
        <td className="px-3 py-2">
          <div className="relative">
            <select
              className="input text-sm py-1.5 pr-8 appearance-none"
              value={form.frecuencia}
              onChange={e => setForm(p => ({ ...p, frecuencia: e.target.value }))}
            >
              <option value="">— Frecuencia —</option>
              {FRECUENCIAS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-oriental-gray" />
          </div>
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1.5">
            <button onClick={handleSave} disabled={saving || !form.nombre.trim()}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40">
              <Check size={13} />
            </button>
            <button onClick={handleCancel}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200">
              <X size={13} className="text-oriental-gray" />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="hover:bg-gray-50 group">
      <td className="px-3 py-2.5 text-sm font-medium text-oriental-black">{item.nombre}</td>
      <td className="px-3 py-2.5">
        {item.codigo && item.codigo !== 'N/A'
          ? <span className="font-mono text-xs text-oriental-black">{item.codigo}</span>
          : <span className="text-xs text-gray-300">—</span>}
      </td>
      <td className="px-3 py-2.5 text-xs text-oriental-gray">{item.modelo || <span className="text-gray-300">—</span>}</td>
      <td className="px-3 py-2.5 text-xs text-oriental-gray">{item.categoria || <span className="text-gray-300">—</span>}</td>
      <td className="px-3 py-2.5">
        {item.frecuencia
          ? <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${frecuenciaColor[item.frecuencia] ?? 'bg-gray-100 text-gray-600'}`}>{item.frecuencia}</span>
          : <span className="text-gray-300 text-xs">—</span>}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(true)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50">
            <Pencil size={13} className="text-blue-500" />
          </button>
          <button onClick={() => onDelete(item.id)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50">
            <Trash2 size={13} className="text-red-400" />
          </button>
        </div>
      </td>
    </tr>
  )
}

function AddRow({
  marca,
  categorias,
  onAdd,
  onCancel,
}: {
  marca: 'MG' | 'MAXUS'
  categorias: string[]
  onAdd: (data: Omit<CatalogoItem, 'id' | 'activo'>) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.nombre.trim()) return
    setSaving(true)
    await onAdd({
      marca,
      nombre: form.nombre.trim(),
      codigo: form.codigo.trim() || null,
      modelo: form.modelo.trim() || null,
      categoria: form.categoria.trim() || null,
      frecuencia: form.frecuencia || null,
    })
    setSaving(false)
    setForm(EMPTY_FORM)
    onCancel()
  }

  return (
    <tr className="bg-green-50/40 border-t-2 border-green-200">
      <td className="px-3 py-2">
        <input
          className="input text-sm py-1.5"
          value={form.nombre}
          onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
          placeholder="Nombre del repuesto *"
          autoFocus
        />
      </td>
      <td className="px-3 py-2">
        <input
          className="input text-sm py-1.5 font-mono"
          value={form.codigo}
          onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))}
          placeholder="Código"
        />
      </td>
      <td className="px-3 py-2">
        <input
          className="input text-sm py-1.5"
          value={form.modelo}
          onChange={e => setForm(p => ({ ...p, modelo: e.target.value }))}
          placeholder="Modelo"
        />
      </td>
      <td className="px-3 py-2">
        <input
          className="input text-sm py-1.5"
          list="categorias-list-add"
          value={form.categoria}
          onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
          placeholder="Categoría"
        />
        <datalist id="categorias-list-add">
          {categorias.map(c => <option key={c} value={c} />)}
        </datalist>
      </td>
      <td className="px-3 py-2">
        <div className="relative">
          <select
            className="input text-sm py-1.5 pr-8 appearance-none"
            value={form.frecuencia}
            onChange={e => setForm(p => ({ ...p, frecuencia: e.target.value }))}
          >
            <option value="">— Frecuencia —</option>
            {FRECUENCIAS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-oriental-gray" />
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <button onClick={handleSave} disabled={saving || !form.nombre.trim()}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40">
            <Check size={13} />
          </button>
          <button onClick={onCancel}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200">
            <X size={13} className="text-oriental-gray" />
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function CatalogoRepuestos() {
  const supabase = createClient()
  const [items, setItems] = useState<CatalogoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [marca, setMarca] = useState<'MG' | 'MAXUS'>('MG')
  const [showAdd, setShowAdd] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('catalogo_repuestos')
      .select('*')
      .eq('activo', true)
      .order('marca').order('categoria').order('nombre')
    setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const q = busqueda.trim().toLowerCase()
  const filtrados = items.filter(it => {
    if (it.marca !== marca) return false
    if (!q) return true
    return (
      it.nombre.toLowerCase().includes(q) ||
      (it.codigo ?? '').toLowerCase().includes(q) ||
      (it.modelo ?? '').toLowerCase().includes(q) ||
      (it.categoria ?? '').toLowerCase().includes(q)
    )
  })
  const categorias = [...new Set(items.filter(it => it.marca === marca).map(it => it.categoria).filter(Boolean) as string[])].sort()

  const mgCount   = items.filter(it => it.marca === 'MG').length
  const maxusCount = items.filter(it => it.marca === 'MAXUS').length

  async function handleSave(id: string, data: Partial<CatalogoItem>) {
    setError('')
    const { error: err } = await supabase
      .from('catalogo_repuestos')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (err) { setError(err.message); return }
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...data } : it))
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Desactivar este repuesto del catálogo?')) return
    setError('')
    const { error: err } = await supabase
      .from('catalogo_repuestos')
      .update({ activo: false })
      .eq('id', id)
    if (err) { setError(err.message); return }
    setItems(prev => prev.filter(it => it.id !== id))
  }

  async function handleAdd(data: Omit<CatalogoItem, 'id' | 'activo'>) {
    setError('')
    const { data: inserted, error: err } = await supabase
      .from('catalogo_repuestos')
      .insert({ ...data, marca, activo: true })
      .select().single()
    if (err || !inserted) { setError(err?.message ?? 'Error al guardar'); return }
    setItems(prev => [...prev, inserted])
  }

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider flex items-center gap-2">
          <BookOpen size={14} className="text-oriental-red" /> Catálogo de repuestos
        </h2>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 text-sm font-semibold text-oriental-red hover:underline">
          <Plus size={14} /> Agregar repuesto
        </button>
      </div>

      <div className="card overflow-hidden">
        {/* Tabs MG / MAXUS */}
        <div className="flex border-b border-gray-100 bg-gray-50">
          {(['MG', 'MAXUS'] as const).map(m => (
            <button key={m} onClick={() => { setMarca(m); setShowAdd(false); setBusqueda('') }}
              className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
                marca === m
                  ? m === 'MG'
                    ? 'border-red-600 text-red-700 bg-white'
                    : 'border-blue-600 text-blue-700 bg-white'
                  : 'border-transparent text-oriental-gray hover:text-oriental-black'
              }`}>
              {m}
              <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                marca === m
                  ? m === 'MG' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {m === 'MG' ? mgCount : maxusCount}
              </span>
            </button>
          ))}
        </div>

        {/* Buscador */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray pointer-events-none" />
            <input
              type="text"
              className="input pl-9 text-sm py-2"
              placeholder="Buscar por nombre, código, modelo o categoría…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-oriental-gray hover:text-oriental-black">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-100">
            <p className="text-sm text-oriental-red">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-oriental-gray text-sm">Cargando catálogo…</div>
        ) : filtrados.length === 0 && !showAdd ? (
          <div className="p-12 text-center">
            {q ? (
              <>
                <p className="text-oriental-gray text-sm">Sin resultados para <span className="font-semibold">"{busqueda}"</span></p>
                <button onClick={() => setBusqueda('')} className="mt-2 text-oriental-red text-sm font-semibold hover:underline">Limpiar búsqueda</button>
              </>
            ) : (
              <>
                <p className="text-oriental-gray text-sm">No hay repuestos {marca} en el catálogo</p>
                <button onClick={() => setShowAdd(true)}
                  className="mt-3 text-oriental-red text-sm font-semibold hover:underline flex items-center gap-1 mx-auto">
                  <Plus size={13} /> Agregar el primero
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-3 py-2.5 text-[11px] font-bold text-oriental-gray uppercase tracking-wider">Nombre</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-oriental-gray uppercase tracking-wider">Código</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-oriental-gray uppercase tracking-wider">Modelo</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-oriental-gray uppercase tracking-wider">Categoría</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-oriental-gray uppercase tracking-wider">Frecuencia</th>
                  <th className="px-3 py-2.5 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    categorias={categorias}
                    onSave={handleSave}
                    onDelete={handleDelete}
                  />
                ))}
                {showAdd && (
                  <AddRow
                    marca={marca}
                    categorias={categorias}
                    onAdd={handleAdd}
                    onCancel={() => setShowAdd(false)}
                  />
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer count */}
        {filtrados.length > 0 && (
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-oriental-gray">
              {q
                ? `${filtrados.length} resultado${filtrados.length !== 1 ? 's' : ''} de ${items.filter(it => it.marca === marca).length} en catálogo ${marca}`
                : `${filtrados.length} repuesto${filtrados.length !== 1 ? 's' : ''} en catálogo ${marca}`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
