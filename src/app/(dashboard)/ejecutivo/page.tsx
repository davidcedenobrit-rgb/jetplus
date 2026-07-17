import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EjecutivoClient from './EjecutivoClient'

export const dynamic = 'force-dynamic'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

export default async function EjecutivoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) redirect('/dashboard')
  return <EjecutivoClient />
}
