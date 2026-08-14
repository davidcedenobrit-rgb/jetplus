'use client'

import { useEffect, useState } from 'react'
import { Plus, X, Check, Eye, EyeOff, Handshake } from 'lucide-react'

interface Aliado {
  id: string
  nombre: string
  codigo: string
  sector: 'inmobiliario' | 'seguros'
  activo: boolean
  created_at: string
}

interface AliadoLead {
  id: string
  aliado_codigo: string
  aliado_nombre: string
  cliente_nombre: string
  cliente_telefono: string
  vehiculo_interes: string | null
  tiene_inicial: boolean
  inicial_monto: number | null
  created_at: string
}

const SECTOR_LABEL: Record<string, string> = { inmobiliario: 'Inmobiliario', seguros: 'Seguros' }

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg text-white ${ok ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg}
    </div>
  )
}

function fmtFecha(iso: string) {
  try { return new Date(iso).toLocaleString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return iso }
}

export default function AliadosTab() {
  const [aliados, setAliados] = useState<Aliado[]>([])
  const [leads, setLeads] = useState<AliadoLead[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [newNombre, setNewNombre] = useState('')
  const [newCodigo, setNewCodigo] = useState('')
  const [newSector, setNewSector] = useState<'inmobiliario' | 'seguros'>('inmobiliario')
  const [showCodigo, setShowCodigo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filtroAliado, setFiltroAliado] = useState('todos')

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 2800)
  }

  async function load() {
    setLoading(true)
    const [rA, rL] = await Promise.all([fetch('/api/aliados'), fetch('/api/aliados/lead')])
    if (rA.ok) setAliados(await rA.json())
    if (rL.ok) setLeads(await rL.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleActivo(a: Aliado) {
    const r = await fetch('/api/aliados', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: a.id, activo: !a.activo }),
    })
    if (r.ok) {
      setAliados(prev => prev.map(x => x.id === a.id ? { ...x, activo: !a.activo } : x))
      showToast(a.activo ? 'Aliado desactivado' : '✓ Aliado activado', !a.activo)
    } else showToast('Error al actualizar', false)
  }

  async function eliminar(a: Aliado) {
    if (!confirm(`¿Eliminar a ${a.nombre}? Esta acción no se puede deshacer.`)) return
    const r = await fetch('/api/aliados', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: a.id }),
    })
    if (r.ok) {
      setAliados(prev => prev.filter(x => x.id !== a.id))
      showToast('Aliado eliminado', true)
    } else showToast('Error al eliminar', false)
  }

  async function agregarAliado() {
    if (!newNombre.trim() || !newCodigo.trim()) { showToast('Nombre y código son requeridos', false); return }
    if (!/^[A-Za-z]\d{3}$/.test(newCodigo.trim())) { showToast('El código debe ser letra + 3 dígitos (ej: A101)', false); return }
    setSaving(true)
    const r = await fetch('/api/aliados', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: newNombre.trim(), codigo: newCodigo.trim(), sector: newSector }),
    })
    const json = await r.json()
    setSaving(false)
    if (r.ok) {
      setAliados(prev => [...prev, json])
      setShowModal(false); setNewNombre(''); setNewCodigo(''); setNewSector('inmobiliario')
      showToast(`✓ ${json.nombre} agregado`, true)
    } else showToast(json.error ?? 'Error al agregar', false)
  }

  const leadsFiltrados = filtroAliado === 'todos' ? leads : leads.filter(l => l.aliado_codigo === filtroAliado)

  if (loading) return <div className="card p-8 text-center text-oriental-gray text-sm">Cargando...</div>

  return (
    <div>
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* ── Gestión de aliados ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-oriental-black flex items-center gap-2"><Handshake size={16} className="text-oriental-red" /> Aliados</h2>
          <p className="text-xs text-oriental-gray mt-0.5">Códigos de acceso para aliados del sector inmobiliario y de seguros.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-3 py-2 bg-oriental-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors">
          <Plus size={14} /> Agregar aliado
        </button>
      </div>

      {aliados.length === 0 ? (
        <div className="card p-8 text-center text-oriental-gray mb-8">
          <p className="mb-2 text-sm">No hay aliados registrados.</p>
          <button onClick={() => setShowModal(true)} className="text-oriental-red text-sm font-semibold hover:underline">Agregar el primero</button>
        </div>
      ) : (
        <div className="space-y-2 mb-8">
          {aliados.map(a => (
            <div key={a.id} className={`card p-4 flex items-center justify-between gap-4 ${!a.activo ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${a.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                  {a.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-oriental-black text-sm">{a.nombre}</p>
                  <p className="text-xs text-oriental-gray">{SECTOR_LABEL[a.sector] ?? a.sector} · Código: {a.codigo} · {a.activo ? 'Activo' : 'Inactivo'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActivo(a)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${a.activo ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                  {a.activo ? 'Desactivar' : 'Activar'}
                </button>
                <button onClick={() => eliminar(a)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50">
                  <X size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Actividad de aliados (clientes referidos) ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-oriental-black">Actividad de aliados</h2>
          <p className="text-xs text-oriental-gray mt-0.5">Clientes que los aliados han enviado al concesionario.</p>
        </div>
        {aliados.length > 0 && (
          <select value={filtroAliado} onChange={e => setFiltroAliado(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-oriental-red bg-white">
            <option value="todos">Todos los aliados</option>
            {aliados.map(a => <option key={a.id} value={a.codigo}>{a.nombre} ({a.codigo})</option>)}
          </select>
        )}
      </div>

      {leadsFiltrados.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-10">Ningún aliado ha enviado clientes todavía.</p>
      ) : (
        <div className="space-y-2">
          {leadsFiltrados.map(l => (
            <div key={l.id} className="card p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="font-semibold text-oriental-black text-sm truncate">{l.cliente_nombre}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700">{l.aliado_nombre} ({l.aliado_codigo})</span>
                  {l.tiene_inicial && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-700">
                      {l.inicial_monto ? `Inicial $${l.inicial_monto}` : 'Con inicial'}
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs truncate">
                  {l.cliente_telefono}{l.vehiculo_interes ? ` · ${l.vehiculo_interes}` : ''}
                </p>
              </div>
              <p className="text-[11px] text-gray-400 shrink-0">{fmtFecha(l.created_at)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal agregar aliado */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <h3 className="font-bold text-oriental-black">Nuevo aliado</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-oriental-black"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Nombre *</label>
                <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red"
                  value={newNombre} onChange={e => setNewNombre(e.target.value)} placeholder="Inmobiliaria Costa Azul" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Sector *</label>
                <div className="flex gap-2">
                  {(['inmobiliario', 'seguros'] as const).map(s => (
                    <button key={s} type="button" onClick={() => setNewSector(s)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${newSector === s ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-oriental-black'}`}>
                      {SECTOR_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Código * <span className="font-normal ml-1 text-gray-400">(letra + 3 dígitos, ej: A101)</span>
                </label>
                <div className="relative">
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red pr-10 tracking-widest font-mono"
                    type={showCodigo ? 'text' : 'password'} maxLength={4} value={newCodigo}
                    onChange={e => setNewCodigo(e.target.value.toUpperCase())} placeholder="A101" />
                  <button type="button" onClick={() => setShowCodigo(p => !p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showCodigo ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Solo comparte este código con el aliado.</p>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={agregarAliado} disabled={saving} className="flex-1 px-4 py-2.5 bg-oriental-black text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? 'Guardando...' : <><Check size={14} /> Agregar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
