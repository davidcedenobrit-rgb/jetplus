import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AprobacionesClient from './AprobacionesClient'

export default async function AprobacionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Cargar solicitudes pendientes + historial reciente
  const { data: solicitudes } = await supabase
    .from('solicitudes_cambio')
    .select(`
      *,
      creditos (
        id,
        monto_financiado,
        moneda,
        num_cuotas,
        frecuencia_pago,
        clientes ( nombre, cedula_rif ),
        vehiculos ( marca, modelo, placa )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  const pendientes = (solicitudes ?? []).filter(s => s.estado === 'pendiente')
  const historial = (solicitudes ?? []).filter(s => s.estado !== 'pendiente')

  return (
    <AprobacionesClient
      pendientes={pendientes}
      historial={historial}
      userId={user.id}
      userEmail={user.email ?? ''}
      rol={(user.user_metadata?.rol as string) ?? 'editor'}
    />
  )
}
