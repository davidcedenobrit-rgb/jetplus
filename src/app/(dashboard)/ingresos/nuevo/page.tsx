'use client'

import { useState, useEffect, useMemo, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { METODOS_PAGO, BANCOS_VE } from '@/lib/utils'
import { IngresoSchema } from '@/lib/validations'
import { ArrowLeft, Save, Search, X, Car, Hash, Check, CreditCard, AlertCircle, Calendar } from 'lucide-react'
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

const planLabel = (tipo: string | null) =>
  tipo === 'inicial_la_oriental' ? 'La Oriental' :
  tipo === 'financiamiento_vehimotors' ? 'Vehimotors' :
  tipo === 'cuota_especial' ? 'Cuota Especial' : 'Crédito'

const planBadgeClass = (tipo: string | null) =>
  tipo === 'inicial_la_oriental' ? 'text-purple-700 bg-purple-50 border-purple-200' :
  tipo === 'financiamiento_vehimotors' ? 'text-indigo-700 bg-indigo-50 border-indigo-200' :
  'text-gray-600 bg-gray-50 border-gray-200'

// La Oriental primero (0), Vehimotors segundo (1), resto al final (2)
const planPriority = (tipo: string | null) =>
  tipo === 'inicial_la_oriental' ? 0 :
  tipo === 'financiamiento_vehimotors' ? 1 : 2

type ModosBusqueda = 'placa' | 'cliente'

interface GrupoVehiculo {
  vehiculo: Vehiculo
  creditos: {
    credito: any
    cuotasPendientes: any[]
  }[]
}

function NuevoIngresoPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Ref para cuota pre-seleccionada desde query params (no causa re-render)
  const preselectedCuotaIdRef = useRef<string | null>(null)

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
  const [vehiculoContexto, setVehiculoContexto] = useState<Vehiculo | null>(null) // vehículo encontrado por placa (solo referencia)

  // ── Créditos y cuotas del cliente (carga completa) ──
  const [gruposVehiculo, setGruposVehiculo] = useState<GrupoVehiculo[]>([])
  const [todasLasCuotas, setTodasLasCuotas] = useState<any[]>([])
  const [loadingCuotas, setLoadingCuotas] = useState(false)

  // ── Selección manual de cuotas ──
  const [cuotasSeleccionadas, setCuotasSeleccionadas] = useState<Set<string>>(new Set())

  // ── Confirmación explícita de registrar sin cuota ──
  const [sinCuotaConfirmado, setSinCuotaConfirmado] = useState(false)

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

  // ── Auto-carga desde query params (cuando llega desde el botón "Registrar pago" del crédito) ──
  useEffect(() => {
    const placaParam = searchParams.get('placa')
    const cuotaIdParam = searchParams.get('cuota_id')
    const montoParam = searchParams.get('monto')

    if (cuotaIdParam) {
      preselectedCuotaIdRef.current = cuotaIdParam
    }
    if (montoParam && parseFloat(montoParam) > 0) {
      setMonto(parseFloat(montoParam).toFixed(2))
    }
    if (placaParam) {
      setPlacaQuery(placaParam.toUpperCase())
      buscarPorPlaca(placaParam.toUpperCase())
    }
    // Si viene concepto de cuota, pre-seleccionar
    if (cuotaIdParam) {
      setConcepto('Cuota de vehículo')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Cargar TODOS los créditos y cuotas del cliente ──
  async function loadCuotasCliente(cliente: Cliente) {
    setLoadingCuotas(true)
    setCuotasSeleccionadas(new Set())

    // 1. Todos los vehículos del cliente
    const { data: vehiculos } = await supabase
      .from('vehiculos').select('*')
      .eq('cliente_id', cliente.id)
      .order('created_at')

    if (!vehiculos || vehiculos.length === 0) {
      setGruposVehiculo([])
      setTodasLasCuotas([])
      setLoadingCuotas(false)
      return
    }

    // 2. Todos los créditos activos de esos vehículos
    const vehiculoIds = vehiculos.map((v: any) => v.id)
    const { data: creditos } = await supabase
      .from('creditos').select('*')
      .in('vehiculo_id', vehiculoIds)
      .eq('estado', 'activo')

    if (!creditos || creditos.length === 0) {
      setGruposVehiculo([])
      setTodasLasCuotas([])
      setLoadingCuotas(false)
      return
    }

    // 3. Todas las cuotas pendientes/vencidas
    const creditoIds = creditos.map((c: any) => c.id)
    const { data: cuotas } = await supabase
      .from('cuotas').select('*')
      .in('credito_id', creditoIds)
      .in('estado', ['pendiente', 'vencida'])
      .order('fecha_vencimiento')

    // Construir mapas para enriquecer
    const creditoMap: Record<string, any> = {}
    creditos.forEach((c: any) => { creditoMap[c.id] = c })

    const vehiculoForCredito: Record<string, Vehiculo> = {}
    vehiculos.forEach((v: any) => {
      creditos
        .filter((c: any) => c.vehiculo_id === v.id)
        .forEach((c: any) => { vehiculoForCredito[c.id] = v })
    })

    // Cuotas enriquecidas con _credito y _vehiculo
    const cuotasEnriquecidas = (cuotas ?? []).map((c: any) => ({
      ...c,
      _credito: creditoMap[c.credito_id],
      _vehiculo: vehiculoForCredito[c.credito_id],
    }))
    setTodasLasCuotas(cuotasEnriquecidas)

    // Grupos para la UI (vehículo → crédito → cuotas), solo los que tienen cuotas pendientes
    const grupos: GrupoVehiculo[] = vehiculos
      .map((vehiculo: any) => {
        const creditosVeh = creditos
          .filter((c: any) => c.vehiculo_id === vehiculo.id)
          // La Oriental primero, Vehimotors después
          .sort((a: any, b: any) => planPriority(a.plan_tipo) - planPriority(b.plan_tipo))
        return {
          vehiculo,
          creditos: creditosVeh
            .map((credito: any) => ({
              credito,
              cuotasPendientes: cuotasEnriquecidas.filter((c: any) => c.credito_id === credito.id),
            }))
            .filter((cr: any) => cr.cuotasPendientes.length > 0),
        }
      })
      .filter((g: GrupoVehiculo) => g.creditos.length > 0)

    setGruposVehiculo(grupos)

    // Auto-seleccionar cuota si viene desde el plan de crédito
    if (preselectedCuotaIdRef.current) {
      const cuotaExiste = cuotasEnriquecidas.find((c: any) => c.id === preselectedCuotaIdRef.current)
      if (cuotaExiste) {
        setCuotasSeleccionadas(new Set([preselectedCuotaIdRef.current!]))
      }
      preselectedCuotaIdRef.current = null // limpiar para no re-seleccionar en recargas
    }

    setLoadingCuotas(false)
  }

  // ── Buscar por placa — acepta placa directa (desde query params) o usa el estado ──
  async function buscarPorPlaca(placaDirecta?: string) {
    const placa = (placaDirecta ?? placaQuery).trim().toUpperCase()
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
    const cliente = (vehiculo as any).clientes as Cliente
    setVehiculoContexto(vehiculo)
    setClienteSeleccionado(cliente)
    loadCuotasCliente(cliente)
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
  }, [clienteQuery, clienteSeleccionado])

  // ── Toggle cuota ──
  function toggleCuota(cuotaId: string) {
    setCuotasSeleccionadas(prev => {
      const next = new Set(prev)
      if (next.has(cuotaId)) next.delete(cuotaId)
      else {
        next.add(cuotaId)
        setSinCuotaConfirmado(false) // al seleccionar una cuota, limpiar confirmación previa
      }
      return next
    })
  }

  // ── Total cuotas seleccionadas ──
  const totalCuotasSeleccionadas = useMemo(() =>
    todasLasCuotas
      .filter(c => cuotasSeleccionadas.has(c.id))
      .reduce((s, c) => s + Number(c.monto), 0),
    [cuotasSeleccionadas, todasLasCuotas]
  )

  // ── Auto-llenar monto cuando se seleccionan cuotas ──
  useEffect(() => {
    if (cuotasSeleccionadas.size > 0 && totalCuotasSeleccionadas > 0) {
      setMonto(totalCuotasSeleccionadas.toFixed(2))
    }
  }, [totalCuotasSeleccionadas])

  // ── Aviso informativo: vencidas y próximas (una por crédito, La Oriental primero) ──
  const cuotasVencidasInfo = useMemo(() => {
    const hoyStr = new Date().toISOString().split('T')[0]
    return todasLasCuotas
      .filter(c => c.fecha_vencimiento < hoyStr)
      .sort((a, b) => planPriority(a._credito?.plan_tipo) - planPriority(b._credito?.plan_tipo))
  }, [todasLasCuotas])

  const proximasCuotasInfo = useMemo(() => {
    const hoyStr = new Date().toISOString().split('T')[0]
    const vistas = new Set<string>()
    const proximas: any[] = []
    const futuras = todasLasCuotas
      .filter(c => c.fecha_vencimiento >= hoyStr)
      .sort((a, b) => {
        // La Oriental primero, luego por fecha
        const pA = planPriority(a._credito?.plan_tipo)
        const pB = planPriority(b._credito?.plan_tipo)
        if (pA !== pB) return pA - pB
        return a.fecha_vencimiento.localeCompare(b.fecha_vencimiento)
      })
    for (const c of futuras) {
      if (!vistas.has(c.credito_id)) {
        vistas.add(c.credito_id)
        proximas.push(c)
      }
    }
    return proximas
  }, [todasLasCuotas])

  // ── Lista plana de cuotas a aplicar en submit ──
  const cuotasParaAplicar = useMemo(() =>
    todasLasCuotas.filter(c => cuotasSeleccionadas.has(c.id)),
    [cuotasSeleccionadas, todasLasCuotas]
  )

  // ── vehiculo_id e placa para el ingreso (único si todas vienen del mismo vehículo) ──
  const vehiculoIdParaIngreso = useMemo(() => {
    if (cuotasParaAplicar.length === 0) return vehiculoContexto?.id ?? null
    const ids = new Set(cuotasParaAplicar.map(c => c._vehiculo?.id).filter(Boolean))
    return ids.size === 1 ? (Array.from(ids)[0] as string) : null
  }, [cuotasParaAplicar, vehiculoContexto])

  const placaParaIngreso = useMemo(() => {
    if (cuotasParaAplicar.length === 0) return vehiculoContexto?.placa ?? null
    const placas = new Set(cuotasParaAplicar.map(c => c._vehiculo?.placa).filter(Boolean))
    return placas.size === 1 ? (Array.from(placas)[0] as string) : null
  }, [cuotasParaAplicar, vehiculoContexto])

  function resetBusqueda() {
    setClienteSeleccionado(null)
    setVehiculoContexto(null)
    setClienteQuery('')
    setPlacaQuery('')
    setShowClienteDropdown(false)
    setGruposVehiculo([])
    setTodasLasCuotas([])
    setCuotasSeleccionadas(new Set())
    setSinCuotaConfirmado(false)
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

    // Bloquear si hay cuotas pendientes y el usuario no seleccionó ninguna ni lo confirmó
    if (gruposVehiculo.length > 0 && cuotasSeleccionadas.size === 0 && !sinCuotaConfirmado) {
      setError('⚠ Este cliente tiene cuotas pendientes. Selecciona al menos una cuota, o confirma que este ingreso no aplica al plan de crédito.')
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
      vehiculo_id: vehiculoIdParaIngreso,
      placa: placaParaIngreso,
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

    // ── Aplicar cuotas con soporte para abono parcial y cuota_ingresos ──
    if (cuotasParaAplicar.length > 0) {
      // Convertir monto a la moneda base de las cuotas (USD)
      const montoBase = moneda === 'USD'
        ? parsed.data.monto
        : parsed.data.tasa_cambio && parsed.data.tasa_cambio > 0
          ? parsed.data.monto / parsed.data.tasa_cambio
          : parsed.data.monto

      let restante = montoBase
      // Acumular cuánto se aplicó por crédito para actualizar el saldo
      const deltasPorCredito: Record<string, number> = {}

      for (const cuota of cuotasParaAplicar) {
        if (restante <= 0.005) break

        const montoCuota = Number(cuota.monto)
        const montoPagadoPrev = Number(cuota.monto_pagado ?? 0)
        const faltaPorPagar = Math.max(0, montoCuota - montoPagadoPrev)
        if (faltaPorPagar <= 0.005) continue // ya completamente pagada

        const montoAplicar = Math.min(restante, faltaPorPagar)
        const nuevoMontoPagado = montoPagadoPrev + montoAplicar
        const esPagadaCompleta = (montoCuota - nuevoMontoPagado) < 0.005

        // Actualizar cuota — cuotas NO tiene columna updated_at
        const { error: cuotaUpdateErr } = await supabase.from('cuotas').update({
          monto_pagado: nuevoMontoPagado,
          estado: esPagadaCompleta ? 'pagada' : 'abono_parcial',
          fecha_pago: esPagadaCompleta ? fechaPago : null,
        }).eq('id', cuota.id)

        if (cuotaUpdateErr) {
          console.error('Error al actualizar cuota', cuota.id, cuotaUpdateErr)
          setError(`Error actualizando cuota N°${cuota.numero_cuota}: ${cuotaUpdateErr.message}`)
          setLoading(false)
          return
        }

        // Vincular recibo ↔ cuota con el monto aplicado
        const { error: ciErr } = await supabase.from('cuota_ingresos').insert({
          cuota_id: cuota.id,
          ingreso_id: inserted.id,
          monto_aplicado: montoAplicar,
        })

        if (ciErr) {
          console.error('Error al insertar cuota_ingresos', ciErr)
        }

        deltasPorCredito[cuota.credito_id] = (deltasPorCredito[cuota.credito_id] ?? 0) + montoAplicar
        restante -= montoAplicar
      }

      // Actualizar saldo de cada crédito afectado
      for (const [creditoId, delta] of Object.entries(deltasPorCredito)) {
        const { data: cred } = await supabase
          .from('creditos').select('saldo').eq('id', creditoId).single()
        if (cred) {
          const nuevoSaldo = Math.max(0, Number(cred.saldo) - delta)
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

  const hayClienteResuelto = !!clienteSeleccionado
  const hoy = new Date().toISOString().split('T')[0]

  // Banner informativo cuando se llega desde el plan de crédito
  const vieneDeCuota = !!searchParams.get('cuota_id')

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

      {vieneDeCuota && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
          <Check size={16} className="text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800 font-medium">
            Cuota pre-seleccionada desde el plan de crédito. Agrega el método de pago y guarda.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── BÚSQUEDA ── */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" />
            Identificar cliente
          </h2>

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
          {modo === 'placa' && !hayClienteResuelto && (
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
                  onClick={() => buscarPorPlaca()}
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
                  onChange={e => setClienteQuery(e.target.value)}
                  onFocus={() => clientes.length > 0 && setShowClienteDropdown(true)}
                />
              </div>
              {showClienteDropdown && clientes.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {clientes.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => {
                        setClienteSeleccionado(c)
                        setClienteQuery(c.nombre)
                        setShowClienteDropdown(false)
                        loadCuotasCliente(c)
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-oriental-bg transition-colors border-b border-gray-50 last:border-0">
                      <p className="font-medium text-oriental-black text-sm">{c.nombre}</p>
                      <p className="text-xs text-oriental-gray">{c.cedula_rif}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── CLIENTE RESUELTO ── */}
          {hayClienteResuelto && (
            <div className="rounded-xl p-4 flex items-center justify-between bg-oriental-black">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-oriental-red/30">
                  <Car size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-bold">{clienteSeleccionado!.nombre}</p>
                  <p className="text-gray-400 text-xs">
                    {clienteSeleccionado!.cedula_rif}
                    {vehiculoContexto && (
                      <span className="ml-2 font-mono">· {vehiculoContexto.placa}</span>
                    )}
                  </p>
                </div>
              </div>
              <button type="button" onClick={resetBusqueda}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* ── AVISO: ESTADO DEL CRÉDITO ── */}
        {hayClienteResuelto && !loadingCuotas && (cuotasVencidasInfo.length > 0 || proximasCuotasInfo.length > 0) && (
          <div className="card p-5">
            <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-3 flex items-center gap-2">
              <div className="w-1 h-4 bg-oriental-red rounded-full" />
              Estado del crédito
            </h2>
            <div className="space-y-3">

              {/* Vencidas */}
              {cuotasVencidasInfo.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={15} className="text-red-600" />
                    <p className="text-sm font-bold text-red-700">
                      {cuotasVencidasInfo.length} cuota{cuotasVencidasInfo.length > 1 ? 's' : ''} vencida{cuotasVencidasInfo.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {cuotasVencidasInfo.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                        <div>
                          <p className="text-sm font-semibold text-red-800">
                            Cuota #{c.numero_cuota}
                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded border ${planBadgeClass(c._credito?.plan_tipo)}`}>
                              {planLabel(c._credito?.plan_tipo)}
                            </span>
                          </p>
                          <p className="text-xs text-red-500">
                            Venció: {new Date(c.fecha_vencimiento + 'T12:00:00').toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {c._vehiculo && <span className="ml-2 font-mono">· {c._vehiculo.placa ?? c._vehiculo.modelo}</span>}
                          </p>
                        </div>
                        <p className="font-extrabold text-red-700 text-base">
                          ${Number(c.monto).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Próximas */}
              {proximasCuotasInfo.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={15} className="text-oriental-gray" />
                    <p className="text-sm font-bold text-oriental-black">
                      Próxima{proximasCuotasInfo.length > 1 ? 's' : ''} cuota{proximasCuotasInfo.length > 1 ? 's' : ''} a pagar
                      {proximasCuotasInfo.length > 1 && (
                        <span className="ml-1 text-xs font-normal text-oriental-gray">({proximasCuotasInfo.length} créditos activos)</span>
                      )}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {proximasCuotasInfo.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
                        <div>
                          <p className="text-sm font-semibold text-blue-800">
                            Cuota #{c.numero_cuota}
                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded border ${planBadgeClass(c._credito?.plan_tipo)}`}>
                              {planLabel(c._credito?.plan_tipo)}
                            </span>
                          </p>
                          <p className="text-xs text-blue-500">
                            Vence: {new Date(c.fecha_vencimiento + 'T12:00:00').toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {c._vehiculo && <span className="ml-2 font-mono">· {c._vehiculo.placa ?? c._vehiculo.modelo}</span>}
                          </p>
                        </div>
                        <p className="font-extrabold text-blue-700 text-base">
                          ${Number(c.monto).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    ))}
                    {proximasCuotasInfo.length > 1 && (
                      <div className="flex items-center justify-between bg-blue-100 rounded-lg px-4 py-2 mt-1">
                        <p className="text-sm font-bold text-blue-900">Total a pagar este período</p>
                        <p className="font-extrabold text-blue-900 text-base">
                          ${proximasCuotasInfo.reduce((s: number, c: any) => s + Number(c.monto), 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ── SELECTOR DE CUOTAS ── */}
        {hayClienteResuelto && (
          <div className="card p-5">
            <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-1 flex items-center gap-2">
              <div className="w-1 h-4 bg-oriental-red rounded-full" />
              Aplicar pago a cuota(s)
            </h2>
            <p className="text-xs text-oriental-gray mb-4">
              Selecciona las cuotas que cubre este pago. El monto se calcula automáticamente.
            </p>

            {loadingCuotas ? (
              <p className="text-sm text-oriental-gray py-4">Cargando créditos del cliente...</p>
            ) : gruposVehiculo.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-6 text-center">
                <CreditCard size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-oriental-gray">Este cliente no tiene créditos activos con cuotas pendientes</p>
                <p className="text-xs text-oriental-gray/60 mt-1">El ingreso se registrará sin aplicar cuotas</p>
              </div>
            ) : (
              <div className="space-y-6">
                {gruposVehiculo.map(({ vehiculo, creditos }) => (
                  <div key={vehiculo.id}>
                    {/* Encabezado del vehículo */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-oriental-black rounded-full flex items-center justify-center flex-shrink-0">
                        <Car size={14} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-oriental-black">
                          {vehiculo.marca} {vehiculo.modelo}
                          {vehiculo.anio && <span className="font-normal text-oriental-gray ml-1">{vehiculo.anio}</span>}
                        </p>
                        <p className="text-xs text-oriental-gray">
                          {vehiculo.version && <span className="mr-1">{vehiculo.version} ·</span>}
                          <span className="font-mono font-semibold">{vehiculo.placa ?? 'Sin placa'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Créditos del vehículo */}
                    <div className="ml-11 space-y-4">
                      {creditos.map(({ credito, cuotasPendientes }) => (
                        <div key={credito.id}>
                          {/* Badge plan + saldo */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${planBadgeClass(credito.plan_tipo)}`}>
                              {planLabel(credito.plan_tipo)}
                            </span>
                            <span className="text-xs text-oriental-gray">
                              Saldo: <span className="font-semibold text-oriental-black">
                                ${Number(credito.saldo).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                              </span>
                            </span>
                          </div>

                          {/* Cuotas como filas seleccionables */}
                          <div className="space-y-1.5">
                            {cuotasPendientes.map((cuota: any) => {
                              const isSelected = cuotasSeleccionadas.has(cuota.id)
                              const isVencida = cuota.fecha_vencimiento < hoy
                              return (
                                <button
                                  key={cuota.id}
                                  type="button"
                                  onClick={() => toggleCuota(cuota.id)}
                                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                                    isSelected
                                      ? 'bg-green-50 border-green-500 shadow-sm'
                                      : isVencida
                                      ? 'bg-red-50 border-red-200 hover:border-red-400'
                                      : 'bg-white border-gray-200 hover:border-gray-400 hover:shadow-sm'
                                  }`}
                                >
                                  {/* Checkbox visual */}
                                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                                    isSelected
                                      ? 'bg-green-600 border-green-600'
                                      : isVencida
                                      ? 'border-red-400'
                                      : 'border-gray-300'
                                  }`}>
                                    {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
                                  </div>

                                  {/* Info cuota */}
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold ${
                                      isSelected ? 'text-green-800' : isVencida ? 'text-red-800' : 'text-oriental-black'
                                    }`}>
                                      Cuota #{cuota.numero_cuota}
                                      {isVencida && (
                                        <span className="ml-2 text-xs font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                                          VENCIDA
                                        </span>
                                      )}
                                      {cuota.concepto && (
                                        <span className={`ml-2 text-xs font-normal ${
                                          isVencida ? 'text-red-500' : 'text-oriental-gray'
                                        }`}>
                                          {cuota.concepto}
                                        </span>
                                      )}
                                    </p>
                                    <p className={`text-xs mt-0.5 ${
                                      isVencida ? 'text-red-500' : 'text-oriental-gray'
                                    }`}>
                                      {isVencida ? 'Venció' : 'Vence'}:{' '}
                                      {new Date(cuota.fecha_vencimiento + 'T12:00:00').toLocaleDateString('es-VE', {
                                        day: 'numeric', month: 'short', year: 'numeric'
                                      })}
                                    </p>
                                  </div>

                                  {/* Monto */}
                                  <p className={`font-extrabold text-base flex-shrink-0 ${
                                    isSelected ? 'text-green-700' : isVencida ? 'text-red-700' : 'text-oriental-black'
                                  }`}>
                                    ${Number(cuota.monto).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                  </p>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Resumen de selección */}
                {cuotasSeleccionadas.size > 0 ? (() => {
                  const montoIngresado = parseFloat(monto) || 0
                  const esAbonoParcial = montoIngresado > 0 && montoIngresado < totalCuotasSeleccionadas
                  return (
                    <div className={`rounded-xl px-4 py-3 ${esAbonoParcial ? 'bg-orange-600' : 'bg-green-700'}`}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-white flex items-center gap-2">
                          <Check size={16} />
                          {cuotasSeleccionadas.size} cuota{cuotasSeleccionadas.size > 1 ? 's' : ''} seleccionada{cuotasSeleccionadas.size > 1 ? 's' : ''}
                        </p>
                        <p className="font-extrabold text-white text-base">
                          ${totalCuotasSeleccionadas.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      {esAbonoParcial && (
                        <p className="text-xs text-orange-100 mt-1.5">
                          ⚠ El monto ingresado (${montoIngresado.toLocaleString('es-VE', { minimumFractionDigits: 2 })}) no cubre el total — la última cuota quedará como <strong>Abono parcial</strong>
                        </p>
                      )}
                    </div>
                  )
                })() : (
                  <p className="text-xs text-oriental-gray text-center py-1">
                    Toca una cuota para seleccionarla
                  </p>
                )}
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
              <label className="label">
                Monto *
                {cuotasSeleccionadas.size > 0 && (
                  <span className="ml-2 text-xs text-green-600 font-normal">(calculado de cuotas)</span>
                )}
              </label>
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

        {/* ── ADVERTENCIA: cuotas pendientes sin seleccionar ── */}
        {hayClienteResuelto && gruposVehiculo.length > 0 && cuotasSeleccionadas.size === 0 && (
          <div className={`rounded-xl border-2 px-5 py-4 transition-all ${
            sinCuotaConfirmado
              ? 'bg-gray-50 border-gray-300'
              : 'bg-amber-50 border-amber-400'
          }`}>
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className={`flex-shrink-0 mt-0.5 ${sinCuotaConfirmado ? 'text-gray-400' : 'text-amber-600'}`} />
              <div className="flex-1">
                <p className={`text-sm font-bold ${sinCuotaConfirmado ? 'text-gray-500' : 'text-amber-800'}`}>
                  No seleccionaste ninguna cuota
                </p>
                <p className={`text-xs mt-0.5 ${sinCuotaConfirmado ? 'text-gray-400' : 'text-amber-700'}`}>
                  Este cliente tiene cuotas pendientes. Si no seleccionas una, el ingreso <strong>no se descontará del plan de crédito</strong>.
                </p>
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sinCuotaConfirmado}
                    onChange={e => setSinCuotaConfirmado(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-400 text-oriental-red cursor-pointer"
                  />
                  <span className={`text-xs font-semibold ${sinCuotaConfirmado ? 'text-gray-600' : 'text-amber-900'}`}>
                    Entendido — registrar este ingreso <em>sin aplicar</em> a ninguna cuota
                  </span>
                </label>
              </div>
            </div>
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
            <Save size={16} />
            {loading ? 'Guardando...' : cuotasParaAplicar.length > 0
              ? `Registrar y aplicar ${cuotasParaAplicar.length} cuota${cuotasParaAplicar.length > 1 ? 's' : ''}`
              : 'Registrar ingreso'
            }
          </button>
          <Link href="/ingresos" className="btn-secondary py-3 px-6">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}

// Wrapper con Suspense requerido por useSearchParams en Next.js App Router
export default function NuevoIngresoPage() {
  return (
    <Suspense fallback={
      <div className="p-8 flex items-center justify-center">
        <div className="text-oriental-gray text-sm">Cargando...</div>
      </div>
    }>
      <NuevoIngresoPageInner />
    </Suspense>
  )
}
