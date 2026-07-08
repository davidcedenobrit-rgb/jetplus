'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Loader2, X, Copy, Check, MessageCircle } from 'lucide-react'

export default function NuevoEmpleadoButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [f, setF] = useState({ nombre: '', cargo: '', departamento: '', cedula: '', telefono: '', correo: '', reportaA: '' })
  const [creado, setCreado] = useState<{ link: string; nombre: string } | null>(null)
  const [copiado, setCopiado] = useState(false)

  function set(k: keyof typeof f, v: string) { setF(prev => ({ ...prev, [k]: v })) }

  function cerrar() {
    if (loading) return
    setOpen(false); setError(''); setCreado(null); setCopiado(false)
    setF({ nombre: '', cargo: '', departamento: '', cedula: '', telefono: '', correo: '', reportaA: '' })
  }

  async function crear() {
    setError('')
    if (!f.nombre.trim()) { setError('El nombre es obligatorio'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/corporativo/empleados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'No se pudo crear'); setLoading(false); return }
      const link = `${window.location.origin}/cuestionario/${j.token}`
      setCreado({ link, nombre: f.nombre.trim() })
      router.refresh()
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }

  function copiar() {
    if (!creado) return
    navigator.clipboard.writeText(creado.link)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const waLink = creado
    ? `https://wa.me/?text=${encodeURIComponent(`Hola ${creado.nombre}, por favor completa tu descripción de cargo de La Oriental en las próximas 72 horas: ${creado.link}`)}`
    : '#'

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
        <UserPlus size={16} /> Nuevo empleado
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={cerrar} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-oriental-red flex items-center justify-center">
                  <UserPlus size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-oriental-black text-base">
                    {creado ? 'Empleado agregado' : 'Nuevo empleado'}
                  </h2>
                  <p className="text-xs text-oriental-gray">
                    {creado ? 'Comparte el enlace del cuestionario' : 'Se generará su enlace del cuestionario (72h)'}
                  </p>
                </div>
              </div>
              <button onClick={cerrar} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                <X size={16} className="text-oriental-gray" />
              </button>
            </div>

            {creado ? (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-sm text-green-800 font-semibold">✅ {creado.nombre} agregado a la nómina.</p>
                  <p className="text-xs text-green-700 mt-1">Tiene 72 horas para completar su descripción de cargo desde este enlace.</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-oriental-gray uppercase mb-1">Enlace del cuestionario</p>
                  <p className="text-xs text-oriental-black break-all font-mono">{creado.link}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={copiar} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-oriental-black hover:bg-gray-50">
                    {copiado ? <><Check size={14} className="text-green-600" /> Copiado</> : <><Copy size={14} /> Copiar enlace</>}
                  </button>
                  <a href={waLink} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700">
                    <MessageCircle size={14} /> WhatsApp
                  </a>
                </div>
                <button onClick={cerrar} className="w-full px-4 py-2.5 rounded-lg bg-oriental-black text-white text-sm font-semibold hover:bg-gray-800">
                  Listo
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">Nombre completo *</label>
                  <input type="text" value={f.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre y apellido" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red" autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">Cargo</label>
                    <input type="text" value={f.cargo} onChange={e => set('cargo', e.target.value)} placeholder="Ej: Asesor" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">Área</label>
                    <input type="text" value={f.departamento} onChange={e => set('departamento', e.target.value)} placeholder="Ej: Ventas" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">Cédula</label>
                    <input type="text" value={f.cedula} onChange={e => set('cedula', e.target.value)} placeholder="V-…" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">Teléfono</label>
                    <input type="text" value={f.telefono} onChange={e => set('telefono', e.target.value)} placeholder="0412-…" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">Correo</label>
                  <input type="email" value={f.correo} onChange={e => set('correo', e.target.value)} placeholder="empleado@correo.com" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red" />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2.5">
                    <p className="text-xs text-red-800">{error}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button onClick={cerrar} disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-oriental-gray hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
                  <button onClick={crear} disabled={loading || !f.nombre.trim()} className="flex-1 px-4 py-2.5 rounded-lg bg-oriental-red text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading && <Loader2 size={14} className="animate-spin" />}
                    {loading ? 'Creando…' : 'Crear y generar enlace'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
