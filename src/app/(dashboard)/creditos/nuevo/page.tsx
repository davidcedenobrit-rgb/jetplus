'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, Search, X, Car, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import type { Cliente, Vehiculo } from '@/types/database'
import { CreditoSchema } from '@/lib/validations'

type Plan = 'credito_40_60' | 'asegurate_500' | 'personalizado'

interface PlanAC500 {
  id: string
  marca: string
  modelo: string
  meses: number
  cuota_0: number
  cuota_1: number
  cuota_2: number
  cuota_3: number
  cuota_4: number
  cuota_5: number
  cuota_6: number
  cuota_7: number
  cuota_8: number
  cuota_9: number
  total: number
}

function formatUSD(n: number) {
  return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

function getCuotasFromPlan(p: PlanAC500): { numero: number; monto: number; dia: string }[] {
  const all = [p.cuota_1, p.cuota_2, p.cuota_3, p.cuota_4, p.cuota_5, p.cuota_6, p.cuota_7, p.cuota_8, p.cuota_9]
  const cuotas = all.slice(0, p.meses)
  return cuotas.map((monto, i) => ({
    numero: i + 1,
    monto,
    dia: i === cuotas.length - 1
      ? `Día ${cuotas.length * 30} (Entrega)`
      : i === 0 ? 'Día 0' : `Día ${i * 30}`,
  }))
}

export default function NuevoCreditoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [plan, setPlan] = useState<Plan>('credito_40_60')

  // Precio desglosado (40/60 y AC500)
  const [precioBase, setPrecioBase] = useState('')
  const [gastosAdmin, setGastosAdmin] = useState('')

  // AC500
  const [cuotasAsegurate, setCuotasAsegurate] = useState<6 | 9>(6)
  const [planesAC500, setPlanesAC500] = useState<PlanAC500[]>([])
  const [planAC500Sel, setPlanAC500Sel] = useState<PlanAC500 | null>(null)
  const [loadingPlanes, setLoadingPlanes] = useState(false)

  // Plan personalizado
  const [inicialCustom, setInicialCustom] = useState('')
  const [numCuotasCustom, setNumCuotasCustom] = useState('12')
  const [montoCuotaCustom, setMontoCuotaCustom] = useState('')
  const [frecuencia, setFrecuencia] = useState('mensual')

  // Cliente
  const [clienteQuery, setClienteQuery] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)

  // Vehículo
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<Vehiculo | null>(null)
  const [loadingVehiculos, setLoadingVehiculos] = useState(false)

  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0])
  const [observaciones, setObservaciones] = useState('')

  // Cálculo del precio total
  const precioCalc = useMemo(() => {
    const base = parseFloat(precioBase) || 0
    const iva = base * 0.16
    const admin = parseFloat(gastosAdmin) || 0
    const total = base + iva + admin
    return { base, iva, admin, total }
  }, [precioBase, gastosAdmin])

  // Buscar clientes
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

  // Cargar vehículos del cliente
  useEffect(() => {
    if (!clienteSeleccionado) { setVehiculos([]); setVehiculoSeleccionado(null); return }
    setLoadingVehiculos(true)
    supabase.from('vehiculos').select('*').eq('cliente_id', clienteSeleccionado.id)
      .then(({ data }) => { setVehiculos(data ?? []); setLoadingVehiculos(false) })
  }, [clienteSeleccionado])

  // Cargar planes AC500 cuando cambia modalidad
  useEffect(() => {
    if (plan !== 'asegurate_500') return
    setLoadingPlanes(true)
    setPlanAC500Sel(null)
    supabase.from('planes_ac500').select('*').eq('meses', cuotasAsegurate).eq('activo', true)
      .order('marca').order('modelo')
      .then(({ data }) => { setPlanesAC500((data as PlanAC500[]) ?? []); setLoadingPlanes(false) })
  }, [plan, cuotasAsegurate])

  // Auto-seleccionar plan AC500 si hay vehículo seleccionado
  useEffect(() => {
    if (plan !== 'asegurate_500' || !vehiculoSeleccionado || planesAC500.length === 0) return
    const modeloBuscar = `${vehiculoSeleccionado.modelo} ${vehiculoSeleccionado.version ?? ''}`.trim()
    const match = planesAC500.find(p =>
      p.marca === vehiculoSeleccionado.marca && (
        p.modelo.includes(vehiculoSeleccionado.modelo) ||
        modeloBuscar.includes(p.modelo.split(' ').slice(0, 2).join(' '))
      )
    )
    if (match) setPlanAC500Sel(match)
  }, [vehiculoSeleccionado, planesAC500, plan])

  // Cálculo plan 40/60
  const calc4060 = useMemo(() => {
    if (precioCalc.total <= 0) return null
    const inicial = precioCalc.total * 0.40
    const saldo = precioCalc.total * 0.60
    const cuota = saldo / 24
    return { inicial, saldo, numCuotas: 24, cuota }
  }, [precioCalc.total])

  // Cuotas AC500 del plan seleccionado
  const cuotasAC500 = useMemo(() => {
    if (!planAC500Sel) return null
    return getCuotasFromPlan(planAC500Sel)
  }, [planAC500Sel])

  // Plan personalizado
  const calcPersonalizado = useMemo(() => {
    const inicial = parseFloat(inicialCustom) || 0
    const numCuotas = parseInt(numCuotasCustom) || 0
    const montoCuota = parseFloat(montoCuotaCustom) || 0
    const saldo = numCuotas * montoCuota
    const total = inicial + saldo
    return { inicial, saldo, numCuotas, montoCuota, total }
  }, [inicialCustom, numCuotasCustom, montoCuotaCustom])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteSeleccionado) { setError('Selecciona un cliente'); return }
    if (!vehiculoSeleccionado) { setError('Selecciona el vehículo'); return }

    let inicial = 0, saldo = 0, numCuotas = 0, montoFinanciado = 0

    if (plan === 'credito_40_60' && calc4060) {
      inicial = calc4060.inicial
      saldo = calc4060.saldo
      numCuotas = 24
      montoFinanciado = precioCalc.total
    } else if (plan === 'asegurate_500' && planAC500Sel) {
      inicial = planAC500Sel.cuota_0
      saldo = planAC500Sel.total - planAC500Sel.cuota_0
      numCuotas = cuotasAsegurate
      montoFinanciado = planAC500Sel.total
    } else if (plan === 'personalizado') {
      inicial = calcPersonalizado.inicial
      saldo = calcPersonalizado.saldo
      numCuotas = calcPersonalizado.numCuotas
      montoFinanciado = inicial + saldo
    } else {
      setError('Selecciona un plan válido'); return
    }

    const parsed = CreditoSchema.safeParse({
      monto_financiado: montoFinanciado,
      inicial,
      num_cuotas: numCuotas,
      frecuencia_pago: plan === 'personalizado' ? frecuencia : 'mensual',
      fecha_inicio: fechaInicio,
      moneda: 'USD',
      observaciones: observaciones || null,
    })
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Datos del crédito inválidos')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    setLoading(true)
    setError('')

    const planLabel = plan === 'credito_40_60' ? 'Crédito 40/60'
      : plan === 'asegurate_500' ? `Asegúrate $500 (${cuotasAsegurate}m) — ${planAC500Sel?.modelo}`
      : 'Personalizado'

    const desglose = plan !== 'personalizado'
      ? `Base: ${formatUSD(precioCalc.base)} | IVA: ${formatUSD(precioCalc.iva)} | Admin: ${formatUSD(precioCalc.admin)}`
      : null
    const obsCompleta = [`Plan: ${planLabel}`, desglose, observaciones].filter(Boolean).join('. ')

    const { data: creditoCreado, error: creditoError } = await supabase
      .from('creditos')
      .insert({
        cliente_id: clienteSeleccionado.id,
        vehiculo_id: vehiculoSeleccionado.id,
        placa: vehiculoSeleccionado.placa,
        monto_financiado: parsed.data.monto_financiado,
        inicial: parsed.data.inicial,
        saldo,
        num_cuotas: parsed.data.num_cuotas,
        frecuencia_pago: parsed.data.frecuencia_pago,
        fecha_inicio: parsed.data.fecha_inicio,
        moneda: 'USD',
        estado: 'activo',
        observaciones: obsCompleta,
      })
      .select()
      .single()

    if (creditoError) { setError(creditoError.message); setLoading(false); return }

    // Generar cuotas
    let cuotasData: { credito_id: string; numero_cuota: number; fecha_vencimiento: string; monto: number; estado: string; mora: number }[] = []

    if (plan === 'asegurate_500' && cuotasAC500) {
      cuotasData = cuotasAC500.map((c, i) => {
        const fecha = new Date(fechaInicio)
        fecha.setDate(fecha.getDate() + (i * 30))
        return {
          credito_id: creditoCreado.id,
          numero_cuota: c.numero,
          fecha_vencimiento: fecha.toISOString().split('T')[0],
          monto: c.monto,
          estado: 'pendiente',
          mora: 0,
        }
      })
    } else if (plan === 'credito_40_60' && calc4060) {
      cuotasData = Array.from({ length: 24 }, (_, i) => {
        const fecha = new Date(fechaInicio)
        fecha.setMonth(fecha.getMonth() + (i + 1))
        return {
          credito_id: creditoCreado.id,
          numero_cuota: i + 1,
          fecha_vencimiento: fecha.toISOString().split('T')[0],
          monto: calc4060.cuota,
          estado: 'pendiente',
          mora: 0,
        }
      })
    } else {
      cuotasData = Array.from({ length: numCuotas }, (_, i) => {
        const fecha = new Date(fechaInicio)
        fecha.setMonth(fecha.getMonth() + (i + 1))
        return {
          credito_id: creditoCreado.id,
          numero_cuota: i + 1,
          fecha_vencimiento: fecha.toISOString().split('T')[0],
          monto: calcPersonalizado.montoCuota,
          estado: 'pendiente',
          mora: 0,
        }
      })
    }

    await supabase.from('cuotas').insert(cuotasData)

    router.push(`/creditos/${creditoCreado.id}`)
    router.refresh()
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/creditos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Nuevo crédito</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Crear plan de pago para vehículo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── CLIENTE Y VEHÍCULO (primero, porque AC500 depende del modelo) ── */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" />
            Cliente y vehículo
          </h2>

          <div className="relative mb-4">
            <label className="label">Buscar cliente *</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray" />
              <input type="text" className="input pl-9 pr-9"
                placeholder="Nombre o cédula/RIF..."
                value={clienteQuery}
                onChange={e => { setClienteQuery(e.target.value); setClienteSeleccionado(null) }}
                onFocus={() => clientes.length > 0 && setShowClienteDropdown(true)}
              />
              {clienteSeleccionado && (
                <button type="button" onClick={() => { setClienteSeleccionado(null); setClienteQuery(''); setVehiculos([]); setVehiculoSeleccionado(null); setPlanAC500Sel(null) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-oriental-gray hover:text-oriental-red">
                  <X size={16} />
                </button>
              )}
            </div>
            {showClienteDropdown && clientes.length > 0 && !clienteSeleccionado && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-auto">
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
            {clienteSeleccionado && (
              <p className="mt-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                ✓ <span className="font-semibold">{clienteSeleccionado.nombre}</span> — {clienteSeleccionado.cedula_rif}
              </p>
            )}
          </div>

          {clienteSeleccionado && (
            <div>
              <label className="label">Vehículo a financiar *</label>
              {loadingVehiculos ? (
                <p className="text-sm text-oriental-gray">Cargando vehículos...</p>
              ) : vehiculos.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-center justify-between">
                  <p className="text-sm text-yellow-800">Este cliente no tiene vehículos registrados</p>
                  <Link href={`/vehiculos/nuevo?cliente_id=${clienteSeleccionado.id}`}
                    className="text-xs font-semibold text-oriental-red hover:underline">+ Registrar vehículo</Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {vehiculos.map(v => (
                    <button key={v.id} type="button"
                      onClick={() => setVehiculoSeleccionado(v)}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                        vehiculoSeleccionado?.id === v.id
                          ? 'border-oriental-red bg-oriental-red/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        vehiculoSeleccionado?.id === v.id ? 'bg-oriental-red/20' : 'bg-gray-100'
                      }`}>
                        <Car size={18} className={vehiculoSeleccionado?.id === v.id ? 'text-oriental-red' : 'text-oriental-gray'} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-oriental-black">{v.marca} {v.modelo} {v.anio}</p>
                        <p className="text-xs text-oriental-gray">{v.version} · {v.color}</p>
                      </div>
                      <span className="font-mono font-bold text-sm bg-gray-100 px-3 py-1 rounded">
                        {v.placa ?? 'Sin placa'}
                      </span>
                    </button>
                  ))}
                  <Link href={`/vehiculos/nuevo?cliente_id=${clienteSeleccionado.id}`}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-gray-300 text-oriental-red text-sm font-semibold hover:border-oriental-red hover:bg-oriental-red/5 transition-all">
                    <Car size={16} /> + Registrar otro vehículo
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── PLAN ── */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" />
            Plan de financiamiento
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {[
              { value: 'credito_40_60', title: 'Crédito 40/60', desc: '40% inicial + 24 cuotas mensuales' },
              { value: 'asegurate_500', title: 'Asegúrate con $500', desc: '$500 reserva + cuotas según modelo' },
              { value: 'personalizado', title: 'Personalizado', desc: 'Define el plan libremente' },
            ].map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => { setPlan(p.value as Plan); setPlanAC500Sel(null) }}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  plan === p.value
                    ? 'border-oriental-red bg-oriental-red/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className={`font-bold text-sm ${plan === p.value ? 'text-oriental-red' : 'text-oriental-black'}`}>{p.title}</p>
                <p className="text-xs text-oriental-gray mt-0.5">{p.desc}</p>
              </button>
            ))}
          </div>

          {/* ── PLAN 40/60 ── */}
          {plan === 'credito_40_60' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Precio base (USD) *</label>
                  <input type="number" step="0.01" min="0" className="input font-semibold text-lg"
                    placeholder="0.00" value={precioBase} onChange={e => setPrecioBase(e.target.value)} required />
                </div>
                <div>
                  <label className="label">IVA 16% (auto)</label>
                  <div className="input bg-gray-50 text-oriental-gray font-semibold text-lg cursor-not-allowed">
                    {formatUSD(precioCalc.iva)}
                  </div>
                </div>
                <div>
                  <label className="label">Gastos administrativos</label>
                  <input type="number" step="0.01" min="0" className="input font-semibold"
                    placeholder="0.00" value={gastosAdmin} onChange={e => setGastosAdmin(e.target.value)} />
                </div>
              </div>

              {precioCalc.total > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                  <p className="text-sm text-oriental-gray">
                    Base {formatUSD(precioCalc.base)} + IVA {formatUSD(precioCalc.iva)} + Admin {formatUSD(precioCalc.admin)}
                  </p>
                  <p className="text-xl font-extrabold text-oriental-black">Total: {formatUSD(precioCalc.total)}</p>
                </div>
              )}

              {calc4060 && (
                <div className="bg-oriental-black rounded-xl p-5 grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Inicial (40%)</p>
                    <p className="text-white font-extrabold text-xl">{formatUSD(calc4060.inicial)}</p>
                  </div>
                  <div className="text-center border-x border-gray-700">
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Cuota mensual</p>
                    <p className="text-oriental-red font-extrabold text-xl">{formatUSD(calc4060.cuota)}</p>
                    <p className="text-gray-500 text-xs mt-0.5">24 cuotas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Saldo (60%)</p>
                    <p className="text-white font-extrabold text-xl">{formatUSD(calc4060.saldo)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PLAN AC500 ── */}
          {plan === 'asegurate_500' && (
            <div className="space-y-4">
              <div>
                <label className="label">Cronograma</label>
                <div className="flex gap-2">
                  {([6, 9] as const).map(n => (
                    <button key={n} type="button" onClick={() => setCuotasAsegurate(n)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-colors ${
                        cuotasAsegurate === n
                          ? 'bg-oriental-red text-white border-oriental-red'
                          : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
                      }`}>
                      {n} meses
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector de modelo (si no se auto-detectó) */}
              {loadingPlanes ? (
                <p className="text-sm text-oriental-gray">Cargando planes...</p>
              ) : (
                <div>
                  <label className="label">Modelo del plan *</label>
                  <select
                    className="select"
                    value={planAC500Sel?.id ?? ''}
                    onChange={e => {
                      const sel = planesAC500.find(p => p.id === e.target.value)
                      setPlanAC500Sel(sel ?? null)
                    }}
                    required
                  >
                    <option value="">Seleccionar modelo...</option>
                    {planesAC500.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.marca} — {p.modelo} ({formatUSD(p.total)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Cronograma detallado */}
              {planAC500Sel && cuotasAC500 && (
                <div className="bg-oriental-black rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between pb-2">
                    <p className="text-white font-bold text-sm">{planAC500Sel.marca} {planAC500Sel.modelo}</p>
                    <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">{cuotasAsegurate} meses</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-gray-400 text-sm">Cuota 0 — Reserva / Gastos</p>
                    <p className="text-white font-bold">{formatUSD(planAC500Sel.cuota_0)}</p>
                  </div>
                  <div className="border-t border-gray-700" />
                  {cuotasAC500.map((c, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <p className="text-gray-300 text-sm">
                        Cuota {c.numero} — <span className="text-gray-500">{c.dia}</span>
                      </p>
                      <p className={`font-bold ${i === cuotasAC500.length - 1 ? 'text-oriental-red' : 'text-white'}`}>
                        {formatUSD(c.monto)}
                      </p>
                    </div>
                  ))}
                  <div className="border-t border-gray-700 pt-3 flex items-center justify-between">
                    <p className="text-gray-400 text-sm font-semibold uppercase">Total · Entrega mes {cuotasAsegurate}</p>
                    <p className="text-oriental-red font-extrabold text-xl">{formatUSD(planAC500Sel.total)}</p>
                  </div>
                </div>
              )}

              {plan === 'asegurate_500' && !planAC500Sel && planesAC500.length > 0 && (
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                  <AlertCircle size={16} className="text-yellow-600 flex-shrink-0" />
                  <p className="text-sm text-yellow-800">Selecciona el modelo del plan para ver el cronograma de cuotas</p>
                </div>
              )}
            </div>
          )}

          {/* ── PLAN PERSONALIZADO ── */}
          {plan === 'personalizado' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Inicial (USD) *</label>
                  <input type="number" step="0.01" min="0" className="input" placeholder="0.00"
                    value={inicialCustom} onChange={e => setInicialCustom(e.target.value)} required />
                </div>
                <div>
                  <label className="label">N° de cuotas *</label>
                  <input type="number" min="1" max="120" className="input" placeholder="12"
                    value={numCuotasCustom} onChange={e => setNumCuotasCustom(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Monto por cuota (USD) *</label>
                  <input type="number" step="0.01" min="0" className="input" placeholder="0.00"
                    value={montoCuotaCustom} onChange={e => setMontoCuotaCustom(e.target.value)} required />
                </div>
              </div>
              <div>
                <label className="label">Frecuencia de pago</label>
                <div className="flex gap-2">
                  {['semanal', 'quincenal', 'mensual'].map(f => (
                    <button key={f} type="button" onClick={() => setFrecuencia(f)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border capitalize transition-colors ${
                        frecuencia === f ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
                      }`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {calcPersonalizado.numCuotas > 0 && calcPersonalizado.montoCuota > 0 && (
                <div className="bg-oriental-black rounded-xl p-5 grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Inicial</p>
                    <p className="text-white font-extrabold text-xl">{formatUSD(calcPersonalizado.inicial)}</p>
                  </div>
                  <div className="text-center border-x border-gray-700">
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Cuota {frecuencia}</p>
                    <p className="text-oriental-red font-extrabold text-xl">{formatUSD(calcPersonalizado.montoCuota)}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{calcPersonalizado.numCuotas} cuotas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total a pagar</p>
                    <p className="text-white font-extrabold text-xl">{formatUSD(calcPersonalizado.total)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── FECHA Y OBSERVACIONES ── */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" />
            Datos del contrato
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha de inicio *</label>
              <input type="date" className="input" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} required />
            </div>
            <div className="md:col-span-2">
              <label className="label">Observaciones</label>
              <textarea className="textarea" rows={2} placeholder="Condiciones especiales, notas del contrato..."
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
            <Save size={16} /> {loading ? 'Creando crédito...' : 'Crear crédito y generar cuotas'}
          </button>
          <Link href="/creditos" className="btn-secondary py-3 px-6">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
