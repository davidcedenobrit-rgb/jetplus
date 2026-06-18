import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import VehiculosClient from './VehiculosClient'

export default async function VehiculosPage() {
  const supabase = await createClient()

  const [{ data: vehiculos }, { data: ac500Creds }] = await Promise.all([
    supabase
      .from('vehiculos')
      .select('*, clientes(nombre, cedula_rif)')
      .order('created_at', { ascending: false }),
    supabase
      .from('creditos')
      .select('vehiculo_id')
      .eq('plan_tipo', 'inicial_la_oriental')
      .not('vehiculo_id', 'is', null),
  ])

  const lista = vehiculos ?? []
  const ac500Ids = (ac500Creds ?? []).map(c => c.vehiculo_id as string)

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Vehículos</h1>
          <p className="text-oriental-gray text-sm mt-1">{lista.length} unidades</p>
        </div>
        <Link href="/vehiculos/nuevo" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo vehículo
        </Link>
      </div>

      <VehiculosClient vehiculos={lista} ac500Ids={ac500Ids} />
    </div>
  )
}
