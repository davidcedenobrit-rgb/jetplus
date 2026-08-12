'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, AlertCircle, CheckCircle2, Clock, Edit3, Shield, RefreshCw, Car, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { addMonthsSafe } from '@/lib/utils'

type EstadoCuota = 'pendiente' | 'pagada' | 'vencida'

// Calcula la fecha de vencimiento de la cuota N (1-based) desde fecha_inicio
// Para frecuencia mensual/único pago: usa addMonthsSafe (mismo día del mes)
function calcularFechaVencimiento(fechaInicio: string, numeroCuota: number, frecuencia: string): string {
  if (frecuencia === 'mensual' || frecuencia === 'único pago') {
    return addMonthsSafe(fechaInicio, numeroCuota).toISOString().split('T')[0]
  }
  const base = new Date(fechaInicio + 'T12:00:00')
  if (frecuencia === 'quincenal') {
    base.setDate(base.getDate() + numeroCuota * 15)
  } else if (frecuencia === 'semanal') {
    base.setDate(base.getDate() + numeroCuota * 7)
  }
  return base.toISOString().split('T')[0]
}

// José, admin y director tienen poder de edición total
const ROL_DIRECTOR = ['jose', 'admin', 'director', 'mary', 'leysdem']
const FRECUENCIAS = ['mensual', 'quincenal', 'semanal', 'único pago']

const planLabel = (tipo: string | null) =>
  tipo === 'inicial_la_oriental' ? 'Jetplus' :
  tipo === 'financiamiento_vehimotors' ? 'Vehimotors' :
  tipo === 'cuota_especial' ? 'Cuota Especial Vehimotors' :
  tipo === 'asegurate_500' ? 'Asegúrate $500' :
  tipo === 'credito_40_60' ? '40/60 Vehimotors' : 'Crédito'

const planBadgeClass = (tipo: string | null) =>
  tipo === 'inicial_la_oriental' ? 'bg-purple-100 text-purple-700' :
  tipo === 'financiamiento_vehimotors' ? 'bg-indigo-100 text-indigo-700' :
  tipo === 'asegurate_500' ? 'bg-yellow-100 text-yellow-700' :
  tipo === 'credito_40_60' ? 'bg-orange-100 text-orange-700' :
  'bg-gray-100 text-gray-600'

const estadoBadgeClass = (estado: string) =>
  estado === 'activo' ? 'bg-green-100 text-green-700' :
  estado === 'mora' ? 'bg-red-100 text-red-700' :
  estado === 'pagado' ? 'bg-blue-100 text-blue-700' :
  'bg-gray-100 text-gray-500'

