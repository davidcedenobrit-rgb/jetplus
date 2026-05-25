'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, AlertCircle, CheckCircle2, Clock, Edit3, Shield, RefreshCw } from 'lucide-react'
import Link from 'next/link'

type EstadoCuota = 'pendiente' | 'pagada' | 'vencida'

// José, admin y director tienen poder de edición total
const ROL_DIRECTOR = ['jose', 'admin', 'director']

const FRECUENCIAS = ['mensual', 'quincenal', 'semanal', 'único pago']

export default function EditarCreditoPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Rol del usuario
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [esDirector, setEsDirector] = useState(false)

  // Crédito original
  const [credito, setCredito] = useState<any>(null)
  const [cuotas, setCuotas] = useState<any[]>([])

  // ── Campos editables del crédito ──
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

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        setUserEmail(user.email ?? '')
        const rolMeta = (user.user_metadata?.rol as string) ?? ''
        setEsDirector(ROL_DIRECTOR.includes(rolMeta))
      }

      const { data: cred } = await supabase
        .from('creditos')
        .select('*, clientes(nombre, cedula_rif), vehiculos(marca, modelo, placa)')
        .eq('id', id)
        .single()

      if (!cred) { router.push('/creditos'); return }
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

      const { data: cs } = await supabase
        .from('cuotas')
        .select('*')
        .eq('credito_id', id)
        .order('numero_cuota')
      setCuotas(cs ?? [])
      setLoading(false)
    }
    load()
  }, [id])

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

  // ── Distribuir monto nuevo equitativamente en cuotas pendientes ──
  function distribuirMonto() {
    const nuevo = parseFloat(montoFinanciado) || 0
    const pendientes = cuotas.filter(c => {
      const estado = getCuotaValor(c, 'estado')
      return estado !== 'pagada'
    })
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hayCambios) { setError('No hay cambios para guardar'); return }
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      if (esDirector) {
        // ── DIRECTOR / JOSÉ: aplica cambios directamente ──
        const updateData: any = {
          observaciones: observaciones || null,
          estado: estadoCredito,
          plan_tipo: planTipo || null,
          updated_at: new Date().toISOString(),
        }

        // Campos extra solo para director
        const mf = parseFloat(montoFinanciado)
        const ini = parseFloat(inicial)
        const sal = parseFloat(saldo)
        const nc = parseInt(numCuotas)
        if (!isNaN(mf)) updateData.monto_financiado = mf
        if (!isNaN(ini)) updateData.inicial = ini
        if (!isNaN(sal)) updateData.saldo = sal
        if (!isNaN(nc)) updateData.num_cuotas = nc
        if (frecuenciaPago) updateData.frecuencia_pago = frecuenciaPago
        if (fechaInicio) updateData.fecha_inicio = fechaInicio
        updateData.moneda = monedaCredito

        const { error: err } = await supabase
          .from('creditos')
          .update(updateData)
          .eq('id', id)
        if (err) throw new Error(err.message)

        // Guardar cuotas editadas
        for (const [cuotaId, cambios] of Object.entries(edicionesCuotas)) {
          const cuotaOriginal = cuotas.find(c => c.id === cuotaId)
          if (!cuotaOriginal) continue
          const update: any = { updated_at: new Date().toISOString() }
          if (cambios.estado !== undefined && cambios.estado !== cuotaOriginal.estado) {
            update.estado = cambios.estado
            if (cambios.estado === 'pagada' && !cuotaOriginal.fecha_pago) {
              update.fecha_pago = new Date().toISOString().split('T')[0]
            }
          }
          if (cambios.monto !== undefined && parseFloat(cambios.monto) !== cuotaOriginal.monto) {
            update.monto = parseFloat(cambios.monto)
          }
          if (cambios.fecha_vencimiento !== undefined && cambios.fecha_vencimiento !== cuotaOriginal.fecha_vencimiento) {
            update.fecha_vencimiento = cambios.fecha_vencimiento
          }
          if (Object.keys(update).length > 1) {
            const { error: err } = await supabase.from('cuotas').update(update).eq('id', cuotaId)
            if (err) throw new Error(err.message)
          }
        }

        setSuccess('Cambios aplicados correctamente.')
        setTimeout(() => router.push(`/creditos/${id}`), 1200)

      } else {
        // ── EDITOR (Mary / Leysdem / Carla): envía solicitud de aprobación ──
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

        const primerCuotaId = cambiosDetalle.find(c => c.tipo === 'cuota')?.cuota_id ?? null
        const { error: err } = await supabase.from('solicitudes_cambio').insert({
          credito_id: id,
          cuota_id: primerCuotaId,
          tipo: 'editar_credito',
          descripcion: `${cambiosDetalle.length} cambio(s) en crédito de ${credito?.clientes?.nombre ?? ''}`,
          cambios: cambiosDetalle,
          solicitado_por: userId,
          solicitado_por_email: userEmail,
          estado: 'pendiente',
        })
        if (err) throw new Error(err.message)

        setSuccess('Solicitud enviada. José Rojas debe aprobarla antes de aplicarse.')
        setTimeout(() => router.push(`/creditos/${id}`), 2000)
      }
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
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
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/creditos/${id}`} className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-oriental-black">Editar crédito</h1>
          <p className="text-oriental-gray text-sm mt-0.5">
            {credito?.clientes?.nombre} · {credito?.vehiculos?.marca} {credito?.vehiculos?.modelo}
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

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── DATOS GENERALES DEL CRÉDITO ── */}
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
                  <input
                    type="number" step="0.01" min="0"
                    className="input pl-7 font-semibold"
                    value={montoFinanciado}
                    onChange={e => setMontoFinanciado(e.target.value)}
                  />
                </div>
              ) : (
                <>
                  <p className="input bg-gray-50 text-oriental-gray cursor-not-allowed font-semibold">
                    ${Number(credito?.monto_financiado).toLocaleString('es-VE', { minimumFractionDigits: 2 })} {credito?.moneda}
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
                      }`}>
                      {m}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="input bg-gray-50 text-oriental-gray cursor-not-allowed font-semibold">{credito?.moneda}</p>
              )}
            </div>

            {/* Inicial */}
            {esDirector && (
              <div>
                <label className="label">Inicial</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray text-sm font-semibold">$</span>
                  <input
                    type="number" step="0.01" min="0"
                    className="input pl-7 font-semibold"
                    value={inicial}
                    onChange={e => setInicial(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Saldo actual */}
            {esDirector && (
              <div>
                <label className="label">Saldo actual</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray text-sm font-semibold">$</span>
                  <input
                    type="number" step="0.01" min="0"
                    className="input pl-7 font-semibold"
                    value={saldo}
                    onChange={e => setSaldo(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Nº de cuotas */}
            <div>
              <label className="label">Nº de cuotas</label>
              {esDirector ? (
                <input
                  type="number" min="1" max="120"
                  className="input font-semibold"
                  value={numCuotas}
                  onChange={e => setNumCuotas(e.target.value)}
                />
              ) : (
                <p className="input bg-gray-50 text-oriental-gray cursor-not-allowed">
                  {credito?.num_cuotas} cuotas · {credito?.frecuencia_pago}
                </p>
              )}
            </div>

            {/* Frecuencia de pago */}
            {esDirector && (
              <div>
                <label className="label">Frecuencia de pago</label>
                <select className="select" value={frecuenciaPago} onChange={e => setFrecuenciaPago(e.target.value)}>
                  {FRECUENCIAS.map(f => <option key={f} value={f} className="capitalize">{f}</option>)}
                </select>
              </div>
            )}

            {/* Fecha de inicio */}
            {esDirector && (
              <div>
                <label className="label">Fecha de inicio</label>
                <input
                  type="date"
                  className="input"
                  value={fechaInicio}
                  onChange={e => setFechaInicio(e.target.value)}
                />
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
              <label className="label">Tipo de crédito (concepto de cuotas)</label>
              <select className="select" value={planTipo} onChange={e => setPlanTipo(e.target.value)}>
                <option value="">Sin clasificar</option>
                <option value="inicial_la_oriental">Crédito Inicial — La Oriental</option>
                <option value="financiamiento_vehimotors">Financiamiento Vehimotors</option>
                <option value="cuota_especial">Cuota especial</option>
              </select>
              <p className="text-xs text-oriental-gray mt-1">
                Clasifica el crédito para que las cuotas muestren su tipo automáticamente
              </p>
            </div>

            {/* Observaciones */}
            <div className="md:col-span-2">
              <label className="label">Observaciones</label>
              <textarea
                className="input min-h-[80px] resize-none"
                placeholder="Notas internas del crédito..."
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                maxLength={500}
              />
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
            {/* Botón: distribuir monto equitativamente (solo director) */}
            {esDirector && cuotasPendientes.length > 0 && parseFloat(montoFinanciado) > 0 && (
              <button
                type="button"
                onClick={distribuirMonto}
                className="flex items-center gap-1.5 text-xs font-semibold text-oriental-red border border-oriental-red/30 px-3 py-1.5 rounded-lg hover:bg-oriental-red/5 transition-colors"
              >
                <RefreshCw size={12} />
                Distribuir monto en {cuotasPendientes.length} cuota{cuotasPendientes.length > 1 ? 's' : ''} pendiente{cuotasPendientes.length > 1 ? 's' : ''}
              </button>
            )}
          </div>

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
                      esPagada ? 'opacity-60 bg-green-50/30' : editada ? 'bg-yellow-50/60' : 'hover:bg-oriental-bg/50'
                    }`}>
                      <td className="px-3 py-2 font-bold text-oriental-black">{cuota.numero_cuota}</td>
                      {cuotas.some(c => c.concepto) && (
                        <td className="px-3 py-2 text-xs text-oriental-gray">{cuota.concepto ?? '—'}</td>
                      )}
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          className={`input py-1 text-xs w-36 ${esPagada ? 'cursor-not-allowed bg-gray-50' : ''}`}
                          value={fechaActual}
                          disabled={esPagada}
                          onChange={e => editarCuota(cuota.id, 'fecha_vencimiento', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={`input py-1 text-xs text-right w-28 font-semibold ${esPagada ? 'cursor-not-allowed bg-gray-50' : ''}`}
                          value={montoActual}
                          disabled={esPagada}
                          onChange={e => editarCuota(cuota.id, 'monto', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="select py-1 text-xs"
                          value={estadoActual}
                          onChange={e => editarCuota(cuota.id, 'estado', e.target.value)}
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="pagada">Pagada</option>
                          <option value="vencida">Vencida</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {editada && (
                          <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full" title="Campo editado" />
                        )}
                        {esPagada && (
                          <span className="inline-block w-2 h-2 bg-green-400 rounded-full" title="Cuota pagada" />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {cuotas.length > 0 && (
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td colSpan={cuotas.some(c => c.concepto) ? 3 : 2} className="px-3 py-2 text-xs font-semibold text-oriental-gray">
                      Total plan
                    </td>
                    <td className="px-3 py-2 text-right font-extrabold text-oriental-black text-sm">
                      ${Object.keys(edicionesCuotas).length > 0
                        ? cuotas.reduce((s, c) => s + parseFloat(getCuotaValor(c, 'monto') || '0'), 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })
                        : cuotas.reduce((s: number, c: any) => s + Number(c.monto), 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })
                      }
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {Object.keys(edicionesCuotas).length > 0 && (
            <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mt-3 flex items-center gap-2">
              <AlertCircle size={13} />
              {Object.keys(edicionesCuotas).length} cuota(s) modificada(s) — los cambios aún no se han guardado
            </p>
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
          <Link href={`/creditos/${id}`} className="text-sm text-oriental-gray hover:text-oriental-black transition-colors">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving || !hayCambios}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
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
