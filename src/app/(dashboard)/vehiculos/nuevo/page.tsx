'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, Search, X, AlertCircle, Store, Car, CheckCircle2, MapPin } from 'lucide-react'
import Link from 'next/link'
import type { Cliente, VehiculoShowroom } from '@/types/database'
import { VehiculoSchema, CreditoSchema } from '@/lib/validations'
import { MODELOS_MG, MODELOS_MAXUS } from '@/lib/modelos'
import { METODOS_PAGO, BANCOS_VE } from '@/lib/utils'

type Plan = 'credito_40_60' | 'asegurate_500' | 'personalizado'

interface PlanAC500 {
  id: string; marca: string; modelo: string; meses: number
  cuota_0: number; cuota_1: number; cuota_2: number; cuota_3: number
  cuota_4: number; cuota_5: number; cuota_6: number; cuota_7: number
  cuota_8: number; cuota_9: number; total: number
}

interface PagoInicial {
  id: string; monto: string; metodo: string; referencia: string
  bancoEmisor: string; bancoReceptor: string
  montoBs: string; tasaCambio: string
}

const METODOS_BS = ['Transferencia bancaria', 'Pago móvil', 'Depósito bancario', 'Efectivo VES', 'Cheque']

function formatUSD(n: number) {
  if (n == null || isNaN(n)) return '$0.00'
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

  // Ingreso de inicial — soporta múltiples métodos de pago
  const [registrarIngresoInicial, setRegistrarIngresoInicial] = useState(false)
  const [ingresoInicialFecha, setIngresoInicialFecha] = useState(new Date().toISOString().split('T')[0])
  const [pagosIniciales, setPagosIniciales] = useState<PagoInicial[]>([
    { id: '1', monto: '', metodo: '', referencia: '', bancoEmisor: '', bancoReceptor: '', montoBs: '', tasaCambio: '' }
  ])

  const [showCrearCliente, setShowCrearCliente] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevaCedula, setNuevaCedula] = useState('')
  const [nuevoTipo, setNuevoTipo] = useState<'natural' | 'juridico'>('natural')
  const [nuevoTelefono, setNuevoTelefono] = useState('')
  const [creandoCliente, setCreandoCliente] = useState(false)
  const [errorCrearCliente, setErrorCrearCliente] = useState('')

  // Showroom
  const [vehiculosShowroom, setVehiculosShowroom] = useState<VehiculoShowroom[]>([])
  const [showroomSeleccionado, setShowroomSeleccionado] = useState<VehiculoShowroom | null>(null)
  const [loadingShowroom, setLoadingShowroom] = useState(true)

  // Prefill desde cotización
  const [cotizacionInfo, setCotizacionInfo] = useState<{
    numero: string; cliente_nombre: string; cliente_ci_rif: string; modalidad: string; cuota_mensual: number | null
  } | null>(null)

  const [marca, setMarca] = useState<'MG' | 'MAXUS'>('MG')
  const [modelo, setModelo] = useState('')
  const [version, setVersion] = useState('')
  const [anio, setAnio] = useState(String(new Date().getFullYear()))
  const [color, setColor] = useState('')
  const [placa, setPlaca] = useState('')
  const [vin, setVin] = useState('')
  const [serialMotor, setSerialMotor] = useState('')
  const [proforma, setProforma] = useState('')
  const [tipoCompra, setTipoCompra] = useState<'contado' | 'financiado'>('contado')
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [observaciones, setObservaciones] = useState('')

  // Financiamiento
  const [plan, setPlan] = useState<Plan>('asegurate_500')
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
  const [orMontoHistorico, setOrMontoHistorico] = useState('')
  // Sub-plan Vehimotors (Crédito Financiamiento)
  const [vhMonto, setVhMonto] = useState('')
  const [vhCuotas, setVhCuotas] = useState('12')
  const [vhMontoCuota, setVhMontoCuota] = useState('')
  const [vhFrecuencia, setVhFrecuencia] = useState('mensual')
  const [vhFecha, setVhFecha] = useState(new Date().toISOString().split('T')[0])
  const [vhObs, setVhObs] = useState('')
  const [vhMontoHistorico, setVhMontoHistorico] = useState('')
  // Resumen financiero del vehículo (plan personalizado)
  const [precioTotalVehiculo, setPrecioTotalVehiculo] = useState('')
  const [montoContado, setMontoContado] = useState('')

  // Plan Vehimotors (40/60) — campos manuales editables
  const [vh4060Inicial, setVh4060Inicial] = useState('')
  const [vh4060NumCuotas, setVh4060NumCuotas] = useState('24')
  const [vh4060MontoCuota, setVh4060MontoCuota] = useState('')

  // Cuota especial (tercer bloque opcional — corre en paralelo a los mensuales)
  const [ceActivo, setCeActivo] = useState(false)
  const [ceMonto, setCeMonto] = useState('')
  const [ceCuotas, setCeCuotas] = useState('8')
  const [ceMontoCuota, setCeMontoCuota] = useState('')
  const [ceFrecuencia, setCeFrecuencia] = useState('trimestral')
  const [ceFecha, setCeFecha] = useState(new Date().toISOString().split('T')[0])
  const [ceObs, setCeObs] = useState('')
  const [ceMontoHistorico, setCeMontoHistorico] = useState('')

  // ── Calculadora de precio (Plan Personalizado) ──
  const [calcBase, setCalcBase] = useState('')
  const [calcIvaPct, setCalcIvaPct] = useState('16')
  const [calcGastosContado, setCalcGastosContado] = useState('')
  const [calcGastosCredito, setCalcGastosCredito] = useState('')
  const [calcPctInicial, setCalcPctInicial] = useState('40')
  const [calcTasaAnual, setCalcTasaAnual] = useState('24')
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
    const cotId = searchParams.get('cotizacionId')
    if (!cotId) return
    fetch(`/api/cotizaciones/${cotId}`)
      .then(r => r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((cot: any) => {
        if (!cot || cot.error) return
        if (cot.marca === 'MG' || cot.marca === 'MAXUS') setMarca(cot.marca)
        if (cot.modelo) setModelo(cot.modelo)
        if (cot.modalidad === 'contado') {
          setTipoCompra('contado')
        } else {
          setTipoCompra('financiado')
          setPlan('personalizado')
          if (cot.precio_base) setCalcBase(String(cot.precio_base))
          if (cot.total_inicial) { setOrMonto(String(cot.total_inicial)); setOrCuotas('0') }
          if (cot.financiamiento_monto) { setVhMonto(String(cot.financiamiento_monto)); setVhCuotas('24') }
        }
        setCotizacionInfo({
          numero: cot.numero,
          cliente_nombre: cot.cliente_nombre,
          cliente_ci_rif: cot.cliente_ci_rif,
          modalidad: cot.modalidad,
          cuota_mensual: cot.cuota_mensual,
        })
      })
  }, [])

  useEffect(() => {
    supabase.from('vehiculos_showroom').select('*')
      .in('estado', ['en_agencia', 'reservado'])
      .order('created_at', { ascending: false })
      .then(({ data }) => { setVehiculosShowroom((data ?? []) as VehiculoShowroom[]); setLoadingShowroom(false) })

    const sid = searchParams.get('showroomId')
    if (sid) {
      supabase.from('vehiculos_showroom').select('*').eq('id', sid).single()
        .then(({ data }) => { if (data) seleccionarShowroom(data as VehiculoShowroom) })
    }
  }, [])

  function seleccionarShowroom(v: VehiculoShowroom | null) {
    setShowroomSeleccionado(v)
    if (v) {
      setMarca(v.marca as 'MG' | 'MAXUS')
      setModelo(v.modelo)
      setAnio(v.anio?.toString() ?? String(new Date().getFullYear()))
      setColor(v.color ?? '')
      setPlaca(v.placa ?? '')
      setVin(v.vin ?? '')
      setSerialMotor(v.serial_motor ?? '')
      setProforma((v as any).proforma_vehimotors ?? '')
    }
  }

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
    const monto      = parseFloat(vhMonto) || 0
    const cuotas     = parseInt(vhCuotas) || 0
    const montoCuota = parseFloat(vhMontoCuota) || 0
    const totalMensual = cuotas * montoCuota
    // Trimestrales
    const nTrim     = ceActivo ? (parseInt(ceCuotas) || 0) : 0
    const montoTrim = ceActivo ? (parseFloat(ceMontoCuota) || 0) : 0
    const totalTrim = nTrim * montoTrim
    const grandTotal  = totalMensual + totalTrim
    const showWarning = !ceActivo && monto > 0 && cuotas > 0 && montoCuota > 0 && Math.abs(totalMensual - monto) > 0.01
    return { monto, cuotas, montoCuota, totalMensual, nTrim, montoTrim, totalTrim, grandTotal, showWarning }
  }, [vhMonto, vhCuotas, vhMontoCuota, ceActivo, ceCuotas, ceMontoCuota])

  // Auto-calcular monto por cuota — La Oriental (plan personalizado)
  useEffect(() => {
    const monto = parseFloat(orMonto)
    const cuotas = parseInt(orCuotas)
    if (monto > 0 && cuotas > 0) {
      setOrMontoCuota((monto / cuotas).toFixed(2))
    } else {
      setOrMontoCuota('')
    }
  }, [orMonto, orCuotas])

  // Auto-calcular monto por cuota — Vehimotors
  // Sin trimestrales: PMT normal. Con trimestrales: (PMT_total - trim_total) / N
  useEffect(() => {
    const monto  = parseFloat(vhMonto)
    const cuotas = parseInt(vhCuotas)
    if (!monto || monto <= 0 || !cuotas || cuotas <= 0) { setVhMontoCuota(''); return }
    const tasa = parseFloat(calcTasaAnual) || 0
    let pmtMensual: number
    if (tasa > 0) {
      const r = tasa / 100 / 12
      pmtMensual = monto * r * Math.pow(1 + r, cuotas) / (Math.pow(1 + r, cuotas) - 1)
    } else {
      pmtMensual = monto / cuotas
    }
    // Con trimestrales: ajustar cuota mensual
    if (ceActivo) {
      const nTrim     = parseInt(ceCuotas) || 0
      const montoTrim = parseFloat(ceMontoCuota) || 0
      const totalTrim = nTrim * montoTrim
      if (totalTrim > 0) {
        const totalConInteres = pmtMensual * cuotas
        const mensualTotal    = Math.max(0, totalConInteres - totalTrim)
        setVhMontoCuota((mensualTotal / cuotas).toFixed(2))
        return
      }
    }
    setVhMontoCuota(pmtMensual.toFixed(2))
  }, [vhMonto, vhCuotas, calcTasaAnual, ceActivo, ceCuotas, ceMontoCuota])

  // ── Sincronizar fecha de entrega → fecha de inicio de cuotas ──────────────
  useEffect(() => {
    if (fechaEntrega) {
      setOrFecha(fechaEntrega)
      setVhFecha(fechaEntrega)
      setCeFecha(fechaEntrega)
    }
  }, [fechaEntrega])

  // ── Auto-rellenar primer pago según el plan (AC500 y 40/60) ──────────────────
  useEffect(() => {
    if (tipoCompra !== 'financiado') return
    let monto = ''
    if (plan === 'asegurate_500' && planAC500Sel) {
      monto = String(planAC500Sel.cuota_0)
    } else if (plan === 'credito_40_60') {
      const m = parseFloat(vh4060Inicial) || calc4060?.inicial || 0
      if (m > 0) monto = m.toFixed(2)
    }
    if (monto) setPagosIniciales(prev => prev.map((p, i) => i === 0 ? { ...p, monto } : p))
  }, [tipoCompra, plan, planAC500Sel, vh4060Inicial, calc4060])

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
    const totalVh = calcVehimotors.totalMensual > 0 ? calcVehimotors.totalMensual : calcVehimotors.monto

    // Cuota especial (paralela)
    const totalCe = ceActivo ? (calcCuotaEspecial.totalCuotas > 0 ? calcCuotaEspecial.totalCuotas : calcCuotaEspecial.monto) : 0

    const totalComprometido = totalOr + totalVh + totalCe

    return { precioBase, totalOr, totalVh, totalCe, totalComprometido }
  }, [precioTotalVehiculo, calcInicialOriental.monto, calcVehimotors.totalMensual, calcVehimotors.monto, calcCuotaEspecial, ceActivo])

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

  // ── Restante de inicial → Crédito La Oriental (plan personalizado) ──────────
  const totalPagadoInicial = pagosIniciales.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
  useEffect(() => {
    if (!registrarIngresoInicial || plan !== 'personalizado' || !calculadora) return
    const restante = Math.max(0, calculadora.totalInicialLaOriental - totalPagadoInicial)
    setOrMonto(restante.toFixed(2))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrarIngresoInicial, plan, calculadora, totalPagadoInicial])

  function aplicarCalculadora() {
    if (!calculadora) return
    // Si el ingreso está activo, orMonto lo maneja el useEffect de restante
    if (!(registrarIngresoInicial && plan === 'personalizado')) {
      setOrMonto(calculadora.totalInicialLaOriental.toFixed(2))
      const cuotasOrActual = parseInt(orCuotas) || 0
      if (cuotasOrActual > 0) {
        setOrMontoCuota((calculadora.totalInicialLaOriental / cuotasOrActual).toFixed(2))
      }
    }
    setVhMonto(calculadora.financiamientoVh.toFixed(2))
    setVhCuotas(String(calculadora.n))
    setVhMontoCuota(calculadora.cuotaVh.toFixed(2))
    setPrecioTotalVehiculo(calculadora.base.toFixed(2))
  }

  async function crearIngresoInicial(vehiculoId: string, vehiculoDesc: string, clienteId: string, placa: string | null) {
    if (!registrarIngresoInicial) return
    const pagosValidos = pagosIniciales.filter(p => parseFloat(p.monto) > 0 && p.metodo)
    if (pagosValidos.length === 0) return
    const year = new Date().getFullYear()
    // Obtener el próximo número una sola vez y luego incrementar localmente
    const { data: ultimoRecibo } = await supabase.from('ingresos')
      .select('numero_recibo')
      .like('numero_recibo', `LOA-REC-${year}-%`)
      .order('numero_recibo', { ascending: false })
      .limit(1).single()
    let nextNum = 1
    if ((ultimoRecibo as any)?.numero_recibo) {
      const partes = (ultimoRecibo as any).numero_recibo.split('-')
      nextNum = (parseInt(partes[partes.length - 1]) || 0) + 1
    }
    for (const pago of pagosValidos) {
      const numero_recibo = `LOA-REC-${year}-${String(nextNum).padStart(5, '0')}`
      nextNum++
      const montoBs = parseFloat(pago.montoBs) || null
      const tasaCambio = parseFloat(pago.tasaCambio) || null
      await supabase.from('ingresos').insert({
        numero_recibo,
        cliente_id: clienteId,
        vehiculo_id: vehiculoId,
        placa: placa || null,
        concepto: `Pago de inicial — ${vehiculoDesc}`,
        monto: parseFloat(pago.monto),
        moneda: 'USD',
        metodo_pago: pago.metodo,
        referencia: pago.referencia || null,
        banco_emisor: pago.bancoEmisor || null,
        banco_receptor: pago.bancoReceptor || null,
        fecha_pago: ingresoInicialFecha,
        estado: 'registrado',
        monto_bs: montoBs,
        tasa_cambio: tasaCambio,
      })
    }
  }

  function updatePago(id: string, field: keyof PagoInicial, value: string) {
    setPagosIniciales(prev => prev.map(p => {
      if (p.id !== id) return p
      const updated = { ...p, [field]: value }
      // Auto-calc USD equivalent when Bs. amount or rate changes
      if (field === 'montoBs' || field === 'tasaCambio') {
        const bs = parseFloat(field === 'montoBs' ? value : p.montoBs) || 0
        const tasa = parseFloat(field === 'tasaCambio' ? value : p.tasaCambio) || 0
        if (bs > 0 && tasa > 0) updated.monto = (bs / tasa).toFixed(2)
      }
      return updated
    }))
  }
  function addPago() {
    setPagosIniciales(prev => [...prev, { id: String(Date.now()), monto: '', metodo: '', referencia: '', bancoEmisor: '', bancoReceptor: '', montoBs: '', tasaCambio: '' }])
  }
  function removePago(id: string) {
    if (pagosIniciales.length <= 1) return
    setPagosIniciales(prev => prev.filter(p => p.id !== id))
  }

  async function crearClienteRapido() {
    if (!nuevoNombre.trim() || !nuevaCedula.trim()) {
      setErrorCrearCliente('Nombre y cédula/RIF son requeridos')
      return
    }
    setCreandoCliente(true)
    setErrorCrearCliente('')
    const { data, error: err } = await supabase.from('clientes').insert({
      nombre: nuevoNombre.trim(),
      cedula_rif: nuevaCedula.trim().toUpperCase(),
      tipo: nuevoTipo,
      telefono: nuevoTelefono.trim() || null,
      activo: true,
    }).select().single()
    if (err || !data) {
      setErrorCrearCliente(err?.message ?? 'Error al crear cliente')
      setCreandoCliente(false)
      return
    }
    setClienteSeleccionado(data)
    setClienteQuery(data.nombre)
    setShowCrearCliente(false)
    setNuevoNombre('')
    setNuevaCedula('')
    setNuevoTelefono('')
    setCreandoCliente(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteSeleccionado) { setError('Selecciona un cliente'); return }

    const parsed = VehiculoSchema.safeParse({
      marca, modelo, version: version || null, anio: parseInt(anio) || null,
      color: color || null, placa: placa.toUpperCase() || null, vin: vin.toUpperCase() || null,
      serial_motor: serialMotor.toUpperCase() || null,
      proforma_vehimotors: proforma.trim() || null,
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

    // Vincular showroom si se seleccionó uno
    if (showroomSeleccionado) {
      await supabase.from('vehiculos_showroom').update({
        estado: 'vendido',
        cliente_id: clienteSeleccionado.id,
        vehiculo_id: vehiculo.id,
        updated_at: new Date().toISOString(),
      }).eq('id', showroomSeleccionado.id)
    }

    // Si es financiado, crear crédito automáticamente
    if (tipoCompra === 'financiado') {

      // --- Plan Personalizado: crear DOS créditos (uno o ambos activos) ---
      if (plan === 'personalizado') {
        const orActivo = calcInicialOriental.monto > 0   // activo si hay monto, aunque cuotas = 0 (pago único)
        const vhActivo = calcVehimotors.cuotas > 0
        if (!orActivo && !vhActivo) {
          setError('Completa al menos un bloque de crédito'); setLoading(false); return
        }

        // Distribuye montoHistorico entre cuotas: completas primero, última con abono parcial
        function buildCuotas(creditoId: string, cuotas: number, montoCuota: number, frecuencia: string, fechaBase: string, concepto: string, montoHistorico = 0) {
          let restante = montoHistorico
          return Array.from({ length: cuotas }, (_, i) => {
            const f = new Date(fechaBase)
            if (frecuencia === 'semanal') f.setDate(f.getDate() + 7 * (i + 1))
            else if (frecuencia === 'quincenal') f.setDate(f.getDate() + 15 * (i + 1))
            else if (frecuencia === 'trimestral') f.setMonth(f.getMonth() + 3 * (i + 1))
            else f.setMonth(f.getMonth() + (i + 1))

            let estado = 'pendiente'
            let monto_pagado = 0

            if (restante >= montoCuota) {
              estado = 'pagada'
              monto_pagado = montoCuota
              restante -= montoCuota
            } else if (restante > 0) {
              estado = 'abono_parcial'
              monto_pagado = restante
              restante = 0
            }

            return {
              credito_id: creditoId, numero_cuota: i + 1,
              fecha_vencimiento: f.toISOString().split('T')[0],
              monto: montoCuota, mora: 0, concepto,
              estado, monto_pagado,
            }
          })
        }

        let primerCreditoId = ''

        if (orActivo) {
          const orHistorico  = parseFloat(orMontoHistorico) || 0
          const orTotalMonto = calcInicialOriental.cuotas > 0 ? calcInicialOriental.totalCuotas : calcInicialOriental.monto
          const orSaldoInicial = Math.max(0, orTotalMonto - orHistorico)
          const { data: creditoOr, error: errOr } = await supabase.from('creditos').insert({
            cliente_id: clienteSeleccionado.id, vehiculo_id: vehiculo.id, placa: vehiculo.placa,
            monto_financiado: orTotalMonto,
            inicial: calcInicialOriental.monto,
            saldo: orSaldoInicial,
            num_cuotas: calcInicialOriental.cuotas,
            frecuencia_pago: orFrecuencia, fecha_inicio: orFecha,
            moneda: 'USD', estado: 'activo', plan_tipo: 'inicial_la_oriental',
            observaciones: orObs || 'Crédito de Inicial — La Oriental',
          }).select().single()
          if (errOr || !creditoOr) { setError(errOr?.message ?? 'Error creando crédito La Oriental'); setLoading(false); return }
          if (calcInicialOriental.cuotas > 0) {
            await supabase.from('cuotas').insert(buildCuotas(creditoOr.id, calcInicialOriental.cuotas, calcInicialOriental.montoCuota, orFrecuencia, orFecha, 'Crédito de Inicial — La Oriental', orHistorico))
          } else {
            // Pago único — crear 1 cuota por el monto completo para que aparezca en el selector de pagos
            await supabase.from('cuotas').insert([{
              credito_id: creditoOr.id,
              numero_cuota: 1,
              fecha_vencimiento: orFecha,
              monto: orTotalMonto,
              mora: 0,
              concepto: 'Crédito de Inicial — La Oriental',
              estado: 'pendiente',
              monto_pagado: 0,
            }])
          }
          primerCreditoId = creditoOr.id
        }

        if (vhActivo) {
          const vhHistorico   = parseFloat(vhMontoHistorico) || 0
          // Si hay cuota especial, el crédito mensual Vehimotors es sobre montoMensual (ya descontado)
          const vhTotalMonto  = calcVehimotors.totalMensual > 0 ? calcVehimotors.totalMensual : calcVehimotors.totalMensual
          const vhSaldoInicial = Math.max(0, vhTotalMonto - vhHistorico)
          const { data: creditoVh, error: errVh } = await supabase.from('creditos').insert({
            cliente_id: clienteSeleccionado.id, vehiculo_id: vehiculo.id, placa: vehiculo.placa,
            monto_financiado: vhTotalMonto,
            inicial: 0,
            saldo: vhSaldoInicial,
            num_cuotas: calcVehimotors.cuotas,
            frecuencia_pago: vhFrecuencia, fecha_inicio: vhFecha,
            moneda: 'USD', estado: 'activo', plan_tipo: 'financiamiento_vehimotors',
            observaciones: vhObs || 'Crédito Financiamiento — Vehimotors',
          }).select().single()
          if (errVh || !creditoVh) { setError(errVh?.message ?? 'Error creando crédito Vehimotors'); setLoading(false); return }
          await supabase.from('cuotas').insert(buildCuotas(creditoVh.id, calcVehimotors.cuotas, calcVehimotors.montoCuota, vhFrecuencia, vhFecha, 'Crédito Financiamiento — Vehimotors', vhHistorico))
          if (!primerCreditoId) primerCreditoId = creditoVh.id
        }

        // Cuota especial (tercer bloque paralelo — ej: trimestral simultánea)
        const ceActivo2 = ceActivo && calcCuotaEspecial.cuotas > 0 && calcCuotaEspecial.montoCuota > 0
        if (ceActivo2) {
          const ceTotalMonto   = calcCuotaEspecial.monto || calcCuotaEspecial.totalCuotas
          const ceHistorico    = parseFloat(ceMontoHistorico) || 0
          const ceSaldoInicial = Math.max(0, ceTotalMonto - ceHistorico)
          const { data: creditoCe, error: errCe } = await supabase.from('creditos').insert({
            cliente_id: clienteSeleccionado.id, vehiculo_id: vehiculo.id, placa: vehiculo.placa,
            monto_financiado: ceTotalMonto,
            inicial: 0,
            saldo: ceSaldoInicial,
            num_cuotas: calcCuotaEspecial.cuotas,
            frecuencia_pago: ceFrecuencia, fecha_inicio: ceFecha,
            moneda: 'USD', estado: 'activo', plan_tipo: 'cuota_especial',
            observaciones: ceObs || `Cuota especial ${ceFrecuencia}`,
          }).select().single()
          if (errCe || !creditoCe) { setError(errCe?.message ?? 'Error creando cuota especial'); setLoading(false); return }
          await supabase.from('cuotas').insert(buildCuotas(creditoCe.id, calcCuotaEspecial.cuotas, calcCuotaEspecial.montoCuota, ceFrecuencia, ceFecha, `Cuota especial ${ceFrecuencia}`, ceHistorico))
          if (!primerCreditoId) primerCreditoId = creditoCe.id
        }

        await crearIngresoInicial(vehiculo.id, `${vehiculo.marca} ${vehiculo.modelo}`, clienteSeleccionado.id, vehiculo.placa)
        router.push(`/creditos/${primerCreditoId}`)
        router.refresh()
        return
      }

      // --- Planes estándar (un solo crédito) ---
      let inicial = 0, saldo = 0, numCuotas = 0, montoFinanciado = 0

      if (plan === 'credito_40_60' && (calc4060 || vh4060Inicial || vh4060MontoCuota)) {
        const inicialFinal = parseFloat(vh4060Inicial) || calc4060?.inicial || 0
        numCuotas = parseInt(vh4060NumCuotas) || 24
        const cuotaFinal = parseFloat(vh4060MontoCuota) || calc4060?.cuota || 0
        saldo = cuotaFinal * numCuotas
        inicial = inicialFinal
        montoFinanciado = inicialFinal + saldo
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
        plan_tipo: plan === 'asegurate_500' ? 'asegurate_500' : 'credito_40_60',
      }).select().single()

      if (creditoError) { setError(creditoError.message); setLoading(false); return }

      // Generar cuotas
      let cuotasData: { credito_id: string; numero_cuota: number; fecha_vencimiento: string; monto: number; estado: string; mora: number; concepto?: string }[] = []

      if (plan === 'asegurate_500' && cuotasAC500 && planAC500Sel) {
        const cuota0 = {
          credito_id: creditoCreado.id,
          numero_cuota: 0,
          fecha_vencimiento: fechaInicio,
          monto: planAC500Sel.cuota_0,
          estado: 'pendiente',
          mora: 0,
          concepto: 'Reserva inicial — Asegúrate con $500',
        }
        cuotasData = [cuota0, ...cuotasAC500.map((c, i) => {
          const fecha = new Date(fechaInicio); fecha.setDate(fecha.getDate() + (i * 30))
          return { credito_id: creditoCreado.id, numero_cuota: c.numero, fecha_vencimiento: fecha.toISOString().split('T')[0], monto: c.monto, estado: 'pendiente', mora: 0 }
        })]
      } else {
        const cuotaUsada = parseFloat(vh4060MontoCuota) || calc4060?.cuota || (saldo / numCuotas)
        cuotasData = Array.from({ length: numCuotas }, (_, i) => {
          const fecha = new Date(fechaInicio); fecha.setMonth(fecha.getMonth() + (i + 1))
          return { credito_id: creditoCreado.id, numero_cuota: i + 1, fecha_vencimiento: fecha.toISOString().split('T')[0], monto: cuotaUsada, estado: 'pendiente', mora: 0 }
        })
      }

      await supabase.from('cuotas').insert(cuotasData)
      await crearIngresoInicial(vehiculo.id, `${vehiculo.marca} ${vehiculo.modelo}`, clienteSeleccionado.id, vehiculo.placa)
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

          {cotizacionInfo && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-800 text-xs font-bold uppercase tracking-wider">Cotización {cotizacionInfo.numero}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${cotizacionInfo.modalidad === 'contado' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {cotizacionInfo.modalidad === 'contado' ? 'Contado' : 'Crédito 24m'}
                </span>
              </div>
              <p className="font-semibold text-green-900 text-sm">{cotizacionInfo.cliente_nombre}</p>
              <p className="text-green-700 text-xs">{cotizacionInfo.cliente_ci_rif}</p>
              {cotizacionInfo.cuota_mensual != null && (
                <p className="text-green-600 text-xs mt-1">
                  Cuota mensual cotizada: <span className="font-bold">${cotizacionInfo.cuota_mensual.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                </p>
              )}
              <p className="text-green-600 text-[11px] mt-2 font-medium">Busca al cliente por nombre o cédula para vincularlo al vehículo.</p>
            </div>
          )}

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

          {!clienteSeleccionado && (
            <div className="mt-3">
              {!showCrearCliente ? (
                <button type="button" onClick={() => setShowCrearCliente(true)}
                  className="text-xs font-semibold text-oriental-red hover:underline flex items-center gap-1">
                  + Crear cliente nuevo
                </button>
              ) : (
                <div className="mt-2 border border-blue-200 rounded-xl p-4 bg-blue-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">Nuevo cliente</p>
                    <button type="button" onClick={() => { setShowCrearCliente(false); setErrorCrearCliente('') }}
                      className="text-blue-400 hover:text-blue-600">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="label">Nombre *</label>
                      <input type="text" className="input" placeholder="Nombre completo" value={nuevoNombre}
                        onChange={e => setNuevoNombre(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Cédula / RIF *</label>
                      <input type="text" className="input font-mono uppercase" placeholder="V12345678"
                        value={nuevaCedula} onChange={e => setNuevaCedula(e.target.value.toUpperCase())} />
                    </div>
                    <div>
                      <label className="label">Tipo</label>
                      <div className="flex gap-2">
                        {(['natural', 'juridico'] as const).map(t => (
                          <button key={t} type="button" onClick={() => setNuevoTipo(t)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors capitalize ${
                              nuevoTipo === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
                            }`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="label">Teléfono</label>
                      <input type="text" className="input" placeholder="0412-1234567" value={nuevoTelefono}
                        onChange={e => setNuevoTelefono(e.target.value)} />
                    </div>
                  </div>
                  {errorCrearCliente && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle size={12} /> {errorCrearCliente}
                    </p>
                  )}
                  <button type="button" onClick={crearClienteRapido} disabled={creandoCliente}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg text-sm transition-colors">
                    {creandoCliente ? 'Guardando...' : 'Registrar cliente'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selector Showroom */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-1 flex items-center gap-2">
            <div className="w-1 h-4 bg-orange-400 rounded-full" />
            Vincular del Showroom
          </h2>
          <p className="text-xs text-oriental-gray mb-4">Opcional — selecciona si el vehículo viene de consignación</p>

          {loadingShowroom ? (
            <p className="text-sm text-oriental-gray">Cargando showroom…</p>
          ) : vehiculosShowroom.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-4 text-center">
              <Store size={22} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-oriental-gray">No hay vehículos disponibles en showroom</p>
            </div>
          ) : showroomSeleccionado ? (
            <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Car size={18} className="text-orange-600" />
                </div>
                <div>
                  <p className="font-bold text-oriental-black">{showroomSeleccionado.marca} {showroomSeleccionado.modelo}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {showroomSeleccionado.placa && <span className="font-mono font-bold text-xs text-oriental-gray">{showroomSeleccionado.placa}</span>}
                    {showroomSeleccionado.color && <span className="text-xs text-oriental-gray">{showroomSeleccionado.color}</span>}
                    {showroomSeleccionado.ubicacion && (
                      <span className="text-xs text-orange-600 flex items-center gap-1">
                        <MapPin size={10} /> {showroomSeleccionado.ubicacion === 'otro' ? showroomSeleccionado.ubicacion_descripcion : showroomSeleccionado.ubicacion}
                      </span>
                    )}
                    {showroomSeleccionado.pdi_hecho && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">PDI ✓</span>}
                  </div>
                </div>
                <CheckCircle2 size={20} className="text-orange-500 flex-shrink-0" />
              </div>
              <button type="button" onClick={() => seleccionarShowroom(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-orange-100 transition-colors flex-shrink-0">
                <X size={16} className="text-orange-600" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {vehiculosShowroom.map(v => (
                <button key={v.id} type="button" onClick={() => seleccionarShowroom(v)}
                  className="rounded-xl border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50 p-3 text-left transition-all">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.marca === 'MG' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{v.marca}</span>
                    <div className="flex items-center gap-1">
                      {v.pdi_hecho && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">PDI ✓</span>}
                      {v.estado === 'reservado' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">Reservado</span>}
                    </div>
                  </div>
                  <p className="font-bold text-oriental-black text-sm">{v.modelo}</p>
                  <div className="mt-1 space-y-0.5">
                    <p className="text-xs text-oriental-gray flex items-center gap-1.5">
                      {v.placa && <span className="font-mono font-bold text-oriental-black">{v.placa}</span>}
                      {v.color && <span>· {v.color}</span>}
                      {v.anio && <span>· {v.anio}</span>}
                    </p>
                    {v.ubicacion && (
                      <p className="text-xs text-orange-600 font-semibold flex items-center gap-1">
                        <MapPin size={10} /> {v.ubicacion === 'otro' ? (v.ubicacion_descripcion ?? 'Otro') : v.ubicacion}
                      </p>
                    )}
                    {v.vin && <p className="text-[10px] font-mono text-oriental-gray truncate">VIN: {v.vin}</p>}
                    {v.serial_motor && <p className="text-[10px] font-mono text-oriental-gray truncate">Motor: {v.serial_motor}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
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
              <label className="label">Versión</label>
              <input type="text" className="input" placeholder="Ej: COM, LUX, Sincrónico…" value={version} onChange={e => setVersion(e.target.value)} />
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
              <label className="label">Proforma Vehimotors</label>
              <input type="text" className="input" placeholder="Código de proforma" value={proforma} onChange={e => setProforma(e.target.value)} />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {[
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
                <div className="bg-oriental-black rounded-xl p-5">
                  <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-4">Condiciones del crédito — edita si los valores difieren</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-gray-400 text-[10px] uppercase tracking-wider block mb-1.5">Inicial ($)</label>
                      <input
                        type="number" step="0.01" min="0"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-bold text-lg focus:outline-none focus:border-oriental-red"
                        placeholder={calc4060 ? calc4060.inicial.toFixed(2) : '0.00'}
                        value={vh4060Inicial}
                        onChange={e => setVh4060Inicial(e.target.value)}
                      />
                      {calc4060 && !vh4060Inicial && (
                        <p className="text-gray-500 text-[10px] mt-1">Auto: 40% = {formatUSD(calc4060.inicial)}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-gray-400 text-[10px] uppercase tracking-wider block mb-1.5">Cuota mensual ($)</label>
                      <input
                        type="number" step="0.01" min="0"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-oriental-red font-bold text-lg focus:outline-none focus:border-oriental-red"
                        placeholder={calc4060 ? calc4060.cuota.toFixed(2) : '0.00'}
                        value={vh4060MontoCuota}
                        onChange={e => setVh4060MontoCuota(e.target.value)}
                      />
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number" min="1"
                          className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-300 text-xs focus:outline-none focus:border-gray-500"
                          value={vh4060NumCuotas}
                          onChange={e => setVh4060NumCuotas(e.target.value)}
                        />
                        <span className="text-gray-500 text-[10px]">cuotas</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-400 text-[10px] uppercase tracking-wider block mb-1.5">Saldo a financiar ($)</label>
                      <div className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
                        <p className="text-white font-bold text-lg">
                          {(() => {
                            const ini = parseFloat(vh4060Inicial) || (calc4060?.inicial ?? 0)
                            const base = parseFloat(precioBase) || 0
                            const total = precioCalc?.total || (base + base * 0.16 + (parseFloat(gastosAdmin) || 0))
                            const saldo = Math.max(0, total - ini)
                            return formatUSD(saldo)
                          })()}
                        </p>
                      </div>
                      {calc4060 && (
                        <p className="text-gray-500 text-[10px] mt-1">Auto: 60% = {formatUSD(calc4060.saldo)}</p>
                      )}
                    </div>
                  </div>
                </div>
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
                        <input type="number" step="0.0001" min="0" className="input"
                          placeholder="Ej: 15.6789" value={calcTasaAnual} onChange={e => setCalcTasaAnual(e.target.value)} />
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

                {/* Ingreso de inicial — integrado con la calculadora */}
                <div className={`border-2 rounded-xl transition-colors ${registrarIngresoInicial ? 'border-green-300 bg-green-50/30' : 'border-dashed border-gray-200'}`}>
                  <div className="flex items-center justify-between p-5 pb-3">
                    <h3 className="text-sm font-bold text-oriental-black flex items-center gap-2">
                      <div className={`w-1 h-4 rounded-full ${registrarIngresoInicial ? 'bg-green-500' : 'bg-gray-300'}`} />
                      Registrar ingreso de inicial
                    </h3>
                    <button type="button" onClick={() => setRegistrarIngresoInicial(v => !v)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${registrarIngresoInicial ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${registrarIngresoInicial ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  {!registrarIngresoInicial && (
                    <p className="text-xs text-oriental-gray px-5 pb-4">Activa para registrar cuánto pagó el cliente de inicial. El restante se carga automáticamente al Crédito La Oriental.</p>
                  )}
                  {registrarIngresoInicial && (
                    <div className="px-5 pb-5 space-y-3">
                      {/* Referencia total calculadora */}
                      {calculadora && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center justify-between text-sm">
                          <span className="text-amber-700 text-xs">Total inicial (calculadora):</span>
                          <span className="font-bold text-amber-900">{formatUSD(calculadora.totalInicialLaOriental)}</span>
                        </div>
                      )}
                      {/* Fecha compartida */}
                      <div className="max-w-xs">
                        <label className="label">Fecha de pago *</label>
                        <input type="date" className="input" value={ingresoInicialFecha} onChange={e => setIngresoInicialFecha(e.target.value)} />
                      </div>
                      {/* Filas de pago */}
                      {pagosIniciales.map((pago, idx) => (
                        <div key={pago.id} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pago {idx + 1}</span>
                            {pagosIniciales.length > 1 && (
                              <button type="button" onClick={() => removePago(pago.id)}
                                className="text-xs text-red-400 hover:text-red-600 font-semibold">Eliminar</button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="label">Monto (USD) *</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray font-bold">$</span>
                                <input type="number" step="0.01" min="0" className="input pl-7 font-semibold text-lg"
                                  placeholder="0.00" value={pago.monto} onChange={e => updatePago(pago.id, 'monto', e.target.value)} />
                              </div>
                            </div>
                            <div>
                              <label className="label">Método *</label>
                              <select className="select" value={pago.metodo} onChange={e => updatePago(pago.id, 'metodo', e.target.value)}>
                                <option value="">Seleccionar...</option>
                                {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="label">N° Referencia</label>
                              <input type="text" className="input" placeholder="Número de referencia"
                                value={pago.referencia} onChange={e => updatePago(pago.id, 'referencia', e.target.value)} />
                            </div>
                            <div>
                              <label className="label">Banco emisor</label>
                              <select className="select" value={pago.bancoEmisor} onChange={e => updatePago(pago.id, 'bancoEmisor', e.target.value)}>
                                <option value="">—</option>
                                {BANCOS_VE.map(b => <option key={b} value={b}>{b}</option>)}
                              </select>
                            </div>
                            <div className="md:col-span-2">
                              <label className="label">Banco receptor</label>
                              <select className="select" value={pago.bancoReceptor} onChange={e => updatePago(pago.id, 'bancoReceptor', e.target.value)}>
                                <option value="">—</option>
                                {BANCOS_VE.map(b => <option key={b} value={b}>{b}</option>)}
                              </select>
                            </div>
                            {METODOS_BS.includes(pago.metodo) && (<>
                              <div className="md:col-span-2 pt-1 border-t border-orange-100">
                                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Detalle en Bolívares</p>
                              </div>
                              <div>
                                <label className="label">Monto en Bs.</label>
                                <input type="number" step="0.01" min="0" className="input"
                                  placeholder="0.00" value={pago.montoBs} onChange={e => updatePago(pago.id, 'montoBs', e.target.value)} />
                              </div>
                              <div>
                                <label className="label">Tasa Bs./USD</label>
                                <input type="number" step="0.01" min="0" className="input"
                                  placeholder="40.00" value={pago.tasaCambio} onChange={e => updatePago(pago.id, 'tasaCambio', e.target.value)} />
                              </div>
                              {pago.montoBs && pago.tasaCambio && (
                                <div className="md:col-span-2">
                                  <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 flex items-center justify-between text-sm">
                                    <span className="text-orange-700 text-xs font-semibold">≈ Equivalente USD:</span>
                                    <span className="font-extrabold text-orange-900">
                                      {formatUSD((parseFloat(pago.montoBs) || 0) / (parseFloat(pago.tasaCambio) || 1))}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </>)}
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={addPago}
                        className="w-full py-2.5 border-2 border-dashed border-green-300 text-green-700 hover:bg-green-50 rounded-xl text-sm font-semibold transition-colors">
                        + Agregar método de pago
                      </button>
                      {/* Total recibido y restante */}
                      {pagosIniciales.length > 1 && (
                        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm">
                          <span className="text-green-800 font-semibold">Total recibido:</span>
                          <span className="font-extrabold text-green-800">{formatUSD(totalPagadoInicial)}</span>
                        </div>
                      )}
                      {calculadora && (
                        <div className={`border rounded-lg px-4 py-3 flex items-center justify-between text-sm ${
                          totalPagadoInicial > calculadora.totalInicialLaOriental
                            ? 'bg-red-50 border-red-200'
                            : 'bg-purple-50 border-purple-200'
                        }`}>
                          <span className="text-purple-800 text-xs font-semibold">→ Restante → Crédito La Oriental:</span>
                          <span className="font-extrabold text-purple-700 text-base">
                            {formatUSD(Math.max(0, calculadora.totalInicialLaOriental - totalPagadoInicial))}
                          </span>
                        </div>
                      )}
                      {pagosIniciales.some(p => !p.monto || !p.metodo) && (
                        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                          <AlertCircle size={14} className="text-yellow-600 flex-shrink-0" />
                          <p className="text-xs text-yellow-800">Completa el monto y el método en cada fila de pago.</p>
                        </div>
                      )}
                    </div>
                  )}
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
                      <label className="label">N° de cuotas <span className="text-purple-500 text-[10px] font-normal">(0 = pago único)</span></label>
                      <input type="number" min="0" max="120" className="input" placeholder="12"
                        value={orCuotas} onChange={e => setOrCuotas(e.target.value)} />
                    </div>
                    <div>
                      {parseInt(orCuotas) === 0 ? (
                        <div className="h-full flex flex-col justify-end">
                          <div className="bg-purple-100 border-2 border-purple-300 border-dashed rounded-xl px-4 py-3 text-center">
                            <p className="text-purple-800 font-bold text-sm">Pago único</p>
                            <p className="text-purple-600 text-[11px] mt-0.5">La Oriental cobra el monto completo sin cuotas</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <label className="label flex items-center gap-2">
                            Monto por cuota (USD)
                            <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-full">auto</span>
                          </label>
                          <input type="number" step="0.01" min="0"
                            className={`input font-bold ${orMontoCuota ? 'bg-purple-50 text-purple-900 border-purple-300 cursor-not-allowed' : ''}`}
                            placeholder="Se calcula automático"
                            value={orMontoCuota}
                            readOnly />
                        </>
                      )}
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
                  {/* Monto histórico La Oriental */}
                  {calcInicialOriental.cuotas > 0 && (() => {
                    const hist = parseFloat(orMontoHistorico) || 0
                    const mc   = calcInicialOriental.montoCuota || 0
                    const completas = hist > 0 ? Math.min(Math.floor(hist / mc), calcInicialOriental.cuotas) : 0
                    const sobrante  = hist > 0 ? hist - completas * mc : 0
                    const saldoRest = Math.max(0, calcInicialOriental.totalCuotas - hist)
                    return (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <div className="flex items-start gap-2 mb-3">
                          <span className="text-amber-500 text-base">📋</span>
                          <div>
                            <p className="text-xs font-bold text-amber-800">¿Cliente con pagos previos al sistema?</p>
                            <p className="text-[11px] text-amber-600">Ingresa el total ya cobrado. El sistema distribuye automáticamente las cuotas pagadas y el abono parcial.</p>
                          </div>
                        </div>
                        <div className="relative mb-3">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray font-bold text-sm">$</span>
                          <input type="number" step="0.01" min="0" className="input pl-7 border-amber-300 bg-white font-semibold"
                            placeholder="0.00 — monto total ya cobrado"
                            value={orMontoHistorico} onChange={e => setOrMontoHistorico(e.target.value)} />
                        </div>
                        {hist > 0 && mc > 0 && (
                          <div className="space-y-1.5">
                            {completas > 0 && <p className="text-[11px] text-green-700 font-semibold">✓ {completas} cuota{completas > 1 ? 's' : ''} pagada{completas > 1 ? 's' : ''} completamente</p>}
                            {sobrante > 0.01 && <p className="text-[11px] text-yellow-700 font-semibold">⚡ Cuota #{completas + 1} con abono parcial de {formatUSD(sobrante)} · pendiente {formatUSD(mc - sobrante)}</p>}
                            <p className="text-[11px] text-red-700 font-semibold">Saldo restante a cobrar: {formatUSD(saldoRest)}</p>
                          </div>
                        )}
                        {hist > 0 && mc === 0 && <p className="text-[11px] text-amber-600">Completa el monto por cuota arriba para ver el preview.</p>}
                      </div>
                    )
                  })()}
                  {calcInicialOriental.cuotas === 0 && calcInicialOriental.monto > 0 && (
                    <div className="mt-3 bg-purple-700 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <p className="text-purple-200 text-[10px] uppercase tracking-wider">Pago único — La Oriental</p>
                        <p className="text-purple-300 text-[11px] mt-0.5">Sin cuotas — cobro total al inicio</p>
                      </div>
                      <p className="text-white font-extrabold text-xl">{formatUSD(calcInicialOriental.monto)}</p>
                    </div>
                  )}
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
                      <label className="label">
                        Monto total Vehimotors (USD)
                        {ceActivo && calcVehimotors.totalTrim > 0 && (
                          <span className="ml-2 text-[10px] font-normal text-teal-600">
                            — incluye cuotas especiales
                          </span>
                        )}
                      </label>
                      <input type="number" step="0.01" min="0" className="input" placeholder="0.00"
                        value={vhMonto} onChange={e => setVhMonto(e.target.value)} />
                      {ceActivo && calcVehimotors.totalTrim > 0 && calcVehimotors.totalMensual > 0 && (
                        <div className="mt-1.5 bg-teal-50 border border-teal-200 rounded-lg px-2.5 py-1.5 text-[11px]">
                          <span className="text-teal-700">
                            <strong>${calcVehimotors.monto.toLocaleString('es-VE', {minimumFractionDigits:2})}</strong> total
                            &nbsp;—&nbsp;
                            <strong className="text-teal-600">${calcVehimotors.totalTrim.toLocaleString('es-VE', {minimumFractionDigits:2})}</strong> cuotas especiales
                            &nbsp;=&nbsp;
                            <strong className="text-indigo-700">${calcVehimotors.totalMensual.toLocaleString('es-VE', {minimumFractionDigits:2})}</strong> en cuotas mensuales
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="label">N° de cuotas</label>
                      <input type="number" min="1" max="120" className="input" placeholder="12"
                        value={vhCuotas} onChange={e => setVhCuotas(e.target.value)} />
                    </div>
                    <div>
                      <label className="label flex items-center gap-2">
                        Monto por cuota (USD)
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full">auto</span>
                      </label>
                      <input type="number" step="0.01" min="0"
                        className={`input font-bold ${vhMontoCuota ? 'bg-indigo-50 text-indigo-900 border-indigo-300 cursor-not-allowed' : ''}`}
                        placeholder="Se calcula automático"
                        value={vhMontoCuota}
                        readOnly />
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
                  {/* Monto histórico Vehimotors */}
                  {calcVehimotors.cuotas > 0 && (() => {
                    const hist = parseFloat(vhMontoHistorico) || 0
                    const mc   = calcVehimotors.montoCuota || 0
                    const completas = hist > 0 ? Math.min(Math.floor(hist / mc), calcVehimotors.cuotas) : 0
                    const sobrante  = hist > 0 ? hist - completas * mc : 0
                    const saldoRest = Math.max(0, calcVehimotors.totalMensual - hist)
                    return (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <div className="flex items-start gap-2 mb-3">
                          <span className="text-amber-500 text-base">📋</span>
                          <div>
                            <p className="text-xs font-bold text-amber-800">¿Cliente con pagos previos al sistema?</p>
                            <p className="text-[11px] text-amber-600">Ingresa el total ya cobrado por Vehimotors. El sistema distribuye cuotas pagadas y abono parcial automáticamente.</p>
                          </div>
                        </div>
                        <div className="relative mb-3">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray font-bold text-sm">$</span>
                          <input type="number" step="0.01" min="0" className="input pl-7 border-amber-300 bg-white font-semibold"
                            placeholder="0.00 — monto total ya cobrado"
                            value={vhMontoHistorico} onChange={e => setVhMontoHistorico(e.target.value)} />
                        </div>
                        {hist > 0 && mc > 0 && (
                          <div className="space-y-1.5">
                            {completas > 0 && <p className="text-[11px] text-green-700 font-semibold">✓ {completas} cuota{completas > 1 ? 's' : ''} pagada{completas > 1 ? 's' : ''} completamente</p>}
                            {sobrante > 0.01 && <p className="text-[11px] text-yellow-700 font-semibold">⚡ Cuota #{completas + 1} con abono parcial de {formatUSD(sobrante)} · pendiente {formatUSD(mc - sobrante)}</p>}
                            <p className="text-[11px] text-red-700 font-semibold">Saldo restante a cobrar: {formatUSD(saldoRest)}</p>
                          </div>
                        )}
                        {hist > 0 && mc === 0 && <p className="text-[11px] text-amber-600">Completa el monto por cuota arriba para ver el preview.</p>}
                      </div>
                    )
                  })()}
                  {calcVehimotors.cuotas > 0 && calcVehimotors.montoCuota > 0 && (
                    <div className="mt-3 bg-indigo-700 rounded-lg p-4">
                      {/* Desglose si hay cuotas especiales */}
                      {ceActivo && calcVehimotors.totalTrim > 0 && (
                        <div className="bg-indigo-800/50 rounded-lg px-3 py-2 mb-3 text-[11px] text-indigo-200 flex items-center justify-between">
                          <span>Total Vehimotors: <strong className="text-white">{formatUSD(calcVehimotors.monto)}</strong></span>
                          <span>Cuotas especiales: <strong className="text-teal-300">− {formatUSD(calcVehimotors.totalTrim)}</strong></span>
                          <span>Mensual: <strong className="text-indigo-100">{formatUSD(calcVehimotors.totalMensual)}</strong></span>
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                          <p className="text-indigo-200 text-[10px] uppercase tracking-wider">
                            {ceActivo && calcVehimotors.totalTrim > 0 ? 'Monto mensual' : 'Monto financiado'}
                          </p>
                          <p className="text-white font-extrabold text-base">
                            {formatUSD(ceActivo && calcVehimotors.totalTrim > 0 ? calcVehimotors.totalMensual : calcVehimotors.monto)}
                          </p>
                        </div>
                        <div className="text-center border-x border-indigo-500">
                          <p className="text-indigo-200 text-[10px] uppercase tracking-wider">Cuota {vhFrecuencia}</p>
                          <p className="text-white font-extrabold text-base">{formatUSD(calcVehimotors.montoCuota)}</p>
                          <p className="text-indigo-300 text-[10px]">{calcVehimotors.cuotas} cuotas</p>
                        </div>
                        <div className="text-center">
                          <p className="text-indigo-200 text-[10px] uppercase tracking-wider">Total cuotas mens.</p>
                          <p className="text-white font-extrabold text-base">{formatUSD(calcVehimotors.totalMensual)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {calcVehimotors.showWarning && (
                    <div className="mt-2 flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                      <AlertCircle size={14} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-800">El total de cuotas mensuales ({formatUSD(calcVehimotors.totalMensual)}) no coincide con el monto mensual ({formatUSD(calcVehimotors.totalMensual)}). Verifica.</p>
                    </div>
                  )}
                </div>

                {/* Cuota Especial (paralela a las mensuales) */}
                <div className={`border-2 rounded-xl overflow-hidden ${ceActivo ? 'border-teal-400 bg-teal-50' : 'border-dashed border-teal-300'}`}>
                  <button
                    type="button"
                    onClick={() => setCeActivo(!ceActivo)}
                    className={`w-full flex items-center justify-between px-5 py-3 transition-colors ${ceActivo ? 'bg-teal-100 hover:bg-teal-200' : 'bg-teal-50 hover:bg-teal-100'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full border-2 ${ceActivo ? 'bg-teal-600 border-teal-600' : 'border-teal-400'}`} />
                      <span className="text-teal-800 font-bold text-sm">3 · Cuotas Especiales (paralelas)</span>
                      <span className="text-teal-600 text-xs">— Ej: cuota trimestral que corre junto a las mensuales</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ceActivo ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-700 border border-teal-300'}`}>{ceActivo ? 'Quitar' : '+ Agregar'}</span>
                  </button>

                  {ceActivo && (
                    <div className="px-5 pb-5 pt-4 space-y-4 bg-teal-50">
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
                                  ? 'bg-teal-700 border-teal-700 text-white'
                                  : 'border-gray-300 text-oriental-gray hover:border-teal-400'
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
                      {/* Pagos previos cuota especial */}
                      {(parseInt(ceCuotas) || 0) > 0 && (parseFloat(ceMontoCuota) || 0) > 0 && (() => {
                        const hist = parseFloat(ceMontoHistorico) || 0
                        const mc   = parseFloat(ceMontoCuota) || 0
                        const completas = hist > 0 ? Math.min(Math.floor(hist / mc), parseInt(ceCuotas) || 0) : 0
                        const sobrante  = hist > 0 ? hist - completas * mc : 0
                        const saldoRest = Math.max(0, ((parseInt(ceCuotas) || 0) * mc) - hist)
                        return (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <div className="flex items-start gap-2 mb-3">
                              <span className="text-amber-500 text-base">📋</span>
                              <div>
                                <p className="text-xs font-bold text-amber-800">¿Cliente con pagos previos en cuotas especiales?</p>
                                <p className="text-[11px] text-amber-600">Ingresa el total ya cobrado. El sistema marca las cuotas como pagadas automáticamente.</p>
                              </div>
                            </div>
                            <div className="relative mb-3">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray font-bold text-sm">$</span>
                              <input type="number" step="0.01" min="0" className="input pl-7 border-amber-300 bg-white font-semibold"
                                placeholder="0.00 — monto total ya cobrado"
                                value={ceMontoHistorico} onChange={e => setCeMontoHistorico(e.target.value)} />
                            </div>
                            {hist > 0 && mc > 0 && (
                              <div className="space-y-1.5">
                                {completas > 0 && <p className="text-[11px] text-green-700 font-semibold">✓ {completas} cuota{completas > 1 ? 's' : ''} pagada{completas > 1 ? 's' : ''} completamente</p>}
                                {sobrante > 0.01 && <p className="text-[11px] text-yellow-700 font-semibold">⚡ Cuota #{completas + 1} con abono parcial de {formatUSD(sobrante)} · pendiente {formatUSD(mc - sobrante)}</p>}
                                <p className="text-[11px] text-oriental-gray font-semibold">Saldo restante: {formatUSD(saldoRest)}</p>
                              </div>
                            )}
                          </div>
                        )
                      })()}
                      {calcCuotaEspecial.cuotas > 0 && calcCuotaEspecial.montoCuota > 0 && (
                        <div className="bg-teal-700 rounded-lg p-4 grid grid-cols-3 gap-3">
                          <div className="text-center">
                            <p className="text-teal-100 text-[10px] uppercase tracking-wider">Monto total</p>
                            <p className="text-white font-extrabold text-base">{formatUSD(calcCuotaEspecial.monto)}</p>
                          </div>
                          <div className="text-center border-x border-teal-500">
                            <p className="text-teal-100 text-[10px] uppercase tracking-wider">Cuota {ceFrecuencia}</p>
                            <p className="text-white font-extrabold text-base">{formatUSD(calcCuotaEspecial.montoCuota)}</p>
                            <p className="text-teal-200 text-[10px]">{calcCuotaEspecial.cuotas} cuotas</p>
                          </div>
                          <div className="text-center">
                            <p className="text-teal-100 text-[10px] uppercase tracking-wider">Total cuotas</p>
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

        {/* Pago de inicial — AC500 y 40/60 (personalizado lo tiene integrado en la calculadora) */}
        {tipoCompra === 'financiado' && plan !== 'personalizado' && (
          <div className={`card p-6 border-2 transition-colors ${registrarIngresoInicial ? 'border-green-300 bg-green-50/30' : 'border-dashed border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider flex items-center gap-2">
                <div className={`w-1 h-4 rounded-full ${registrarIngresoInicial ? 'bg-green-500' : 'bg-gray-300'}`} />
                Registrar ingreso de inicial
              </h2>
              <button type="button" onClick={() => setRegistrarIngresoInicial(v => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors ${registrarIngresoInicial ? 'bg-green-500' : 'bg-gray-300'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${registrarIngresoInicial ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {!registrarIngresoInicial && (
              <p className="text-xs text-oriental-gray mt-2">Activa para registrar el pago de inicial. Soporta múltiples métodos de pago.</p>
            )}
            {registrarIngresoInicial && (
              <div className="mt-4 space-y-3">
                <div className="max-w-xs">
                  <label className="label">Fecha de pago *</label>
                  <input type="date" className="input" value={ingresoInicialFecha} onChange={e => setIngresoInicialFecha(e.target.value)} />
                </div>
                {pagosIniciales.map((pago, idx) => (
                  <div key={pago.id} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pago {idx + 1}</span>
                      {pagosIniciales.length > 1 && (
                        <button type="button" onClick={() => removePago(pago.id)}
                          className="text-xs text-red-400 hover:text-red-600 font-semibold">Eliminar</button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="label">Monto (USD) *</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray font-bold">$</span>
                          <input type="number" step="0.01" min="0" className="input pl-7 font-semibold text-lg"
                            placeholder="0.00" value={pago.monto} onChange={e => updatePago(pago.id, 'monto', e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className="label">Método *</label>
                        <select className="select" value={pago.metodo} onChange={e => updatePago(pago.id, 'metodo', e.target.value)}>
                          <option value="">Seleccionar...</option>
                          {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">N° Referencia</label>
                        <input type="text" className="input" placeholder="Número de referencia"
                          value={pago.referencia} onChange={e => updatePago(pago.id, 'referencia', e.target.value)} />
                      </div>
                      <div>
                        <label className="label">Banco emisor</label>
                        <select className="select" value={pago.bancoEmisor} onChange={e => updatePago(pago.id, 'bancoEmisor', e.target.value)}>
                          <option value="">—</option>
                          {BANCOS_VE.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="label">Banco receptor</label>
                        <select className="select" value={pago.bancoReceptor} onChange={e => updatePago(pago.id, 'bancoReceptor', e.target.value)}>
                          <option value="">—</option>
                          {BANCOS_VE.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      {METODOS_BS.includes(pago.metodo) && (<>
                        <div className="md:col-span-2 pt-1 border-t border-orange-100">
                          <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Detalle en Bolívares</p>
                        </div>
                        <div>
                          <label className="label">Monto en Bs.</label>
                          <input type="number" step="0.01" min="0" className="input"
                            placeholder="0.00" value={pago.montoBs} onChange={e => updatePago(pago.id, 'montoBs', e.target.value)} />
                        </div>
                        <div>
                          <label className="label">Tasa Bs./USD</label>
                          <input type="number" step="0.01" min="0" className="input"
                            placeholder="40.00" value={pago.tasaCambio} onChange={e => updatePago(pago.id, 'tasaCambio', e.target.value)} />
                        </div>
                        {pago.montoBs && pago.tasaCambio && (
                          <div className="md:col-span-2">
                            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 flex items-center justify-between text-sm">
                              <span className="text-orange-700 text-xs font-semibold">≈ Equivalente USD:</span>
                              <span className="font-extrabold text-orange-900">
                                {formatUSD((parseFloat(pago.montoBs) || 0) / (parseFloat(pago.tasaCambio) || 1))}
                              </span>
                            </div>
                          </div>
                        )}
                      </>)}
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addPago}
                  className="w-full py-2.5 border-2 border-dashed border-green-300 text-green-700 hover:bg-green-50 rounded-xl text-sm font-semibold transition-colors">
                  + Agregar método de pago
                </button>
                {pagosIniciales.length > 1 && (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm">
                    <span className="text-green-800 font-semibold">Total recibido:</span>
                    <span className="font-extrabold text-green-800">{formatUSD(totalPagadoInicial)}</span>
                  </div>
                )}
                {pagosIniciales.some(p => !p.monto || !p.metodo) && (
                  <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                    <AlertCircle size={14} className="text-yellow-600 flex-shrink-0" />
                    <p className="text-xs text-yellow-800">Completa el monto y el método en cada fila de pago.</p>
                  </div>
                )}
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
