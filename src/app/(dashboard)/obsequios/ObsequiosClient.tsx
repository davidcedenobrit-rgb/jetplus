'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Gift, Plus, Trash2, Check, Search } from 'lucide-react'

type Obsequio = {
  id: string
  cliente_nombre: string | null
  descripcion: string
  motivo: string | null
  fecha: string
  valor: number | null
  moneda: string | null
  entregado_por: string | null
  notas: string | null
}

const EMPTY = { cliente_nombre: '', descripcion: '', motivo: '', fecha: new Date().toISOString().slice(0, 10), valor: '', moneda: 'USD', entregado_por: '', notas: '' }
type Form = typeof EMPTY

export default function ObsequiosClient() {
  const supabase = createClient()
  const [items, setItems] = useState<Obsequio[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<Form>(EMPTY)

  async function load() {
    const { data } = await supabase.from('obsequios_clientes').select('*').order('fecha', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const q = busqueda.trim().toLowerCase()
  const filtrados = useMemo(() => items.filter(o =>
    !q || (o.cliente_nombre ?? '').toLowerCase().includes(q) || o.descripcion.toLowerCase().includes(q) || (o.motivo ?? '').toLowerCase().includes(q)
  ), [items, q])

  async function guardar() {
    setError('')
    if (!form.descripcion.trim()) { setError('Describe el obsequio'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase.from('obsequios_clientes').insert({
      cliente_nombre: form.cliente_nombre.trim() || null,
      descripcion: form.descripcion.trim(),
      motivo: form.motivo.trim() || null,
      fecha: form.fecha,
      valor: form.valor.trim() ? Number(form.valor.replace(',', '.')) : null,
      moneda: form.moneda || 'USD',
      entregado_por: form.entregado_por.trim() || null,
      notas: form.notas.trim() || null,
      registrado_por: user?.id ?? null,
    })
    if (err) { setError(err.message); return }
    setForm({ ...EMPTY, fecha: new Date().toISOString().slice(0, 10) }); setCreando(false); load()
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este registro de obsequio?')) return
    await supabase.from('obsequios_clientes').delete().eq('id', id)
    load()
  }

  const fmtFecha = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
  const fmtValor = (n: number | null, moneda: string | null) => n == null ? '—' : `${moneda === 'VES' ? 'Bs.' : '$'} ${Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`

  return (
    <div className="p-4 lg:p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"><ArrowLeft size={18} className="text-oriental-gray" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-oriental-black flex items-center gap-2"><Gift size={22} className="text-oriental-red" /> Obsequios a clientes</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Registro de obsequios entregados a clientes</p>
        </div>
        {!creando && <button onClick={() => { setForm({ ...EMPTY, fecha: new Date().toISOString().slice(0, 10) }); setCreando(true) }} className="btn-primary flex items-center gap-2"><Plus size={16} /> Nuevo</button>}
      </div>

      {creando && (
        <div className="card p-5 mb-4">
          <h2 className="text-sm font-bold text-oriental-black mb-3">Nuevo obsequio</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="label">Cliente</label><input className="input" value={form.cliente_nombre} onChange={e => setForm(p => ({ ...p, cliente_nombre: e.target.value }))} placeholder="Nombre del cliente" /></div>
            <div><label className="label">Fecha *</label><input className="input" type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} /></div>
            <div className="md:col-span-2"><label className="label">Obsequio *</label><input className="input" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Ej: Gorra, franela, kit de bienvenida…" /></div>
            <div><label className="label">Motivo</label><input className="input" value={form.motivo} onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))} placeholder="Compra, cumpleaños, fidelización…" /></div>
            <div>
              <label className="label">Valor</label>
              <div className="flex gap-1">
                <input className="input flex-1" type="text" inputMode="decimal" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} placeholder="0,00" />
                {(['USD', 'VES'] as const).map(m => (
                  <button key={m} type="button" onClick={() => setForm(p => ({ ...p, moneda: m }))}
                    className={`px-2 rounded-lg text-xs font-semibold border ${form.moneda === m ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200'}`}>{m}</button>
                ))}
              </div>
            </div>
            <div><label className="label">Entregado por</label><input className="input" value={form.entregado_por} onChange={e => setForm(p => ({ ...p, entregado_por: e.target.value }))} /></div>
            <div><label className="label">Notas</label><input className="input" value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} /></div>
          </div>
          {error && <p className="text-xs text-oriental-red mt-2">{error}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={guardar} className="btn-primary flex items-center gap-1.5 py-2 px-4 text-sm"><Check size={14} /> Guardar</button>
            <button onClick={() => { setCreando(false); setError('') }} className="btn-secondary py-2 px-4 text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="card p-4 mb-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray" />
          <input className="input pl-9" placeholder="Buscar por cliente, obsequio o motivo…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-oriental-gray text-sm">Cargando…</div>
      ) : filtrados.length === 0 ? (
        <div className="card p-12 text-center text-oriental-gray text-sm">Sin obsequios{q ? ' para esa búsqueda' : ' registrados'}.</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-oriental-gray">Fecha</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-oriental-gray">Cliente</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-oriental-gray">Obsequio</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-oriental-gray">Motivo</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-oriental-gray">Valor</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-oriental-gray">Entregó</th>
                  <th className="px-4 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50 group">
                    <td className="px-4 py-2.5 text-oriental-gray text-xs whitespace-nowrap">{fmtFecha(o.fecha)}</td>
                    <td className="px-4 py-2.5 text-oriental-black">{o.cliente_nombre ?? '—'}</td>
                    <td className="px-4 py-2.5 font-semibold text-oriental-black">{o.descripcion}</td>
                    <td className="px-4 py-2.5 text-oriental-gray text-xs">{o.motivo ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right text-oriental-gray whitespace-nowrap">{fmtValor(o.valor, o.moneda)}</td>
                    <td className="px-4 py-2.5 text-oriental-gray text-xs">{o.entregado_por ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => eliminar(o.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={13} className="text-red-400" /></button>
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
