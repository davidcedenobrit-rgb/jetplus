'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronRight, MapPin, Lock, Loader2, CheckCircle2 } from 'lucide-react'
import type { VehiculoShowroom } from '@/types/database'

const FLUJO: Record<string, { siguiente: string; label: string; color: string }> = {
  llegada:        { siguiente: 'por_enviar_pdi', label: 'Marcar: Por enviar a PDI',  color: 'btn-primary' },
  por_enviar_pdi: { siguiente: 'en_taller',      label: 'Marcar: Enviado al taller', color: 'btn-primary' },
  en_taller:      { siguiente: 'en_agencia',     label: 'Marcar: Regresó a agencia', color: 'btn-primary' },
  en_agencia:     { siguiente: 'reservado',      label: 'Reservar vehículo',         color: 'btn-primary' },
  reservado:      { siguiente: 'en_agencia',     label: 'Cancelar reserva',          color: 'btn-secondary' },
}

const DIAS_RESERVA = [5, 7, 10, 12, 15, 30]

interface Props {
  vehiculo: VehiculoShowroom
  esJose: boolean
  userId: string
}

export default function ShowroomAcciones({ vehiculo, esJose, userId }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Ubicación
  const [showUbicacion, setShowUbicacion] = useState(false)
  const [ubicacion, setUbicacion] = useState<'showroom' | 'galpon' | 'otro'>(vehiculo.ubicacion as any ?? 'showroom')
  const [ubicacionDesc, setUbicacionDesc] = useState(vehiculo.ubicacion_descripcion ?? '')

  // Reserva
  const [showReserva, setShowReserva] = useState(false)
  const [montoReserva, setMontoReserva] = useState('')
  const [diasReserva, setDiasReserva] = useState(7)
  const [notasReserva, setNotasReserva] = useState('')

  // PDI
  const [showPdi, setShowPdi] = useState(false)
  const [fechaPdi, setFechaPdi] = useState(new Date().toISOString().split('T')[0])

  const flujoActual = FLUJO[vehiculo.estado]
  const esVendido = vehiculo.estado === 'vendido'

  async function avanzarEstado() {
    if (!flujoActual) return
    const siguiente = flujoActual.siguiente

    // Si va a reservar, mostrar modal
    if (siguiente === 'reservado' && esJose) {
      setShowReserva(true)
      return
    }
    // Si cancela reserva, volver a en_agencia
    if (vehiculo.estado === 'reservado') {
      setLoading(true)
      await supabase.from('vehiculos_showroom').update({
        estado: 'en_agencia',
        reservado_por: null, reserva_monto: null, reserva_vence: null, reserva_notas: null,
        updated_at: new Date().toISOString(),
      }).eq('id', vehiculo.id)
      router.refresh()
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    const update: any = { estado: siguiente, updated_at: new Date().toISOString() }

    // Al regresar a agencia: requerir ubicación
    if (siguiente === 'en_agencia') {
      setShowUbicacion(true)
      setLoading(false)
      return
    }

    const { error: err } = await supabase.from('vehiculos_showroom').update(update).eq('id', vehiculo.id)
    if (err) setError(err.message)
    else router.refresh()
    setLoading(false)
  }

  async function guardarUbicacion() {
    setLoading(true)
    const { error: err } = await supabase.from('vehiculos_showroom').update({
      estado: 'en_agencia',
      ubicacion,
      ubicacion_descripcion: ubicacion === 'otro' ? ubicacionDesc : null,
      updated_at: new Date().toISOString(),
    }).eq('id', vehiculo.id)
    if (err) setError(err.message)
    else { setShowUbicacion(false); router.refresh() }
    setLoading(false)
  }

  async function guardarSoloUbicacion() {
    setLoading(true)
    const { error: err } = await supabase.from('vehiculos_showroom').update({
      ubicacion,
      ubicacion_descripcion: ubicacion === 'otro' ? ubicacionDesc : null,
      updated_at: new Date().toISOString(),
    }).eq('id', vehiculo.id)
    if (err) setError(err.message)
    else { setShowUbicacion(false); router.refresh() }
    setLoading(false)
  }

  async function confirmarReserva() {
    if (!montoReserva || parseFloat(montoReserva) <= 0) { setError('Ingresa un monto válido'); return }
    setLoading(true)
    setError('')
    const vence = new Date()
    vence.setDate(vence.getDate() + diasReserva)
    const { error: err } = await supabase.from('vehiculos_showroom').update({
      estado: 'reservado',
      reservado_por: userId,
      reserva_monto: parseFloat(montoReserva),
      reserva_vence: vence.toISOString().split('T')[0],
      reserva_notas: notasReserva || null,
      updated_at: new Date().toISOString(),
    }).eq('id', vehiculo.id)
    if (err) setError(err.message)
    else { setShowReserva(false); router.refresh() }
    setLoading(false)
  }

  async function marcarPdiHecho() {
    setLoading(true)
    const { error: err } = await supabase.from('vehiculos_showroom').update({
      pdi_hecho: true,
      fecha_pdi: fechaPdi,
      updated_at: new Date().toISOString(),
    }).eq('id', vehiculo.id)
    if (err) setError(err.message)
    else { setShowPdi(false); router.refresh() }
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      {/* Avanzar estado */}
      {!esVendido && flujoActual && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-oriental-black mb-3">Cambiar estado</h3>
          {vehiculo.estado === 'en_agencia' && !esJose ? (
            <p className="text-xs text-oriental-gray">Solo José puede reservar un vehículo.</p>
          ) : (
            <button onClick={avanzarEstado} disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 disabled:opacity-60">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
              {flujoActual.label}
            </button>
          )}
        </div>
      )}

      {/* Marcar PDI hecho */}
      {!vehiculo.pdi_hecho && ['en_taller', 'en_agencia', 'por_enviar_pdi'].includes(vehiculo.estado) && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-oriental-black mb-3">PDI</h3>
          {!showPdi ? (
            <button onClick={() => setShowPdi(true)} className="w-full btn-secondary flex items-center justify-center gap-2 py-2.5">
              <CheckCircle2 size={16} /> Marcar PDI como hecho
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="label">Fecha del PDI</label>
                <input type="date" className="input" value={fechaPdi} onChange={e => setFechaPdi(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <button onClick={marcarPdiHecho} disabled={loading} className="flex-1 btn-primary py-2 text-sm">
                  {loading ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Confirmar'}
                </button>
                <button onClick={() => setShowPdi(false)} className="flex-1 btn-secondary py-2 text-sm">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ubicación */}
      {['en_agencia', 'reservado', 'vendido'].includes(vehiculo.estado) && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-oriental-black mb-3 flex items-center gap-2">
            <MapPin size={14} className="text-oriental-gray" /> Ubicación
          </h3>
          {!showUbicacion ? (
            <>
              <p className="text-sm text-oriental-black capitalize mb-2">
                {vehiculo.ubicacion
                  ? (vehiculo.ubicacion === 'otro' ? (vehiculo.ubicacion_descripcion ?? 'Otro') : vehiculo.ubicacion)
                  : 'No asignada'}
              </p>
              {!esVendido && (
                <button onClick={() => setShowUbicacion(true)} className="w-full btn-secondary py-2 text-sm">
                  Cambiar ubicación
                </button>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-1.5">
                {(['showroom', 'galpon', 'otro'] as const).map(u => (
                  <button key={u} type="button" onClick={() => setUbicacion(u)}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-colors capitalize ${ubicacion === u ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'}`}>
                    {u}
                  </button>
                ))}
              </div>
              {ubicacion === 'otro' && (
                <input type="text" className="input text-sm" placeholder="Describe la ubicación…" value={ubicacionDesc} onChange={e => setUbicacionDesc(e.target.value)} />
              )}
              <div className="flex gap-2">
                <button onClick={guardarSoloUbicacion} disabled={loading} className="flex-1 btn-primary py-2 text-sm">
                  {loading ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Guardar'}
                </button>
                <button onClick={() => setShowUbicacion(false)} className="flex-1 btn-secondary py-2 text-sm">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Ubicación al regresar a agencia */}
      {showUbicacion && vehiculo.estado !== 'en_agencia' && vehiculo.estado !== 'reservado' && vehiculo.estado !== 'vendido' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-oriental-black text-lg mb-1">Ubicación en agencia</h3>
            <p className="text-sm text-oriental-gray mb-4">¿Dónde quedará estacionado el vehículo?</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(['showroom', 'galpon', 'otro'] as const).map(u => (
                <button key={u} type="button" onClick={() => setUbicacion(u)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors capitalize ${ubicacion === u ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'}`}>
                  {u}
                </button>
              ))}
            </div>
            {ubicacion === 'otro' && (
              <input type="text" className="input mb-3" placeholder="Describe la ubicación…" value={ubicacionDesc} onChange={e => setUbicacionDesc(e.target.value)} />
            )}
            <div className="flex gap-2">
              <button onClick={guardarUbicacion} disabled={loading} className="flex-1 btn-primary py-2.5">
                {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Confirmar'}
              </button>
              <button onClick={() => setShowUbicacion(false)} className="flex-1 btn-secondary py-2.5">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reserva */}
      {showReserva && esJose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-oriental-black text-lg mb-1 flex items-center gap-2">
              <Lock size={16} className="text-purple-600" /> Reservar vehículo
            </h3>
            <p className="text-sm text-oriental-gray mb-4">{vehiculo.marca} {vehiculo.modelo}{vehiculo.placa ? ` · ${vehiculo.placa}` : ''}</p>

            <div className="space-y-3">
              <div>
                <label className="label">Monto de reserva (USD) *</label>
                <input type="number" className="input" placeholder="0.00" min="0" step="0.01"
                  value={montoReserva} onChange={e => setMontoReserva(e.target.value)} />
              </div>
              <div>
                <label className="label">Vigencia de la reserva</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {DIAS_RESERVA.map(d => (
                    <button key={d} type="button" onClick={() => setDiasReserva(d)}
                      className={`py-2 rounded-lg text-xs font-bold border transition-colors ${diasReserva === d ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-oriental-gray border-gray-200 hover:border-purple-300'}`}>
                      {d} días
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Notas (opcional)</label>
                <textarea className="textarea text-sm" rows={2} placeholder="Cliente interesado, condiciones…"
                  value={notasReserva} onChange={e => setNotasReserva(e.target.value)} />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={confirmarReserva} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm transition-colors">
                {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Confirmar reserva'}
              </button>
              <button onClick={() => { setShowReserva(false); setError('') }} className="flex-1 btn-secondary py-2.5">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
