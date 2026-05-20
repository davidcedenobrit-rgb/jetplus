'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, AlertCircle, CheckCircle2, Clock, Edit3, Shield } from 'lucide-react'
import Link from 'next/link'

type EstadoCuota = 'pendiente' | 'pagada' | 'vencida'

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
  const [rol, setRol] = useState<'director' | 'editor'>('editor')

  // Crédito
  const [credito, setCredito] = useState<any>(null)
  const [cuotas, setCuotas] = useState<any[]>([])

  // Campos editables del crédito
  const [observaciones, setObservaciones] = useState('')
  const [estadoCredito, setEstadoCredito] = useState('')
  const [planTipo, setPlanTipo] = useState('')

  // Ediciones de cuotas (mapa: cuota_id → { estado, monto, fecha_vencimiento })
  const [edicionesCuotas, setEdicionesCuotas] = useState<Record<string, Partial<{ estado: EstadoCuota; monto: string; fecha_vencimiento: string }>>>({})

  useEffect(() => {
    async function load() {
      // Cargar usuario y rol
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        setUserEmail(user.email ?? '')
        const rolMeta = (user.user_metadata?.rol as string) ?? 'editor'
        setRol(rolMeta === 'director' ? 'director' : 'editor')
      }

      // Cargar crédito
      const { data: cred } = await supabase
        .from('creditos')
        .select('*, clientes(nombre, cedula_rif), vehiculos(marca, modelo, placa)')
        .eq('id', id)
        .single()

      if (!cred) { router.push('/creditos'); return }
      setCredito(cred)
      setObservaciones(cred.observaciones ?? '')
      setEstadoCredito(cred.estado)
      setPlanTipo(cred.plan_tipo ?? '')

      // Cargar cuotas
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
    return campo === 'monto' ? String(cuota.monto) : campo === 'fecha_vencimiento' ? cuota.fecha_vencimiento : cuota.estado
  }

  const hayCambiosCredito = observaciones !== (credito?.observaciones ?? '') || estadoCredito !== credito?.estado || planTipo !== (credito?.plan_tipo ?? '')
  const hayCambiosCuotas = Object.keys(edicionesCuotas).length > 0
  const hayCambios = hayCambiosCredito || hayCambiosCuotas

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hayCambios) { setError('No hay cambios para guardar'); return }
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      if (rol === 'director') {
        // ── DIRECTOR: aplica cambios directamente ──
        if (hayCambiosCredito) {
          const { error: err } = await supabase
            .from('creditos')
            .update({
              observaciones: observaciones || null,
              estado: estadoCredito,
              plan_tipo: planTipo || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', id)
          if (err) throw new Error(err.message)
        }

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
        // ── EDITOR: crea solicitud de cambio para aprobación de José ──
        const cambiosDetalle: any[] = []

        if (hayCambiosCredito) {
          if (observaciones !== (credito?.observaciones ?? '')) {
            cambiosDetalle.push({ tipo: 'credito', campo: 'observaciones', anterior: credito.observaciones, nuevo: observaciones })
          }
          if (estadoCredito !== credito?.estado) {
            cambiosDetalle.push({ tipo: 'credito', campo: 'estado', anterior: credito.estado, nuevo: estadoCredito })
          }
          if (planTipo !== (credito?.plan_tipo ?? '')) {
            cambiosDetalle.push({ tipo: 'credito', campo: 'plan_tipo', anterior: credito.plan_tipo, nuevo: planTipo || null })
          }
        }

        for (const [cuotaId, cambios] of Object.entries(edicionesCuotas)) {
          const cuotaOriginal = cuotas.find(c => c.id === cuotaId)
          if (!cuotaOriginal) continue
          if (cambios.estado !== undefined && cambios.estado !== cuotaOriginal.estado) {
            cambiosDetalle.push({ tipo: 'cuota', cuota_id: cuotaId, numero_cuota: cuotaOriginal.numero_cuota, campo: 'estado', anterior: cuotaOriginal.estado, nuevo: cambios.estado })
          }
          if (cambios.monto !== undefined && parseFloat(cambios.monto) !== cuotaOriginal.monto) {
            cambiosDetalle.push({ tipo: 'cuota', cuota_id: cuotaId, numero_cuota: cuotaOriginal.numero_cuota, campo: 'monto', anterior: cuotaOriginal.monto, nuevo: parseFloat(cambios.monto) })
          }
          if (cambios.fecha_vencimiento !== undefined && cambios.fecha_vencimiento !== cuotaOriginal.fecha_vencimiento) {
            cambiosDetalle.push({ tipo: 'cuota', cuota_id: cuotaId, numero_cuota: cuotaOriginal.numero_cuota, campo: 'fecha_vencimiento', anterior: cuotaOriginal.fecha_vencimiento, nuevo: cambios.fecha_vencimiento })
          }
        }

        if (cambiosDetalle.length === 0) {
          setError('No hay cambios reales para enviar')
          setSaving(false)
          return
        }

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

  const cuotaEstadoColors: Record<string, string> = {
    pagada: 'bg-green-100 text-green-800',
    pendiente: 'bg-yellow-100 text-yellow-800',
    vencida: 'bg-red-100 text-red-800',
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
        {/* Badge de rol */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
          rol === 'director' ? 'bg-oriental-red/10 text-oriental-red' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
        }`}>
          <Shield size={13} />
          {rol === 'director' ? 'Director — edición directa' : 'Editor — requiere aprobación'}
        </div>
      </div>

      {/* Aviso para editores */}
      {rol === 'editor' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle size={18} className="text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">Los cambios requieren aprobación</p>
            <p className="text-xs text-yellow-700 mt-0.5">Tu solicitud será enviada a José Rojas para revisión. Los cambios no se aplican hasta que sean aprobados.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Datos del crédito ── */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" />
            Datos generales del crédito
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Monto financiado</label>
              <p className="input bg-gray-50 text-oriental-gray cursor-not-allowed font-semibold">
                ${Number(credito?.monto_financiado).toLocaleString('es-VE', { minimumFractionDigits: 2 })} {credito?.moneda}
              </p>
              <p className="text-xs text-oriental-gray mt-1">Solo el director puede cambiar el monto (regenera las cuotas)</p>
            </div>
            <div>
              <label className="label">Plan de cuotas</label>
              <p className="input bg-gray-50 text-oriental-gray cursor-not-allowed">
                {credito?.num_cuotas} cuotas · {credito?.frecuencia_pago}
              </p>
            </div>
            <div>
              <label className="label">Estado del crédito</label>
              <select
                className="select"
                value={estadoCredito}
                onChange={e => setEstadoCredito(e.target.value)}
              >
                <option value="activo">Activo</option>
                <option value="pagado">Pagado</option>
                <option value="mora">En mora</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="label">Tipo de crédito (concepto de cuotas)</label>
              <select
                className="select"
                value={planTipo}
                onChange={e => setPlanTipo(e.target.value)}
              >
                <option value="">Sin clasificar</option>
                <option value="inicial_la_oriental">Crédito Inicial — La Oriental</option>
                <option value="financiamiento_vehimotors">Financiamiento Vehimotors</option>
              </select>
              <p className="text-xs text-oriental-gray mt-1">
                Clasifica el crédito para que las cuotas muestren su tipo automáticamente
              </p>
            </div>
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

        {/* ── Tabla de cuotas editable ── */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" />
            Plan de cuotas
            <span className="text-xs text-oriental-gray font-normal ml-1 normal-case">Haz clic en cualquier campo para editarlo</span>
          </h2>

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
                  <th className="text-center px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider w-8">
                    <Edit3 size={12} />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cuotas.map((cuota: any) => {
                  const editada = !!edicionesCuotas[cuota.id]
                  const estadoActual = getCuotaValor(cuota, 'estado') as EstadoCuota
                  const montoActual = getCuotaValor(cuota, 'monto')
                  const fechaActual = getCuotaValor(cuota, 'fecha_vencimiento')

                  return (
                    <tr key={cuota.id} className={`transition-colors ${editada ? 'bg-yellow-50/60' : 'hover:bg-oriental-bg/50'}`}>
                      <td className="px-3 py-2 font-bold text-oriental-black">{cuota.numero_cuota}</td>
                      {cuotas.some(c => c.concepto) && (
                        <td className="px-3 py-2 text-xs text-oriental-gray">{cuota.concepto ?? '—'}</td>
                      )}
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          className="input py-1 text-xs w-36"
                          value={fechaActual}
                          onChange={e => editarCuota(cuota.id, 'fecha_vencimiento', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="input py-1 text-xs text-right w-28 font-semibold"
                          value={montoActual}
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
                      </td>
                    </tr>
                  )
                })}
              </tbody>
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
            ) : rol === 'director' ? (
              <><Save size={16} /> Guardar cambios</>
            ) : (
              <><Send size={16} /> Enviar para aprobación</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

// Ícono inline para editor
function Send({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  )
}
