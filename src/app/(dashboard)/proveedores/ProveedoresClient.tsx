'use client'

import { useEffect, useState, useMemo } from 'react'
import { Truck, Plus, Pencil, Trash2, Check, Search } from 'lucide-react'
import { listarProveedoresAdmin, guardarProveedor, desactivarProveedor } from './actions'
import type { Proveedor } from '../egresos/actions'

const EMPTY = { nombre: '', rif: '', correo: '', telefono: '', numero_cuenta: '', banco: '', direccion: '' }
type Form = typeof EMPTY

function toRow(f: Form) {
  const clean = (v: string) => (v.trim() ? v.trim() : null)
  return {
    nombre: f.nombre.trim(),
    rif: clean(f.rif),
    correo: clean(f.correo),
    telefono: clean(f.telefono),
    numero_cuenta: clean(f.numero_cuenta),
    banco: clean(f.banco),
    direccion: clean(f.direccion),
  }
}

export default function ProveedoresClient() {
  const [items, setItems] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [error, setError] = useState('')
  const [creando, setCreando] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)

  async function load() {
    const { proveedores } = await listarProveedoresAdmin()
    setItems(proveedores)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const q = busqueda.trim().toLowerCase()
  const filtrados = useMemo(() => items.filter(p =>
    !q || p.nombre.toLowerCase().includes(q) || (p.rif ?? '').toLowerCase().includes(q) || (p.telefono ?? '').toLowerCase().includes(q)
  ), [items, q])

  function abrirNuevo() { setForm(EMPTY); setCreando(true); setEditId(null); setError('') }
  function abrirEditar(p: Proveedor) {
    setForm({ nombre: p.nombre, rif: p.rif ?? '', correo: p.correo ?? '', telefono: p.telefono ?? '', numero_cuenta: p.numero_cuenta ?? '', banco: p.banco ?? '', direccion: p.direccion ?? '' })
    setEditId(p.id); setCreando(false); setError('')
  }

  async function guardar() {
    setError('')
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
    const res = await guardarProveedor(editId, toRow(form))
    if (res.error) { setError(res.error); return }
    setEditId(null); setCreando(false); setForm(EMPTY); load()
  }

  async function eliminar(id: string) {
    if (!confirm('¿Desactivar este proveedor? No afecta los egresos ya registrados.')) return
    const res = await desactivarProveedor(id)
    if (res.error) { setError(res.error); return }
    load()
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray" />
          <input className="input pl-9" placeholder="Buscar por nombre, RIF o teléfono…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <button onClick={abrirNuevo} className="btn-primary flex items-center gap-2 whitespace-nowrap"><Plus size={16} /> Nuevo</button>
      </div>

      {(creando || editId) && (
        <div className="card p-5 mb-4">
          <h2 className="text-sm font-bold text-oriental-black mb-3">{editId ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="label">Nombre / razón social *</label><input className="input" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} /></div>
            <div><label className="label">RIF</label><input className="input font-mono" value={form.rif} onChange={e => setForm(p => ({ ...p, rif: e.target.value }))} placeholder="J-…" /></div>
            <div><label className="label">Teléfono</label><input className="input" value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} /></div>
            <div><label className="label">Correo</label><input className="input" type="email" value={form.correo} onChange={e => setForm(p => ({ ...p, correo: e.target.value }))} /></div>
            <div><label className="label">N° de cuenta</label><input className="input font-mono" value={form.numero_cuenta} onChange={e => setForm(p => ({ ...p, numero_cuenta: e.target.value }))} /></div>
            <div><label className="label">Banco</label><input className="input" value={form.banco} onChange={e => setForm(p => ({ ...p, banco: e.target.value }))} /></div>
            <div className="md:col-span-2"><label className="label">Dirección fiscal</label><textarea className="textarea" rows={2} value={form.direccion} onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))} placeholder="Dirección fiscal del proveedor (aparece en el comprobante de retención)" /></div>
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
        <div className="card p-12 text-center">
          <Truck size={30} className="mx-auto text-gray-300 mb-3" />
          <p className="text-oriental-gray text-sm">Sin proveedores{q ? ' para esa búsqueda' : ' registrados'}.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-oriental-gray">Nombre</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-oriental-gray">RIF</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-oriental-gray">Teléfono</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-oriental-gray">Correo</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-oriental-gray">Cuenta / Banco</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-oriental-gray">Dirección</th>
                  <th className="px-4 py-2.5 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 group">
                    <td className="px-4 py-2.5 font-semibold text-oriental-black">{p.nombre}</td>
                    <td className="px-4 py-2.5 text-oriental-gray font-mono text-xs">{p.rif ?? '—'}</td>
                    <td className="px-4 py-2.5 text-oriental-gray text-xs">{p.telefono ?? '—'}</td>
                    <td className="px-4 py-2.5 text-oriental-gray text-xs">{p.correo ?? '—'}</td>
                    <td className="px-4 py-2.5 text-oriental-gray text-xs">{p.numero_cuenta ? <span className="font-mono">{p.numero_cuenta}</span> : '—'}{p.banco ? ` · ${p.banco}` : ''}</td>
                    <td className="px-4 py-2.5 text-xs max-w-[240px]">
                      {p.direccion
                        ? <span className="text-oriental-gray line-clamp-2" title={p.direccion}>{p.direccion}</span>
                        : <button onClick={() => abrirEditar(p)} className="text-oriental-red hover:underline font-medium">+ Agregar</button>}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => abrirEditar(p)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50"><Pencil size={13} className="text-blue-500" /></button>
                        <button onClick={() => eliminar(p.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50"><Trash2 size={13} className="text-red-400" /></button>
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