export default function EditarCreditoPage() {
  const params = useParams()
  const idInicial = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [loadingSwitch, setLoadingSwitch] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Rol del usuario
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [esDirector, setEsDirector] = useState(false)

  // Todos los créditos del cliente (para el selector)
  const [creditosCliente, setCreditosCliente] = useState<any[]>([])
  // ID del crédito actualmente siendo editado
  const [creditoActivoId, setCreditoActivoId] = useState(idInicial)

  // Crédito original (para detección de cambios)
  const [credito, setCredito] = useState<any>(null)
  const [cuotas, setCuotas] = useState<any[]>([])

  // ── Campos editables ──
  const [montoFinanciado, setMontoFinanciado] = useState('')
  const [inicial, setInicial] = useState('')
  const [saldo, setSaldo] = useState('')
  const [numCuotas, setNumCuotas] = useState('')
  const [frecuenciaPago, setFrecuenciaPago] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [monedaCredito, setMonedaCredito] = useState<'USD' | 'VES'>('USD')
  const [estadoCredito, setEstadoCredito] = useState('')
  const [planTipo, setPlanTipo] = useState('')
  const [observaciones, setObservaciones] = useState('')

  // Ediciones de cuotas (mapa: cuota_id → { estado, monto, fecha_vencimiento })
  const [edicionesCuotas, setEdicionesCuotas] = useState<Record<string, Partial<{ estado: EstadoCuota; monto: string; fecha_vencimiento: string }>>>({})

  // Cuotas de todos los créditos del vehículo (para pagos históricos)
  const [cuotasVehiculo, setCuotasVehiculo] = useState<any[]>([])

  // Panel Crédito con Antigüedad
  const [aplicandoAntiguedad, setAplicandoAntiguedad] = useState(false)
  const [antiguedadMsg, setAntiguedadMsg] = useState('')
  const [montoHistorico, setMontoHistorico] = useState('')

  // ── Poblar formulario desde un objeto crédito ──
  function poblarFormulario(cred: any) {
    setCredito(cred)
    setMontoFinanciado(String(cred.monto_financiado ?? ''))
    setInicial(String(cred.inicial ?? ''))
    setSaldo(String(cred.saldo ?? ''))
    setNumCuotas(String(cred.num_cuotas ?? ''))
    setFrecuenciaPago(cred.frecuencia_pago ?? 'mensual')
    setFechaInicio(cred.fecha_inicio ?? '')
    setMonedaCredito(cred.moneda ?? 'USD')
    setEstadoCredito(cred.estado ?? 'activo')
    setPlanTipo(cred.plan_tipo ?? '')
    setObservaciones(cred.observaciones ?? '')
  }

  // ── Carga inicial ──
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        setUserEmail(user.email ?? '')
        setEsDirector(ROL_DIRECTOR.includes(user.app_metadata?.rol ?? ''))
      }

      // Crédito inicial (por URL)
      const { data: cred } = await supabase
        .from('creditos')
        .select('*, clientes(nombre, cedula_rif), vehiculos(marca, modelo, placa)')
        .eq('id', idInicial)
        .single()

      if (!cred) { router.push('/creditos'); return }
      poblarFormulario(cred)

      // Todos los créditos del mismo cliente (para el selector)
      const { data: todos } = await supabase
        .from('creditos')
        .select('*, vehiculos(marca, modelo, placa)')
        .eq('cliente_id', cred.cliente_id)
        .order('created_at')
      setCreditosCliente(todos ?? [])

      // Cuotas del crédito inicial
      const { data: cs } = await supabase
        .from('cuotas').select('*')
        .eq('credito_id', idInicial)
        .order('numero_cuota')
      setCuotas(cs ?? [])

      // Cuotas de TODOS los créditos del mismo vehículo (para pagos históricos)
      const creditosVeh = (todos ?? []).filter((c: any) => c.vehiculo_id === cred.vehiculo_id)
      if (creditosVeh.length > 0) {
        const { data: allCuotas } = await supabase
          .from('cuotas').select('*')
          .in('credito_id', creditosVeh.map((c: any) => c.id))
          .order('fecha_vencimiento')
        setCuotasVehiculo(allCuotas ?? [])
      }

      setLoading(false)
    }
    load()
  }, [idInicial])

  // ── Cambiar al crédito seleccionado ──
  async function cambiarCredito(nuevoId: string) {
    if (nuevoId === creditoActivoId || loadingSwitch) return
    setLoadingSwitch(true)
    setEdicionesCuotas({})
    setError('')
    setSuccess('')

    const { data: cred } = await supabase
      .from('creditos')
      .select('*, clientes(nombre, cedula_rif), vehiculos(marca, modelo, placa)')
      .eq('id', nuevoId)
      .single()

    if (cred) {
      setCreditoActivoId(nuevoId)
      poblarFormulario(cred)
    }

    const { data: cs } = await supabase
      .from('cuotas').select('*')
      .eq('credito_id', nuevoId)
      .order('numero_cuota')
    setCuotas(cs ?? [])
    setLoadingSwitch(false)
  }

  // ── Edición de cuotas ──
  function editarCuota(cuotaId: string, campo: string, valor: string) {
    setEdicionesCuotas(prev => ({
      ...prev,
      [cuotaId]: { ...(prev[cuotaId] ?? {}), [campo]: valor }
    }))
  }

  function getCuotaValor(cuota: any, campo: string) {
    const edicion = edicionesCuotas[cuota.id]
    if (edicion && campo in edicion) return (edicion as any)[campo]
    return campo === 'monto'
      ? String(cuota.monto)
      : campo === 'fecha_vencimiento'
      ? cuota.fecha_vencimiento
      : cuota.estado
  }

  // ── Distribuir monto equitativamente en cuotas pendientes ──
  function distribuirMonto() {
    const nuevo = parseFloat(montoFinanciado) || 0
    const pendientes = cuotas.filter(c => getCuotaValor(c, 'estado') !== 'pagada')
    if (pendientes.length === 0 || nuevo <= 0) return
    const montoPorCuota = (nuevo / pendientes.length).toFixed(2)
    const nuevasEdiciones: Record<string, any> = { ...edicionesCuotas }
    for (const c of pendientes) {
      nuevasEdiciones[c.id] = { ...(nuevasEdiciones[c.id] ?? {}), monto: montoPorCuota }
    }
    setEdicionesCuotas(nuevasEdiciones)
  }

  // ── Detección de cambios ──
  const hayCambiosCredito = credito && (
    observaciones !== (credito.observaciones ?? '') ||
    estadoCredito !== credito.estado ||
    planTipo !== (credito.plan_tipo ?? '') ||
    (esDirector && (
      parseFloat(montoFinanciado) !== credito.monto_financiado ||
      parseFloat(inicial) !== credito.inicial ||
      parseFloat(saldo) !== credito.saldo ||
      parseInt(numCuotas) !== credito.num_cuotas ||
      frecuenciaPago !== credito.frecuencia_pago ||
      fechaInicio !== credito.fecha_inicio ||
      monedaCredito !== credito.moneda
    ))
  )
  const hayCambiosCuotas = Object.keys(edicionesCuotas).length > 0
  const hayCambios = hayCambiosCredito || hayCambiosCuotas

  // ── Guardar ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hayCambios) { setError('No hay cambios para guardar'); return }
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      if (esDirector) {
        // Director / José: aplica directamente
        const updateData: any = {
          observaciones: observaciones || null,
          estado: estadoCredito,
          plan_tipo: planTipo || null,
          updated_at: new Date().toISOString(),
        }
        const mf = parseFloat(montoFinanciado)
        const ini = parseFloat(inicial)
        const sal = parseFloat(saldo)
        const ncNuevo = parseInt(numCuotas)
        const ncAnterior = credito?.num_cuotas ?? 0
        if (!isNaN(mf)) updateData.monto_financiado = mf
        if (!isNaN(ini)) updateData.inicial = ini
        if (!isNaN(sal)) updateData.saldo = sal
        if (!isNaN(ncNuevo)) updateData.num_cuotas = ncNuevo
        if (frecuenciaPago) updateData.frecuencia_pago = frecuenciaPago
        if (fechaInicio) updateData.fecha_inicio = fechaInicio
        updateData.moneda = monedaCredito

        const { error: err } = await supabase.from('creditos').update(updateData).eq('id', creditoActivoId)
        if (err) throw new Error(err.message)

        // ── Regenerar plan si cambia algo estructural ──────────────────
        const cambioEstructural =
          (!isNaN(ncNuevo) && ncNuevo !== ncAnterior) ||
          (!isNaN(mf) && mf !== credito?.monto_financiado) ||
          (fechaInicio !== credito?.fecha_inicio) ||
          (frecuenciaPago !== credito?.frecuencia_pago)

        if (cambioEstructural) {
          // Preservar cuotas ya pagadas
          const cuotasPagadas = cuotas.filter(c => c.estado === 'pagada')
          const numPagadas    = cuotasPagadas.length

          // Eliminar cuotas no pagadas
          const cuotasNoPagadas = cuotas.filter(c => c.estado !== 'pagada')
          if (cuotasNoPagadas.length > 0) {
            const { error: delErr } = await supabase
              .from('cuotas').delete()
              .in('id', cuotasNoPagadas.map(c => c.id))
            if (delErr) throw new Error(delErr.message)
          }

          // Generar cuotas faltantes
          const ncFinal   = !isNaN(ncNuevo) ? ncNuevo : ncAnterior
          const cuotasFaltan = ncFinal - numPagadas
          if (cuotasFaltan > 0) {
            const montoBase = !isNaN(mf) && mf > 0 ? mf : credito?.monto_financiado ?? 0
            const montoPorCuota = parseFloat((montoBase / ncFinal).toFixed(2))
            const frecActual   = frecuenciaPago || credito?.frecuencia_pago || 'mensual'
            const fechaBase    = fechaInicio    || credito?.fecha_inicio
            const conceptoCuota =
              (planTipo || credito?.plan_tipo) === 'inicial_la_oriental'    ? 'Crédito de Inicial — Jetplus' :
              (planTipo || credito?.plan_tipo) === 'financiamiento_vehimotors' ? 'Crédito Financiamiento — Vehimotors' :
              'Cuota'

            const nuevasCuotas = Array.from({ length: cuotasFaltan }, (_, i) => {
              const n = numPagadas + i + 1
              return {
                credito_id:       creditoActivoId,
                numero_cuota:     n,
                fecha_vencimiento: calcularFechaVencimiento(fechaBase, n, frecActual),
                monto:            montoPorCuota,
                estado:           'pendiente',
                concepto:         conceptoCuota,
              }
            })

            const { error: insErr } = await supabase.from('cuotas').insert(nuevasCuotas)
            if (insErr) throw new Error(insErr.message)
          }
        } else {
          // Sin cambio estructural — editar cuotas individualmente
          for (const [cuotaId, cambios] of Object.entries(edicionesCuotas)) {
            const co = cuotas.find(c => c.id === cuotaId)
            if (!co) continue
            const update: any = {}
            if (cambios.estado !== undefined && cambios.estado !== co.estado) {
              update.estado = cambios.estado
              if (cambios.estado === 'pagada' && !co.fecha_pago) update.fecha_pago = new Date().toISOString().split('T')[0]
            }
            if (cambios.monto !== undefined && parseFloat(cambios.monto) !== co.monto) update.monto = parseFloat(cambios.monto)
            if (cambios.fecha_vencimiento !== undefined && cambios.fecha_vencimiento !== co.fecha_vencimiento) update.fecha_vencimiento = cambios.fecha_vencimiento
            if (Object.keys(update).length > 0) {
              const { error: cuotaErr } = await supabase.from('cuotas').update(update).eq('id', cuotaId)
              if (cuotaErr) throw new Error(cuotaErr.message)
            }
          }
        }

        setSuccess('Cambios aplicados correctamente.')
        setTimeout(() => router.push(`/creditos/${creditoActivoId}`), 1200)

      } else {
        // Editor: envía solicitud
        const cambiosDetalle: any[] = []
        if (observaciones !== (credito?.observaciones ?? ''))
          cambiosDetalle.push({ tipo: 'credito', campo: 'observaciones', anterior: credito.observaciones, nuevo: observaciones })
        if (estadoCredito !== credito?.estado)
          cambiosDetalle.push({ tipo: 'credito', campo: 'estado', anterior: credito.estado, nuevo: estadoCredito })
        if (planTipo !== (credito?.plan_tipo ?? ''))
          cambiosDetalle.push({ tipo: 'credito', campo: 'plan_tipo', anterior: credito.plan_tipo, nuevo: planTipo || null })

        for (const [cuotaId, cambios] of Object.entries(edicionesCuotas)) {
          const co = cuotas.find(c => c.id === cuotaId)
          if (!co) continue
          if (cambios.estado !== undefined && cambios.estado !== co.estado)
            cambiosDetalle.push({ tipo: 'cuota', cuota_id: cuotaId, numero_cuota: co.numero_cuota, campo: 'estado', anterior: co.estado, nuevo: cambios.estado })
          if (cambios.monto !== undefined && parseFloat(cambios.monto) !== co.monto)
            cambiosDetalle.push({ tipo: 'cuota', cuota_id: cuotaId, numero_cuota: co.numero_cuota, campo: 'monto', anterior: co.monto, nuevo: parseFloat(cambios.monto) })
          if (cambios.fecha_vencimiento !== undefined && cambios.fecha_vencimiento !== co.fecha_vencimiento)
            cambiosDetalle.push({ tipo: 'cuota', cuota_id: cuotaId, numero_cuota: co.numero_cuota, campo: 'fecha_vencimiento', anterior: co.fecha_vencimiento, nuevo: cambios.fecha_vencimiento })
        }

        if (cambiosDetalle.length === 0) { setError('No hay cambios reales para enviar'); setSaving(false); return }

        const { error: err } = await supabase.from('solicitudes_cambio').insert({
          credito_id: creditoActivoId,
          cuota_id: cambiosDetalle.find(c => c.tipo === 'cuota')?.cuota_id ?? null,
          tipo: 'editar_credito',
          descripcion: `${cambiosDetalle.length} cambio(s) en crédito de ${credito?.clientes?.nombre ?? ''}`,
          cambios: cambiosDetalle,
          solicitado_por: userId,
          solicitado_por_email: userEmail,
          estado: 'pendiente',
        })
        if (err) throw new Error(err.message)

        setSuccess('Solicitud enviada. José Rojas debe aprobarla antes de aplicarse.')
        setTimeout(() => router.push(`/creditos/${creditoActivoId}`), 2000)
      }
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function aplicarAntiguedad() {
    const totalPagado = parseFloat(montoHistorico)
    if (!totalPagado || totalPagado <= 0) { setAntiguedadMsg('Ingresa el monto total ya cobrado'); return }

    // Todas las cuotas del vehículo pendientes, ordenadas por fecha
    const pendientes = [...cuotasVehiculo]
      .filter(c => c.estado !== 'pagada')
      .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))

    if (pendientes.length === 0) { setAntiguedadMsg('No hay cuotas pendientes'); return }

    setAplicandoAntiguedad(true); setAntiguedadMsg('')

    let restante = totalPagado
    let aplicadas = 0
    let cuotaAbono: any = null
    let montoAbono = 0
    const saldoDelta: Record<string, number> = {}

    for (const cuota of pendientes) {
      const montoCuota = Number(cuota.monto)
      if (restante <= 0) break

      if (restante >= montoCuota) {
        const { error } = await supabase.from('cuotas').update({
          estado: 'pagada',
          monto_pagado: montoCuota,
          fecha_pago: cuota.fecha_vencimiento,
        }).eq('id', cuota.id)
        if (error) { setAntiguedadMsg(`Error cuota #${cuota.numero_cuota}: ${error.message}`); setAplicandoAntiguedad(false); return }
        saldoDelta[cuota.credito_id] = (saldoDelta[cuota.credito_id] ?? 0) + montoCuota
        restante -= montoCuota
        aplicadas++
      } else {
        cuotaAbono = cuota
        montoAbono = restante
        const { error } = await supabase.from('cuotas').update({
          estado: 'abono_parcial',
          monto_pagado: montoAbono,
          fecha_pago: cuota.fecha_vencimiento,
        }).eq('id', cuota.id)
        if (error) { setAntiguedadMsg(`Error cuota #${cuota.numero_cuota}: ${error.message}`); setAplicandoAntiguedad(false); return }
        saldoDelta[cuota.credito_id] = (saldoDelta[cuota.credito_id] ?? 0) + montoAbono
        restante = 0
        aplicadas++
      }
    }

    // Actualizar saldo de cada crédito afectado
    const creditosVeh = creditosCliente.filter(c => c.vehiculo_id === credito?.vehiculo_id)
    for (const [cId, delta] of Object.entries(saldoDelta)) {
      const cred = creditosVeh.find((c: any) => c.id === cId)
      if (!cred) continue
      const nuevoSaldo = Math.max(0, Number(cred.saldo) - delta)
      const { error: errSaldo } = await supabase.from('creditos').update({ saldo: nuevoSaldo }).eq('id', cId)
      if (errSaldo) { setAntiguedadMsg(`Error saldo: ${errSaldo.message}`); setAplicandoAntiguedad(false); return }
    }

    // Reload cuotas del vehículo completo
    const creditoIds = creditosVeh.map((c: any) => c.id)
    const { data: allCuotas } = await supabase.from('cuotas').select('*')
      .in('credito_id', creditoIds).order('fecha_vencimiento')
    setCuotasVehiculo(allCuotas ?? [])

    // Reload cuotas del crédito activo (para el editor)
    const { data: cs } = await supabase.from('cuotas').select('*').eq('credito_id', creditoActivoId).order('numero_cuota')
    setCuotas(cs ?? [])
    setMontoHistorico('')

    const fmtMonto = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 5 })
    const completadas = aplicadas - (cuotaAbono ? 1 : 0)
    let msg = `✓ $${fmtMonto(totalPagado)} distribuidos en todos los planes: ${completadas} cuota${completadas !== 1 ? 's' : ''} pagadas`
    if (cuotaAbono) msg += `, cuota #${cuotaAbono.numero_cuota} con abono $${fmtMonto(montoAbono)} (pendiente $${fmtMonto(Number(cuotaAbono.monto) - montoAbono)})`
    setAntiguedadMsg(msg)
    setAplicandoAntiguedad(false)
    router.refresh()
  }

  if (loading) {
    return (
      <div className="p-8 max-w-5xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-9 h-9 bg-gray-100 rounded-lg" />
          <div className="h-7 w-48 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="card p-6 animate-pulse h-48" />
      </div>
    )
  }

  const cuotasPendientes = cuotas.filter(c => getCuotaValor(c, 'estado') !== 'pagada')

  return (
    <div className="p-8 max-w-5xl">
      {/* Cabecera */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/creditos/${creditoActivoId}`} className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-oriental-black">Editar crédito</h1>
          <p className="text-oriental-gray text-sm mt-0.5">
            {credito?.clientes?.nombre}
            <span className="text-oriental-gray/50 mx-1.5">·</span>
            {credito?.vehiculos?.marca} {credito?.vehiculos?.modelo}
            <span className="font-mono ml-2">{credito?.vehiculos?.placa ?? ''}</span>
          </p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
          esDirector ? 'bg-oriental-red/10 text-oriental-red' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
        }`}>
          <Shield size={13} />
          {esDirector ? 'Edición directa' : 'Requiere aprobación'}
        </div>
      </div>

      {/* ── SELECTOR DE CRÉDITO ── */}
      {creditosCliente.length > 1 && (
        <div className="card p-5 mb-6">
          <p className="text-xs font-bold text-oriental-gray uppercase tracking-wider mb-3 flex items-center gap-2">
            <CreditCard size={13} />
            Seleccionar crédito a editar
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {creditosCliente.map(cr => {
              const esActivo = cr.id === creditoActivoId
              return (
                <button
                  key={cr.id}
                  type="button"
                  onClick={() => cambiarCredito(cr.id)}
                  disabled={loadingSwitch}
                  className={`relative flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all disabled:opacity-60 ${
                    esActivo
                      ? 'bg-oriental-black border-oriental-black shadow-md'
                      : 'bg-white border-gray-200 hover:border-oriental-red/40 hover:shadow-sm'
                  }`}
                >
                  {/* Indicador activo */}
                  {esActivo && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-oriental-red rounded-full" />
                  )}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    esActivo ? 'bg-white/10' : 'bg-gray-100'
                  }`}>
                    <Car size={16} className={esActivo ? 'text-white' : 'text-oriental-gray'} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        esActivo ? 'bg-white/15 text-white' : planBadgeClass(cr.plan_tipo)
                      }`}>
                        {planLabel(cr.plan_tipo)}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        esActivo ? 'bg-white/10 text-gray-300' : estadoBadgeClass(cr.estado)
                      }`}>
                        {cr.estado}
                      </span>
                    </div>
                    <p className={`text-sm font-semibold truncate ${esActivo ? 'text-white' : 'text-oriental-black'}`}>
                      {cr.vehiculos?.marca} {cr.vehiculos?.modelo}
                    </p>
                    <p className={`text-xs font-mono ${esActivo ? 'text-gray-400' : 'text-oriental-gray'}`}>
                      {cr.vehiculos?.placa ?? 'Sin placa'}
                      <span className="ml-2 not-italic font-sans">
                        {cr.num_cuotas} cuotas · ${Number(cr.saldo).toLocaleString('es-VE', { minimumFractionDigits: 0 })}
                      </span>
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
          {loadingSwitch && (
            <p className="text-xs text-oriental-gray mt-3 flex items-center gap-1.5">
              <Clock size={12} className="animate-spin" /> Cargando crédito...
            </p>
          )}
        </div>
      )}

      {/* Aviso para editores */}
      {!esDirector && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle size={18} className="text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">Los cambios requieren aprobación</p>
            <p className="text-xs text-yellow-700 mt-0.5">Tu solicitud será enviada a José Rojas para revisión. Los cambios no se aplican hasta ser aprobados.</p>
          </div>
        </div>
      )}

      {/* ── PANEL CRÉDITO CON ANTIGÜEDAD — solo directores ── */}
      {esDirector && cuotasVehiculo.length > 0 && (() => {
        const cuotasOrdenadas = [...cuotas].sort((a, b) => a.numero_cuota - b.numero_cuota)
        const pagadas   = cuotasVehiculo.filter(c => c.estado === 'pagada')
        const parciales = cuotasVehiculo.filter(c => c.estado === 'abono_parcial')
        const montoCobrado = pagadas.reduce((s, c) => s + Number(c.monto_pagado ?? c.monto), 0)
                           + parciales.reduce((s, c) => s + Number(c.monto_pagado ?? 0), 0)
        const montoTotal = creditosCliente
          .filter(c => c.vehiculo_id === credito?.vehiculo_id)
          .reduce((s: number, c: any) => s + Number(c.monto_financiado), 0) || Number(credito?.monto_financiado ?? 0)
        const pct = montoTotal > 0 ? Math.min(100, Math.round((montoCobrado / montoTotal) * 100)) : 0

        // Preview: cómo se distribuirá el monto histórico ingresado
        const totalInput = parseFloat(montoHistorico) || 0
        const pendientesOrdenadas = [...cuotasVehiculo]
          .filter(c => c.estado !== 'pagada')
          .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))
        let preview: { cuota: any; tipo: 'pagada' | 'parcial'; monto: number }[] = []
        if (totalInput > 0) {
          let rest = totalInput
          for (const c of pendientesOrdenadas) {
            if (rest <= 0) break
            const mc = Number(c.monto)
            if (rest >= mc) { preview.push({ cuota: c, tipo: 'pagada', monto: mc }); rest -= mc }
            else { preview.push({ cuota: c, tipo: 'parcial', monto: rest }); rest = 0 }
          }
        }

        return (
          <div className="mb-6 border-2 border-amber-300 bg-amber-50 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-amber-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="text-base">📋</span>
              Crédito con Antigüedad — Pagos anteriores al sistema
            </h2>

            {/* Resumen actual */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white rounded-xl p-3 border border-amber-200 text-center">
                <p className="text-[10px] text-amber-600 font-semibold uppercase">Total financiado</p>
                <p className="text-base font-extrabold text-oriental-black">${montoTotal.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(montoTotal)*100)%100===0?0:2, maximumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-oriental-gray">{cuotasVehiculo.length} cuotas · ${Number(montoTotal - montoCobrado).toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(Number(montoTotal - montoCobrado))*100)%100===0?0:2, maximumFractionDigits: 2 })} saldo</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-green-200 text-center">
                <p className="text-[10px] text-green-600 font-semibold uppercase">Ya cobrado</p>
                <p className="text-base font-extrabold text-green-700">${montoCobrado.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(montoCobrado)*100)%100===0?0:2, maximumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-oriental-gray">{pagadas.length} pagadas · {parciales.length} parcial{parciales.length !== 1 ? 'es' : ''}</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-red-200 text-center">
                <p className="text-[10px] text-red-600 font-semibold uppercase">Pendiente real</p>
                <p className="text-base font-extrabold text-oriental-red">${Math.max(0, montoTotal - montoCobrado).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-oriental-gray">{pendientesOrdenadas.length} cuotas por cobrar en todos los planes</p>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="mb-5">
              <div className="flex justify-between text-xs text-amber-700 mb-1">
                <span>Progreso actual</span><span className="font-bold">{pct}%</span>
              </div>
              <div className="h-2 bg-amber-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-600 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>

            {/* Input: monto total ya cobrado */}
            {pendientesOrdenadas.length > 0 && (
              <div className="bg-white rounded-xl border border-amber-200 p-4 mb-4">
                <label className="text-xs font-bold text-amber-900 block mb-1">
                  ¿Cuánto ha pagado el cliente en total antes de hoy? (USD)
                </label>
                <p className="text-[11px] text-amber-700 mb-3">
                  El sistema calcula automáticamente cuáles cuotas quedan pagadas y cuál queda con abono parcial.
                </p>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray font-bold">$</span>
                    <input type="number" step="0.00001" min="0"
                      className="input pl-7 font-bold text-lg"
                      placeholder="0.00000"
                      value={montoHistorico}
                      onChange={e => { setMontoHistorico(e.target.value); setAntiguedadMsg('') }} />
                  </div>
                  <button type="button" onClick={aplicarAntiguedad}
                    disabled={aplicandoAntiguedad || !montoHistorico || parseFloat(montoHistorico) <= 0}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap">
                    {aplicandoAntiguedad ? <><RefreshCw size={14} className="animate-spin" />Aplicando…</> : '✓ Aplicar'}
                  </button>
                </div>

                {/* Preview de cómo quedarán las cuotas */}
                {preview.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Vista previa:</p>
                    {preview.map(({ cuota, tipo, monto }) => (
                      <div key={cuota.id} className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs ${tipo === 'pagada' ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                        <span className="font-semibold text-oriental-black">Cuota #{cuota.numero_cuota} — {cuota.fecha_vencimiento}</span>
                        <span className={`font-bold ${tipo === 'pagada' ? 'text-green-700' : 'text-yellow-700'}`}>
                          {tipo === 'pagada'
                            ? `✓ Pagada completa ($${monto.toFixed(2)})`
                            : `⚡ Abono parcial $${monto.toFixed(2)} · Pendiente $${(Number(cuota.monto) - monto).toFixed(2)}`}
                        </span>
                      </div>
                    ))}
                    {pendientesOrdenadas.length > preview.length && (
                      <p className="text-[10px] text-oriental-gray pl-1">
                        + {pendientesOrdenadas.length - preview.length} cuota{pendientesOrdenadas.length - preview.length !== 1 ? 's' : ''} quedan pendientes para cobro en el sistema
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Cuotas ya configuradas */}
            <div className="bg-white rounded-xl border border-amber-100 overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <p className="text-[10px] font-bold text-oriental-gray uppercase tracking-wider">Estado actual de cuotas</p>
              </div>
              <div className="divide-y divide-gray-50 max-h-52 overflow-y-auto">
                {cuotasOrdenadas.map(cuota => {
                  const mp = Number(cuota.monto_pagado ?? 0)
                  return (
                    <div key={cuota.id} className={`flex items-center gap-3 px-4 py-2 ${cuota.estado === 'pagada' ? 'bg-green-50' : cuota.estado === 'abono_parcial' ? 'bg-yellow-50' : ''}`}>
                      <span className="text-[11px] font-bold text-oriental-gray w-7">#{cuota.numero_cuota}</span>
                      <span className="text-[11px] text-oriental-gray w-20">{cuota.fecha_vencimiento}</span>
                      <span className="text-[11px] font-semibold text-oriental-black">${Number(cuota.monto).toFixed(2)}</span>
                      <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        cuota.estado === 'pagada' ? 'bg-green-100 text-green-700' :
                        cuota.estado === 'abono_parcial' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {cuota.estado === 'pagada' ? '✓ Pagada'
                          : cuota.estado === 'abono_parcial' ? `Abono $${mp.toFixed(2)}`
                          : 'Pendiente'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {antiguedadMsg && (
              <div className={`mt-3 px-4 py-3 rounded-xl text-xs font-semibold ${antiguedadMsg.startsWith('✓') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                {antiguedadMsg}
              </div>
            )}
            <p className="text-[10px] text-amber-700 mt-3">⚠ Estos pagos <strong>no generan ingresos</strong> — solo reflejan cobros previos al sistema. Desde la última cuota pendiente el sistema cobra normalmente.</p>
          </div>
        )
      })()}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── DATOS GENERALES ── */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" />
            Datos generales del crédito
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Monto financiado */}
            <div>
              <label className="label">Monto financiado</label>
              {esDirector ? (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray text-sm font-semibold">$</span>
                  <input type="number" step="0.01" min="0" className="input pl-7 font-semibold"
                    value={montoFinanciado} onChange={e => setMontoFinanciado(e.target.value)} />
                </div>
              ) : (
                <>
                  <p className="input bg-gray-50 text-oriental-gray cursor-not-allowed font-semibold">
                    ${Number(credito?.monto_financiado).toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(Number(credito?.monto_financiado))*100)%100===0?0:2, maximumFractionDigits: 2 })} {credito?.moneda}
                  </p>
                  <p className="text-xs text-oriental-gray mt-1">Solo el director puede cambiar el monto</p>
                </>
              )}
            </div>

            {/* Moneda */}
            <div>
              <label className="label">Moneda</label>
              {esDirector ? (
                <div className="flex gap-2">
                  {(['USD', 'VES'] as const).map(m => (
                    <button key={m} type="button" onClick={() => setMonedaCredito(m)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-colors ${
                        monedaCredito === m ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
                      }`}>{m}</button>
                  ))}
                </div>
              ) : (
                <p className="input bg-gray-50 text-oriental-gray cursor-not-allowed font-semibold">{credito?.moneda}</p>
              )}
            </div>

            {/* Inicial (solo director) */}
            {esDirector && (
              <div>
                <label className="label">Inicial</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray text-sm font-semibold">$</span>
                  <input type="number" step="0.01" min="0" className="input pl-7 font-semibold"
                    value={inicial} onChange={e => setInicial(e.target.value)} />
                </div>
              </div>
            )}

            {/* Saldo (solo director) */}
            {esDirector && (
              <div>
                <label className="label">Saldo actual</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray text-sm font-semibold">$</span>
                  <input type="number" step="0.01" min="0" className="input pl-7 font-semibold"
                    value={saldo} onChange={e => setSaldo(e.target.value)} />
                </div>
              </div>
            )}

            {/* Nº de cuotas */}
            <div>
              <label className="label">Nº de cuotas</label>
              {esDirector ? (
                <input type="number" min="1" max="120" className="input font-semibold"
                  value={numCuotas} onChange={e => setNumCuotas(e.target.value)} />
              ) : (
                <p className="input bg-gray-50 text-oriental-gray cursor-not-allowed">
                  {credito?.num_cuotas} cuotas · {credito?.frecuencia_pago}
                </p>
              )}
            </div>

            {/* Frecuencia (solo director) */}
            {esDirector && (
              <div>
                <label className="label">Frecuencia de pago</label>
                <select className="select" value={frecuenciaPago} onChange={e => setFrecuenciaPago(e.target.value)}>
                  {FRECUENCIAS.map(f => <option key={f} value={f} className="capitalize">{f}</option>)}
                </select>
              </div>
            )}

            {/* Fecha de inicio (solo director) */}
            {esDirector && (
              <div>
                <label className="label">Fecha de inicio</label>
                <input type="date" className="input" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
              </div>
            )}

            {/* Estado */}
            <div>
              <label className="label">Estado del crédito</label>
              <select className="select" value={estadoCredito} onChange={e => setEstadoCredito(e.target.value)}>
                <option value="activo">Activo</option>
                <option value="pagado">Pagado</option>
                <option value="mora">En mora</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            {/* Tipo de crédito */}
            <div>
              <label className="label">Tipo de crédito</label>
              <select className="select" value={planTipo} onChange={e => setPlanTipo(e.target.value)}>
                <option value="">Sin clasificar</option>
                <option value="inicial_la_oriental">Crédito Inicial — Jetplus</option>
                <option value="financiamiento_vehimotors">Financiamiento Vehimotors</option>
                <option value="cuota_especial">Cuota especial</option>
              </select>
              <p className="text-xs text-oriental-gray mt-1">Clasifica el crédito para que las cuotas muestren su tipo automáticamente</p>
            </div>

            {/* Observaciones */}
            <div className="md:col-span-2">
              <label className="label">Observaciones</label>
              <textarea className="input min-h-[80px] resize-none" placeholder="Notas internas del crédito..."
                value={observaciones} onChange={e => setObservaciones(e.target.value)} maxLength={500} />
            </div>
          </div>
        </div>

        {/* ── PLAN DE CUOTAS ── */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider flex items-center gap-2">
              <div className="w-1 h-4 bg-oriental-red rounded-full" />
              Plan de cuotas
              <span className="text-xs text-oriental-gray font-normal ml-1 normal-case">Haz clic en cualquier campo para editarlo</span>
            </h2>
            {esDirector && cuotasPendientes.length > 0 && parseFloat(montoFinanciado) > 0 && (
              <button type="button" onClick={distribuirMonto}
                className="flex items-center gap-1.5 text-xs font-semibold text-oriental-red border border-oriental-red/30 px-3 py-1.5 rounded-lg hover:bg-oriental-red/5 transition-colors">
                <RefreshCw size={12} />
                Distribuir en {cuotasPendientes.length} cuota{cuotasPendientes.length > 1 ? 's' : ''} pendiente{cuotasPendientes.length > 1 ? 's' : ''}
              </button>
            )}
          </div>

          {cuotas.length === 0 ? (
            <p className="text-sm text-oriental-gray text-center py-6">Este crédito no tiene cuotas generadas</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-oriental-bg border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider w-10">N°</th>
                      {cuotas.some(c => c.concepto) && (
                        <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Concepto</th>
                      )}
                      <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Vencimiento</th>
                      <th className="text-right px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Monto</th>
                      <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Estado</th>
                      <th className="text-center px-3 py-2 w-8">
                        <Edit3 size={12} className="text-oriental-gray" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {cuotas.map((cuota: any) => {
                      const editada = !!edicionesCuotas[cuota.id]
                      const estadoActual = getCuotaValor(cuota, 'estado') as EstadoCuota
                      const montoActual = getCuotaValor(cuota, 'monto')
                      const fechaActual = getCuotaValor(cuota, 'fecha_vencimiento')
                      const esPagada = estadoActual === 'pagada'

                      return (
                        <tr key={cuota.id} className={`transition-colors ${
                          esPagada ? 'opacity-55 bg-green-50/30' : editada ? 'bg-yellow-50/60' : 'hover:bg-oriental-bg/50'
                        }`}>
                          <td className="px-3 py-2 font-bold text-oriental-black">{cuota.numero_cuota}</td>
                          {cuotas.some(c => c.concepto) && (
                            <td className="px-3 py-2 text-xs text-oriental-gray">{cuota.concepto ?? '—'}</td>
                          )}
                          <td className="px-3 py-2">
                            <input type="date"
                              className={`input py-1 text-xs w-36 ${esPagada ? 'cursor-not-allowed bg-gray-50' : ''}`}
                              value={fechaActual} disabled={esPagada}
                              onChange={e => editarCuota(cuota.id, 'fecha_vencimiento', e.target.value)} />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input type="number" step="0.01" min="0"
                              className={`input py-1 text-xs text-right w-28 font-semibold ${esPagada ? 'cursor-not-allowed bg-gray-50' : ''}`}
                              value={montoActual} disabled={esPagada}
                              onChange={e => editarCuota(cuota.id, 'monto', e.target.value)} />
                          </td>
                          <td className="px-3 py-2">
                            <select className="select py-1 text-xs" value={estadoActual}
                              onChange={e => editarCuota(cuota.id, 'estado', e.target.value)}>
                              <option value="pendiente">Pendiente</option>
                              <option value="pagada">Pagada</option>
                              <option value="vencida">Vencida</option>
                            </select>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {editada && <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full" title="Editada" />}
                            {!editada && esPagada && <span className="inline-block w-2 h-2 bg-green-400 rounded-full" title="Pagada" />}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td colSpan={cuotas.some(c => c.concepto) ? 3 : 2}
                        className="px-3 py-2.5 text-xs font-semibold text-oriental-gray">
                        Total del plan
                      </td>
                      <td className="px-3 py-2.5 text-right font-extrabold text-oriental-black">
                        ${cuotas.reduce((s, c) => s + parseFloat(getCuotaValor(c, 'monto') || '0'), 0)
                          .toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {Object.keys(edicionesCuotas).length > 0 && (
                <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mt-3 flex items-center gap-2">
                  <AlertCircle size={13} />
                  {Object.keys(edicionesCuotas).length} cuota(s) modificada(s) — los cambios aún no se han guardado
                </p>
              )}
            </>
          )}
        </div>

        {/* Mensajes */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Botones */}
        <div className="flex items-center justify-between">
          <Link href={`/creditos/${creditoActivoId}`} className="text-sm text-oriental-gray hover:text-oriental-black transition-colors">
            Cancelar
          </Link>
          <button type="submit" disabled={saving || !hayCambios}
            className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {saving ? (
              <><Clock size={16} className="animate-spin" /> Guardando...</>
            ) : esDirector ? (
              <><Save size={16} /> Guardar cambios</>
            ) : (
              <><SendIcon size={16} /> Enviar para aprobación</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

function SendIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  )
}
