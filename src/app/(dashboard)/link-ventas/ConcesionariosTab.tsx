'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Loader2, CheckCircle2, Upload, Star } from 'lucide-react'

interface Concesionario {
  id: string
  nombre: string
  rif: string | null
  direccion: string | null
  telefono: string | null
  correo: string | null
  logo_url: string | null
  prefijo: string
  es_principal: boolean
  activo: boolean
  orden: number
  secuencia: number
}

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red bg-white'
const labelCls = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1'

export default function ConcesionariosTab() {
  const supabase = createClient()
  const [items, setItems] = useState<Concesionario[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    fetch('/api/concesionarios?all=1')
      .then(r => r.json())
      .then((d: Concesionario[]) => { if (Array.isArray(d)) setItems(d) })
      .catch(() => setError('Error al cargar concesionarios'))
      .finally(() => setLoading(false))
  }, [])

  function set(id: string, field: keyof Concesionario, value: unknown) {
    setItems(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
    setSaved(p => ({ ...p, [id]: false }))
  }

  async function subirLogo(id: string, file: File) {
    if (!file.type.startsWith('image/')) { setError('El logo debe ser una imagen'); return }
    setUploading(p => ({ ...p, [id]: true })); setError('')
    try {
      const ext = file.name.split('.').pop() || 'png'
      const path = `concesionarios/${id}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, file, { contentType: file.type, upsert: true })
      if (upErr) { setError('Error al subir: ' + upErr.message); return }
      const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(path)
      set(id, 'logo_url', urlData.publicUrl)
    } catch {
      setError('Error al subir el logo')
    } finally {
      setUploading(p => ({ ...p, [id]: false }))
    }
  }

  async function guardar(id: string) {
    const c = items.find(x => x.id === id)
    if (!c) return
    setSaving(p => ({ ...p, [id]: true })); setError('')
    const r = await fetch(`/api/concesionarios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: c.nombre, rif: c.rif, direccion: c.direccion, telefono: c.telefono,
        correo: c.correo, logo_url: c.logo_url, prefijo: c.prefijo,
        activo: c.activo, es_principal: c.es_principal,
      }),
    })
    setSaving(p => ({ ...p, [id]: false }))
    if (!r.ok) { const d = await r.json(); setError(d.error ?? 'Error al guardar'); return }
    // Si se marcó principal, reflejar que los demás dejan de serlo
    setItems(prev => prev.map(x => x.id === id ? x : (c.es_principal ? { ...x, es_principal: false } : x)))
    setSaved(p => ({ ...p, [id]: true }))
    setTimeout(() => setSaved(p => ({ ...p, [id]: false })), 2500)
  }

  if (loading) return <div className="card p-8 text-center text-oriental-gray text-sm">Cargando concesionarios...</div>

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-bold text-oriental-black">Concesionarios</h2>
        <p className="text-sm text-oriental-gray mt-1">
          Cada concesionario tiene su encabezado (logo y datos legales) y su numeración propia.
          El <strong>principal</strong> es el que sale preseleccionado al generar cotizaciones.
        </p>
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="space-y-4">
        {items.map(c => (
          <div key={c.id} className={`card p-5 ${c.activo ? '' : 'opacity-70'}`}>
            <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-3">
                {c.logo_url
                  ? <img src={c.logo_url} alt={c.nombre} className="h-10 max-w-[160px] object-contain" />
                  : <div className="h-10 px-3 flex items-center bg-gray-100 rounded text-xs text-gray-400">Sin logo</div>}
                <div>
                  <p className="font-bold text-oriental-black text-sm">{c.nombre}</p>
                  <p className="text-[11px] text-gray-400 font-mono">Prefijo {c.prefijo} · N° actual {c.secuencia}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => set(c.id, 'es_principal', !c.es_principal)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${c.es_principal ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                  <Star size={12} className={c.es_principal ? 'fill-amber-400' : ''} /> Principal
                </button>
                <button onClick={() => set(c.id, 'activo', !c.activo)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${c.activo ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                  {c.activo ? 'Activo' : 'Inactivo'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={labelCls}>Nombre legal</label>
                <input className={inputCls} value={c.nombre} onChange={e => set(c.id, 'nombre', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>RIF</label>
                <input className={inputCls} value={c.rif ?? ''} onChange={e => set(c.id, 'rif', e.target.value)} placeholder="J-..." />
              </div>
              <div>
                <label className={labelCls}>Prefijo de numeración</label>
                <input className={`${inputCls} font-mono uppercase`} value={c.prefijo} onChange={e => set(c.id, 'prefijo', e.target.value.toUpperCase())} placeholder="ORI" maxLength={5} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Dirección (una línea por renglón)</label>
                <textarea className={`${inputCls} h-20 resize-none`} value={c.direccion ?? ''} onChange={e => set(c.id, 'direccion', e.target.value)} placeholder={'Av. Principal...\nCiudad - Estado - Venezuela'} />
              </div>
              <div>
                <label className={labelCls}>Teléfono</label>
                <input className={inputCls} value={c.telefono ?? ''} onChange={e => set(c.id, 'telefono', e.target.value)} placeholder="0414-..." />
              </div>
              <div>
                <label className={labelCls}>Correo</label>
                <input className={inputCls} value={c.correo ?? ''} onChange={e => set(c.id, 'correo', e.target.value)} placeholder="correo@..." />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <input ref={el => { fileRefs.current[c.id] = el }} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) subirLogo(c.id, f); e.target.value = '' }} />
              <button onClick={() => fileRefs.current[c.id]?.click()} disabled={uploading[c.id]}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60">
                {uploading[c.id] ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploading[c.id] ? 'Subiendo...' : (c.logo_url ? 'Cambiar logo' : 'Subir logo')}
              </button>
              <div className="flex-1" />
              <button onClick={() => guardar(c.id)} disabled={saving[c.id]}
                className="flex items-center gap-1.5 px-4 py-2 bg-oriental-red text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-60">
                {saving[c.id] ? <Loader2 size={14} className="animate-spin" /> : saved[c.id] ? <CheckCircle2 size={14} /> : <Save size={14} />}
                {saving[c.id] ? 'Guardando...' : saved[c.id] ? 'Guardado' : 'Guardar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
