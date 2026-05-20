'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { METODOS_PAGO, BANCOS_VE } from '@/lib/utils'
import { IngresoSchema } from '@/lib/validations'
import { ArrowLeft, Save, Search, X, Car, Hash, AlertCircle, Clock, Calendar } from 'lucide-react'
import Link from 'next/link'
import FileUpload from '@/components/FileUpload'
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

  // ── Cuotas del vehículo ──
  const [cuotasVencidas, setCuotasVencidas] = useState<any[]>([])
  const [proximasCuotas, setProximasCuotas] = useState<any[]>([])
  const [todasCuotasPendientes, setTodasCuotasPendientes] = useState<any[]>([])
  const [loadingCuotas, setLoadingCuotas] = useState(false)

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
  const [tasaCambio, setTasaCambio] = useState('')
  const [comprobantes, setComprobantes] = useState<{ url: string; nombre: string }[]>([])

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

  // ── Cargar cuotas del vehículo seleccionado ──
  useEffect(() => {
    if (!vehiculoSeleccionado) {
      setCuotasVencidas([]); setProximasCuotas([]); setTodasCuotasPendientes([])
      return
    }
    setLoadingCuotas(true)
    const hoy = new Date().toISOString().split('T')[0]
    supabase.from('creditos').select('id, plan_tipo, frecuencia_pago, moneda, saldo')
      .eq('vehiculo_id', vehiculoSeleccionado.id)
      .eq('estado', 'activo')
      .then(async ({ data: creditos }) => {
        if (!creditos || creditos.length === 0) { setLoadingCuotas(false); return }
        const ids = creditos.map((c: any) => c.id)
        const creditoMap: Record<string, any> = {}
        creditos.forEach((c: any) => { creditoMap[c.id] = c })
        const { data: cuotas } = await supabase.from('cuotas')
          .select('*')
          .in('credito_id', ids)
          .in('estado', ['pendiente', 'vencida'])
          .order('fecha_vencimiento')
        const todas = (cuotas ?? []).map((c: any) => ({ ...c, _credito: creditoMap[c.credito_id] }))

        // Vencidas: anteriores a hoy
        setCuotasVencidas(todas.filter((c: any) => c.fecha_vencimiento < hoy))

        // Próximas: la siguiente por cada crédito activo
        const proximas: any[] = []
        ids.forEach((cid: string) => {
          const proxima = todas.find((c: any) => c.credito_id === cid && c.fecha_vencimiento >= hoy)
          if (proxima) proximas.push(proxima)
        })
        proximas.sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))
        setProximasCuotas(proximas)

        // ── Todas ordenadas por prioridad de pago ──
        // 1. La Oriental primero, luego Vehimotors (o sin clasificar)
        // 2. Dentro de cada crédito: vencidas primero, luego por fecha
        const ordenadas = [...todas].sort((a, b) => {
          const prioA = a._credito?.plan_tipo === 'inicial_la_oriental' ? 0 : 1
          const prioB = b._credito?.plan_tipo === 'inicial_la_oriental' ? 0 : 1
          if (prioA !== prioB) return prioA - prioB
          return a.fecha_vencimiento.localeCompare(b.fecha_vencimiento)
        })
        setTodasCuotasPendientes(ordenadas)
        setLoadingCuotas(false)
      })
  }, [vehiculoSeleccionado])

  // ── Calcular cuotas que cubre este pago (en tiempo real) ──
  const montoUSD = useMemo(() => {
    const m = parseFloat(monto) || 0
    if (moneda === 'USD') return m
    const tasa = parseFloat(tasaCambio) || 0
    return tasa > 0 ? m / tasa : 0
  }, [monto, moneda, tasaCambio])

  const { cuotasAplicar, sobrante } = useMemo(() => {
    if (!vehiculoSeleccionado || montoUSD <= 0 || todasCuotasPendientes.length === 0) {
      return { cuotasAplicar: [], sobrante: 0 }
    }
    const aplicar: any[] = []
    let restante = montoUSD
    for (const cuota of todasCuotasPendientes) {
      if (restante < Number(cuota.monto) - 0.005) break // no alcanza para esta cuota
      aplicar.push(cuota)
      restante -= Number(cuota.monto)
    }
    return { cuotasAplicar: aplicar, sobrante: Math.max(0, restante) }
  }, [montoUSD, todasCuotasPendientes, vehiculoSeleccionado])

  function resetBusqueda() {
    setClienteSeleccionado(null)
    setVehiculoSeleccionado(null)
    setVehiculosCliente([])
    setClienteQuery('')
    setPlacaQuery('')
    setShowClienteDropdown(false)
    setShowVehiculoDropdown(false)
    setCuotasVencidas([])
    setProximasCuotas([])
    setTodasCuotasPendientes([])
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
      tasa_cambio: moneda === 'VES' && tasaCambio ? parseFloat(tasaCambio) : null,
    })
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Datos inválidos')
      return
    }

    setLoading(true)
    setError('')

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      setError('Sesión expirada. Recarga la página e inicia sesión nuevamente.')
      setLoading(false)
      return
    }

    const year = new Date().getFullYear()
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    const seq = String(buf[0] % 1_000_000).padStart(6, '0')
    const numero_recibo = `LOA-REC-${year}-${seq}`

    const { data: inserted, error: insertError } = await supabase.from('ingresos').insert({
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
      tasa_cambio: moneda === 'VES' && tasaCambio ? parseFloat(tasaCambio) : null,
      estado: 'pendiente_aprobacion',
      registrado_por: user.id,
    }).select('id').single()

    if (insertError || !inserted) { setError(insertError?.message ?? 'Error al guardar'); setLoading(false); return }

    if (comprobantes.length > 0) {
      await supabase.from('archivos').insert(
        comprobantes.map(c => ({
          tipo: 'comprobante',
          url: c.url,
          nombre: c.nombre,
          ingreso_id: inserted.id,
          subido_por: user.id,
        }))
      )
    }

    // ── Aplicar cuotas automáticamente ──
    if (cuotasAplicar.length > 0) {
      // 1. Marcar cada cuota como pagada
      for (const cuota of cuotasAplicar) {
        await supabase.from('cuotas').update({
          estado: 'pagada',
          fecha_pago: fechaPago,
          updated_at: new Date().toISOString(),
        }).eq('id', cuota.id)
      }

      // 2. Actualizar saldo de cada crédito afectado
      const creditosAfectados = [...new Set(cuotasAplicar.map((c: any) => c.credito_id))]
      for (const creditoId of creditosAfectados) {
        const cuotasDeCred = cuotasAplicar.filter((c: any) => c.credito_id === creditoId)
        const totalPagado = cuotasDeCred.reduce((s: number, c: any) => s + Number(c.monto), 0)

        const { data: cred } = await supabase
          .from('creditos').select('saldo, num_cuotas').eq('id', creditoId).single()
        if (cred) {
          const nuevoSaldo = Math.max(0, Number(cred.saldo) - totalPagado)
          await supabase.from('creditos').update({
            saldo: nuevoSaldo,
            estado: nuevoSaldo <= 0.01 ? 'pagado' : 'activo',
            updated_at: new Date().toISOString(),
          }).eq('id', creditoId)
        }
      }
    }

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

        {/* ── CUOTAS VENCIDAS / PRÓXIMAS CUOTAS ── */}
        {vehiculoSeleccionado && (loadingCuotas || cuotasVencidas.length > 0 || proximasCuotas.length > 0) && (
          <div className="card p-5">
            <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-3 flex items-center gap-2">
              <div className="w-1 h-4 bg-oriental-red rounded-full" />
              Estado del crédito
            </h2>
            {loadingCuotas ? (
              <p className="text-sm text-oriental-gray">Cargando cuotas...</p>
            ) : (
              <div className="space-y-3">
                {/* Cuotas vencidas */}
                {cuotasVencidas.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle size={15} className="text-red-600" />
                      <p className="text-sm font-bold text-red-700">{cuotasVencidas.length} cuota{cuotasVencidas.length > 1 ? 's' : ''} vencida{cuotasVencidas.length > 1 ? 's' : ''}</p>
                    </div>
                    <div className="space-y-1.5">
                      {cuotasVencidas.map((c: any) => (
                        <div key={c.id} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                          <div>
                            <p className="text-sm font-semibold text-red-800">
                              Cuota #{c.numero_cuota}
                              {c.concepto && <span className="ml-2 text-xs font-normal text-red-600">{c.concepto}</span>}
                            </p>
                            <p className="text-xs text-red-500">
                              Venció: {new Date(c.fecha_vencimiento + 'T12:00:00').toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {c._credito?.frecuencia_pago && <span className="ml-2 capitalize">· {c._credito.frecuencia_pago}</span>}
                            </p>
                          </div>
                          <p className="font-extrabold text-red-700 text-base">${Number(c.monto).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Próximas cuotas — una por cada crédito activo */}
                {proximasCuotas.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar size={15} className="text-oriental-gray" />
                      <p className="text-sm font-bold text-oriental-black">
                        Próxima{proximasCuotas.length > 1 ? 's' : ''} cuota{proximasCuotas.length > 1 ? 's' : ''} a pagar
                        {proximasCuotas.length > 1 && <span className="ml-1 text-xs font-normal text-oriental-gray">({proximasCuotas.length} créditos activos)</span>}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {proximasCuotas.map((c: any) => {
                        const planLabel = c._credito?.plan_tipo === 'inicial_la_oriental'
                          ? 'Inicial La Oriental'
                          : c._credito?.plan_tipo === 'financiamiento_vehimotors'
                          ? 'Vehimotors'
                          : c.concepto ?? null
                        return (
                          <div key={c.id} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
                            <div>
                              <p className="text-sm font-semibold text-blue-800">
                                Cuota #{c.numero_cuota}
                                {planLabel && <span className="ml-2 text-xs font-normal text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">{planLabel}</span>}
                              </p>
                              <p className="text-xs text-blue-500">
                                Vence: {new Date(c.fecha_vencimiento + 'T12:00:00').toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}
                                {c._credito?.frecuencia_pago && <span className="ml-2 capitalize">· {c._credito.frecuencia_pago}</span>}
                              </p>
                            </div>
                            <p className="font-extrabold text-blue-700 text-base">${Number(c.monto).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                          </div>
                        )
                      })}
                      {proximasCuotas.length > 1 && (
                        <div className="flex items-center justify-between bg-blue-100 rounded-lg px-4 py-2 mt-1">
                          <p className="text-sm font-bold text-blue-900">Total a pagar este período</p>
                          <p className="font-extrabold text-blue-900 text-base">
                            ${proximasCuotas.reduce((s, c) => s + Number(c.monto), 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── CUOTAS QUE CUBRE ESTE PAGO ── */}
        {vehiculoSeleccionado && todasCuotasPendientes.length > 0 && montoUSD > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-3 flex items-center gap-2">
              <div className="w-1 h-4 bg-green-500 rounded-full" />
              Cuotas que cubre este pago
            </h2>

            {cuotasAplicar.length > 0 ? (
              <div className="space-y-2">
                {cuotasAplicar.map((c: any) => {
                  const planLabel = c._credito?.plan_tipo === 'inicial_la_oriental'
                    ? 'La Oriental' : c._credito?.plan_tipo === 'financiamiento_vehimotors'
                    ? 'Vehimotors' : c.concepto ?? 'Crédito'
                  const planColor = c._credito?.plan_tipo === 'inicial_la_oriental'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  return (
                    <div key={c.id} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <CheckMark />
                        <div>
                          <p className="text-sm font-semibold text-green-800">
                            Cuota #{c.numero_cuota}
                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded border ${planColor}`}>{planLabel}</span>
                          </p>
                          <p className="text-xs text-green-600">
                            {c.fecha_vencimiento < new Date().toISOString().split('T')[0] ? '⚠ Vencida — ' : ''}
                            Vence: {new Date(c.fecha_vencimiento + 'T12:00:00').toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <p className="font-extrabold text-green-700">${Number(c.monto).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                    </div>
                  )
                })}

                {/* Resumen total */}
                <div className="flex items-center justify-between bg-green-700 rounded-lg px-4 py-3 mt-1">
                  <p className="text-sm font-bold text-white">
                    {cuotasAplicar.length} cuota{cuotasAplicar.length > 1 ? 's' : ''} se marcarán como <span className="underline">Pagadas</span>
                  </p>
                  <p className="font-extrabold text-white">
                    ${cuotasAplicar.reduce((s: number, c: any) => s + Number(c.monto), 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                {sobrante > 0.01 && (
                  <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2.5">
                    <AlertCircle size={15} className="text-yellow-600 flex-shrink-0" />
                    <p className="text-sm text-yellow-800">
                      Sobrante de <span className="font-bold">${sobrante.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span> — no alcanza para la siguiente cuota
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                <AlertCircle size={15} className="text-yellow-600 flex-shrink-0" />
                <p className="text-sm text-yellow-800">
                  El monto ingresado (${montoUSD.toLocaleString('es-VE', { minimumFractionDigits: 2 })}) no alcanza para cubrir la próxima cuota
                  {todasCuotasPendientes[0] && <span className="font-semibold"> de ${Number(todasCuotasPendientes[0].monto).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>}.
                  El ingreso se registrará como pago parcial.
                </p>
              </div>
            )}
          </div>
        )}

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
            {moneda === 'VES' && (
              <div>
                <label className="label">Tasa del día (Bs/$) *</label>
                <input type="number" step="0.01" min="0" className="input font-semibold"
                  placeholder="Ej: 36.50" value={tasaCambio} onChange={e => setTasaCambio(e.target.value)} required />
                {tasaCambio && parseFloat(monto) > 0 && (
                  <p className="text-xs text-oriental-gray mt-1">
                    Equivale a ~${(parseFloat(monto) / parseFloat(tasaCambio)).toFixed(2)} USD
                  </p>
                )}
              </div>
            )}
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

        {/* ── COMPROBANTES ── */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" />
            Comprobantes
          </h2>
          <FileUpload files={comprobantes} onFilesChange={setComprobantes} />
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
            {loading ? 'Guardando...' : cuotasAplicar.length > 0
              ? `Registrar y marcar ${cuotasAplicar.length} cuota${cuotasAplicar.length > 1 ? 's' : ''} como pagada${cuotasAplicar.length > 1 ? 's' : ''}`
              : 'Registrar ingreso'
            }
          </button>
          <Link href="/ingresos" className="btn-secondary py-3 px-6">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}

function CheckMark() {
  return (
    <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}
