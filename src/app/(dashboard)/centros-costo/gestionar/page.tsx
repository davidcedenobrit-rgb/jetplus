import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import GestionarCentrosClient, { type CentroRow } from './GestionarCentrosClient'

export const dynamic = 'force-dynamic'

const ROLES = ['jose', 'admin', 'director']

export default async function GestionarCentrosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) redirect('/dashboard')

  const svc = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await svc.from('centros_costo').select('id, nombre, activo, orden').order('orden')
  return <GestionarCentrosClient inicial={(data as CentroRow[]) ?? []} />
}
