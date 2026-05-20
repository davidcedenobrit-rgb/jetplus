'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle2, XCircle, Clock, AlertCircle, Shield, ChevronRight,
  ArrowLeft, User, CreditCard
} from 'lucide-react'

interface Props {
  pendientes: any[]
  historial: any[]
  userId: string
  userEmail: string
  rol: string
}

const CAMPO_LABELS: Record<string, string> = {
  estado: 'Estado',
  monto: 'Monto',
  fecha_vencimiento: 'Fecha de vencimiento',
  observaciones: 'Observaciones',
}

function formatCambioValor(campo: string, valor: any) {
  if (campo === 'monto') return `$${Number(valor).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
  if (campo === 'fecha_vencimiento') return new Date(valor + 'T12:00:00').toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })
  return String(valor ?? '—')
}

function SolicitudCard({ s, esDirector, onAccion }: { s: any; esDirector: boolean; onAccion: (id: string, accion: 'aprobado' | 'rechazado', nota?: string) => void }) {
  const [loading, setLoading] = useState(false)
  const [notaRechazo, setNotaRechazo] = useState('')
  const [showNota, setShowNota] = useState(false)
  const credito = s.creditos
  const cambios: any[] = s.cambios ?? []

  async function handleAprobar() {
    setLoading(true)
    await onAccion(s.id, 'aprobado')
    setLoading(false)
  }

  async function handleRechazar() {
    if (!notaRechazo.trim()) { setShowNota(true); return }
    setLoading(true)
    await onAccion(s.id, 'rechazado', notaRechazo)
    setLoading(false)
    setShowNota(false)
  }

  return (
    <div className="card p-5">
      {/* Encabezado */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-yellow-100 text-yellow-800 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Clock size={10} /> Pendiente
            </span>
            <span className="text-xs text-oriental-gray">{new Date(s.created_at).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <p className="font-semibold text-oriental-black">{s.descripcion}</p>
          <p className="text-xs text-oriental-gray mt-0.5">
            Solicitado por: <span className="font-medium">{s.solicitado_por_email}</span>
          </p>
        </div>
        {credito && (
          <Link href={`/creditos/${s.credito_id}`} className="flex items-center gap-1 text-xs text-oriental-gray hover:text-oriental-black transition-colors">
            Ver crédito <ChevronRight size={12} />
          </Link>
        )}
      </div>

      {/* Info del crédito */}
      {credito && (
        <div className="bg-oriental-bg rounded-lg px-4 py-3 mb-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <User size={14} className="text-oriental-gray" />
            <span className="font-medium text-oriental-black">{credito.clientes?.nombre}</span>
            <span className="text-oriental-gray text-xs">{credito.clientes?.cedula_rif}</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard size={14} className="text-oriental-gray" />
            <span className="text-oriental-gray">{credito.vehiculos?.marca} {credito.vehiculos?.modelo}</span>
            <span className="font-mono font-bold text-xs bg-gray-200 px-1.5 py-0.5 rounded">{credito.vehiculos?.placa ?? '—'}</span>
          </div>
        </div>
      )}

      {/* Detalle de cambios */}
      <div className="space-y-2 mb-4">
        <p className="text-xs font-semibold text-oriental-gray uppercase tracking-wider">Cambios solicitados</p>
        {cambios.map((c: any, i: number) => (
          <div key={i} className="flex items-center gap-3 text-sm bg-white border border-gray-100 rounded-lg px-4 py-2.5">
            <div className="flex-1">
              <span className="text-oriental-gray text-xs">
                {c.tipo === 'cuota' ? `Cuota #${c.numero_cuota} —` : 'Crédito —'}{' '}
                <span className="font-semibold text-oriental-black">{CAMPO_LABELS[c.campo] ?? c.campo}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="bg-red-50 text-red-700 px-2 py-1 rounded line-through">{formatCambioValor(c.campo, c.anterior)}</span>
              <span className="text-oriental-gray">→</span>
              <span className="bg-green-50 text-green-700 px-2 py-1 rounded font-semibold">{formatCambioValor(c.campo, c.nuevo)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Nota rechazo (condicional) */}
      {showNota && (
        <div className="mb-3">
          <label className="label text-xs">Motivo del rechazo (requerido)</label>
          <textarea
            className="input text-sm min-h-[60px] resize-none"
            placeholder="Explica brevemente por qué se rechaza..."
            value={notaRechazo}
            onChange={e => setNotaRechazo(e.target.value)}
          />
        </div>
      )}

      {/* Acciones */}
      {esDirector ? (
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={handleAprobar}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            <CheckCircle2 size={15} /> Aprobar y aplicar
          </button>
          <button
            onClick={handleRechazar}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            <XCircle size={15} /> {showNota ? 'Confirmar rechazo' : 'Rechazar'}
          </button>
          {showNota && (
            <button
              onClick={() => { setShowNota(false); setNotaRechazo('') }}
              className="text-sm text-oriental-gray hover:text-oriental-black transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      ) : (
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs text-oriental-gray flex items-center gap-1">
            <Shield size={12} /> Solo José Rojas puede aprobar o rechazar solicitudes
          </p>
        </div>
      )}
    </div>
  )
}

export default function AprobacionesClient({ pendientes, historial, userId, userEmail, rol }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [pendientesState, setPendientesState] = useState(pendientes)
  const [historialState, setHistorialState] = useState(historial)
  const [tab, setTab] = useState<'pendientes' | 'historial'>('pendientes')
  const esDirector = rol === 'director'

  async function handleAccion(solicitudId: string, accion: 'aprobado' | 'rechazado', nota?: string) {
    const solicitud = pendientesState.find(s => s.id === solicitudId)
    if (!solicitud) return

    if (accion === 'aprobado') {
      // Aplicar los cambios reales
      const cambios: any[] = solicitud.cambios ?? []
      for (const c of cambios) {
        if (c.tipo === 'cuota' && c.cuota_id) {
          const update: any = { [c.campo]: c.nuevo, updated_at: new Date().toISOString() }
          if (c.campo === 'estado' && c.nuevo === 'pagada') {
            update.fecha_pago = new Date().toISOString().split('T')[0]
          }
          await supabase.from('cuotas').update(update).eq('id', c.cuota_id)
        } else if (c.tipo === 'credito') {
          await supabase.from('creditos').update({ [c.campo]: c.nuevo, updated_at: new Date().toISOString() }).eq('id', solicitud.credito_id)
        }
      }
    }

    // Actualizar la solicitud
    const { error } = await supabase
      .from('solicitudes_cambio')
      .update({
        estado: accion,
        aprobado_por: userId,
        aprobado_por_email: userEmail,
        nota_rechazo: nota ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', solicitudId)

    if (!error) {
      const s = pendientesState.find(s => s.id === solicitudId)!
      setPendientesState(prev => prev.filter(s => s.id !== solicitudId))
      setHistorialState(prev => [{ ...s, estado: accion, aprobado_por_email: userEmail, nota_rechazo: nota }, ...prev])
      router.refresh()
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-oriental-black">Aprobaciones</h1>
            {pendientesState.length > 0 && (
              <span className="bg-oriental-red text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {pendientesState.length}
              </span>
            )}
          </div>
          <p className="text-oriental-gray text-sm mt-0.5">Solicitudes de cambio en créditos</p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
          esDirector ? 'bg-oriental-red/10 text-oriental-red' : 'bg-gray-100 text-oriental-gray'
        }`}>
          <Shield size={13} />
          {esDirector ? 'Director' : 'Editor — solo lectura'}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('pendientes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
            tab === 'pendientes'
              ? 'bg-oriental-black text-white border-oriental-black'
              : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
          }`}
        >
          <Clock size={14} />
          Pendientes
          {pendientesState.length > 0 && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${tab === 'pendientes' ? 'bg-oriental-red text-white' : 'bg-gray-200 text-gray-600'}`}>
              {pendientesState.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('historial')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
            tab === 'historial'
              ? 'bg-oriental-black text-white border-oriental-black'
              : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
          }`}
        >
          Historial
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${tab === 'historial' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
            {historialState.length}
          </span>
        </button>
      </div>

      {/* Contenido pendientes */}
      {tab === 'pendientes' && (
        <div className="space-y-4">
          {pendientesState.length === 0 ? (
            <div className="card p-12 text-center">
              <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
              <p className="text-oriental-black font-semibold">Todo al día</p>
              <p className="text-oriental-gray text-sm mt-1">No hay solicitudes pendientes de aprobación</p>
            </div>
          ) : (
            pendientesState.map(s => (
              <SolicitudCard key={s.id} s={s} esDirector={esDirector} onAccion={handleAccion} />
            ))
          )}
        </div>
      )}

      {/* Historial */}
      {tab === 'historial' && (
        <div className="space-y-3">
          {historialState.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-oriental-gray text-sm">No hay historial de solicitudes</p>
            </div>
          ) : (
            historialState.map(s => (
              <div key={s.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {s.estado === 'aprobado' ? (
                        <span className="text-xs bg-green-100 text-green-800 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 size={10} /> Aprobado
                        </span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-800 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <XCircle size={10} /> Rechazado
                        </span>
                      )}
                      <span className="text-xs text-oriental-gray">{new Date(s.created_at).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <p className="text-sm font-medium text-oriental-black">{s.descripcion}</p>
                    <p className="text-xs text-oriental-gray mt-0.5">
                      Solicitado por: {s.solicitado_por_email}
                      {s.aprobado_por_email && <> · Revisado por: {s.aprobado_por_email}</>}
                    </p>
                    {s.nota_rechazo && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={11} /> {s.nota_rechazo}
                      </p>
                    )}
                  </div>
                  <Link href={`/creditos/${s.credito_id}`} className="text-xs text-oriental-gray hover:text-oriental-black transition-colors flex items-center gap-1">
                    Ver <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
