import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Building2, HardHat } from 'lucide-react'

export const dynamic = 'force-dynamic'

const ROLES = ['director', 'admin', 'jose']

export default async function CapitalMotorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) redirect('/dashboard')

  return (
    <div className="p-4 lg:p-8 max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black flex items-center gap-2">
            <Building2 size={22} className="text-oriental-red" /> Capital Motors
          </h1>
          <p className="text-oriental-gray text-sm">Concesionario</p>
        </div>
      </div>

      <div className="card p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-5">
          <HardHat size={30} className="text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-oriental-black mb-2">En construcción</h2>
        <p className="text-oriental-gray text-sm max-w-md mx-auto">
          El Centro de Mando de <strong>Capital Motors</strong> todavía se está preparando.
          Cuando esté listo, tendrá su propio acceso con datos independientes, igual que Ki Auto.
        </p>
      </div>
    </div>
  )
}
