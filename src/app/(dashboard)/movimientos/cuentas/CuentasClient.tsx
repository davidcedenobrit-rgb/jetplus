'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Loader2, Pencil, Trash2, X } from 'lucide-react'
import { guardarCuenta, desactivarCuenta, type Cuenta } from '../actions'

const TIPOS = [
  { v: 'banco', label: 'Banco' },
  { v: 'usdt', label: 'USDT' },
  { v: 'efectivo', label: 'Efectivo' },
  { v: 'otro', label: 'Otro' },
]
const MONEDAS = ['USD', 'VES', 'USDT']
const tipoIcono: Record<string, string> = { banco: '🏦', usdt: '₮', efectivo: '💵', otro: '•' }

const VACIA = { nombre: '', tipo: 'banco', moneda: 'USD', custodio: '', banco: '', orden: 0 }

export default function CuentasClient({ cuentas }: { cuentas: Cuenta[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState<any | null>(null)   // null = cerrado
  const [editId, setEditId] = useState<string | null>(null)
  const [error, setError] = useState('')

  function abrirNueva() { setEditId(null); setForm({ ...VACIA }); setError('') }
  function abrirEditar(c: Cuenta) {
    setEditId(c.id)
    setForm({ nombre: c.nombre, tipo: c.tipo, moneda: c.moneda, custodio: c.custodio ?? '', banco: c.banco ?? '', orden: c.orden })
    setError('')
  }

  function guardar() {
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
    setError('')
    startTransition(async () => {
      const res = await guardarCuenta(editId, {
        nombre: form.nombre, tipo: form.tipo, moneda: form.moneda,
        custodio: form.custodio || null, banco: form.banco || null, orden: Number(form.orden) || 0,
      })
      if (res.error) { setError(res.error); return }
      setForm(null); setEditId(null); router.refresh()
    })
  }

  function eliminar(c: Cuenta) {
    if (!confirm(`¿Desactivar la cuenta "${c.nombre}"?`)) return
    startTransition(async () => {
      await desactivarCuenta(c.id); router.refresh()
    })
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/movimientos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-oriental-black">Cuentas</h1>
          <p className="text-oriental-gray text-sm">Bancos, USDT por custodio y efectivo</p>
        </div>
        <button onClick={abrirNueva} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> Nueva cuenta
        </button>
      </div>

      {form && (
        <div className="card p-5 mb-5 border-2 border-oriental-red/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-oriental-black">{editId ? 'Editar cuenta' : 'Nueva cuenta'}</h2>
            <button onClick={() => setForm(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100"><X size={15} className="text-oriental-gray" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="label">Nombre *</label>
              <input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Banesco USD, USDT CH, Efectivo Bs." />
            </div>
            <div>
              <label className="label">Tipo</label>
              <select className="select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                {TIPOS.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Moneda</label>
              <select className="select" value={form.moneda} onChange={e => setForm({ ...form, moneda: e.target.value })}>
                {MONEDAS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Custodio <span className="text-oriental-gray font-normal">(opcional)</span></label>
              <input className="input" value={form.custodio} onChange={e => setForm({ ...form, custodio: e.target.value })} placeholder="Ej: Carla Hernández" />
            </div>
            <div>
              <label className="label">Banco <span className="text-oriental-gray font-normal">(opcional)</span></label>
              <input className="input" value={form.banco} onChange={e => setForm({ ...form, banco: e.target.value })} placeholder="Ej: Banesco" />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={guardar} disabled={pending} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60">
              {pending ? <Loader2 size={14} className="animate-spin" /> : null} Guardar
            </button>
            <button onClick={() => setForm(null)} className="btn-secondary text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {cuentas.length === 0 ? (
          <div className="p-10 text-center text-oriental-gray text-sm">Aún no hay cuentas. Crea la primera.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {cuentas.map(c => (
              <div key={c.id} className={`flex items-center gap-3 px-4 py-3 ${!c.activo ? 'opacity-50' : ''}`}>
                <span className="text-lg">{tipoIcono[c.tipo] ?? '•'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-oriental-black">{c.nombre}
                    {!c.activo && <span className="ml-2 text-[10px] font-bold text-gray-400">(inactiva)</span>}
                  </p>
                  <p className="text-[11px] text-oriental-gray">
                    {[c.moneda, c.custodio, c.banco].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button onClick={() => abrirEditar(c)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><Pencil size={14} className="text-oriental-gray" /></button>
                {c.activo && (
                  <button onClick={() => eliminar(c)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
