import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import CreditosClient from './CreditosClient'

export default async function CreditosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('creditos')
    .select('*, clientes(nombre, cedula_rif), vehiculos(tipo_compra)')
    .order('created_at', { ascending: false })

  if (params.estado) query = query.eq('estado', params.estado)

  const { data: creditos } = await query

  // Fetch cuotas para calcular saldo real
  const creditoIds = (creditos ?? []).map(c => c.id)
  const cuotasObj: Record<string, { estado: string; monto: number; monto_pagado: number }[]> = {}
  if (creditoIds.length > 0) {
    const { data: cuotas } = await supabase
      .from('cuotas')
      .select('credito_id, estado, monto, monto_pagado, fecha_vencimiento')
      .in('credito_id', creditoIds)
    for (const q of cuotas ?? []) {
      if (!cuotasObj[q.credito_id]) cuotasObj[q.credito_id] = []
      cuotasObj[q.credito_id].push(q)
    }
  }

  // Agrupar por vehiculo_id
  const grupos = new Map<string, typeof creditos>()
  for (const c of creditos ?? []) {
    const key = c.vehiculo_id ?? c.id
    if (!grupos.has(key)) grupos.set(key, [])
    grupos.get(key)!.push(c)
  }

  const grupos_arr = Array.from(grupos.values()).filter((g): g is any[] => g !== null)
  const totalCreditos = creditos?.length ?? 0

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Créditos</h1>
          <p className="text-oriental-gray text-sm mt-1">
            {grupos_arr.length} {grupos_arr.length === 1 ? 'vehículo' : 'vehículos'} financiados
            {totalCreditos !== grupos_arr.length && (
              <span className="text-oriental-gray/60"> · {totalCreditos} créditos</span>
            )}
          </p>
        </div>
        <Link href="/creditos/nuevo" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Nuevo crédito
        </Link>
      </div>

      {/* Filtro estado (server-side) */}
      <div className="flex gap-2 mb-5">
        {[
          { value: '', label: 'Todos' },
          { value: 'activo', label: 'Activos' },
          { value: 'mora', label: 'En mora' },
          { value: 'pagado', label: 'Pagados' },
        ].map(f => (
          <Link
            key={f.value}
            href={f.value ? `/creditos?estado=${f.value}` : '/creditos'}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              params.estado === f.value || (!params.estado && !f.value)
                ? 'bg-oriental-black text-white border-oriental-black'
                : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <CreditosClient grupos={grupos_arr} cuotasObj={cuotasObj} />
    </div>
  )
}
