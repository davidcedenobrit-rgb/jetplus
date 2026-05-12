'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { METODOS_PAGO, BANCOS_VE } from '@/lib/utils'
import { IngresoSchema } from '@/lib/validations'
import { ArrowLeft, Save, Search, X, Car, Hash } from 'lucide-react'
import Link from 'next/link'
import type { Cliente, Vehiculo } from '@/types/database'

const CONCEPTOS = [
  'Cuota de vehículo',
  'Inicial de vehículo',
  'Saldo de vehículo',
  'Trámite vehicular',
  'Seguro vehicular',
  'Placa',
  'Accesorios',
  'Servicio de taller',
  'Abono a crédito',
  'Otro',
]

type ModosBusqueda = 'placa' | 'cliente'

export default function NuevoIngresoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Modo de búsqueda
  const [modo, setModo] = useState<ModosBusqueda>('placa')

  // ── Búsqueda por PLACA ──
  const [placaQuery, setPlacaQuery] = useState('')
  const [buscandoPlaca, setBuscandoPlaca] = useState(false)

  // ── Búsqueda por CLIENTE ──
  const [clienteQuery, setClienteQuery] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)

  // ── Datos resueltos ──
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)
  const [vehiculosCliente, setVehiculosCliente] = useState<Vehiculo[]>([])
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<Vehiculo | null>(null)
  const [showVehiculoDropdown, setShowVehiculoDropdown] = useState(false)

  // ── Campos del pago ──
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState<'USD' | 'VES'>('USD')
  const [metodoPago, setMetodoPago] = useState('')
  const [bancoEmisor, setBancoEmisor] = useState('')
  const [bancoReceptor, setBancoReceptor] = useState('')
  const [referencia, setReferencia] = useState('')
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0])
  const [observaciones, setObservaciones] = useState('')

  // ── Buscar por placa ──
  async function buscarPorPlaca() {
    const placa = placaQuery.trim().toUpperCase()
    if (!placa) return
    setBuscandoPlaca(true)
    const { data: vehiculo } = await supabase
      .from('vehiculos')
      .select('*, clientes(*)')
      .ilike('placa', placa)
      .limit(1)
      .single()
    setBuscandoPlaca(false)

    if (!vehiculo) {
      setError(`No se encontró ningún vehículo con placa "${placa}"`)
      return
    }
    setError('')
    setVehiculoSeleccionado(vehiculo)
    setClienteSeleccionado((vehiculo as any).clientes)
  }

  // ── Buscar clientes por nombre/cédula ──
  useEffect(() => {
    if (clienteQuery.length < 2 || clienteSeleccionado) { setClientes([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('clientes').select('*')
        .or(`nombre.ilike.%${clienteQuery}%,cedula_rif.ilike.%${clienteQuery}%`)
        .eq('activo', true).limit(8)
      setClientes(data ?? [])
      setShowClienteDropdown(true)
    }, 300)
    return () => clearTimeout(t)
  }, [clienteQuery])

  // ── Cargar vehículos del cliente ──
  useEffect(() => {
    if (!clienteSeleccionado) { setVehiculosCliente([]); return }
    supabase.from('vehiculos').select('*')
      .eq('cliente_id', clienteSeleccionado.id)
      .then(({ data }) => {
        setVehiculosCliente(data ?? [])
        if (data && data.length === 1) {
          setVehiculoSeleccionado(data[0])
        } else if (data && data.length > 1 && modo === 'cliente') {
          setShowVehiculoDropdown(true)
        }
      })
  }, [clienteSeleccionado])

  function resetBusqueda() {
    setClienteSeleccionado(null)
    setVehiculoSeleccionado(null)
    setVehiculosCliente([])
    setClienteQuery('')
    setPlacaQuery('')
    setShowClienteDropdown(false)
    setShowVehiculoDropdown(false)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteSeleccionado) { setError('Busca y selecciona un cliente o placa'); return }

    const montoNum = parseFloat(monto)
    const parsed = IngresoSchema.safeParse({
      concepto,
      monto: montoNum,
      moneda,
      metodo_pago: metodoPago,
      banco_emisor: bancoEmisor || null,
      banco_receptor: bancoReceptor || null,
      referencia: referencia || null,
      fecha_pago: fechaPago,
      observaciones: observaciones || null,
    })
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Datos inválidos')
      return
    }

    setLoading(true)
    setError('')

    const year = new Date().getFullYear()
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    const seq = String(buf[0] % 1_000_000).padStart(6, '0')
    const numero_recibo = `LOA-REC-${year}-${seq}`

    const { data: { user } } = await supabase.auth.getUser()

    const { error: insertError } = await supabase.from('ingresos').insert({
      numero_recibo,
      cliente_id: clienteSeleccionado.id,
      vehiculo_id: vehiculoSeleccionado?.id ?? null,
      placa: vehiculoSeleccionado?.placa ?? null,
      concepto,
      monto: parsed.data.monto,
      moneda,
      metodo_pago: metodoPago,
      banco_emisor: bancoEmisor || null,
      banco_receptor: bancoReceptor || null,
      referencia: referencia || null,
      fecha_pago: fechaPago,
      observaciones: observaciones || null,
      estado: 'pendiente_aprobacion',
      registrado_por: user?.id ?? '',
    })

    if (insertError) { setError(insertError.message); setLoading(false); return }
    router.push('/ingresos')
    router.refresh()
  }

  const hayVehiculoResuelto = !!vehiculoSeleccionado
  const hayClienteResuelto = !!clienteSeleccionado

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/ingresos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Registrar ingreso</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Nuevo pago de cliente</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── BÚSQUEDA ── */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" />
            Identificar cliente y vehículo
          </h2>

          {/* Selector de modo */}
          <div className="flex gap-2 mb-5">
            <button type="button" onClick={() => { setModo('placa'); resetBusqueda() }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                modo === 'placa' ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
              }`}>
              <Hash size={14} /> Buscar por placa
            </button>
            <button type="button" onClick={() => { setModo('cliente'); resetBusqueda() }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                modo === 'cliente' ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
              }`}>
              <Search size={14} /> Buscar por cliente
            </button>
          </div>

          {/* ── MODO PLACA ── */}
          {modo === 'placa' && !hayVehiculoResuelto && (
            <div>
              <label className="label">Placa del vehículo</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray" />
                  <input
                    type="text"
                    className="input pl-9 font-mono uppercase tracking-widest text-lg"
                    placeholder="ABC123"
                    value={placaQuery}
                    onChange={e => setPlacaQuery(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), buscarPorPlaca())}
                    maxLength={7}
                  />
                </div>
                <button
                  type="button"
                  onClick={buscarPorPlaca}
                  disabled={buscandoPlaca || !placaQuery}
                  className="btn-primary px-5 disabled:opacity-50"
                >
                  {buscandoPlaca ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
              <p className="text-xs text-oriental-gray mt-1.5">Presiona Enter o el botón para buscar</p>
            </div>
          )}

          {/* ── MODO CLIENTE ── */}
          {modo === 'cliente' && !hayClienteResuelto && (
            <div className="relative">
              <label className="label">Nombre o cédula del cliente</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray" />
                <input type="text" className="input pl-9"
                  placeholder="Juan Pérez / V-12345678"
                  value={clienteQuery}
                  onChange={e => { setClienteQuery(e.target.value) }}
                  onFocus={() => clientes.length > 0 && setShowClienteDropdown(true)}
                />
              </div>
              {showClienteDropdown && clientes.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {clientes.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => { setClienteSeleccionado(c); setClienteQuery(c.nombre); setShowClienteDropdown(false) }}
                      className="w-full text-left px-4 py-3 hover:bg-oriental-bg transition-colors border-b border-gray-50 last:border-0">
                      <p className="font-medium text-oriental-black text-sm">{c.nombre}</p>
                      <p className="text-xs text-oriental-gray">{c.cedula_rif}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── SELECTOR DE VEHÍCULO (cuando hay múltiples) ── */}
          {hayClienteResuelto && !hayVehiculoResuelto && vehiculosCliente.length > 1 && (
            <div className="mt-4">
              <p className="text-sm text-oriental-gray mb-2">
                <span className="font-semibold text-oriental-black">{clienteSeleccionado!.nombre}</span> tiene {vehiculosCliente.length} vehículos. ¿Cuál está pagando?
              </p>
              <div className="space-y-2">
                {vehiculosCliente.map(v => (
                  <button key={v.id} type="button"
                    onClick={() => setVehiculoSeleccionado(v)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-oriental-red hover:bg-oriental-red/5 text-left transition-all group"
                  >
                    <div className="w-10 h-10 bg-gray-100 group-hover:bg-oriental-red/10 rounded-full flex items-center justify-center transition-colors">
                      <Car size={18} className="text-oriental-gray group-hover:text-oriental-red" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-oriental-black">{v.marca} {v.modelo} {v.anio}</p>
                      <p className="text-xs text-oriental-gray">{v.version} · {v.color}</p>
                    </div>
                    <span className="font-mono font-bold text-sm bg-gray-100 px-3 py-1.5 rounded">
                      {v.placa ?? 'Sin placa'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── RESULTADO RESUELTO ── */}
          {(hayVehiculoResuelto || hayClienteResuelto) && (
            <div className={`rounded-xl p-4 flex items-center justify-between ${hayVehiculoResuelto ? 'bg-oriental-black' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hayVehiculoResuelto ? 'bg-oriental-red/30' : 'bg-gray-200'}`}>
                  <Car size={18} className={hayVehiculoResuelto ? 'text-white' : 'text-oriental-gray'} />
                </div>
                <div>
                  {hayVehiculoResuelto ? (
                    <>
                      <p className="text-white font-bold">{vehiculoSeleccionado!.marca} {vehiculoSeleccionado!.modelo} {vehiculoSeleccionado!.anio}</p>
                      <p className="text-gray-400 text-xs">{clienteSeleccionado?.nombre} · {clienteSeleccionado?.cedula_rif}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-oriental-black font-bold">{clienteSeleccionado?.nombre}</p>
                      <p className="text-oriental-gray text-xs">{clienteSeleccionado?.cedula_rif}</p>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {hayVehiculoResuelto && (
                  <span className="font-mono font-bold bg-gray-800 text-white px-3 py-1.5 rounded text-sm tracking-widest">
                    {vehiculoSeleccionado!.placa ?? 'Sin placa'}
                  </span>
                )}
                <button type="button" onClick={resetBusqueda}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${hayVehiculoResuelto ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-400 hover:text-oriental-red'}`}>
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── DETALLE DEL PAGO ── */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" />
            Detalle del pago
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Concepto *</label>
              <select className="select" value={concepto} onChange={e => setConcepto(e.target.value)} required>
                <option value="">Seleccionar concepto...</option>
                {CONCEPTOS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Monto *</label>
              <input type="number" step="0.01" min="0" className="input font-semibold text-lg"
                placeholder="0.00" value={monto} onChange={e => setMonto(e.target.value)} required />
            </div>
            <div>
              <label className="label">Moneda *</label>
              <div className="flex gap-2">
                {(['USD', 'VES'] as const).map(m => (
                  <button key={m} type="button" onClick={() => setMoneda(m)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-colors ${
                      moneda === m ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Método de pago *</label>
              <select className="select" value={metodoPago} onChange={e => setMetodoPago(e.target.value)} required>
                <option value="">Seleccionar...</option>
                {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Fecha de pago *</label>
              <input type="date" className="input" value={fechaPago} onChange={e => setFechaPago(e.target.value)} required />
            </div>
            <div>
              <label className="label">Banco emisor</label>
              <select className="select" value={bancoEmisor} onChange={e => setBancoEmisor(e.target.value)}>
                <option value="">Seleccionar...</option>
                {BANCOS_VE.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Banco receptor</label>
              <select className="select" value={bancoReceptor} onChange={e => setBancoReceptor(e.target.value)}>
                <option value="">Seleccionar...</option>
                {BANCOS_VE.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Referencia</label>
              <input type="text" className="input font-mono"
                placeholder="Número de referencia bancaria" value={referencia} onChange={e => setReferencia(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Observaciones</label>
              <textarea className="textarea" rows={3} placeholder="Notas adicionales..."
                value={observaciones} onChange={e => setObservaciones(e.target.value)} />
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
            <Save size={16} /> {loading ? 'Guardando...' : 'Registrar ingreso'}
          </button>
          <Link href="/ingresos" className="btn-secondary py-3 px-6">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
