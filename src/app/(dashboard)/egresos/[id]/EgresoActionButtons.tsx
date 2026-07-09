'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle2, XCircle, AlertTriangle,
  Printer, Banknote
} from 'lucide-react'
import DeleteButton from '@/components/DeleteButton'

interface Props {
  egresoId: string
  estado: string
}

export default function EgresoActionButtons({ egresoId, estado }: Props) {
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

    await supabase.from('egresos').update(update).eq('id', egresoId)
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
      label: 'Marcar como pagado',
      icon: Banknote,
      estado: 'pagado',
      show: ['aprobado'],
      style: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    // Nota: los egresos NO se reportan a Carla ni a Vehimotors.
    // Pagar a un proveedor (incluido Vehimotors/Avanza Motos) es un egreso normal
    // que termina en 'pagado'. El reporte a Vehimotors vive solo en Ingresos.
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
              onClick={() => updateEstado(action.estado)}
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
          Imprimir comprobante
        </button>
        <DeleteButton table="egresos" id={egresoId} redirectTo="/egresos" label="Eliminar egreso" />
      </div>
    </div>
  )
}
