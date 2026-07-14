import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ObsequiosClient from './ObsequiosClient'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

export default async function ObsequiosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) redirect('/dashboard')
  return <ObsequiosClient />
}
