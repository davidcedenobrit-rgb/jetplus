'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { ClienteSchema } from '@/lib/validations'

export default function NuevoClientePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsed = ClienteSchema.safeParse({
      nombre,
      cedula_rif: cedulaRif,
      tipo,
      telefono: telefono || null,
      whatsapp: whatsapp || null,
      correo: correo || null,
      direccion: direccion || null,
      ciudad: ciudad || null,
      observaciones: observaciones || null,
    })
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Datos inválidos')
      return
    }

    setLoading(true)
    setError('')

    const { error: insertError } = await supabase.from('clientes').insert({
      ...parsed.data,
      correo: parsed.data.correo || null,
      activo: true,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push('/clientes')
    router.refresh()
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/clientes" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Nuevo cliente</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Registrar persona natural o jurídica</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tipo */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" />
            Tipo de cliente
          </h2>
          <div className="flex gap-2">
            {(['natural', 'juridico'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                  tipo === t
                    ? 'bg-oriental-black text-white border-oriental-black'
                    : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
                }`}
              >
                {t === 'natural' ? 'Persona natural' : 'Persona jurídica'}
              </button>
            ))}
          </div>
        </div>

        {/* Datos */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" />
            Datos del cliente
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">{tipo === 'juridico' ? 'Razón social' : 'Nombre completo'} *</label>
              <input type="text" className="input" placeholder={tipo === 'juridico' ? 'Empresa C.A.' : 'Juan Pérez'} value={nombre} onChange={e => setNombre(e.target.value)} required />
            </div>
            <div>
              <label className="label">{tipo === 'juridico' ? 'RIF' : 'Cédula / RIF'} *</label>
              <input type="text" className="input font-mono" placeholder={tipo === 'juridico' ? 'J-12345678-9' : 'V-12345678'} value={cedulaRif} onChange={e => setCedulaRif(e.target.value)} required />
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
              <input type="email" className="input" placeholder="correo@ejemplo.com" value={correo} onChange={e => setCorreo(e.target.value)} />
            </div>
            <div>
              <label className="label">Ciudad</label>
              <input type="text" className="input" placeholder="Maturín" value={ciudad} onChange={e => setCiudad(e.target.value)} />
            </div>
            <div>
              <label className="label">Dirección</label>
              <input type="text" className="input" placeholder="Av. Principal..." value={direccion} onChange={e => setDireccion(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Observaciones</label>
              <textarea className="textarea" rows={3} placeholder="Notas sobre el cliente..." value={observaciones} onChange={e => setObservaciones(e.target.value)} />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <div className="w-1.5 h-1.5 bg-oriental-red rounded-full flex-shrink-0" />
            <p className="text-oriental-red text-sm">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary flex items-center gap-2 py-3 px-6" disabled={loading}>
            <Save size={16} />
            {loading ? 'Guardando...' : 'Registrar cliente'}
          </button>
          <Link href="/clientes" className="btn-secondary py-3 px-6">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
