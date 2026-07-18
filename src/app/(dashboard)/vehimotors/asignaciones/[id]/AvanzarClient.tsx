'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, Mail, Ban, CheckCircle2 } from 'lucide-react'
import { avanzarFase, anularVinculacion } from '../actions'

const SIGUIENTE: Record<string, string> = {
  asignado: 'Pasar a: En facturación',
  en_facturacion: 'Pasar a: Factura recibida',
  factura_recibida: 'Marcar como Completado',
}

export default function AvanzarClient({ vinculacionId, estado }: { vinculacionId: string; estado: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [notas, setNotas] = useState('')
  const [error, setError] = useState('')
  const [anulando, setAnulando] = useState(false)
  const [motivo, setMotivo] = useState('')

  const labelSiguiente = SIGUIENTE[estado]

  async function avanzar() {
    setError('')
    const r = await avanzarFase(vinculacionId, notas)
    if ('error' in r && r.error) { setError(r.error); return }
    setNotas('')
    startTransition(() => router.refresh())
  }

  async function anular() {
    setError('')
    const r = await anularVinculacion(vinculacionId, motivo)
    if ('error' in r && r.error) { setError(r.error); return }
    startTransition(() => router.refresh())
  }

  if (estado === 'completado') {
    return (
      <div className="card p-5 bg-green-50 border-green-200 flex items-center gap-2">
        <CheckCircle2 size={18} className="text-green-600" />
        <p className="text-sm font-semibold text-green-800">Proceso completado — cliente asignado y factura de VH recibida.</p>
      </div>
    )
  }
  if (estado === 'anulado') {
    return <div className="card p-5 text-sm text-oriental-gray">Esta asignación fue anulada.</div>
  }

  return (
    <div className="card p-5">
      <h2 className="font-bold text-oriental-black mb-3">Acciones</h2>

      {/* Correo: se enchufa en el próximo paso */}
      <div className="mb-4 rounded-lg border border-dashed border-gray-200 p-3 flex items-center gap-2 text-oriental-gray">
        <Mail size={15} />
        <p className="text-xs">El envío de correo ({estado === 'asignado' ? 'asignación al cliente' : 'facturación de la proforma'}) como José Rojas se agrega en el siguiente paso.</p>
      </div>

      <div>
        <label className="label">Nota (opcional)</label>
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} className="input" placeholder="Observación de esta fase…" />
      </div>

      {error && <p className="text-sm text-oriental-red mt-2">{error}</p>}

      <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
        {labelSiguiente && (
          <button onClick={avanzar} disabled={pending} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
            {pending ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />} {labelSiguiente}
          </button>
        )}
        {!anulando ? (
          <button onClick={() => setAnulando(true)} className="text-xs text-oriental-red hover:underline flex items-center gap-1"><Ban size={12} /> Anular</button>
        ) : (
          <div className="flex items-center gap-2">
            <input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Motivo" className="input py-1 text-xs w-40" />
            <button onClick={anular} disabled={pending} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-oriental-red text-white disabled:opacity-50">Confirmar</button>
            <button onClick={() => setAnulando(false)} className="text-xs text-oriental-gray">Cancelar</button>
          </div>
        )}
      </div>
    </div>
  )
}
