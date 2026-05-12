'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle2, XCircle, AlertTriangle,
  Send, Landmark, Building2, Printer
} from 'lucide-react'
import DeleteButton from '@/components/DeleteButton'

interface Props {
  ingresoId: string
  estado: string
}

export default function ActionButtons({ ingresoId, estado }: Props) {
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
      label: 'Enviar a Carla',
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
      show: ['depositado', 'enviado_deposito'],
      style: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    },
  ]

  const visibleActions = actions.filter(a => a.show.includes(estado))

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
              onClick={() => updateEstado(action.estado, action.timestamp)}
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
