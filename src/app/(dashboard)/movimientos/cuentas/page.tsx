import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listarCuentas } from '../actions'
import CuentasClient from './CuentasClient'

export const dynamic = 'force-dynamic'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

export default async function CuentasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) redirect('/dashboard')

  const { cuentas } = await listarCuentas(false)
  return <CuentasClient cuentas={cuentas} />
}
