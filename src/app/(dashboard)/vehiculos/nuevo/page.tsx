'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, Search, X, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import type { Cliente } from '@/types/database'
import { VehiculoSchema, CreditoSchema } from '@/lib/validations'

const MODELOS_MG = [
  'MG5 1.5L Sincronico',
  'MG5 1.5L Automatico',
  'MG3 1.5L Sincronico',
  'MG3 1.5L AT STD',
  'NEW MG ZS AT LUX',
  'NEW MG ZS AT STD',
  'MG ZS Sincrónica Clasica',
  'MG ZS AT Clasica',
  'RX5 1.5T Automatica',
  'RX8',
  'RX9 COM 4x2',
  'RX9 LUX 4x4',
  'MC Cybester',
  'MG4 URBAN COM',
]
const MODELOS_MAXUS = [
  'D60',
  'D60 LUX',
  'D90',
  'D90 4X4 AT LUX',
  'T60 Comfort 4x4 GASOLINA',
  'T60 Comfort 4x2 GASOLINA',
  'T90 4X4 AT Double Exe. Lux Gasolina',
  'S80 1.9L Diesel/Chasis',
  'C30 Chasis',
  'G10 Van Gasolina',
  'G10 Pasajero Gasolina',
]

type Plan = 'credito_40_60' | 'asegurate_500' | 'personalizado'

interface PlanAC500 {
  id: string; marca: string; modelo: string; meses: number
  cuota_0: number; cuota_1: number; cuota_2: number; cuota_3: number
  cuota_4: number; cuota_5: number; cuota_6: number; cuota_7: number
  cuota_8: number; cuota_9: number; total: number
}

