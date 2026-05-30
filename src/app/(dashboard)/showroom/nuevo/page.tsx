'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, Store } from 'lucide-react'
import Link from 'next/link'

const MODELOS_MG = ['MG3 1.5L MT STD','MG3 1.5L AT STD','MG5 1.5L MT','MG5 1.5L CVT COM','MG ZS MT COM','MG ZS AT COM','MG ZS AT LUX','MG RX5 1.5T DCT','MG RX9 2.0T AT 4WD']
const MODELOS_MAXUS = ['Maxus D60','Maxus D90 AT','Maxus D90 LUX 4x4','Maxus T60 Comfort 4x4','Maxus T60 Comfort 4x2','Maxus T70 4x4 AT','Maxus T90 4x4 Exe. Lux','Maxus S80 Diesel','Maxus C300 Chasis']

export default function NuevoShowroomPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [marca, setMarca] = useState<'MG' | 'MAXUS'>('MG')
  const [modelo, setModelo] = useState('')
  const [version, setVersion] = useState('')
  const [anio, setAnio] = useState(new Date().getFullYear().toString())
  const [color, setColor] = useState('')
  const [placa, setPlaca] = useState('')
  const [vin, setVin] = useState('')
  const [serialMotor, setSerialMotor] = useState('')
  const [fechaLlegada, setFechaLlegada] = useState(new Date().toISOString().split('T')[0])
  const [observaciones, setObservaciones] = useState('')

  const modelos = marca === 'MG' ? MODELOS_MG : MODELOS_MAXUS

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!modelo) { setError('Selecciona un modelo'); return }

    setLoading(true)
    setError('')

    const { error: insertError } = await supabase.from('vehiculos_showroom').insert({
      marca,
      modelo,
      version: version || null,
      anio: anio ? parseInt(anio) : null,
      color: color || null,
      placa: placa.toUpperCase() || null,
      vin: vin || null,
      serial_motor: serialMotor || null,
      fecha_llegada: fechaLlegada,
      estado: 'llegada',
      observaciones: observaciones || null,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push('/showroom')
    router.refresh()
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/showroom" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Registrar vehículo showroom</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Consignación de Vehimotors · Caracas</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Marca */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" />
            Marca
          </h2>
          <div className="flex gap-2">
            {(['MG', 'MAXUS'] as const).map(m => (
              <button key={m} type="button" onClick={() => { setMarca(m); setModelo('') }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-colors ${marca === m ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Datos del vehículo */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" />
            Datos del vehículo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Modelo *</label>
              <select className="input" value={modelo} onChange={e => setModelo(e.target.value)} required>
                <option value="">Seleccionar modelo…</option>
                {modelos.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Versión / Trim</label>
              <input type="text" className="input" placeholder="COM, LUX, etc." value={version} onChange={e => setVersion(e.target.value)} />
            </div>
            <div>
              <label className="label">Año</label>
              <input type="number" className="input" placeholder="2026" min="2020" max="2030" value={anio} onChange={e => setAnio(e.target.value)} />
            </div>
            <div>
              <label className="label">Color</label>
              <input type="text" className="input" placeholder="Plata, Negro, Blanco…" value={color} onChange={e => setColor(e.target.value)} />
            </div>
            <div>
              <label className="label">Placa</label>
              <input type="text" className="input font-mono uppercase" placeholder="AA000AA" value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className="label">VIN / Chasis</label>
              <input type="text" className="input font-mono" placeholder="17 caracteres" value={vin} onChange={e => setVin(e.target.value)} />
            </div>
            <div>
              <label className="label">Serial de motor</label>
              <input type="text" className="input font-mono" placeholder="Serial motor" value={serialMotor} onChange={e => setSerialMotor(e.target.value)} />
            </div>
            <div>
              <label className="label">Fecha de llegada</label>
              <input type="date" className="input" value={fechaLlegada} onChange={e => setFechaLlegada(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Observaciones</label>
              <textarea className="textarea" rows={3} placeholder="Notas de recepción…" value={observaciones} onChange={e => setObservaciones(e.target.value)} />
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
            {loading ? 'Guardando...' : 'Registrar vehículo'}
          </button>
          <Link href="/showroom" className="btn-secondary py-3 px-6">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
