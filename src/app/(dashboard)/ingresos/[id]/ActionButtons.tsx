'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle2, XCircle, AlertTriangle,
  Send, Landmark, Building2, Printer
} from 'lucide-react'
import DeleteButton from '@/components/DeleteButton'

const ROL_DIRECTOR = ['jose', 'admin', 'director']

interface Props {
  ingresoId: string
  estado: string
  monto: number
  moneda: string
  numeroRecibo: string
  rol?: string
}

export default function ActionButtons({ ingresoId, estado, monto, moneda, numeroRecibo, rol = 'editor' }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState('')

  async function updateEstado(nuevoEstado: string, timestampField?: string) {
    setLoading(nuevoEstado)
    const update: Record<string, any> = { estado: nuevoEstado }
    if (timestampField) update[timestampField] = new Date().toISOString()

    if (nuevoEstado === 'aprobado') {
      const { data: { user } } = await supabase.auth.getUser()
      update.aprobado_por = user?.id
      update.fecha_aprobacion = new Date().toISOString()
    }

    await supabase.from('ingresos').update(update).eq('id', ingresoId)

    // Al mandar a depositar, crear egreso automático a Vehimotors
    if (nuevoEstado === 'enviado_deposito') {
      const { data: { user } } = await supabase.auth.getUser()
      const year = new Date().getFullYear()
      const buf = new Uint32Array(1)
      crypto.getRandomValues(buf)
      const seq = String(buf[0] % 1_000_000).padStart(6, '0')
      await supabase.from('egresos').insert({
        numero_egreso: `LOA-EGR-${year}-${seq}`,
        categoria: 'vehimotors',
        concepto: `Depósito a Vehimotors — ${numeroRecibo}`,
        monto,
        moneda,
        ingreso_id: ingresoId,
        estado: 'registrado',
        fecha_egreso: new Date().toISOString().split('T')[0],
        registrado_por: user?.id ?? '',
      })
    }

    setLoading('')
    router.refresh()
  }

  const actions = [
    {
      label: 'Aprobar',
      icon: CheckCircle2,
      estado: 'aprobado',
      show: ['pendiente_aprobacion', 'correccion_requerida'],
      style: 'bg-green-600 hover:bg-green-700 text-white',
    },
    {
      label: 'Rechazar',
      icon: XCircle,
      estado: 'rechazado',
      show: ['pendiente_aprobacion', 'correccion_requerida'],
      style: 'bg-red-600 hover:bg-red-700 text-white',
    },
    {
      label: 'Solicitar corrección',
      icon: AlertTriangle,
      estado: 'correccion_requerida',
      show: ['pendiente_aprobacion'],
      style: 'bg-orange-500 hover:bg-orange-600 text-white',
    },
    {
      label: 'Reportar a Carla',
      icon: Send,
      estado: 'enviado_carla',
      timestamp: 'enviado_carla_at',
      show: ['aprobado'],
      style: 'bg-purple-600 hover:bg-purple-700 text-white',
    },
    {
      label: 'Mandar a depositar',
      icon: Landmark,
      estado: 'enviado_deposito',
      timestamp: 'deposito_at',
      show: ['aprobado', 'enviado_carla'],
      style: 'bg-oriental-black hover:bg-gray-800 text-white',
    },
    {
      label: 'Reportar a Vehimotors',
      icon: Building2,
      estado: 'reportado_vehimotors',
      timestamp: 'vehimotors_at',
      show: ['depositado', 'enviado_deposito', 'entregado_carla'],
      style: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    },
    {
      label: 'Entregado a Carla',
      icon: Send,
      estado: 'entregado_carla',
      timestamp: 'entregado_carla_at',
      show: ['depositado'],
      onlyRoles: ROL_DIRECTOR,
      style: 'bg-teal-600 hover:bg-teal-700 text-white',
    },
  ]

  const visibleActions = actions.filter(a =>
    a.show.includes(estado) &&
    (!('onlyRoles' in a) || (a as any).onlyRoles.includes(rol))
  )

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-oriental-black mb-4">Acciones</h3>
      {visibleActions.length === 0 ? (
        <p className="text-sm text-oriental-gray">No hay acciones disponibles para este estado.</p>
      ) : (
        <div className="space-y-2">
          {visibleActions.map(action => (
            <button
              key={action.estado}
              onClick={() => updateEstado(action.estado, (action as any).timestamp)}
              disabled={loading !== ''}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${action.style}`}
            >
              <action.icon size={16} />
              {loading === action.estado ? 'Procesando...' : action.label}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-gray-100 mt-4 pt-4 space-y-2">
        <button
          onClick={() => window.print()}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-oriental-gray hover:bg-gray-50 transition-colors"
        >
          <Printer size={16} />
          Imprimir recibo
        </button>
        <DeleteButton table="ingresos" id={ingresoId} redirectTo="/ingresos" label="Eliminar ingreso" />
      </div>
    </div>
  )
}
