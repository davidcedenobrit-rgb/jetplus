import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConsolidadosClient from './ConsolidadosClient'

export const dynamic = 'force-dynamic'

const DIR = ['jose', 'admin', 'director', 'mary', 'leysdem']

export default async function ConsolidadosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!DIR.includes(rol)) redirect('/dashboard')
  return <ConsolidadosClient />
}
