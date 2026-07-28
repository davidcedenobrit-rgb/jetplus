import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReporteCobrosClient from './ReporteCobrosClient'

export const dynamic = 'force-dynamic'

const DIR = ['jose', 'admin', 'director', 'mary', 'leysdem']

export default async function ReporteCobrosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!DIR.includes(rol)) redirect('/dashboard')
  return <ReporteCobrosClient />
}
