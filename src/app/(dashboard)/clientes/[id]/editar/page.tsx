'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

export default function EditarClientePage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [nombre, setNombre] = useState('')
  const [cedulaRif, setCedulaRif] = useState('')
  const [tipo, setTipo] = useState<'natural' | 'juridico'>('natural')
  const [telefono, setTelefono] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [correo, setCorreo] = useState('')
  const [direccion, setDireccion] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [observaciones, setObservaciones] = useState('')

  useEffect(() => {
    supabase.from('clientes').select('*').eq('id', id).single().then(({ data }) => {
      if (!data) { router.push('/clientes'); return }
      setNombre(data.nombre ?? '')
      setCedulaRif(data.cedula_rif ?? '')
      setTipo(data.tipo ?? 'natural')
      setTelefono(data.telefono ?? '')
      setWhatsapp(data.whatsapp ?? '')
      setCorreo(data.correo ?? '')
      setDireccion(data.direccion ?? '')
      setCiudad(data.ciudad ?? '')
      setObservaciones(data.observaciones ?? '')
      setLoading(false)
    })
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !cedulaRif.trim()) { setError('Nombre y cédula son obligatorios'); return }
    setSaving(true); setError('')

    const { error: err } = await supabase.from('clientes').update({
      nombre:       nombre.trim(),
      cedula_rif:   cedulaRif.trim(),
      tipo,
      telefono:     telefono.trim() || null,
      whatsapp:     whatsapp.trim() || null,
      correo:       correo.trim() || null,
      direccion:    direccion.trim() || null,
      ciudad:       ciudad.trim() || null,
      observaciones: observaciones.trim() || null,
      updated_at:   new Date().toISOString(),
    }).eq('id', id)

    if (err) { setError(err.message); setSaving(false); return }
    router.push(`/clientes/${id}`)
    router.refresh()
  }

  if (loading) return <div className="p-8 max-w-3xl"><div className="card p-6 animate-pulse h-64" /></div>

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/clientes/${id}`} className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Editar cliente</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Modifica los datos del cliente</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Tipo */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" /> Tipo de cliente
          </h2>
          <div className="flex gap-2">
            {(['natural', 'juridico'] as const).map(t => (
              <button key={t} type="button" onClick={() => setTipo(t)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                  tipo === t ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
                }`}>
                {t === 'natural' ? 'Persona natural' : 'Persona jurídica'}
              </button>
            ))}
          </div>
        </div>

        {/* Datos */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" /> Datos del cliente
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">{tipo === 'juridico' ? 'Razón social' : 'Nombre completo'} *</label>
              <input type="text" className="input" value={nombre} onChange={e => setNombre(e.target.value)} required />
            </div>
            <div>
              <label className="label">{tipo === 'juridico' ? 'RIF' : 'Cédula / RIF'} *</label>
              <input type="text" className="input font-mono" value={cedulaRif} onChange={e => setCedulaRif(e.target.value)} required />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input type="text" className="input" placeholder="0412-1234567" value={telefono} onChange={e => setTelefono(e.target.value)} />
            </div>
            <div>
              <label className="label">WhatsApp</label>
              <input type="text" className="input" placeholder="+58 412-1234567" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
            </div>
            <div>
              <label className="label">Correo electrónico</label>
              <input type="email" className="input" value={correo} onChange={e => setCorreo(e.target.value)} />
            </div>
            <div>
              <label className="label">Ciudad</label>
              <input type="text" className="input" placeholder="Maturín" value={ciudad} onChange={e => setCiudad(e.target.value)} />
            </div>
            <div>
              <label className="label">Dirección</label>
              <input type="text" className="input" value={direccion} onChange={e => setDireccion(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Observaciones</label>
              <textarea className="textarea" rows={3} value={observaciones} onChange={e => setObservaciones(e.target.value)} />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-oriental-red text-sm">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary flex items-center gap-2 py-3 px-6" disabled={saving}>
            <Save size={16} /> {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <Link href={`/clientes/${id}`} className="btn-secondary py-3 px-6">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
