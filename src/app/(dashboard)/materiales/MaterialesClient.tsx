'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Boxes, Plus, Pencil, Trash2, Check, X, Search } from 'lucide-react'
import { BRANDING } from '@/lib/branding'

type Material = {
  id: string
  nombre: string
  categoria: string | null
  unidad: string | null
  stock: number | null
  precio_referencia: number | null
  moneda: string | null
  proveedor: string | null
  notas: string | null
}

const EMPTY = { nombre: '', categoria: '', unidad: '', stock: '', precio_referencia: '', moneda: 'USD', proveedor: '', notas: '' }
type Form = typeof EMPTY

function toRow(f: Form) {
  return {
    nombre: f.nombre.trim(),
    categoria: f.categoria.trim() || null,
    unidad: f.unidad.trim() || null,
    stock: f.stock.trim() ? Number(f.stock.replace(',', '.')) : null,
    precio_referencia: f.precio_referencia.trim() ? Number(f.precio_referencia.replace(',', '.')) : null,
    moneda: f.moneda || 'USD',
    proveedor: f.proveedor.trim() || null,
    notas: f.notas.trim() || null,
  }
}

export default function MaterialesClient() {
  const supabase = createClient()
  const [items, setItems] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [error, setError] = useState('')
  const [creando, setCreando] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)

  async function load() {
    const { data } = await supabase.from('materiales_insumos').select('*').eq('activo', true).order('nombre')
    setItems(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const q = busqueda.trim().toLowerCase()
  const filtrados = useMemo(() => items.filter(m =>
    !q || m.nombre.toLowerCase().includes(q) || (m.categoria ?? '').toLowerCase().includes(q) || (m.proveedor ?? '').toLowerCase().includes(q)
  ), [items, q])

  function abrirNuevo() { setForm(EMPTY); setCreando(true); setEditId(null); setError('') }
  function abrirEditar(m: Material) {
    setForm({
      nombre: m.nombre, categoria: m.categoria ?? '', unidad: m.unidad ?? '',
      stock: m.stock != null ? String(m.stock) : '', precio_referencia: m.precio_referencia != null ? String(m.precio_referencia) : '',
      moneda: m.moneda ?? 'USD', proveedor: m.proveedor ?? '', notas: m.notas ?? '',
    })
    setEditId(m.id); setCreando(false); setError('')
  }

  async function guardar() {
    setError('')
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
    if (editId) {
      const { error: err } = await supabase.from('materiales_insumos').update({ ...toRow(form), updated_at: new Date().toISOString() }).eq('id', editId)
      if (err) { setError(err.message); return }
      setEditId(null)
    } else {
      const { error: err } = await supabase.from('materiales_insumos').insert({ ...toRow(form), activo: true })
      if (err) { setError(err.message); return }
      setCreando(false)
    }
    setForm(EMPTY); load()
  }

  async function eliminar(id: string) {
    if (!confirm('¿Desactivar este material del listado?')) return
    await supabase.from('materiales_insumos').update({ activo: false }).eq('id', id)
    load()
  }

  const fmtPrecio = (n: number | null, moneda: string | null) => n == null ? '—' : `${moneda === 'VES' ? 'Bs.' : '$'} ${Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`

  return (
    <div className="p-4 lg:p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"><ArrowLeft size={18} className="text-oriental-gray" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-oriental-black flex items-center gap-2"><Boxes size={22} className="text-oriental-red" /> Materiales e insumos</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Base de datos de materiales e insumos de {BRANDING.marca}</p>
        </div>
        <button onClick={abrirNuevo} className="btn-primary flex items-center gap-2"><Plus size={16} /> Nuevo</button>
      </div>

      <div className="card p-4 mb-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray" />
          <input className="input pl-9" placeholder="Buscar por nombre, categoría o proveedor…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
      </div>

      {(creando || editId) && (
        <div className="card p-5 mb-4">
          <h2 className="text-sm font-bold text-oriental-black mb-3">{editId ? 'Editar material' : 'Nuevo material'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2"><label className="label">Nombre *</label><input className="input" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} /></div>
            <div><label className="label">Categoría</label><input className="input" value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))} placeholder="Limpieza, oficina, taller…" /></div>
            <div><label className="label">Unidad</label><input className="input" value={form.unidad} onChange={e => setForm(p => ({ ...p, unidad: e.target.value }))} placeholder="Unid, litro, caja…" /></div>
            <div><label className="label">Stock</label><input className="input" type="text" inputMode="decimal" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} placeholder="0" /></div>
            <div>
              <label className="label">Precio ref.</label>
              <div className="flex gap-1">
                <input className="input flex-1" type="text" inputMode="decimal" value={form.precio_referencia} onChange={e => setForm(p => ({ ...p, precio_referencia: e.target.value }))} placeholder="0,00" />
                {(['USD', 'VES'] as const).map(m => (
                  <button key={m} type="button" onClick={() => setForm(p => ({ ...p, moneda: m }))}
                    className={`px-2 rounded-lg text-xs font-semibold border ${form.moneda === m ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200'}`}>{m}</button>
                ))}
              </div>
            </div>
            <div><label className="label">Proveedor</label><input className="input" value={form.proveedor} onChange={e => setForm(p => ({ ...p, proveedor: e.target.value }))} /></div>
            <div className="md:col-span-3"><label className="label">Notas</label><input className="input" value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} /></div>
          </div>
          {error && <p className="text-xs text-oriental-red mt-2">{error}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={guardar} className="btn-primary flex items-center gap-1.5 py-2 px-4 text-sm"><Check size={14} /> Guardar</button>
            <button onClick={() => { setCreando(false); setEditId(null); setError('') }} className="btn-secondary py-2 px-4 text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card p-12 text-center text-oriental-gray text-sm">Cargando…</div>
      ) : filtrados.length === 0 ? (
        <div className="card p-12 text-center text-oriental-gray text-sm">Sin materiales{q ? ' para esa búsqueda' : ' registrados'}.</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-oriental-gray">Nombre</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-oriental-gray">Categoría</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-oriental-gray">Unidad</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-oriental-gray">Stock</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-oriental-gray">Precio ref.</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-oriental-gray">Proveedor</th>
                  <th className="px-4 py-2.5 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50 group">
                    <td className="px-4 py-2.5 font-semibold text-oriental-black">{m.nombre}</td>
                    <td className="px-4 py-2.5 text-oriental-gray text-xs">{m.categoria ?? '—'}</td>
                    <td className="px-4 py-2.5 text-oriental-gray text-xs">{m.unidad ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right text-oriental-gray">{m.stock ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right text-oriental-gray whitespace-nowrap">{fmtPrecio(m.precio_referencia, m.moneda)}</td>
                    <td className="px-4 py-2.5 text-oriental-gray text-xs">{m.proveedor ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => abrirEditar(m)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50"><Pencil size={13} className="text-blue-500" /></button>
                        <button onClick={() => eliminar(m.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50"><Trash2 size={13} className="text-red-400" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
