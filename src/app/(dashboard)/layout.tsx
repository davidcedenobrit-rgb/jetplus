import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientLayout from '@/components/layout/ClientLayout'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const rol = (user.user_metadata?.rol as string) ?? 'editor'

  const ROL_CARLA_VISIBLE = ['jose', 'admin', 'director', 'carla']

  // Conteo de aprobaciones pendientes
  const { count: aprobacionesPendientes } = await supabase
    .from('solicitudes_cambio')
    .select('id', { count: 'exact', head: true })
    .eq('estado', 'pendiente')

  // Conteo de depósitos pendientes de entregar a Carla
  const { count: depositosPendientesCarla } = ROL_CARLA_VISIBLE.includes(rol)
    ? await supabase
        .from('ingresos')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'depositado')
    : { count: 0 }

  return (
    <ClientLayout
      userEmail={user.email ?? ''}
      rol={rol}
      aprobacionesPendientes={aprobacionesPendientes ?? 0}
      depositosPendientesCarla={depositosPendientesCarla ?? 0}
    >
      {children}
    </ClientLayout>
  )
}
