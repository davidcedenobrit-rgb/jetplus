import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2 } from 'lucide-react'
import ConcesionariosTab from '../../link-ventas/ConcesionariosTab'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

export default async function BaseDatosConcesionariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) redirect('/dashboard')

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/base-datos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex items-center gap-2">
          <Building2 size={20} className="text-slate-600" />
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Concesionarios</h1>
            <p className="text-oriental-gray text-sm">Concesionarios, prefijos de numeración y logos</p>
          </div>
        </div>
      </div>

      <ConcesionariosTab />
    </div>
  )
}
