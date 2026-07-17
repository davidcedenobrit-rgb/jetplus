import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { esSuperAdmin } from '@/lib/super-admin'
import { simularImportacion } from '@/lib/contabilidad/plan-cuentas'
import ImportarClient from './ImportarClient'

export const dynamic = 'force-dynamic'

export default async function ImportarCatalogoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!esSuperAdmin(user.email)) redirect('/dashboard')

  const sim = simularImportacion()
  return <ImportarClient sim={sim} />
}
