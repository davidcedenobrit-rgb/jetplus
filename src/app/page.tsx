import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RUTA_POST_LOGIN } from '@/lib/menu-config'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect(RUTA_POST_LOGIN)
  } else {
    redirect('/login')
  }
}