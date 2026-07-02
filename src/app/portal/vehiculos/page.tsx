import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Car, ChevronRight } from 'lucide-react'
import BottomNav from '../BottomNav'
import PortalHeader from '../PortalHeader'

export default async function MisVehiculosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.rol !== 'cliente') redirect('/portal/login')

  const admin = await createAdminClient()
  const { data: cuenta } = await admin.from('cliente_cuentas').select('cliente_id').eq('user_id', user.id).single()
  if (!cuenta) redirect('/portal/login')

  const { data: vehiculos } = await admin
    .from('vehiculos')
    .select('id, marca, modelo, placa, color, anio, tipo_compra, fecha_entrega, estado')
    .eq('cliente_id', cuenta.cliente_id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <PortalHeader />
      <div className="px-5 py-4">
        <p className="text-[10px] font-black text-oriental-gray uppercase tracking-widest">Mis vehículos</p>
        <h1 className="text-xl font-black text-oriental-black mt-0.5">
          {(vehiculos?.length ?? 0)} {(vehiculos?.length ?? 0) === 1 ? 'vehículo' : 'vehículos'}
        </h1>
      </div>

      <div className="px-5 space-y-3">
        {(vehiculos ?? []).map(v => (
          <Link
            key={v.id}
            href={`/portal/vehiculos/${v.id}`}
            className="block bg-white border border-gray-100 rounded-2xl p-4 hover:border-oriental-red transition-colors shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <Car size={12} className="text-oriental-red" />
                  <p className="text-[10px] font-bold text-oriental-red uppercase tracking-widest">{v.marca}</p>
                </div>
                <p className="text-base font-black text-oriental-black leading-tight">{v.modelo}</p>
                <p className="text-xs text-oriental-gray mt-0.5">
                  {v.anio ?? ''} {v.color ? `· ${v.color}` : ''}
                </p>
                {v.placa && (
                  <div className="inline-block mt-2 px-2 py-0.5 bg-gray-100 rounded font-mono text-[11px] font-bold text-oriental-black">
                    {v.placa}
                  </div>
                )}
              </div>
              <ChevronRight size={16} className="text-gray-300 mt-1" />
            </div>
          </Link>
        ))}

        {(!vehiculos || vehiculos.length === 0) && (
          <div className="text-center py-12 text-oriental-gray">
            <Car size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm">Aún no hay vehículos vinculados a su cuenta.</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
