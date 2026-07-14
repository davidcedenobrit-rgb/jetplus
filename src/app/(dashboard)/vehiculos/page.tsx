import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import VehiculosClient from './VehiculosClient'

export default async function VehiculosPage() {
  const supabase = await createClient()

  const [vehiculos, credPlanes] = await Promise.all([
    fetchAllRows<any>((from, to) => supabase
      .from('vehiculos')
      .select('*, clientes(nombre, cedula_rif)')
      .order('created_at', { ascending: false })
      .range(from, to)),
    fetchAllRows<any>((from, to) => supabase
      .from('creditos')
      .select('vehiculo_id, plan_tipo')
      .not('vehiculo_id', 'is', null)
      .range(from, to)),
  ])

  const lista = vehiculos ?? []

  // Build map vehiculo_id → Set of plan_tipos
  const planesMap: Record<string, string[]> = {}
  for (const c of credPlanes ?? []) {
    if (!c.vehiculo_id || !c.plan_tipo) continue
    if (!planesMap[c.vehiculo_id]) planesMap[c.vehiculo_id] = []
    if (!planesMap[c.vehiculo_id].includes(c.plan_tipo)) planesMap[c.vehiculo_id].push(c.plan_tipo)
  }

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

      <VehiculosClient vehiculos={lista} planesMap={planesMap} />
    </div>
  )
}
