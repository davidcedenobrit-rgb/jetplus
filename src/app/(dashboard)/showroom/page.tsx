import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Store, Plus } from 'lucide-react'
import ExportButtons from './ExportButtons'
import ShowroomClient from './ShowroomClient'
import type { VehiculoShowroom } from '@/types/database'

const TABS = [
  { key: 'todos',       label: 'Todos' },
  { key: 'en_agencia',  label: 'Disponibles' },
  { key: 'reservado',   label: 'Reservados' },
  { key: 'en_taller',   label: 'En taller' },
  { key: 'vendido',     label: 'Vendidos' },
  { key: 'transferido', label: 'Transferidos' },
] as const

export default async function ShowroomPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rol = user.app_metadata?.rol as string
  const puedeEditar = ['jose', 'arianna', 'admin', 'director'].includes(rol)
  const params = await searchParams
  const tab = params.tab ?? 'todos'

  let query = supabase
    .from('vehiculos_showroom')
    .select('*')
    .order('created_at', { ascending: false })

  if (tab === 'transferido') {
    // Transferidos a otro concesionario (aunque su estado interno sea "vendido")
    query = query.not('transferido_a', 'is', null)
  } else if (tab === 'vendido') {
    // Vendidos "de verdad" — se excluyen los transferidos
    query = query.eq('estado', 'vendido').is('transferido_a', null)
  } else if (tab !== 'todos') {
    query = query.eq('estado', tab)
  }

  const { data: vehiculos } = await query
  const lista = (vehiculos ?? []) as VehiculoShowroom[]

  const { data: todos } = await supabase.from('vehiculos_showroom').select('estado, transferido_a')
  const conteos: Record<string, number> = {}
  let transferidoCount = 0
  ;(todos ?? []).forEach((v: any) => {
    if (v.transferido_a) { transferidoCount += 1; return }
    conteos[v.estado] = (conteos[v.estado] ?? 0) + 1
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center">
            <Store size={20} className="text-oriental-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Vehículo Showroom</h1>
            <p className="text-oriental-gray text-sm">Consignaciones de Vehimotors · {todos?.length ?? 0} vehículo{(todos?.length ?? 0) !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons filas={lista as any} tab={tab} />
          <Link href="/showroom/nuevo" className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            Registrar vehículo
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map(t => {
          const count = t.key === 'todos' ? (todos?.length ?? 0)
            : t.key === 'transferido' ? transferidoCount
            : (conteos[t.key] ?? 0)
          return (
            <Link
              key={t.key}
              href={`/showroom?tab=${t.key}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                tab === t.key
                  ? 'bg-white text-oriental-black shadow-sm'
                  : 'text-oriental-gray hover:text-oriental-black'
              }`}
            >
              {t.label}
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-oriental-red text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {count}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {lista.length === 0 ? (
        <div className="card p-16 text-center">
          <Store size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-oriental-gray font-medium">No hay vehículos en esta categoría</p>
          <p className="text-sm text-gray-400 mt-1">Registra el primer vehículo de consignación</p>
        </div>
      ) : (
        <ShowroomClient lista={lista} puedeEditar={puedeEditar} />
      )}
    </div>
  )
}
