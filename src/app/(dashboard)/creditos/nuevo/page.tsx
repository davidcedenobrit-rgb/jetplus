'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, Search, X, Car, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import type { Cliente, Vehiculo } from '@/types/database'
import { CreditoSchema } from '@/lib/validations'
import { MODELOS_MG, MODELOS_MAXUS } from '@/lib/modelos'

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
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [plan, setPlan] = useState<Plan>('asegurate_500')

  // Precio desglosado (40/60 y AC500)
  const [precioBase, setPrecioBase] = useState('')
  const [gastosAdmin, setGastosAdmin] = useState('')

  // AC500
  const [cuotasAsegurate, setCuotasAsegurate] = useState<6 | 9>(6)
  const [planesAC500, setPlanesAC500] = useState<PlanAC500[]>([])
  const [planAC500Sel, setPlanAC500Sel] = useState<PlanAC500 | null>(null)
  const [loadingPlanes, setLoadingPlanes] = useState(false)

  // Plan personalizado — Crédito Inicial La Oriental
  const [inicialOrientalMonto, setInicialOrientalMonto] = useState('')
  const [inicialOrientalCuotas, setInicialOrientalCuotas] = useState('12')
  const [inicialOrientalMontoCuota, setInicialOrientalMontoCuota] = useState('')
  const [inicialOrientalFrecuencia, setInicialOrientalFrecuencia] = useState('mensual')
  const [inicialOrientalFecha, setInicialOrientalFecha] = useState(new Date().toISOString().split('T')[0])
  const [inicialOrientalObs, setInicialOrientalObs] = useState('')
  // Plan personalizado — Crédito Financiamiento Vehimotors
  const [vehimotorsMonto, setVehimotorsMonto] = useState('')
  const [vehimotorsCuotas, setVehimotorsCuotas] = useState('24')
  const [vehimotorsMontoCuota, setVehimotorsMontoCuota] = useState('')
  const [vehimotorsFrecuencia, setVehimotorsFrecuencia] = useState('mensual')
  const [vehimotorsFecha, setVehimotorsFecha] = useState(new Date().toISOString().split('T')[0])
  const [vehimotorsObs, setVehimotorsObs] = useState('')

  // Cuota especial (trimestral paralela)
  const [ceActivo, setCeActivo] = useState(false)
  const [ceMonto, setCeMonto] = useState('')
  const [ceCuotas, setCeCuotas] = useState('8')
  const [ceMontoCuota, setCeMontoCuota] = useState('')
  const [ceFrecuencia, setCeFrecuencia] = useState('trimestral')
  const [ceFecha, setCeFecha] = useState(new Date().toISOString().split('T')[0])
  const [ceObs, setCeObs] = useState('')
  const [ceMontoHistorico, setCeMontoHistorico] = useState('')

  // Historial de pagos previos
  const [orMontoHistorico, setOrMontoHistorico] = useState('')
  const [vhMontoHistorico, setVhMontoHistorico] = useState('')

  // Calculadora de precio
  const [calcBase, setCalcBase] = useState('')
  const [calcIvaPct, setCalcIvaPct] = useState('16')
  const [calcGastosContado, setCalcGastosContado] = useState('')
  const [calcGastosCredito, setCalcGastosCredito] = useState('')
  const [calcPctInicial, setCalcPctInicial] = useState('40')
  const [calcTasaAnual, setCalcTasaAnual] = useState('24')
  const [calcNumCuotasVh, setCalcNumCuotasVh] = useState('24')

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

  // Pre-cargar vehículo y cliente si viene desde la página del vehículo
  useEffect(() => {
    const vid = searchParams.get('vehiculo_id')
    if (!vid) return
    ;(async () => {
      const { data: v } = await supabase.from('vehiculos').select('*').eq('id', vid).single()
      if (!v) return
      const { data: c } = await supabase.from('clientes').select('*').eq('id', v.cliente_id).single()
      if (!c) return
      setClienteSeleccionado(c)
      setClienteQuery(c.nombre)
      setVehiculos([v])
      setVehiculoSeleccionado(v)
    })()
  }, [])

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

  // Pre-cargar créditos existentes cuando se selecciona un vehículo
  useEffect(() => {
    if (!vehiculoSeleccionado) return
    supabase
      .from('creditos')
      .select('*')
      .eq('vehiculo_id', vehiculoSeleccionado.id)
      .then(({ data: creditos }) => {
        if (!creditos || creditos.length === 0) return
        for (const cred of creditos) {
          if (cred.plan_tipo === 'inicial_la_oriental') {
            setInicialOrientalMonto(String(cred.monto_financiado ?? ''))
            setInicialOrientalCuotas(String(cred.num_cuotas ?? '12'))
            setInicialOrientalFrecuencia(cred.frecuencia_pago ?? 'mensual')
            setInicialOrientalFecha(cred.fecha_inicio ?? new Date().toISOString().split('T')[0])
            setInicialOrientalObs(cred.observaciones ?? '')
          }
          if (cred.plan_tipo === 'financiamiento_vehimotors') {
            setVehimotorsMonto(String(cred.monto_financiado ?? ''))
            setVehimotorsCuotas(String(cred.num_cuotas ?? '24'))
            setVehimotorsFrecuencia(cred.frecuencia_pago ?? 'mensual')
            setVehimotorsFecha(cred.fecha_inicio ?? new Date().toISOString().split('T')[0])
            setVehimotorsObs(cred.observaciones ?? '')
          }
        }
        // Cambiar a plan personalizado si hay créditos de esos tipos
        const tienes = creditos.map((c: any) => c.plan_tipo)
        if (tienes.includes('inicial_la_oriental') || tienes.includes('financiamiento_vehimotors')) {
          setPlan('personalizado')
        }
      })
  }, [vehiculoSeleccionado])

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

  // Auto-calcular monto por cuota — La Oriental
  // Siempre recalcula; si no hay monto/cuotas válidos, limpia el campo
  useEffect(() => {
    const monto  = parseFloat(inicialOrientalMonto)
    const cuotas = parseInt(inicialOrientalCuotas)
    if (monto > 0 && cuotas > 0) {
      setInicialOrientalMontoCuota((monto / cuotas).toFixed(2))
    } else {
      setInicialOrientalMontoCuota('')
    }
  }, [inicialOrientalMonto, inicialOrientalCuotas])

  // Auto-calcular cuota Vehimotors con PMT + descuento trimestral
  useEffect(() => {
    const monto  = parseFloat(vehimotorsMonto)
    const cuotas = parseInt(vehimotorsCuotas)
    if (!monto || monto <= 0 || !cuotas || cuotas <= 0) { setVehimotorsMontoCuota(''); return }
    const tasa = parseFloat(calcTasaAnual) || 0
    let pmt: number
    if (tasa > 0) {
      const r = tasa / 100 / 12
      pmt = monto * r * Math.pow(1 + r, cuotas) / (Math.pow(1 + r, cuotas) - 1)
    } else {
      pmt = monto / cuotas
    }
    if (ceActivo) {
      const totalTrim = (parseInt(ceCuotas) || 0) * (parseFloat(ceMontoCuota) || 0)
      if (totalTrim > 0) {
        const total = pmt * cuotas
        setVehimotorsMontoCuota((Math.max(0, total - totalTrim) / cuotas).toFixed(2))
        return
      }
    }
    setVehimotorsMontoCuota(pmt.toFixed(2))
  }, [vehimotorsMonto, vehimotorsCuotas, calcTasaAnual, ceActivo, ceCuotas, ceMontoCuota])

  // Calculadora de precio (live)
  const calculadora = useMemo(() => {
    const base = parseFloat(calcBase) || 0
    if (base <= 0) return null
    const ivaPct = parseFloat(calcIvaPct) || 16
    const iva = base * ivaPct / 100
    const pctInicial = (parseFloat(calcPctInicial) || 40) / 100
    const gastosCredito = parseFloat(calcGastosCredito) || 0
    const inicialBase = base * pctInicial
    const totalInicialLaOriental = inicialBase + iva + gastosCredito
    const financiamientoVh = base * (1 - pctInicial)
    const n = parseInt(calcNumCuotasVh) || 24
    const tasaAnual = parseFloat(calcTasaAnual) || 0
    let cuotaVh: number
    if (tasaAnual > 0) {
      const r = tasaAnual / 100 / 12
      cuotaVh = financiamientoVh * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)
    } else {
      cuotaVh = financiamientoVh / n
    }
    return { base, iva, ivaPct, pctInicial, gastosCredito, inicialBase, totalInicialLaOriental, financiamientoVh, cuotaVh, n, tasaAnual }
  }, [calcBase, calcIvaPct, calcGastosCredito, calcPctInicial, calcTasaAnual, calcNumCuotasVh])

  function aplicarCalculadora() {
    if (!calculadora) return
    setInicialOrientalMonto(calculadora.totalInicialLaOriental.toFixed(2))
    setVehimotorsMonto(calculadora.financiamientoVh.toFixed(2))
    setVehimotorsCuotas(String(calculadora.n))
    setVehimotorsMontoCuota(calculadora.cuotaVh.toFixed(2))
  }

  // Plan personalizado — cálculos
  const calcInicialOriental = useMemo(() => {
    const montoTotal = parseFloat(inicialOrientalMonto) || 0
    const numCuotas = parseInt(inicialOrientalCuotas) || 0
    const montoCuota = parseFloat(inicialOrientalMontoCuota) || 0
    const totalCuotas = numCuotas * montoCuota
    const showWarning = montoTotal > 0 && numCuotas > 0 && montoCuota > 0 && Math.abs(totalCuotas - montoTotal) > 0.01
    return { montoTotal, numCuotas, montoCuota, totalCuotas, showWarning }
  }, [inicialOrientalMonto, inicialOrientalCuotas, inicialOrientalMontoCuota])

  const calcVehimotors = useMemo(() => {
    const montoTotal = parseFloat(vehimotorsMonto) || 0
    const numCuotas = parseInt(vehimotorsCuotas) || 0
    const montoCuota = parseFloat(vehimotorsMontoCuota) || 0
    const totalCuotas = numCuotas * montoCuota
    const showWarning = montoTotal > 0 && numCuotas > 0 && montoCuota > 0 && Math.abs(totalCuotas - montoTotal) > 0.01
    return { montoTotal, numCuotas, montoCuota, totalCuotas, showWarning }
  }, [vehimotorsMonto, vehimotorsCuotas, vehimotorsMontoCuota])

  const resumenPersonalizado = useMemo(() => {
    const totalOr  = calcInicialOriental.totalCuotas
    const totalVhMensual = calcVehimotors.totalCuotas
    const totalCe  = ceActivo ? (parseInt(ceCuotas) || 0) * (parseFloat(ceMontoCuota) || 0) : 0
    const totalVh  = totalVhMensual + totalCe          // Vehimotors completo
    const totalFinanciado = totalOr + totalVh
    return { totalOr, totalVhMensual, totalCe, totalVh, totalFinanciado }
  }, [calcInicialOriental.totalCuotas, calcVehimotors.totalCuotas, ceActivo, ceCuotas, ceMontoCuota])

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
      // Plan personalizado: dos créditos separados — se manejan más abajo
    } else {
      setError('Selecciona un plan válido'); return
    }

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) { setError('Sesión expirada'); return }
    setLoading(true)
    setError('')

    // ── PLAN PERSONALIZADO: crear DOS créditos (uno o ambos activos) ──
    if (plan === 'personalizado') {
      const orActivo = calcInicialOriental.numCuotas > 0
      const vhActivo = calcVehimotors.numCuotas > 0
      if (!orActivo && !vhActivo) {
        setError('Completa al menos un bloque de crédito')
        setLoading(false)
        return
      }

      // Distribución histórica: completas primero, última con abono parcial
      function buildCuotas(creditoId: string, n: number, montoCuota: number, frecuencia: string, fechaBase: string, concepto: string, montoHistorico = 0) {
        let restante = montoHistorico
        return Array.from({ length: n }, (_, i) => {
          const fecha = new Date(fechaBase)
          if (frecuencia === 'semanal') fecha.setDate(fecha.getDate() + (i + 1) * 7)
          else if (frecuencia === 'quincenal') fecha.setDate(fecha.getDate() + (i + 1) * 15)
          else if (frecuencia === 'trimestral') fecha.setMonth(fecha.getMonth() + 3 * (i + 1))
          else fecha.setMonth(fecha.getMonth() + (i + 1))
          let estado = 'pendiente', monto_pagado = 0
          if (restante >= montoCuota) { estado = 'pagada'; monto_pagado = montoCuota; restante -= montoCuota }
          else if (restante > 0) { estado = 'abono_parcial'; monto_pagado = restante; restante = 0 }
          return { credito_id: creditoId, numero_cuota: i + 1, fecha_vencimiento: fecha.toISOString().split('T')[0], monto: montoCuota, estado, monto_pagado, mora: 0, concepto }
        })
      }

      let primerCreditoId = ''

      if (orActivo) {
        const { data: resO, error: errO } = await supabase.from('creditos').insert({
          cliente_id: clienteSeleccionado.id, vehiculo_id: vehiculoSeleccionado.id,
          placa: vehiculoSeleccionado.placa,
          monto_financiado: calcInicialOriental.montoTotal,
          inicial: calcInicialOriental.montoTotal,
          saldo: calcInicialOriental.totalCuotas,
          num_cuotas: calcInicialOriental.numCuotas,
          frecuencia_pago: inicialOrientalFrecuencia,
          fecha_inicio: inicialOrientalFecha, moneda: 'USD', estado: 'activo',
          plan_tipo: 'inicial_la_oriental',
          observaciones: inicialOrientalObs || 'Crédito de Inicial — La Oriental',
        }).select().single()
        if (errO || !resO) { setError(errO?.message ?? 'Error crédito inicial'); setLoading(false); return }
        await supabase.from('cuotas').insert(buildCuotas(resO.id, calcInicialOriental.numCuotas, calcInicialOriental.montoCuota, inicialOrientalFrecuencia, inicialOrientalFecha, 'Crédito de Inicial — La Oriental', parseFloat(orMontoHistorico) || 0))
        primerCreditoId = resO.id
      }

      if (vhActivo) {
        const { data: resV, error: errV } = await supabase.from('creditos').insert({
          cliente_id: clienteSeleccionado.id, vehiculo_id: vehiculoSeleccionado.id,
          placa: vehiculoSeleccionado.placa,
          monto_financiado: calcVehimotors.totalCuotas,
          inicial: 0,
          saldo: calcVehimotors.totalCuotas,
          num_cuotas: calcVehimotors.numCuotas,
          frecuencia_pago: vehimotorsFrecuencia,
          fecha_inicio: vehimotorsFecha, moneda: 'USD', estado: 'activo',
          plan_tipo: 'financiamiento_vehimotors',
          observaciones: vehimotorsObs || 'Crédito Financiamiento — Vehimotors',
        }).select().single()
        if (errV || !resV) { setError(errV?.message ?? 'Error crédito Vehimotors'); setLoading(false); return }
        await supabase.from('cuotas').insert(buildCuotas(resV.id, calcVehimotors.numCuotas, calcVehimotors.montoCuota, vehimotorsFrecuencia, vehimotorsFecha, 'Crédito Financiamiento — Vehimotors', parseFloat(vhMontoHistorico) || 0))
        // Cuota especial trimestral
        if (ceActivo && parseInt(ceCuotas) > 0 && parseFloat(ceMontoCuota) > 0) {
          const ceTotalMonto = (parseInt(ceCuotas) || 0) * (parseFloat(ceMontoCuota) || 0)
          const ceHistorico = parseFloat(ceMontoHistorico) || 0
          const { data: resCe } = await supabase.from('creditos').insert({
            cliente_id: clienteSeleccionado.id, vehiculo_id: vehiculoSeleccionado.id,
            placa: vehiculoSeleccionado.placa,
            monto_financiado: ceTotalMonto, inicial: 0, saldo: Math.max(0, ceTotalMonto - ceHistorico),
            num_cuotas: parseInt(ceCuotas), frecuencia_pago: ceFrecuencia,
            fecha_inicio: ceFecha, moneda: 'USD', estado: 'activo', plan_tipo: 'cuota_especial',
            observaciones: ceObs || `Cuota especial ${ceFrecuencia}`,
          }).select().single()
          if (resCe) await supabase.from('cuotas').insert(buildCuotas(resCe.id, parseInt(ceCuotas), parseFloat(ceMontoCuota), ceFrecuencia, ceFecha, `Cuota especial ${ceFrecuencia}`, ceHistorico))
        }
        if (!primerCreditoId) primerCreditoId = resV.id
      }

      router.push(`/creditos/${primerCreditoId}`)
      router.refresh()
      return
    }

    const planLabel = plan === 'credito_40_60' ? 'Vehimotors (Planta)'
      : `Asegúrate $500 (${cuotasAsegurate}m) — ${planAC500Sel?.modelo}`

    const desglose = `Base: ${formatUSD(precioCalc.base)} | IVA: ${formatUSD(precioCalc.iva)} | Admin: ${formatUSD(precioCalc.admin)}`
    const obsCompleta = [`Plan: ${planLabel}`, desglose, observaciones].filter(Boolean).join('. ')

    const parsed = CreditoSchema.safeParse({
      monto_financiado: montoFinanciado,
      inicial,
      num_cuotas: numCuotas,
      frecuencia_pago: 'mensual',
      fecha_inicio: fechaInicio,
      moneda: 'USD',
      observaciones: obsCompleta || null,
    })
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Datos del crédito inválidos')
      setLoading(false)
      return
    }

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
        return { credito_id: creditoCreado.id, numero_cuota: c.numero, fecha_vencimiento: fecha.toISOString().split('T')[0], monto: c.monto, estado: 'pendiente', mora: 0 }
      })
    } else if (plan === 'credito_40_60' && calc4060) {
      cuotasData = Array.from({ length: 24 }, (_, i) => {
        const fecha = new Date(fechaInicio)
        fecha.setMonth(fecha.getMonth() + (i + 1))
        return { credito_id: creditoCreado.id, numero_cuota: i + 1, fecha_vencimiento: fecha.toISOString().split('T')[0], monto: calc4060.cuota, estado: 'pendiente', mora: 0 }
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {[
              { value: 'asegurate_500', title: 'Asegúrate con $500', desc: '$500 reserva + cuotas según modelo' },
              { value: 'personalizado', title: 'Personalizado "La Oriental"', desc: 'Define el plan libremente' },
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

          {/* ── CALCULADORA DE PRECIO (plan personalizado) ── */}
          {plan === 'personalizado' && (
            <div className="border-2 border-amber-200 rounded-xl bg-amber-50/30">
              <div className="px-5 pt-4 pb-3 border-b border-amber-200">
                <p className="text-sm font-bold text-amber-900 flex items-center gap-2">
                  <span className="text-base">🧮</span> Calculadora de precio
                  <span className="text-xs font-normal text-amber-700 ml-1">— Los resultados precargan los campos automáticamente</span>
                </p>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className="label">Precio base (USD) *</label>
                    <input type="number" step="0.01" min="0" className="input font-semibold text-lg"
                      placeholder="23,000.00" value={calcBase} onChange={e => setCalcBase(e.target.value)} />
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="label">Gastos (crédito)</label>
                    <input type="number" step="0.01" min="0" className="input"
                      placeholder="0.00" value={calcGastosCredito} onChange={e => setCalcGastosCredito(e.target.value)} />
                    <p className="text-[10px] text-oriental-gray mt-0.5">Póliza + Traslado + INTT + Notaría</p>
                  </div>
                  <div>
                    <label className="label">Tasa Vehimotors (% anual)</label>
                    <input type="number" step="0.0001" min="0" className="input"
                      placeholder="Ej: 24.5678" value={calcTasaAnual} onChange={e => setCalcTasaAnual(e.target.value)} />
                    <p className="text-[10px] text-oriental-gray mt-0.5">Vacío = sin interés</p>
                  </div>
                  <div>
                    <label className="label">N° cuotas Vehimotors</label>
                    <input type="number" step="1" min="1" max="120" className="input"
                      placeholder="24" value={calcNumCuotasVh} onChange={e => setCalcNumCuotasVh(e.target.value)} />
                  </div>
                </div>
                {calculadora && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-amber-200 rounded-xl p-4 space-y-2 text-sm">
                      <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">Total Inicial — La Oriental</p>
                      <div className="flex justify-between"><span className="text-oriental-gray">{Math.round(calculadora.pctInicial * 100)}% Precio base</span><span className="font-semibold">{formatUSD(calculadora.inicialBase)}</span></div>
                      <div className="flex justify-between"><span className="text-oriental-gray">IVA ({calculadora.ivaPct}%)</span><span className="font-semibold">{formatUSD(calculadora.iva)}</span></div>
                      <div className="flex justify-between"><span className="text-oriental-gray">Gastos</span><span className="font-semibold">{formatUSD(calculadora.gastosCredito)}</span></div>
                      <div className="flex justify-between border-t border-amber-200 pt-2"><span className="font-bold text-purple-800 text-xs uppercase">Total inicial</span><span className="font-extrabold text-purple-700 text-base">{formatUSD(calculadora.totalInicialLaOriental)}</span></div>
                    </div>
                    <div className="bg-white border border-amber-200 rounded-xl p-4 space-y-2 text-sm">
                      <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">Financiamiento Vehimotors</p>
                      <div className="flex justify-between"><span className="text-oriental-gray">Principal</span><span className="font-semibold">{formatUSD(calculadora.financiamientoVh)}</span></div>
                      <div className="flex justify-between bg-indigo-50 rounded-lg px-2 py-1.5"><span className="text-indigo-700 font-semibold text-xs">{calculadora.n} cuotas{calculadora.tasaAnual > 0 ? ` (${calculadora.tasaAnual}% anual)` : ''}</span><span className="font-extrabold text-indigo-800">{formatUSD(calculadora.cuotaVh)} / cuota</span></div>
                    </div>
                  </div>
                )}
                {calculadora && (
                  <button type="button" onClick={aplicarCalculadora}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition-colors">
                    ↓ Aplicar al Plan Personalizado
                  </button>
                )}
                {!calculadora && <p className="text-xs text-amber-700 text-center py-2">Ingresa el precio base para ver los cálculos</p>}
              </div>
            </div>
          )}

          {/* ── PLAN PERSONALIZADO LA ORIENTAL ── */}
          {plan === 'personalizado' && (
            <div className="space-y-5">
              {/* Sub-crédito 1: Inicial La Oriental */}
              <div className="border-2 border-purple-200 bg-purple-50/40 rounded-xl p-5">
                <p className="text-sm font-bold text-purple-800 mb-4 flex items-center gap-2">
                  <span className="w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  Crédito de Inicial — La Oriental
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Monto inicial financiado (USD)</label>
                    <input type="number" step="0.01" min="0" className="input" placeholder="0.00"
                      value={inicialOrientalMonto} onChange={e => setInicialOrientalMonto(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">N° de cuotas</label>
                    <input type="number" min="0" max="120" className="input" placeholder="12 (0 = pago único)"
                      value={inicialOrientalCuotas} onChange={e => setInicialOrientalCuotas(e.target.value)} />
                  </div>
                  <div>
                    <label className="label flex items-center gap-1.5">
                      Monto por cuota (USD)
                      {inicialOrientalMontoCuota && (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">auto</span>
                      )}
                    </label>
                    <input
                      type="number" step="0.01" min="0"
                      className={`input font-bold ${inicialOrientalMontoCuota ? 'bg-purple-50 text-purple-900 border-purple-300 cursor-not-allowed' : ''}`}
                      placeholder="Se calcula automático"
                      value={inicialOrientalMontoCuota}
                      readOnly
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="label">Frecuencia</label>
                    <div className="flex gap-2">
                      {['semanal', 'quincenal', 'mensual', 'trimestral'].map(f => (
                        <button key={f} type="button" onClick={() => setInicialOrientalFrecuencia(f)}
                          className={`flex-1 py-2 rounded-lg text-xs font-semibold border capitalize transition-colors ${
                            inicialOrientalFrecuencia === f ? 'bg-purple-700 text-white border-purple-700' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
                          }`}>{f}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Fecha inicio</label>
                    <input type="date" className="input" value={inicialOrientalFecha} onChange={e => setInicialOrientalFecha(e.target.value)} />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="label">Observaciones</label>
                  <textarea className="textarea" rows={2} placeholder="Condiciones especiales de este crédito..."
                    value={inicialOrientalObs} onChange={e => setInicialOrientalObs(e.target.value)} />
                </div>
                {calcInicialOriental.numCuotas > 0 && calcInicialOriental.montoCuota > 0 && (
                  <div className="mt-3 bg-purple-700 rounded-lg p-4 grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-purple-200 text-[10px] uppercase tracking-wider">Monto financiado</p>
                      <p className="text-white font-extrabold text-base">{formatUSD(calcInicialOriental.montoTotal)}</p>
                    </div>
                    <div className="text-center border-x border-purple-500">
                      <p className="text-purple-200 text-[10px] uppercase tracking-wider">Cuota {inicialOrientalFrecuencia}</p>
                      <p className="text-white font-extrabold text-base">{formatUSD(calcInicialOriental.montoCuota)}</p>
                      <p className="text-purple-300 text-[10px]">{calcInicialOriental.numCuotas} cuotas</p>
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
                    <p className="text-xs text-yellow-800">El total de cuotas ({formatUSD(calcInicialOriental.totalCuotas)}) no coincide con el monto financiado ({formatUSD(calcInicialOriental.montoTotal)}). Verifica si es una condición especial.</p>
                  </div>
                )}
                {/* Pagos previos La Oriental */}
                {calcInicialOriental.numCuotas > 0 && (() => {
                  const hist = parseFloat(orMontoHistorico) || 0
                  const mc   = calcInicialOriental.montoCuota || 0
                  const completas = hist > 0 ? Math.min(Math.floor(hist / mc), calcInicialOriental.numCuotas) : 0
                  const sobrante  = hist > 0 ? hist - completas * mc : 0
                  const saldoRest = Math.max(0, calcInicialOriental.totalCuotas - hist)
                  return (
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
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
                          <p className="text-[11px] text-oriental-gray font-semibold">Saldo restante: {formatUSD(saldoRest)}</p>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* Sub-crédito 2: Financiamiento Vehimotors */}
              <div className="border-2 border-indigo-200 bg-indigo-50/40 rounded-xl p-5">
                <p className="text-sm font-bold text-indigo-800 mb-4 flex items-center gap-2">
                  <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  Crédito Financiamiento — Vehimotors
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Monto financiado Vehimotors (USD)</label>
                    <input type="number" step="0.01" min="0" className="input" placeholder="0.00"
                      value={vehimotorsMonto} onChange={e => setVehimotorsMonto(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">N° de cuotas</label>
                    <input type="number" min="1" max="120" className="input" placeholder="24"
                      value={vehimotorsCuotas} onChange={e => setVehimotorsCuotas(e.target.value)} />
                  </div>
                  <div>
                    <label className="label flex items-center gap-1.5">
                      Monto por cuota (USD)
                      {vehimotorsMontoCuota && (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded-full">auto</span>
                      )}
                    </label>
                    <input
                      type="number" step="0.01" min="0"
                      className={`input font-bold ${vehimotorsMontoCuota ? 'bg-indigo-50 text-indigo-900 border-indigo-300 cursor-not-allowed' : ''}`}
                      placeholder="Se calcula automático"
                      value={vehimotorsMontoCuota}
                      readOnly
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="label">Frecuencia</label>
                    <div className="flex gap-2">
                      {['semanal', 'quincenal', 'mensual', 'trimestral'].map(f => (
                        <button key={f} type="button" onClick={() => setVehimotorsFrecuencia(f)}
                          className={`flex-1 py-2 rounded-lg text-xs font-semibold border capitalize transition-colors ${
                            vehimotorsFrecuencia === f ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
                          }`}>{f}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Fecha inicio</label>
                    <input type="date" className="input" value={vehimotorsFecha} onChange={e => setVehimotorsFecha(e.target.value)} />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="label">Observaciones</label>
                  <textarea className="textarea" rows={2} placeholder="Condiciones especiales de este financiamiento..."
                    value={vehimotorsObs} onChange={e => setVehimotorsObs(e.target.value)} />
                </div>
                {calcVehimotors.numCuotas > 0 && calcVehimotors.montoCuota > 0 && (
                  <div className="mt-3 bg-indigo-700 rounded-lg p-4 grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-indigo-200 text-[10px] uppercase tracking-wider">Monto financiado</p>
                      <p className="text-white font-extrabold text-base">{formatUSD(calcVehimotors.montoTotal)}</p>
                    </div>
                    <div className="text-center border-x border-indigo-500">
                      <p className="text-indigo-200 text-[10px] uppercase tracking-wider">Cuota {vehimotorsFrecuencia}</p>
                      <p className="text-white font-extrabold text-base">{formatUSD(calcVehimotors.montoCuota)}</p>
                      <p className="text-indigo-300 text-[10px]">{calcVehimotors.numCuotas} cuotas</p>
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
                    <p className="text-xs text-yellow-800">El total de cuotas ({formatUSD(calcVehimotors.totalCuotas)}) no coincide con el monto financiado ({formatUSD(calcVehimotors.montoTotal)}). Verifica si es una condición especial.</p>
                  </div>
                )}
                {/* Pagos previos Vehimotors */}
                {calcVehimotors.numCuotas > 0 && (() => {
                  const hist = parseFloat(vhMontoHistorico) || 0
                  const mc   = calcVehimotors.montoCuota || 0
                  const completas = hist > 0 ? Math.min(Math.floor(hist / mc), calcVehimotors.numCuotas) : 0
                  const sobrante  = hist > 0 ? hist - completas * mc : 0
                  const saldoRest = Math.max(0, calcVehimotors.totalCuotas - hist)
                  return (
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
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
                          <p className="text-[11px] text-oriental-gray font-semibold">Saldo restante: {formatUSD(saldoRest)}</p>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* ── CUOTAS ESPECIALES (paralelas) ── */}
              <div className={`border-2 rounded-xl overflow-hidden ${ceActivo ? 'border-teal-400 bg-teal-50' : 'border-dashed border-teal-300'}`}>
                <button type="button" onClick={() => setCeActivo(!ceActivo)}
                  className={`w-full flex items-center justify-between px-5 py-3 transition-colors ${ceActivo ? 'bg-teal-100 hover:bg-teal-200' : 'bg-teal-50 hover:bg-teal-100'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full border-2 ${ceActivo ? 'bg-teal-600 border-teal-600' : 'border-teal-400'}`} />
                    <span className="text-teal-800 font-bold text-sm">3 · Cuotas Especiales (paralelas)</span>
                    <span className="text-teal-600 text-xs">— Se descuentan del total Vehimotors, reduciendo la cuota mensual</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ceActivo ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-700 border border-teal-300'}`}>
                    {ceActivo ? 'Quitar' : '+ Agregar'}
                  </span>
                </button>
                {ceActivo && (
                  <div className="px-5 pb-5 pt-4 space-y-4 bg-teal-50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="label">N° cuotas especiales *</label>
                        <input type="number" className="input" placeholder="ej: 8"
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
                      <div>
                        <label className="label">Total trimestrales</label>
                        <div className="input bg-teal-100 text-teal-900 font-bold cursor-not-allowed">
                          {formatUSD((parseInt(ceCuotas) || 0) * (parseFloat(ceMontoCuota) || 0))}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="label">Frecuencia</label>
                        <div className="flex gap-2 flex-wrap">
                          {(['mensual', 'trimestral', 'semestral', 'anual'] as const).map(f => (
                            <button key={f} type="button" onClick={() => setCeFrecuencia(f)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${ceFrecuencia === f ? 'bg-teal-700 border-teal-700 text-white' : 'border-gray-300 text-oriental-gray hover:border-teal-400'}`}>
                              {f}
                            </button>
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
                    {/* Resumen trimestral vs mensual */}
                    {ceActivo && (parseInt(ceCuotas) || 0) > 0 && (parseFloat(ceMontoCuota) || 0) > 0 && calcVehimotors.montoCuota > 0 && (
                      <div className="bg-teal-700 rounded-lg p-4">
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div>
                            <p className="text-teal-100 text-[10px] uppercase tracking-wider">Trimestrales</p>
                            <p className="text-white font-extrabold">{formatUSD((parseInt(ceCuotas)||0)*(parseFloat(ceMontoCuota)||0))}</p>
                            <p className="text-teal-200 text-[10px]">{ceCuotas} cuotas</p>
                          </div>
                          <div className="border-x border-teal-500">
                            <p className="text-teal-100 text-[10px] uppercase tracking-wider">Cuota mensual</p>
                            <p className="text-white font-extrabold">{formatUSD(calcVehimotors.montoCuota)}</p>
                            <p className="text-teal-200 text-[10px]">{vehimotorsCuotas} cuotas</p>
                          </div>
                          <div>
                            <p className="text-teal-100 text-[10px] uppercase tracking-wider">Total Vehimotors</p>
                            <p className="text-white font-extrabold">{formatUSD((parseInt(ceCuotas)||0)*(parseFloat(ceMontoCuota)||0) + calcVehimotors.totalCuotas)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Resumen total financiado */}
              {(resumenPersonalizado.totalOr > 0 || resumenPersonalizado.totalVh > 0) && (
                <div className="bg-oriental-black rounded-xl p-5">
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Resumen del plan</p>
                  <div className="space-y-2">
                    {resumenPersonalizado.totalOr > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-300">Crédito de Inicial — La Oriental</span>
                        <span className="text-purple-300 font-semibold">{formatUSD(resumenPersonalizado.totalOr)}</span>
                      </div>
                    )}
                    {resumenPersonalizado.totalVh > 0 && (
                      <>
                        {resumenPersonalizado.totalCe > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-teal-300">Cuotas trimestrales — Vehimotors</span>
                            <span className="text-teal-300 font-semibold">{formatUSD(resumenPersonalizado.totalCe)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-indigo-300">Cuotas mensuales — Vehimotors</span>
                          <span className="text-indigo-300 font-semibold">{formatUSD(resumenPersonalizado.totalVhMensual)}</span>
                        </div>
                        {resumenPersonalizado.totalCe > 0 && (
                          <div className="flex justify-between text-sm bg-indigo-900/30 rounded-lg px-3 py-1.5">
                            <span className="text-indigo-200 font-semibold">Total Vehimotors</span>
                            <span className="text-indigo-200 font-bold">{formatUSD(resumenPersonalizado.totalVh)}</span>
                          </div>
                        )}
                      </>
                    )}
                    <div className="border-t border-gray-700 pt-2 flex justify-between">
                      <span className="text-gray-300 font-semibold text-sm">Total financiado general</span>
                      <span className="text-oriental-red font-extrabold text-lg">{formatUSD(resumenPersonalizado.totalFinanciado)}</span>
                    </div>
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
            {plan !== 'personalizado' && (
              <div>
                <label className="label">Fecha de inicio *</label>
                <input type="date" className="input" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} required />
              </div>
            )}
            <div className={plan !== 'personalizado' ? '' : 'md:col-span-2'}>
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
