import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function PortalRoot() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.rol !== 'cliente') {
    redirect('/portal/login')
  }
  redirect('/portal/inicio')
}
