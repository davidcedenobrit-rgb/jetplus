import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import VehiculosEditor from './VehiculosEditor'

const ROL_PERMITIDO = ['jose', 'admin', 'director']

export default async function LinkVentasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const rol = (user?.user_metadata?.rol as string) ?? 'editor'
  if (!ROL_PERMITIDO.includes(rol)) redirect('/dashboard')

  const { data: vehiculos } = await supabase
    .from('catalogo_ventas')
    .select('*')
    .order('orden')

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Link de Ventas</h1>
          <p className="text-oriental-gray text-sm mt-1">
            Administra el catálogo público y los planes AC500
          </p>
        </div>
        <a
          href="/ventas"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-oriental-gray hover:text-oriental-black hover:border-gray-400 transition-colors"
        >
          <ExternalLink size={15} />
          Ver página pública
        </a>
      </div>

      <VehiculosEditor initialVehiculos={vehiculos ?? []} />
    </div>
  )
}
