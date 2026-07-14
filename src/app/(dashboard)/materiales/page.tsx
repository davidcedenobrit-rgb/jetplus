import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MaterialesClient from './MaterialesClient'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

export default async function MaterialesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) redirect('/dashboard')
  return <MaterialesClient />
}
