'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Check, Eye, EyeOff } from 'lucide-react'

interface Vendedora {
  id: string
  nombre: string
  activa: boolean
  created_at: string
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg text-white ${ok ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg}
    </div>
  )
}

export default function VendedorasEditor() {
  const [vendedoras, setVendedoras] = useState<Vendedora[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [newNombre, setNewNombre] = useState('')
  const [newCodigo, setNewCodigo] = useState('')
  const [showCodigo, setShowCodigo] = useState(false)
  const [saving, setSaving] = useState(false)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 2800)
  }

  async function load() {
    setLoading(true)
    const r = await fetch('/api/vendedoras')
    if (r.ok) setVendedoras(await r.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleActiva(v: Vendedora) {
    const r = await fetch('/api/vendedoras', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: v.id, activa: !v.activa }),
    })
    if (r.ok) {
      setVendedoras(prev => prev.map(x => x.id === v.id ? { ...x, activa: !v.activa } : x))
      showToast(v.activa ? 'Vendedora desactivada' : '✓ Vendedora activada', !v.activa)
    } else {
      showToast('Error al actualizar', false)
    }
  }

  async function eliminar(v: Vendedora) {
    if (!confirm(`¿Eliminar a ${v.nombre}? Esta acción no se puede deshacer.`)) return
    const r = await fetch('/api/vendedoras', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: v.id }),
    })
    if (r.ok) {
      setVendedoras(prev => prev.filter(x => x.id !== v.id))
      showToast('Vendedora eliminada', true)
    } else {
      showToast('Error al eliminar', false)
    }
  }

  async function agregarVendedora() {
    if (!newNombre.trim() || !newCodigo.trim()) { showToast('Nombre y código son requeridos', false); return }
    if (!/^[A-Za-z]\d{3}$/.test(newCodigo.trim())) { showToast('El código debe ser letra + 3 dígitos (ej: D198)', false); return }
    setSaving(true)
    const r = await fetch('/api/vendedoras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: newNombre.trim(), codigo: newCodigo.trim() }),
    })
    const json = await r.json()
    setSaving(false)
    if (r.ok) {
      setVendedoras(prev => [...prev, json])
      setShowModal(false)
      setNewNombre('')
      setNewCodigo('')
      showToast(`✓ ${json.nombre} agregada`, true)
    } else {
      showToast(json.error ?? 'Error al agregar', false)
    }
  }

  return (
    <>
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-oriental-black">Vendedoras</h2>
          <p className="text-xs text-oriental-gray mt-0.5">El código de 3 dígitos es la clave para generar cotizaciones en la página pública.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-oriental-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus size={14} /> Agregar vendedora
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-oriental-gray text-sm">Cargando...</div>
      ) : vendedoras.length === 0 ? (
        <div className="card p-12 text-center text-oriental-gray">
          <p className="mb-2 text-sm">No hay vendedoras registradas.</p>
          <button onClick={() => setShowModal(true)} className="text-oriental-red text-sm font-semibold hover:underline">
            Agregar la primera
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {vendedoras.map(v => (
            <div key={v.id} className={`card p-4 flex items-center justify-between gap-4 ${!v.activa ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${v.activa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                  {v.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-oriental-black text-sm">{v.nombre}</p>
                  <p className="text-xs text-oriental-gray">Código: •••  ·  {v.activa ? 'Activa' : 'Inactiva'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActiva(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${v.activa ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                >
                  {v.activa ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => eliminar(v)}
                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal agregar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <h3 className="font-bold text-oriental-black">Nueva vendedora</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-oriental-black"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Nombre *</label>
                <input
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red"
                  value={newNombre}
                  onChange={e => setNewNombre(e.target.value)}
                  placeholder="Diana García"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Código *
                  <span className="font-normal ml-1 text-gray-400">(letra + 3 dígitos, ej: D198)</span>
                </label>
                <div className="relative">
                  <input
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red pr-10 tracking-widest font-mono"
                    type={showCodigo ? 'text' : 'password'}
                    maxLength={4}
                    value={newCodigo}
                    onChange={e => setNewCodigo(e.target.value.toUpperCase())}
                    placeholder="X000"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCodigo(p => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCodigo ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Solo comparte este código con la vendedora. No lo compartas en chats grupales.</p>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={agregarVendedora} disabled={saving} className="flex-1 px-4 py-2.5 bg-oriental-black text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? 'Guardando...' : <><Check size={14} /> Agregar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
