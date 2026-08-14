import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Share2 } from 'lucide-react'
import BitacoraRedesTab from '../BitacoraRedesTab'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

export default async function RedesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) redirect('/dashboard')

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/gestion-ventas" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"><ArrowLeft size={18} className="text-oriental-gray" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black flex items-center gap-2"><Share2 size={22} className="text-oriental-red" /> Redes</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Qué eligen los clientes en el link de redes sociales y los datos enviados a WhatsApp</p>
        </div>
      </div>
      <BitacoraRedesTab />
    </div>
  )
}
