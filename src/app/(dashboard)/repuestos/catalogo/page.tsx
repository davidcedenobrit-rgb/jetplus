import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import CatalogoRepuestos from '../CatalogoRepuestos'

const ROL_ADMIN = ['jose', 'arianna', 'director', 'admin', 'mary', 'leysdem', 'almacen']

export default async function CatalogoRepuestosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  const isAdmin = ROL_ADMIN.includes(rol)

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-oriental-red/10 flex items-center justify-center">
          <BookOpen className="text-oriental-red" size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Catálogo repuestos VM</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Catálogo de repuestos Vehimotors (MG &amp; MAXUS)</p>
        </div>
      </div>

      <CatalogoRepuestos isAdmin={isAdmin} />
    </div>
  )
}
