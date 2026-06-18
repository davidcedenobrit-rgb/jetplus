'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, Store, CheckCircle2, Car, X } from 'lucide-react'
import Link from 'next/link'
import { ClienteSchema } from '@/lib/validations'
import type { VehiculoShowroom } from '@/types/database'

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

  // Showroom
  const [vehiculosShowroom, setVehiculosShowroom] = useState<VehiculoShowroom[]>([])
  const [showroomSeleccionado, setShowroomSeleccionado] = useState<VehiculoShowroom | null>(null)
  const [loadingShowroom, setLoadingShowroom] = useState(true)

  useEffect(() => {
    async function cargarShowroom() {
      const { data } = await supabase
        .from('vehiculos_showroom')
        .select('*')
        .in('estado', ['en_agencia', 'reservado'])
        .order('created_at', { ascending: false })
      setVehiculosShowroom((data ?? []) as VehiculoShowroom[])
      setLoadingShowroom(false)
    }
    cargarShowroom()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsed = ClienteSchema.safeParse({
      nombre, cedula_rif: cedulaRif, tipo,
      telefono: telefono || null, whatsapp: whatsapp || null,
      correo: correo || null, direccion: direccion || null,
      ciudad: ciudad || null, observaciones: observaciones || null,
    })
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Datos inválidos')
      return
    }

    setLoading(true)
    setError('')

    // 1. Crear cliente via API route (admin client — evita problemas de sesión browser)
    let clienteId: string
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...parsed.data, correo: parsed.data.correo || null }),
      })
      const json = await res.json()
      if (!res.ok || !json.id) {
        setError(json.error ?? 'Error al crear cliente')
        setLoading(false)
        return
      }
      clienteId = json.id
    } catch {
      setError('Error de conexión al crear el cliente. Intenta de nuevo.')
      setLoading(false)
      return
    }

    // 2. Si hay showroom seleccionado, crear vehículo y vincularlo
    if (showroomSeleccionado) {
      const sv = showroomSeleccionado

      // Crear vehículo desde datos del showroom
      const { data: vehiculoData, error: vErr } = await supabase
        .from('vehiculos')
        .insert({
          cliente_id: clienteId,
          marca: sv.marca as any,
          modelo: sv.modelo,
          version: sv.version,
          anio: sv.anio,
          color: sv.color,
          placa: sv.placa,
          vin: sv.vin,
          serial_motor: sv.serial_motor,
          tipo_compra: 'financiado',
          estado: 'activo',
          observaciones: sv.observaciones,
        })
        .select('id')
        .single()

      if (!vErr && vehiculoData) {
        // Vincular showroom → cliente y vehículo, marcar vendido
        await supabase.from('vehiculos_showroom').update({
          estado: 'vendido',
          cliente_id: clienteId,
          vehiculo_id: vehiculoData.id,
          updated_at: new Date().toISOString(),
        }).eq('id', sv.id)

        // Redirigir al cliente con el vehículo ya creado
        router.push(`/clientes/${clienteId}`)
        router.refresh()
        return
      }
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

        {/* Selector de vehículo showroom */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-1 flex items-center gap-2">
            <div className="w-1 h-4 bg-orange-400 rounded-full" />
            ¿Compra un vehículo del Showroom?
          </h2>
          <p className="text-xs text-oriental-gray mb-4">Opcional — selecciona si el cliente se lleva un carro de consignación</p>

          {loadingShowroom ? (
            <p className="text-sm text-oriental-gray">Cargando disponibilidad…</p>
          ) : vehiculosShowroom.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-4 text-center">
              <Store size={24} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-oriental-gray">No hay vehículos disponibles en showroom</p>
            </div>
          ) : (
            <>
              {showroomSeleccionado ? (
                <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                      <Car size={18} className="text-orange-600" />
                    </div>
                    <div>
                      <p className="font-bold text-oriental-black">{showroomSeleccionado.marca} {showroomSeleccionado.modelo}</p>
                      <p className="text-xs text-oriental-gray">
                        {showroomSeleccionado.placa && <span className="font-mono font-bold mr-2">{showroomSeleccionado.placa}</span>}
                        {showroomSeleccionado.color && <span>{showroomSeleccionado.color} · </span>}
                        {showroomSeleccionado.anio}
                      </p>
                    </div>
                    <CheckCircle2 size={20} className="text-orange-500" />
                  </div>
                  <button type="button" onClick={() => setShowroomSeleccionado(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-orange-100 transition-colors">
                    <X size={16} className="text-orange-600" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {vehiculosShowroom.map(v => (
                    <button key={v.id} type="button" onClick={() => setShowroomSeleccionado(v)}
                      className="rounded-xl border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50 p-3 text-left transition-all group">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.marca === 'MG' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {v.marca}
                        </span>
                        {v.estado === 'reservado' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Reservado</span>
                        )}
                      </div>
                      <p className="font-bold text-oriental-black text-sm">{v.modelo}</p>
                      <p className="text-xs text-oriental-gray mt-0.5">
                        {v.placa && <span className="font-mono font-bold mr-1">{v.placa}</span>}
                        {v.color && <span>{v.color}</span>}
                        {v.anio && <span> · {v.anio}</span>}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Tipo */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" />
            Tipo de cliente
          </h2>
          <div className="flex gap-2">
            {(['natural', 'juridico'] as const).map(t => (
              <button key={t} type="button" onClick={() => setTipo(t)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${tipo === t ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'}`}>
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

        {showroomSeleccionado && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
            <p className="text-sm text-orange-800 font-semibold">
              ✓ Al registrar, se creará el vehículo automáticamente y el showroom quedará marcado como Vendido.
            </p>
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