function formatUSD(n: number) {
  return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

function getCuotasFromPlan(p: PlanAC500): { numero: number; monto: number; dia: string }[] {
  const all = [p.cuota_1, p.cuota_2, p.cuota_3, p.cuota_4, p.cuota_5, p.cuota_6, p.cuota_7, p.cuota_8, p.cuota_9]
  const cuotas = all.slice(0, p.meses)
  return cuotas.map((monto, i) => ({
    numero: i + 1, monto,
    dia: i === cuotas.length - 1 ? `Día ${cuotas.length * 30} (Entrega)` : i === 0 ? 'Día 0' : `Día ${i * 30}`,
  }))
}

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
  const [serialMotor, setSerialMotor] = useState('')
  const [tipoCompra, setTipoCompra] = useState<'contado' | 'financiado'>('contado')
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [observaciones, setObservaciones] = useState('')

  // Financiamiento
  const [plan, setPlan] = useState<Plan>('credito_40_60')
  const [precioBase, setPrecioBase] = useState('')
  const [gastosAdmin, setGastosAdmin] = useState('')
  const [cuotasAsegurate, setCuotasAsegurate] = useState<6 | 9>(6)
  const [planesAC500, setPlanesAC500] = useState<PlanAC500[]>([])
  const [planAC500Sel, setPlanAC500Sel] = useState<PlanAC500 | null>(null)
  const [loadingPlanes, setLoadingPlanes] = useState(false)
  const [inicialCustom, setInicialCustom] = useState('')
  const [numCuotasCustom, setNumCuotasCustom] = useState('12')
  const [montoCuotaCustom, setMontoCuotaCustom] = useState('')
  const [frecuencia, setFrecuencia] = useState('mensual')
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0])

  // Sub-plan La Oriental (Crédito Inicial)
  const [orMonto, setOrMonto] = useState('')
  const [orCuotas, setOrCuotas] = useState('12')
  const [orMontoCuota, setOrMontoCuota] = useState('')
  const [orFrecuencia, setOrFrecuencia] = useState('mensual')
  const [orFecha, setOrFecha] = useState(new Date().toISOString().split('T')[0])
  const [orObs, setOrObs] = useState('')
  // Sub-plan Vehimotors (Crédito Financiamiento)
  const [vhMonto, setVhMonto] = useState('')
  const [vhCuotas, setVhCuotas] = useState('12')
  const [vhMontoCuota, setVhMontoCuota] = useState('')
  const [vhFrecuencia, setVhFrecuencia] = useState('mensual')
  const [vhFecha, setVhFecha] = useState(new Date().toISOString().split('T')[0])
  const [vhObs, setVhObs] = useState('')
  // Resumen financiero del vehículo (plan personalizado)
  const [precioTotalVehiculo, setPrecioTotalVehiculo] = useState('')
  const [montoContado, setMontoContado] = useState('')

  // Cuota especial (tercer bloque opcional — corre en paralelo a los mensuales)
  const [ceActivo, setCeActivo] = useState(false)
  const [ceMonto, setCeMonto] = useState('')
  const [ceCuotas, setCeCuotas] = useState('8')
  const [ceMontoCuota, setCeMontoCuota] = useState('')
  const [ceFrecuencia, setCeFrecuencia] = useState('trimestral')
  const [ceFecha, setCeFecha] = useState(new Date().toISOString().split('T')[0])
  const [ceObs, setCeObs] = useState('')

  // ── Calculadora de precio (Plan Personalizado) ──
  const [calcBase, setCalcBase] = useState('')
  const [calcIvaPct, setCalcIvaPct] = useState('16')
  const [calcGastosContado, setCalcGastosContado] = useState('')
  const [calcGastosCredito, setCalcGastosCredito] = useState('')
  const [calcPctInicial, setCalcPctInicial] = useState('40')
  const [calcTasaAnual, setCalcTasaAnual] = useState('')
  const [calcNumCuotasVh, setCalcNumCuotasVh] = useState('24')

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
        .from('clientes').select('*')
        .or(`nombre.ilike.%${clienteQuery}%,cedula_rif.ilike.%${clienteQuery}%`)
        .eq('activo', true).limit(8)
      setClientes(data ?? [])
      setShowDropdown(true)
    }, 300)
    return () => clearTimeout(t)
  }, [clienteQuery])

  // Cargar planes AC500
  useEffect(() => {
    if (tipoCompra !== 'financiado' || plan !== 'asegurate_500') return
    setLoadingPlanes(true)
    setPlanAC500Sel(null)
    supabase.from('planes_ac500').select('*').eq('meses', cuotasAsegurate).eq('activo', true)
      .order('marca').order('modelo')
      .then(({ data }) => { setPlanesAC500((data as PlanAC500[]) ?? []); setLoadingPlanes(false) })
  }, [tipoCompra, plan, cuotasAsegurate])

  // Auto-seleccionar plan AC500 si el modelo coincide
  useEffect(() => {
    if (plan !== 'asegurate_500' || !modelo || planesAC500.length === 0) return
    const match = planesAC500.find(p => p.marca === marca && p.modelo.includes(modelo))
    if (match) setPlanAC500Sel(match)
  }, [modelo, marca, planesAC500, plan])

  const precioCalc = useMemo(() => {
    const base = parseFloat(precioBase) || 0
    const iva = base * 0.16
    const admin = parseFloat(gastosAdmin) || 0
    return { base, iva, admin, total: base + iva + admin }
  }, [precioBase, gastosAdmin])

  const calc4060 = useMemo(() => {
    if (precioCalc.total <= 0) return null
    const inicial = precioCalc.total * 0.40
    const saldo = precioCalc.total * 0.60
    return { inicial, saldo, numCuotas: 24, cuota: saldo / 24 }
  }, [precioCalc.total])

  const cuotasAC500 = useMemo(() => {
    if (!planAC500Sel) return null
    return getCuotasFromPlan(planAC500Sel)
  }, [planAC500Sel])

  const calcPersonalizado = useMemo(() => {
    const inicial = parseFloat(inicialCustom) || 0
    const numCuotas = parseInt(numCuotasCustom) || 0
    const montoCuota = parseFloat(montoCuotaCustom) || 0
    const saldo = numCuotas * montoCuota
    return { inicial, saldo, numCuotas, montoCuota, total: inicial + saldo }
  }, [inicialCustom, numCuotasCustom, montoCuotaCustom])

  const calcInicialOriental = useMemo(() => {
    const monto = parseFloat(orMonto) || 0
    const cuotas = parseInt(orCuotas) || 0
    const montoCuota = parseFloat(orMontoCuota) || 0
    const totalCuotas = cuotas * montoCuota
    const showWarning = monto > 0 && cuotas > 0 && montoCuota > 0 && Math.abs(totalCuotas - monto) > 0.01
    return { monto, cuotas, montoCuota, totalCuotas, showWarning }
  }, [orMonto, orCuotas, orMontoCuota])

  const calcVehimotors = useMemo(() => {
    const monto = parseFloat(vhMonto) || 0
    const cuotas = parseInt(vhCuotas) || 0
    const montoCuota = parseFloat(vhMontoCuota) || 0
    const totalCuotas = cuotas * montoCuota
    const showWarning = monto > 0 && cuotas > 0 && montoCuota > 0 && Math.abs(totalCuotas - monto) > 0.01
    return { monto, cuotas, montoCuota, totalCuotas, showWarning }
  }, [vhMonto, vhCuotas, vhMontoCuota])

  const calcCuotaEspecial = useMemo(() => {
    const monto = parseFloat(ceMonto) || 0
    const cuotas = parseInt(ceCuotas) || 0
    const montoCuota = parseFloat(ceMontoCuota) || 0
    const totalCuotas = cuotas * montoCuota
    const showWarning = monto > 0 && cuotas > 0 && montoCuota > 0 && Math.abs(totalCuotas - monto) > 0.01
    return { monto, cuotas, montoCuota, totalCuotas, showWarning }
  }, [ceMonto, ceCuotas, ceMontoCuota])

  const resumenFinanciero = useMemo(() => {
    const precioBase = parseFloat(precioTotalVehiculo) || 0

    // La Oriental: usar monto directo (el total que cobra La Oriental, independiente de cuántas cuotas)
    const totalOr = calcInicialOriental.monto

    // Vehimotors: total de cuotas (incluye interés si hay); si no hay montoCuota, usar monto base
    const totalVh = calcVehimotors.totalCuotas > 0 ? calcVehimotors.totalCuotas : calcVehimotors.monto

    // Cuota especial (paralela)
    const totalCe = ceActivo ? (calcCuotaEspecial.totalCuotas > 0 ? calcCuotaEspecial.totalCuotas : calcCuotaEspecial.monto) : 0

    const totalComprometido = totalOr + totalVh + totalCe

    return { precioBase, totalOr, totalVh, totalCe, totalComprometido }
  }, [precioTotalVehiculo, calcInicialOriental.monto, calcVehimotors.totalCuotas, calcVehimotors.monto, calcCuotaEspecial, ceActivo])

  // ── Calculadora de precio (live) ──
  const calculadora = useMemo(() => {
    const base = parseFloat(calcBase) || 0
    if (base <= 0) return null
    const ivaPct = parseFloat(calcIvaPct) || 16
    const iva = base * ivaPct / 100
    const pctInicial = (parseFloat(calcPctInicial) || 40) / 100
    const gastosContado = parseFloat(calcGastosContado) || 0
    const gastosCredito = parseFloat(calcGastosCredito) || 0

    // Modalidad contado
    const contadoTotal = base + iva + gastosContado

    // Modalidad crédito
    const inicialBase = base * pctInicial            // ej: 40% precio base
    const totalInicialLaOriental = inicialBase + iva + gastosCredito  // total inicial a pagar
    const financiamientoVh = base * (1 - pctInicial) // 60% precio base → Vehimotors
    const n = parseInt(calcNumCuotasVh) || 24
    const tasaAnual = parseFloat(calcTasaAnual) || 0
    let cuotaVh: number
    if (tasaAnual > 0) {
      const r = tasaAnual / 100 / 12  // tasa mensual
      cuotaVh = financiamientoVh * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)
    } else {
      cuotaVh = financiamientoVh / n  // sin interés
    }

    return { base, iva, ivaPct, pctInicial, gastosContado, gastosCredito, contadoTotal, inicialBase, totalInicialLaOriental, financiamientoVh, cuotaVh, n, tasaAnual }
  }, [calcBase, calcIvaPct, calcGastosContado, calcGastosCredito, calcPctInicial, calcTasaAnual, calcNumCuotasVh])

  function aplicarCalculadora() {
    if (!calculadora) return
    // La Oriental: monto total + calcular montoCuota si ya hay cuotas definidas
    setOrMonto(calculadora.totalInicialLaOriental.toFixed(2))
    const cuotasOrActual = parseInt(orCuotas) || 0
    if (cuotasOrActual > 0) {
      setOrMontoCuota((calculadora.totalInicialLaOriental / cuotasOrActual).toFixed(2))
    }
    // Vehimotors: monto financiado, cuotas y cuota calculada
    setVhMonto(calculadora.financiamientoVh.toFixed(2))
    setVhCuotas(String(calculadora.n))
    setVhMontoCuota(calculadora.cuotaVh.toFixed(2))
    // Precio de referencia del vehículo
    setPrecioTotalVehiculo(calculadora.base.toFixed(2))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteSeleccionado) { setError('Selecciona un cliente'); return }

    const parsed = VehiculoSchema.safeParse({
      marca, modelo, version: version || null, anio: parseInt(anio) || null,
      color: color || null, placa: placa.toUpperCase() || null, vin: vin.toUpperCase() || null,
      serial_motor: serialMotor.toUpperCase() || null,
      tipo_compra: tipoCompra, fecha_entrega: fechaEntrega || null, estado: 'activo',
      observaciones: observaciones || null,
    })
    if (!parsed.success) { setError(parsed.error.errors[0]?.message ?? 'Datos inválidos'); return }

    setLoading(true)
    setError('')

    const { data: vehiculo, error: insertError } = await supabase.from('vehiculos').insert({
      cliente_id: clienteSeleccionado.id,
      ...parsed.data,
      precio_base: calculadora ? parseFloat(calcBase) || null : parseFloat(precioBase) || null,
      precio_total: parseFloat(precioTotalVehiculo) || null,
      monto_contado: parseFloat(montoContado) || null,
    }).select().single()

    if (insertError || !vehiculo) { setError(insertError?.message ?? 'Error al guardar'); setLoading(false); return }

    // Si es financiado, crear crédito automáticamente
    if (tipoCompra === 'financiado') {

      // --- Plan Personalizado: crear DOS créditos (uno o ambos activos) ---
      if (plan === 'personalizado') {
        const orActivo = calcInicialOriental.cuotas > 0
        const vhActivo = calcVehimotors.cuotas > 0
        if (!orActivo && !vhActivo) {
          setError('Completa al menos un bloque de crédito'); setLoading(false); return
        }

        function buildCuotas(creditoId: string, cuotas: number, montoCuota: number, frecuencia: string, fechaBase: string, concepto: string) {
          return Array.from({ length: cuotas }, (_, i) => {
            const f = new Date(fechaBase)
            if (frecuencia === 'semanal') f.setDate(f.getDate() + 7 * (i + 1))
            else if (frecuencia === 'quincenal') f.setDate(f.getDate() + 15 * (i + 1))
            else if (frecuencia === 'trimestral') f.setMonth(f.getMonth() + 3 * (i + 1))
            else f.setMonth(f.getMonth() + (i + 1))
            return { credito_id: creditoId, numero_cuota: i + 1, fecha_vencimiento: f.toISOString().split('T')[0], monto: montoCuota, estado: 'pendiente', mora: 0, concepto }
          })
        }

        let primerCreditoId = ''

        if (orActivo) {
          const { data: creditoOr, error: errOr } = await supabase.from('creditos').insert({
            cliente_id: clienteSeleccionado.id, vehiculo_id: vehiculo.id, placa: vehiculo.placa,
            monto_financiado: calcInicialOriental.monto,
            inicial: calcInicialOriental.monto,
            saldo: calcInicialOriental.totalCuotas,
            num_cuotas: calcInicialOriental.cuotas,
            frecuencia_pago: orFrecuencia, fecha_inicio: orFecha,
            moneda: 'USD', estado: 'activo', plan_tipo: 'inicial_la_oriental',
            observaciones: orObs || 'Crédito de Inicial — La Oriental',
          }).select().single()
          if (errOr || !creditoOr) { setError(errOr?.message ?? 'Error creando crédito La Oriental'); setLoading(false); return }
          await supabase.from('cuotas').insert(buildCuotas(creditoOr.id, calcInicialOriental.cuotas, calcInicialOriental.montoCuota, orFrecuencia, orFecha, 'Crédito de Inicial — La Oriental'))
          primerCreditoId = creditoOr.id
        }

        if (vhActivo) {
          const { data: creditoVh, error: errVh } = await supabase.from('creditos').insert({
            cliente_id: clienteSeleccionado.id, vehiculo_id: vehiculo.id, placa: vehiculo.placa,
            monto_financiado: calcVehimotors.monto,
            inicial: calcVehimotors.monto,
            saldo: calcVehimotors.totalCuotas,
            num_cuotas: calcVehimotors.cuotas,
            frecuencia_pago: vhFrecuencia, fecha_inicio: vhFecha,
            moneda: 'USD', estado: 'activo', plan_tipo: 'financiamiento_vehimotors',
            observaciones: vhObs || 'Crédito Financiamiento — Vehimotors',
          }).select().single()
          if (errVh || !creditoVh) { setError(errVh?.message ?? 'Error creando crédito Vehimotors'); setLoading(false); return }
          await supabase.from('cuotas').insert(buildCuotas(creditoVh.id, calcVehimotors.cuotas, calcVehimotors.montoCuota, vhFrecuencia, vhFecha, 'Crédito Financiamiento — Vehimotors'))
          if (!primerCreditoId) primerCreditoId = creditoVh.id
        }

        // Cuota especial (tercer bloque paralelo — ej: trimestral simultánea)
        const ceActivo2 = ceActivo && calcCuotaEspecial.cuotas > 0 && calcCuotaEspecial.montoCuota > 0
        if (ceActivo2) {
          const { data: creditoCe, error: errCe } = await supabase.from('creditos').insert({
            cliente_id: clienteSeleccionado.id, vehiculo_id: vehiculo.id, placa: vehiculo.placa,
            monto_financiado: calcCuotaEspecial.monto || calcCuotaEspecial.totalCuotas,
            inicial: 0,
            saldo: calcCuotaEspecial.totalCuotas,
            num_cuotas: calcCuotaEspecial.cuotas,
            frecuencia_pago: ceFrecuencia, fecha_inicio: ceFecha,
            moneda: 'USD', estado: 'activo', plan_tipo: 'cuota_especial',
            observaciones: ceObs || `Cuota especial ${ceFrecuencia}`,
          }).select().single()
          if (errCe || !creditoCe) { setError(errCe?.message ?? 'Error creando cuota especial'); setLoading(false); return }
          await supabase.from('cuotas').insert(buildCuotas(creditoCe.id, calcCuotaEspecial.cuotas, calcCuotaEspecial.montoCuota, ceFrecuencia, ceFecha, `Cuota especial ${ceFrecuencia}`))
          if (!primerCreditoId) primerCreditoId = creditoCe.id
        }

        router.push(`/creditos/${primerCreditoId}`)
        router.refresh()
        return
      }

      // --- Planes estándar (un solo crédito) ---
      let inicial = 0, saldo = 0, numCuotas = 0, montoFinanciado = 0

      if (plan === 'credito_40_60' && calc4060) {
        inicial = calc4060.inicial; saldo = calc4060.saldo; numCuotas = 24; montoFinanciado = precioCalc.total
      } else if (plan === 'asegurate_500' && planAC500Sel) {
        inicial = planAC500Sel.cuota_0; saldo = planAC500Sel.total - planAC500Sel.cuota_0
        numCuotas = cuotasAsegurate; montoFinanciado = planAC500Sel.total
      } else {
        setError('Completa los datos del financiamiento'); setLoading(false); return
      }

      const creditoParsed = CreditoSchema.safeParse({
        monto_financiado: montoFinanciado, inicial, num_cuotas: numCuotas,
        frecuencia_pago: 'mensual',
        fecha_inicio: fechaInicio, moneda: 'USD', observaciones: null,
      })
      if (!creditoParsed.success) { setError(creditoParsed.error.errors[0]?.message ?? 'Datos del crédito inválidos'); setLoading(false); return }

      const planLabel = plan === 'credito_40_60' ? 'Vehimotors (Planta)'
        : `Asegúrate $500 (${cuotasAsegurate}m) — ${planAC500Sel?.modelo}`

      const desglose = `Base: ${formatUSD(precioCalc.base)} | IVA: ${formatUSD(precioCalc.iva)} | Admin: ${formatUSD(precioCalc.admin)}`
      const obsCompleta = [`Plan: ${planLabel}`, desglose, observaciones].filter(Boolean).join('. ')

      const { data: creditoCreado, error: creditoError } = await supabase.from('creditos').insert({
        cliente_id: clienteSeleccionado.id, vehiculo_id: vehiculo.id,
        placa: vehiculo.placa, monto_financiado: montoFinanciado,
        inicial, saldo, num_cuotas: numCuotas,
        frecuencia_pago: 'mensual',
        fecha_inicio: fechaInicio, moneda: 'USD', estado: 'activo', observaciones: obsCompleta,
      }).select().single()

      if (creditoError) { setError(creditoError.message); setLoading(false); return }

      // Generar cuotas
      let cuotasData: { credito_id: string; numero_cuota: number; fecha_vencimiento: string; monto: number; estado: string; mora: number }[] = []

      if (plan === 'asegurate_500' && cuotasAC500) {
        cuotasData = cuotasAC500.map((c, i) => {
          const fecha = new Date(fechaInicio); fecha.setDate(fecha.getDate() + (i * 30))
          return { credito_id: creditoCreado.id, numero_cuota: c.numero, fecha_vencimiento: fecha.toISOString().split('T')[0], monto: c.monto, estado: 'pendiente', mora: 0 }
        })
      } else {
        cuotasData = Array.from({ length: 24 }, (_, i) => {
          const fecha = new Date(fechaInicio); fecha.setMonth(fecha.getMonth() + (i + 1))
          return { credito_id: creditoCreado.id, numero_cuota: i + 1, fecha_vencimiento: fecha.toISOString().split('T')[0], monto: calc4060!.cuota, estado: 'pendiente', mora: 0 }
        })
      }

      await supabase.from('cuotas').insert(cuotasData)
      router.push(`/creditos/${creditoCreado.id}`)
      router.refresh()
      return
    }

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
                  <button key={m} type="button" onClick={() => { setMarca(m); setModelo(''); setPlanAC500Sel(null) }}
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
              <label className="label">Serial del motor</label>
              <input type="text" className="input font-mono uppercase" placeholder="Serial del motor" value={serialMotor} onChange={e => setSerialMotor(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className="label">Fecha de entrega</label>
              <input type="date" className="input" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Tipo de compra */}
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

          {tipoCompra === 'contado' && (
            <div className="mt-4">
              <label className="label">Observaciones</label>
              <textarea className="textarea" rows={3} placeholder="Notas del vehículo..." value={observaciones} onChange={e => setObservaciones(e.target.value)} />
            </div>
          )}
        </div>

        {/* Plan de financiamiento (solo si es financiado) */}
        {tipoCompra === 'financiado' && (
          <div className="card p-6">
            <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-oriental-red rounded-full" />
              Plan de financiamiento
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              {[
                { value: 'credito_40_60', title: 'Vehimotors (Planta)', desc: '40% inicial + 24 cuotas mensuales' },
                { value: 'asegurate_500', title: 'Asegúrate con $500', desc: '$500 reserva + cuotas según modelo' },
                { value: 'personalizado', title: 'Personalizado "La Oriental"', desc: 'Define el plan libremente' },
              ].map(p => (
                <button key={p.value} type="button"
                  onClick={() => { setPlan(p.value as Plan); setPlanAC500Sel(null) }}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    plan === p.value ? 'border-oriental-red bg-oriental-red/5' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <p className={`font-bold text-sm ${plan === p.value ? 'text-oriental-red' : 'text-oriental-black'}`}>{p.title}</p>
                  <p className="text-xs text-oriental-gray mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>

            {/* Plan Vehimotors (40/60) */}
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
                    <div className="input bg-gray-50 text-oriental-gray font-semibold text-lg cursor-not-allowed">{formatUSD(precioCalc.iva)}</div>
                  </div>
                  <div>
                    <label className="label">Gastos administrativos</label>
                    <input type="number" step="0.01" min="0" className="input font-semibold"
                      placeholder="0.00" value={gastosAdmin} onChange={e => setGastosAdmin(e.target.value)} />
                  </div>
                </div>
                {precioCalc.total > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                    <p className="text-sm text-oriental-gray">Base {formatUSD(precioCalc.base)} + IVA {formatUSD(precioCalc.iva)} + Admin {formatUSD(precioCalc.admin)}</p>
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

            {/* Plan AC500 */}
            {plan === 'asegurate_500' && (
              <div className="space-y-4">
                <div>
                  <label className="label">Cronograma</label>
                  <div className="flex gap-2">
                    {([6, 9] as const).map(n => (
                      <button key={n} type="button" onClick={() => setCuotasAsegurate(n)}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-colors ${
                          cuotasAsegurate === n ? 'bg-oriental-red text-white border-oriental-red' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
                        }`}>{n} meses</button>
                    ))}
                  </div>
                </div>
                {loadingPlanes ? (
                  <p className="text-sm text-oriental-gray">Cargando planes...</p>
                ) : (
                  <div>
                    <label className="label">Modelo del plan *</label>
                    <select className="select" value={planAC500Sel?.id ?? ''}
                      onChange={e => setPlanAC500Sel(planesAC500.find(p => p.id === e.target.value) ?? null)} required>
                      <option value="">Seleccionar modelo...</option>
                      {planesAC500.map(p => (
                        <option key={p.id} value={p.id}>{p.marca} — {p.modelo} ({formatUSD(p.total)})</option>
                      ))}
                    </select>
                  </div>
                )}
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
                        <p className="text-gray-300 text-sm">Cuota {c.numero} — <span className="text-gray-500">{c.dia}</span></p>
                        <p className={`font-bold ${i === cuotasAC500.length - 1 ? 'text-oriental-red' : 'text-white'}`}>{formatUSD(c.monto)}</p>
                      </div>
                    ))}
                    <div className="border-t border-gray-700 pt-3 flex items-center justify-between">
                      <p className="text-gray-400 text-sm font-semibold uppercase">Total · Entrega mes {cuotasAsegurate}</p>
                      <p className="text-oriental-red font-extrabold text-xl">{formatUSD(planAC500Sel.total)}</p>
                    </div>
                  </div>
                )}
                {!planAC500Sel && planesAC500.length > 0 && (
                  <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                    <AlertCircle size={16} className="text-yellow-600 flex-shrink-0" />
                    <p className="text-sm text-yellow-800">Selecciona el modelo del plan para ver el cronograma de cuotas</p>
                  </div>
                )}
              </div>
            )}

            {/* Plan Personalizado — Dos sub-créditos */}
            {plan === 'personalizado' && (
              <div className="space-y-5">

                {/* ── CALCULADORA DE PRECIO ── */}
                <div className="border-2 border-amber-200 rounded-xl bg-amber-50/30">
                  <div className="px-5 pt-4 pb-3 border-b border-amber-200">
                    <p className="text-sm font-bold text-amber-900 flex items-center gap-2">
                      <span className="text-base">🧮</span>
                      Calculadora de precio
                      <span className="text-xs font-normal text-amber-700 ml-1">— Los resultados precargan los campos automáticamente</span>
                    </p>
                  </div>
                  <div className="p-5 space-y-4">
                    {/* Inputs principales */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <label className="label">Precio base (USD) *</label>
                        <input type="number" step="0.01" min="0" className="input font-semibold text-lg"
                          placeholder="52,000.00" value={calcBase} onChange={e => setCalcBase(e.target.value)} />
                      </div>
                      <div>
                        <label className="label">IVA (%)</label>
                        <input type="number" step="0.01" min="0" max="100" className="input"
                          placeholder="16" value={calcIvaPct} onChange={e => setCalcIvaPct(e.target.value)} />
                      </div>
                      <div>
                        <label className="label">% Inicial (La Oriental)</label>
                        <input type="number" step="1" min="1" max="99" className="input"
                          placeholder="40" value={calcPctInicial} onChange={e => setCalcPctInicial(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="label">Gastos (contado)</label>
                        <input type="number" step="0.01" min="0" className="input"
                          placeholder="4,600.00" value={calcGastosContado} onChange={e => setCalcGastosContado(e.target.value)} />
                        <p className="text-[10px] text-oriental-gray mt-0.5">Póliza + Traslado + INTT + Notaría + Honorarios</p>
                      </div>
                      <div>
                        <label className="label">Gastos (crédito)</label>
                        <input type="number" step="0.01" min="0" className="input"
                          placeholder="7,332.00" value={calcGastosCredito} onChange={e => setCalcGastosCredito(e.target.value)} />
                        <p className="text-[10px] text-oriental-gray mt-0.5">Póliza + Traslado + INTT + Notaría + Honorarios</p>
                      </div>
                      <div>
                        <label className="label">Tasa Vehimotors (% anual)</label>
                        <input type="number" step="0.01" min="0" className="input"
                          placeholder="Ej: 15.6" value={calcTasaAnual} onChange={e => setCalcTasaAnual(e.target.value)} />
                        <p className="text-[10px] text-oriental-gray mt-0.5">Vacío = sin interés (monto ÷ cuotas)</p>
                      </div>
                      <div>
                        <label className="label">N° cuotas Vehimotors</label>
                        <input type="number" step="1" min="1" max="120" className="input"
                          placeholder="24" value={calcNumCuotasVh} onChange={e => setCalcNumCuotasVh(e.target.value)} />
                      </div>
                    </div>

                    {/* Resultados en dos columnas */}
                    {calculadora && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        {/* Columna CONTADO */}
                        <div className="bg-white border border-amber-200 rounded-xl overflow-hidden">
                          <div className="bg-amber-100 px-4 py-2">
                            <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">Modalidad Contado</p>
                          </div>
                          <div className="px-4 py-3 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-oriental-gray">100% Precio base</span>
                              <span className="font-semibold text-oriental-black">{formatUSD(calculadora.base)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-oriental-gray">I.V.A. ({calculadora.ivaPct}%)</span>
                              <span className="font-semibold text-oriental-black">{formatUSD(calculadora.iva)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-oriental-gray">Gastos</span>
                              <span className="font-semibold text-oriental-black">{formatUSD(calculadora.gastosContado)}</span>
                            </div>
                            <div className="flex justify-between border-t border-amber-200 pt-2 mt-1">
                              <span className="font-bold text-oriental-black uppercase text-xs tracking-wide">Total a pagar</span>
                              <span className="font-extrabold text-amber-800 text-base">{formatUSD(calculadora.contadoTotal)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Columna CRÉDITO */}
                        <div className="bg-white border border-amber-200 rounded-xl overflow-hidden">
                          <div className="bg-amber-100 px-4 py-2">
                            <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">Modalidad Crédito ({Math.round(calculadora.pctInicial * 100)}% Inicial)</p>
                          </div>
                          <div className="px-4 py-3 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-oriental-gray">{Math.round(calculadora.pctInicial * 100)}% Precio base</span>
                              <span className="font-semibold text-oriental-black">{formatUSD(calculadora.inicialBase)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-oriental-gray">I.V.A. ({calculadora.ivaPct}%)</span>
                              <span className="font-semibold text-oriental-black">{formatUSD(calculadora.iva)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-oriental-gray">Gastos crédito</span>
                              <span className="font-semibold text-oriental-black">{formatUSD(calculadora.gastosCredito)}</span>
                            </div>
                            <div className="flex justify-between border-t border-amber-200 pt-2">
                              <span className="font-bold text-purple-800 text-xs uppercase tracking-wide">Total Inicial (La Oriental)</span>
                              <span className="font-extrabold text-purple-700 text-base">{formatUSD(calculadora.totalInicialLaOriental)}</span>
                            </div>
                            <div className="flex justify-between bg-indigo-50 rounded-lg px-3 py-2 mt-1">
                              <span className="text-indigo-700 font-semibold text-xs">Financiamiento {Math.round((1 - calculadora.pctInicial) * 100)}% — Vehimotors</span>
                              <span className="font-bold text-indigo-800">{formatUSD(calculadora.financiamientoVh)}</span>
                            </div>
                            <div className="flex justify-between bg-indigo-50 rounded-lg px-3 py-2">
                              <span className="text-indigo-700 font-semibold text-xs">{calculadora.n} cuotas {calculadora.tasaAnual > 0 ? `(${calculadora.tasaAnual}% anual)` : '(sin interés)'}</span>
                              <span className="font-extrabold text-indigo-800">{formatUSD(calculadora.cuotaVh)} / cuota</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Botón aplicar */}
                    {calculadora && (
                      <button
                        type="button"
                        onClick={aplicarCalculadora}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-colors text-sm"
                      >
                        ↓ Aplicar al Plan Personalizado
                      </button>
                    )}
                    {!calculadora && (
                      <p className="text-xs text-amber-700 text-center py-2">Ingresa el precio base para ver los cálculos</p>
                    )}
                  </div>
                </div>

                {/* Precio del vehículo */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-oriental-gray uppercase tracking-wider mb-3">Precio del vehículo</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Precio base del vehículo (USD)</label>
                      <input type="number" step="0.01" min="0" className="input font-semibold text-lg"
                        placeholder="0.00" value={precioTotalVehiculo} onChange={e => setPrecioTotalVehiculo(e.target.value)} />
                      <p className="text-xs text-oriental-gray mt-1">Se precarga con la calculadora. Referencia para el resumen financiero.</p>
                    </div>
                    <div>
                      <label className="label">Monto pagado de contado (USD)</label>
                      <input type="number" step="0.01" min="0" className="input"
                        placeholder="0.00" value={montoContado} onChange={e => setMontoContado(e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Sub-plan La Oriental */}
                <div className="border-2 border-purple-200 rounded-xl p-5 bg-purple-50/40">
                  <p className="font-bold text-purple-800 text-sm mb-4 flex items-center gap-2">
                    <span className="w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
                    Crédito de Inicial — La Oriental
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <label className="label">Monto inicial financiado (USD)</label>
                      <input type="number" step="0.01" min="0" className="input" placeholder="0.00"
                        value={orMonto} onChange={e => setOrMonto(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">N° de cuotas</label>
                      <input type="number" min="1" max="120" className="input" placeholder="12"
                        value={orCuotas} onChange={e => setOrCuotas(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Monto por cuota (USD)</label>
                      <input type="number" step="0.01" min="0" className="input" placeholder="0.00"
                        value={orMontoCuota} onChange={e => setOrMontoCuota(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="label">Frecuencia</label>
                      <div className="flex gap-2">
                        {['semanal', 'quincenal', 'mensual', 'trimestral'].map(f => (
                          <button key={f} type="button" onClick={() => setOrFrecuencia(f)}
                            className={`flex-1 py-2 rounded-lg text-xs font-semibold border capitalize transition-colors ${
                              orFrecuencia === f ? 'bg-purple-700 text-white border-purple-700' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
                            }`}>{f}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="label">Fecha inicio</label>
                      <input type="date" className="input" value={orFecha} onChange={e => setOrFecha(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Observaciones</label>
                    <textarea className="textarea" rows={2} placeholder="Condiciones especiales de este crédito..."
                      value={orObs} onChange={e => setOrObs(e.target.value)} />
                  </div>
                  {calcInicialOriental.cuotas > 0 && calcInicialOriental.montoCuota > 0 && (
                    <div className="mt-3 bg-purple-700 rounded-lg p-4 grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <p className="text-purple-200 text-[10px] uppercase tracking-wider">Monto financiado</p>
                        <p className="text-white font-extrabold text-base">{formatUSD(calcInicialOriental.monto)}</p>
                      </div>
                      <div className="text-center border-x border-purple-500">
                        <p className="text-purple-200 text-[10px] uppercase tracking-wider">Cuota {orFrecuencia}</p>
                        <p className="text-white font-extrabold text-base">{formatUSD(calcInicialOriental.montoCuota)}</p>
                        <p className="text-purple-300 text-[10px]">{calcInicialOriental.cuotas} cuotas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-purple-200 text-[10px] uppercase tracking-wider">Total cuotas</p>
                        <p className="text-white font-extrabold text-base">{formatUSD(calcInicialOriental.totalCuotas)}</p>
                      </div>
                    </div>
                  )}
                  {calcInicialOriental.showWarning && (
                    <div className="mt-2 flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                      <AlertCircle size={14} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-800">El total de cuotas ({formatUSD(calcInicialOriental.totalCuotas)}) no coincide con el monto financiado ({formatUSD(calcInicialOriental.monto)}). Verifica si es una condición especial.</p>
                    </div>
                  )}
                </div>

                {/* Sub-plan Vehimotors */}
                <div className="border-2 border-indigo-200 rounded-xl p-5 bg-indigo-50/40">
                  <p className="font-bold text-indigo-800 text-sm mb-4 flex items-center gap-2">
                    <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
                    Crédito Financiamiento — Vehimotors
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <label className="label">Monto financiado Vehimotors (USD)</label>
                      <input type="number" step="0.01" min="0" className="input" placeholder="0.00"
                        value={vhMonto} onChange={e => setVhMonto(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">N° de cuotas</label>
                      <input type="number" min="1" max="120" className="input" placeholder="12"
                        value={vhCuotas} onChange={e => setVhCuotas(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Monto por cuota (USD)</label>
                      <input type="number" step="0.01" min="0" className="input" placeholder="0.00"
                        value={vhMontoCuota} onChange={e => setVhMontoCuota(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="label">Frecuencia</label>
                      <div className="flex gap-2">
                        {['semanal', 'quincenal', 'mensual', 'trimestral'].map(f => (
                          <button key={f} type="button" onClick={() => setVhFrecuencia(f)}
                            className={`flex-1 py-2 rounded-lg text-xs font-semibold border capitalize transition-colors ${
                              vhFrecuencia === f ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
                            }`}>{f}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="label">Fecha inicio</label>
                      <input type="date" className="input" value={vhFecha} onChange={e => setVhFecha(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Observaciones</label>
                    <textarea className="textarea" rows={2} placeholder="Condiciones especiales de este financiamiento..."
                      value={vhObs} onChange={e => setVhObs(e.target.value)} />
                  </div>
                  {calcVehimotors.cuotas > 0 && calcVehimotors.montoCuota > 0 && (
                    <div className="mt-3 bg-indigo-700 rounded-lg p-4 grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <p className="text-indigo-200 text-[10px] uppercase tracking-wider">Monto financiado</p>
                        <p className="text-white font-extrabold text-base">{formatUSD(calcVehimotors.monto)}</p>
                      </div>
                      <div className="text-center border-x border-indigo-500">
                        <p className="text-indigo-200 text-[10px] uppercase tracking-wider">Cuota {vhFrecuencia}</p>
                        <p className="text-white font-extrabold text-base">{formatUSD(calcVehimotors.montoCuota)}</p>
                        <p className="text-indigo-300 text-[10px]">{calcVehimotors.cuotas} cuotas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-indigo-200 text-[10px] uppercase tracking-wider">Total cuotas</p>
                        <p className="text-white font-extrabold text-base">{formatUSD(calcVehimotors.totalCuotas)}</p>
                      </div>
                    </div>
                  )}
                  {calcVehimotors.showWarning && (
                    <div className="mt-2 flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                      <AlertCircle size={14} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-800">El total de cuotas ({formatUSD(calcVehimotors.totalCuotas)}) no coincide con el monto financiado ({formatUSD(calcVehimotors.monto)}). Verifica si es una condición especial.</p>
                    </div>
                  )}
                </div>

                {/* Cuota Especial (paralela a las mensuales) */}
                <div className="border border-dashed border-teal-400/40 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setCeActivo(!ceActivo)}
                    className={`w-full flex items-center justify-between px-5 py-3 transition-colors ${ceActivo ? 'bg-teal-900/40' : 'bg-teal-950/20 hover:bg-teal-900/20'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full border-2 ${ceActivo ? 'bg-teal-400 border-teal-400' : 'border-teal-500'}`} />
                      <span className="text-teal-300 font-semibold text-sm">Cuotas Especiales (paralelas)</span>
                      <span className="text-teal-500 text-xs">— Corren simultáneamente con las cuotas mensuales</span>
                    </div>
                    <span className="text-teal-400 text-xs font-semibold">{ceActivo ? 'Quitar' : '+ Agregar'}</span>
                  </button>

                  {ceActivo && (
                    <div className="px-5 pb-5 pt-4 space-y-4 bg-teal-950/10">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="label">Monto total *</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray text-sm">$</span>
                            <input type="number" step="0.01" className="input pl-7" placeholder="0.00"
                              value={ceMonto} onChange={e => setCeMonto(e.target.value)} />
                          </div>
                        </div>
                        <div>
                          <label className="label">N° cuotas *</label>
                          <input type="number" className="input" placeholder="ej: 4"
                            value={ceCuotas} onChange={e => setCeCuotas(e.target.value)} />
                        </div>
                        <div>
                          <label className="label">Monto por cuota *</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray text-sm">$</span>
                            <input type="number" step="0.01" className="input pl-7" placeholder="0.00"
                              value={ceMontoCuota} onChange={e => setCeMontoCuota(e.target.value)} />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="label">Frecuencia</label>
                          <div className="flex gap-2 flex-wrap">
                            {(['mensual', 'trimestral', 'semestral', 'anual'] as const).map(f => (
                              <button key={f} type="button"
                                onClick={() => setCeFrecuencia(f)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${ceFrecuencia === f
                                  ? 'bg-teal-600 border-teal-600 text-white'
                                  : 'border-teal-700 text-teal-400 hover:border-teal-500'
                                }`}>{f}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="label">Fecha inicio</label>
                          <input type="date" className="input" value={ceFecha} onChange={e => setCeFecha(e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className="label">Observaciones</label>
                        <textarea className="textarea" rows={2} placeholder="Condiciones especiales de esta cuota paralela..."
                          value={ceObs} onChange={e => setCeObs(e.target.value)} />
                      </div>
                      {calcCuotaEspecial.cuotas > 0 && calcCuotaEspecial.montoCuota > 0 && (
                        <div className="bg-teal-800/50 rounded-lg p-4 grid grid-cols-3 gap-3">
                          <div className="text-center">
                            <p className="text-teal-300 text-[10px] uppercase tracking-wider">Monto total</p>
                            <p className="text-white font-extrabold text-base">{formatUSD(calcCuotaEspecial.monto)}</p>
                          </div>
                          <div className="text-center border-x border-teal-700">
                            <p className="text-teal-300 text-[10px] uppercase tracking-wider">Cuota {ceFrecuencia}</p>
                            <p className="text-white font-extrabold text-base">{formatUSD(calcCuotaEspecial.montoCuota)}</p>
                            <p className="text-teal-400 text-[10px]">{calcCuotaEspecial.cuotas} cuotas</p>
                          </div>
                          <div className="text-center">
                            <p className="text-teal-300 text-[10px] uppercase tracking-wider">Total cuotas</p>
                            <p className="text-white font-extrabold text-base">{formatUSD(calcCuotaEspecial.totalCuotas)}</p>
                          </div>
                        </div>
                      )}
                      {calcCuotaEspecial.showWarning && (
                        <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                          <AlertCircle size={14} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-yellow-800">El total de cuotas ({formatUSD(calcCuotaEspecial.totalCuotas)}) no coincide con el monto total ({formatUSD(calcCuotaEspecial.monto)}). Verifica las condiciones.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Resumen financiero del vehículo */}
                {(resumenFinanciero.totalOr > 0 || resumenFinanciero.totalVh > 0 || resumenFinanciero.totalCe > 0) && (
                  <div className="bg-oriental-black rounded-xl p-5">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Resumen financiero del vehículo</p>
                    <div className="space-y-2 mb-4">
                      {resumenFinanciero.precioBase > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Precio base del vehículo</span>
                          <span className="text-gray-300 font-semibold">{formatUSD(resumenFinanciero.precioBase)}</span>
                        </div>
                      )}
                      {resumenFinanciero.totalOr > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-purple-300">Inicial — La Oriental (incl. IVA + gastos)</span>
                          <span className="text-purple-300 font-semibold">{formatUSD(resumenFinanciero.totalOr)}</span>
                        </div>
                      )}
                      {resumenFinanciero.totalVh > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-indigo-300">Financiamiento Vehimotors</span>
                          <span className="text-indigo-300 font-semibold">{formatUSD(resumenFinanciero.totalVh)}</span>
                        </div>
                      )}
                      {resumenFinanciero.totalCe > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-teal-300">Cuotas Especiales (paralelas)</span>
                          <span className="text-teal-300 font-semibold">{formatUSD(resumenFinanciero.totalCe)}</span>
                        </div>
                      )}
                      <div className="border-t border-gray-700 pt-2 flex justify-between text-sm">
                        <span className="text-white font-bold">Total comprometido por el cliente</span>
                        <span className="text-oriental-red font-extrabold text-base">{formatUSD(resumenFinanciero.totalComprometido)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Fecha inicio (solo para planes estándar) */}
            {plan !== 'personalizado' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Fecha inicio del crédito *</label>
                  <input type="date" className="input" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Observaciones</label>
                  <textarea className="textarea" rows={2} placeholder="Notas del financiamiento..."
                    value={observaciones} onChange={e => setObservaciones(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <div className="w-1.5 h-1.5 bg-oriental-red rounded-full flex-shrink-0" />
            <p className="text-oriental-red text-sm">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary flex items-center gap-2 py-3 px-6" disabled={loading}>
            <Save size={16} /> {loading ? 'Guardando...' : tipoCompra === 'financiado' ? 'Registrar vehículo y crear crédito' : 'Registrar vehículo'}
          </button>
          <Link href="/vehiculos" className="btn-secondary py-3 px-6">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
