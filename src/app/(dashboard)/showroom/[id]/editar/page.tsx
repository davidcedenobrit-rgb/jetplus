import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import type { VehiculoShowroom } from '@/types/database'
import EditarShowroomForm from './EditarShowroomForm'

export default async function EditarShowroomPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rol = user.user_metadata?.rol as string
  if (!['jose', 'arianna', 'admin', 'director'].includes(rol)) redirect('/showroom')

  const { id } = await params
  const { data: vehiculo } = await supabase
    .from('vehiculos_showroom')
    .select('*')
    .eq('id', id)
    .single()

  if (!vehiculo) notFound()

  return <EditarShowroomForm vehiculo={vehiculo as VehiculoShowroom} />
}
