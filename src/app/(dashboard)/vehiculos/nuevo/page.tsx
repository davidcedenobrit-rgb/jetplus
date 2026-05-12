'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, Search, X } from 'lucide-react'
import Link from 'next/link'
import type { Cliente } from '@/types/database'
import { VehiculoSchema } from '@/lib/validations'

const MODELOS_MG = ['ZS', 'ZS EV', 'HS', 'MG5', 'MG4', 'MG7', 'GT', 'RX5', 'RX8', 'Marvel R', 'Cyberster']
const MODELOS_MAXUS = ['T60', 'T90', 'D60', 'D90 Pro', 'G50', 'G90', 'MIFA 9', 'eDeliver 3', 'eDeliver 7', 'eT20', 'V90 EV']

export default function NuevoVehiculoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [clienteQuery, setClienteQuery] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  const [marca, setMarca] = useState<'MG' | 'MAXUS'>('MG')
  const [modelo, setModelo] = useState('')
  const [version, setVersion] = useState('')
  const [anio, setAnio] = useState(String(new Date().getFullYear()))
  const [color, setColor] = useState('')
  const [placa, setPlaca] = useState('')
  const [vin, setVin] = useState('')
  const [tipoCompra, setTipoCompra] = useState<'contado' | 'financiado'>('contado')
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [observaciones, setObservaciones] = useState('')

  useEffect(() => {
    const cid = searchParams.get('cliente_id')
    if (cid) {
      supabase.from('clientes').select('*').eq('id', cid).single().then(({ data }) => {
        if (data) { setClienteSeleccionado(data); setClienteQuery(data.nombre) }
      })
    }
  }, [])

  useEffect(() => {
    if (clienteQuery.length < 2 || clienteSeleccionado) { setClientes([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('clientes')
        .select('*')
        .or(`nombre.ilike.%${clienteQuery}%,cedula_rif.ilike.%${clienteQuery}%`)
        .eq('activo', true)
        .limit(8)
      setClientes(data ?? [])
      setShowDropdown(true)
    }, 300)
    return () => clearTimeout(t)
  }, [clienteQuery])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteSeleccionado) { setError('Selecciona un cliente'); return }

    const parsed = VehiculoSchema.safeParse({
      marca,
      modelo,
      version: version || null,
      anio: parseInt(anio) || null,
      color: color || null,
      placa: placa.toUpperCase() || null,
      vin: vin.toUpperCase() || null,
      tipo_compra: tipoCompra,
      fecha_entrega: fechaEntrega || null,
      estado: 'activo',
      observaciones: observaciones || null,
    })
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Datos inválidos')
      return
    }

    setLoading(true)
    setError('')

    const { error: insertError } = await supabase.from('vehiculos').insert({
      cliente_id: clienteSeleccionado.id,
      ...parsed.data,
    })

    if (insertError) { setError(insertError.message); setLoading(false); return }
    router.push('/vehiculos')
    router.refresh()
  }

  const modelos = marca === 'MG' ? MODELOS_MG : MODELOS_MAXUS

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/vehiculos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Nuevo vehículo</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Registrar unidad MG o MAXUS</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cliente */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" />
            Propietario
          </h2>
          <div className="relative">
            <label className="label">Buscar cliente *</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray" />
              <input type="text" className="input pl-9 pr-9" placeholder="Nombre o cédula..." value={clienteQuery}
                onChange={e => { setClienteQuery(e.target.value); setClienteSeleccionado(null) }}
                onFocus={() => clientes.length > 0 && setShowDropdown(true)} />
              {clienteSeleccionado && (
                <button type="button" onClick={() => { setClienteSeleccionado(null); setClienteQuery('') }} className="absolute right-3 top-1/2 -translate-y-1/2 text-oriental-gray hover:text-oriental-red">
                  <X size={16} />
                </button>
              )}
            </div>
            {showDropdown && clientes.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                {clientes.map(c => (
                  <button key={c.id} type="button" onClick={() => { setClienteSeleccionado(c); setClienteQuery(c.nombre); setShowDropdown(false) }}
                    className="w-full text-left px-4 py-3 hover:bg-oriental-bg transition-colors border-b border-gray-50 last:border-0">
                    <p className="font-medium text-oriental-black text-sm">{c.nombre}</p>
                    <p className="text-xs text-oriental-gray">{c.cedula_rif}</p>
                  </button>
                ))}
              </div>
            )}
            {clienteSeleccionado && (
              <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800">
                Seleccionado: <span className="font-semibold">{clienteSeleccionado.nombre}</span> — {clienteSeleccionado.cedula_rif}
              </div>
            )}
          </div>
        </div>

        {/* Vehículo */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" />
            Datos del vehículo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Marca *</label>
              <div className="flex gap-2">
                {(['MG', 'MAXUS'] as const).map(m => (
                  <button key={m} type="button" onClick={() => { setMarca(m); setModelo('') }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-colors ${
                      marca === m ? 'bg-oriental-red text-white border-oriental-red' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Modelo *</label>
              <select className="select" value={modelo} onChange={e => setModelo(e.target.value)} required>
                <option value="">Seleccionar...</option>
                {modelos.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Versión / Trim</label>
              <input type="text" className="input" placeholder="Ej: Luxury, Comfort" value={version} onChange={e => setVersion(e.target.value)} />
            </div>
            <div>
              <label className="label">Año</label>
              <input type="number" className="input" min="2020" max="2030" value={anio} onChange={e => setAnio(e.target.value)} />
            </div>
            <div>
              <label className="label">Color</label>
              <input type="text" className="input" placeholder="Blanco perlado" value={color} onChange={e => setColor(e.target.value)} />
            </div>
            <div>
              <label className="label">Placa</label>
              <input type="text" className="input font-mono uppercase" placeholder="ABC123" value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className="label">VIN / Chasis</label>
              <input type="text" className="input font-mono uppercase" placeholder="VIN de 17 caracteres" value={vin} onChange={e => setVin(e.target.value.toUpperCase())} maxLength={17} />
            </div>
            <div>
              <label className="label">Fecha de entrega</label>
              <input type="date" className="input" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Compra */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" />
            Tipo de compra
          </h2>
          <div className="flex gap-2">
            {(['contado', 'financiado'] as const).map(t => (
              <button key={t} type="button" onClick={() => setTipoCompra(t)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors capitalize ${
                  tipoCompra === t ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
                }`}>
                {t}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <label className="label">Observaciones</label>
            <textarea className="textarea" rows={3} placeholder="Notas del vehículo..." value={observaciones} onChange={e => setObservaciones(e.target.value)} />
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
            <Save size={16} /> {loading ? 'Guardando...' : 'Registrar vehículo'}
          </button>
          <Link href="/vehiculos" className="btn-secondary py-3 px-6">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
