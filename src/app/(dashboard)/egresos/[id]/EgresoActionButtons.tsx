'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, AlertTriangle, Printer, Banknote, Send, Loader2 } from 'lucide-react'
import DeleteButton from '@/components/DeleteButton'
import { aprobarEgreso, rechazarEgreso, solicitarCorreccionEgreso, reenviarEgreso, marcarPagadoEgreso } from './estado-actions'

const DIR = ['jose', 'admin', 'director', 'mary', 'leysdem']

interface Props {
  egresoId: string
  estado: string
  rol: string
  esRegistrador: boolean
}

export default function EgresoActionButtons({ egresoId, estado, rol, esRegistrador }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const [modal, setModal] = useState<null | 'rechazar' | 'correccion' | 'pagar'>(null)
  const [motivo, setMotivo] = useState('')
  const [pagoFecha, setPagoFecha] = useState(new Date().toISOString().slice(0, 10))
  const [pagoRef, setPagoRef] = useState('')

  const puedeAprobar = DIR.includes(rol)

  async function run(key: string, fn: () => Promise<{ ok?: boolean; error?: string }>) {
    setLoading(key); setError('')
    const r = await fn()
    setLoading('')
    if (r?.error) { setError(r.error); return }
    setModal(null); setMotivo(''); setPagoRef(''); router.refresh()
  }

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-oriental-black mb-4">Acciones</h3>

      <div className="space-y-2">
        {/* Aprobar / Rechazar / Corrección — solo dirección */}
        {puedeAprobar && (estado === 'pendiente_aprobacion' || estado === 'correccion_requerida') && (
          <button onClick={() => run('aprobar', () => aprobarEgreso(egresoId))} disabled={loading !== ''}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-700 text-white disabled:opacity-50">
            {loading === 'aprobar' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Aprobar
          </button>
        )}
        {puedeAprobar && estado === 'pendiente_aprobacion' && (
          <button onClick={() => { setModal('correccion'); setMotivo('') }} disabled={loading !== ''}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50">
            <AlertTriangle size={16} /> Solicitar corrección
          </button>
        )}
        {puedeAprobar && (estado === 'pendiente_aprobacion' || estado === 'correccion_requerida') && (
          <button onClick={() => { setModal('rechazar'); setMotivo('') }} disabled={loading !== ''}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50">
            <XCircle size={16} /> Rechazar
          </button>
        )}

        {/* Reenviar a aprobación tras corregir — dirección o el registrador */}
        {estado === 'correccion_requerida' && (puedeAprobar || esRegistrador) && (
          <button onClick={() => run('reenviar', () => reenviarEgreso(egresoId))} disabled={loading !== ''}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-oriental-black hover:bg-gray-800 text-white disabled:opacity-50">
            {loading === 'reenviar' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Reenviar a aprobación
          </button>
        )}

        {/* Marcar como pagado — solo dirección */}
        {puedeAprobar && estado === 'aprobado' && (
          <button onClick={() => { setModal('pagar'); setPagoFecha(new Date().toISOString().slice(0, 10)); setPagoRef('') }} disabled={loading !== ''}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
            <Banknote size={16} /> Marcar como pagado
          </button>
        )}

        {!puedeAprobar && estado !== 'correccion_requerida' && (
          <p className="text-sm text-oriental-gray">No hay acciones disponibles para tu rol en este estado.</p>
        )}
      </div>

      {error && <p className="text-xs text-oriental-red mt-2">{error}</p>}

      <div className="border-t border-gray-100 mt-4 pt-4 space-y-2">
        <button onClick={() => window.print()} className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-oriental-gray hover:bg-gray-50 transition-colors">
          <Printer size={16} /> Imprimir comprobante
        </button>
        <DeleteButton table="egresos" id={egresoId} redirectTo="/egresos" label="Eliminar egreso" />
      </div>

      {/* Modal motivo (rechazar / corrección) */}
      {(modal === 'rechazar' || modal === 'correccion') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5">
            <h4 className="font-bold text-oriental-black mb-1">{modal === 'rechazar' ? 'Rechazar egreso' : 'Solicitar corrección'}</h4>
            <p className="text-xs text-oriental-gray mb-3">{modal === 'rechazar' ? 'Indica por qué se rechaza.' : 'Indica qué debe corregir quien lo registró.'}</p>
            <textarea className="textarea w-full" rows={3} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Motivo…" autoFocus />
            {error && <p className="text-xs text-oriental-red mt-2">{error}</p>}
            <div className="flex gap-2 pt-3">
              <button onClick={() => setModal(null)} className="flex-1 btn-secondary py-2 text-sm">Cancelar</button>
              <button
                onClick={() => modal === 'rechazar'
                  ? run('rechazar', () => rechazarEgreso(egresoId, motivo))
                  : run('correccion', () => solicitarCorreccionEgreso(egresoId, motivo))}
                disabled={loading !== '' || !motivo.trim()}
                className={`flex-1 py-2 text-sm rounded-lg font-semibold text-white disabled:opacity-50 ${modal === 'rechazar' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'}`}>
                {loading ? '…' : (modal === 'rechazar' ? 'Rechazar' : 'Solicitar corrección')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pagar */}
      {modal === 'pagar' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5">
            <h4 className="font-bold text-oriental-black mb-3 flex items-center gap-2"><Banknote size={18} className="text-blue-600" /> Registrar pago</h4>
            <div className="space-y-3">
              <div><label className="label">Fecha de pago</label><input type="date" className="input" value={pagoFecha} onChange={e => setPagoFecha(e.target.value)} /></div>
              <div><label className="label">Referencia / N° de operación</label><input type="text" className="input font-mono" value={pagoRef} onChange={e => setPagoRef(e.target.value)} placeholder="Opcional" /></div>
            </div>
            {error && <p className="text-xs text-oriental-red mt-2">{error}</p>}
            <div className="flex gap-2 pt-4">
              <button onClick={() => setModal(null)} className="flex-1 btn-secondary py-2 text-sm">Cancelar</button>
              <button onClick={() => run('pagar', () => marcarPagadoEgreso(egresoId, { fecha: pagoFecha, referencia: pagoRef }))} disabled={loading !== ''}
                className="flex-1 py-2 text-sm rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
                {loading === 'pagar' ? <Loader2 size={14} className="animate-spin" /> : <Banknote size={14} />} Confirmar pago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
