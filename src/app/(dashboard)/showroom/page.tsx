import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Store, Plus, Car, MapPin, CheckCircle2, Lock, Tag, Wrench } from 'lucide-react'
import type { VehiculoShowroom } from '@/types/database'

const ESTADOS: Record<string, { label: string; color: string; bg: string; step: number }> = {
  llegada:        { label: 'Recibido',        color: 'text-blue-700',   bg: 'bg-blue-100',   step: 1 },
  por_enviar_pdi: { label: 'Por enviar a PDI', color: 'text-yellow-700', bg: 'bg-yellow-100', step: 2 },
  en_taller:      { label: 'En taller (PDI)',  color: 'text-orange-700', bg: 'bg-orange-100', step: 3 },
  en_agencia:     { label: 'Disponible',       color: 'text-green-700',  bg: 'bg-green-100',  step: 4 },
  reservado:      { label: 'Reservado',        color: 'text-purple-700', bg: 'bg-purple-100', step: 5 },
  vendido:        { label: 'Vendido',          color: 'text-gray-600',   bg: 'bg-gray-100',   step: 6 },
}

const TABS = [
  { key: 'todos',      label: 'Todos' },
  { key: 'en_agencia', label: 'Disponibles' },
  { key: 'reservado',  label: 'Reservados' },
  { key: 'en_taller',  label: 'En taller' },
  { key: 'vendido',    label: 'Vendidos' },
] as const

function ProgressBar({ estado }: { estado: string }) {
  const step = ESTADOS[estado]?.step ?? 1
  const pct = Math.round(((step - 1) / 5) * 100)
  return (
    <div className="mt-3">
      <div className="flex justify-between text-[10px] text-oriental-gray mb-1">
        <span>Recibido</span>
        <span>Vendido</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${estado === 'vendido' ? 'bg-gray-400' : estado === 'reservado' ? 'bg-purple-500' : estado === 'en_agencia' ? 'bg-green-500' : 'bg-oriental-red'}`}
          style={{ width: `${pct === 0 ? 4 : pct}%` }}
        />
      </div>
      <p className="text-[10px] text-oriental-gray mt-0.5">{pct}% completado</p>
    </div>
  )
}

export default async function ShowroomPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rol = user.user_metadata?.rol as string
  const params = await searchParams
  const tab = params.tab ?? 'todos'

  let query = supabase
    .from('vehiculos_showroom')
    .select('*')
    .order('created_at', { ascending: false })

  if (tab !== 'todos') {
    query = query.eq('estado', tab)
  }

  const { data: vehiculos } = await query
  const lista = (vehiculos ?? []) as VehiculoShowroom[]

  // Conteos por estado
  const { data: todos } = await supabase.from('vehiculos_showroom').select('estado')
  const conteos: Record<string, number> = {}
  ;(todos ?? []).forEach((v: any) => {
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
            <p className="text-oriental-gray text-sm">Consignaciones de Vehimotors · {lista.length} vehículo{lista.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Link href="/showroom/nuevo" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Registrar vehículo
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map(t => {
          const count = t.key === 'todos' ? (todos?.length ?? 0) : (conteos[t.key] ?? 0)
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

      {/* Grid de cards */}
      {lista.length === 0 ? (
        <div className="card p-16 text-center">
          <Store size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-oriental-gray font-medium">No hay vehículos en esta categoría</p>
          <p className="text-sm text-gray-400 mt-1">Registra el primer vehículo de consignación</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {lista.map(v => {
            const est = ESTADOS[v.estado] ?? ESTADOS.llegada
            const hoy = new Date()
            const vence = v.reserva_vence ? new Date(v.reserva_vence) : null
            const reservaVencida = vence && vence < hoy

            return (
              <Link key={v.id} href={`/showroom/${v.id}`} className="card p-5 hover:shadow-md transition-shadow block">
                {/* Header card */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.marca === 'MG' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {v.marca}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${est.bg} ${est.color}`}>
                      {est.label}
                    </span>
                  </div>
                  {v.pdi_hecho && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                      <CheckCircle2 size={10} /> PDI ✓
                    </span>
                  )}
                </div>

                {/* Info principal */}
                <h3 className="font-bold text-oriental-black text-base leading-tight">{v.modelo}</h3>

                <div className="mt-2 space-y-1.5">
                  {v.placa && (
                    <p className="text-xs text-oriental-gray flex items-center gap-1.5">
                      <Car size={11} className="flex-shrink-0" />
                      <span className="font-mono font-bold text-oriental-black">{v.placa}</span>
                      {v.color && <span>· {v.color}</span>}
                      {v.anio && <span>· {v.anio}</span>}
                    </p>
                  )}
                  {/* Ubicación destacada */}
                  {v.ubicacion && (
                    <div className="inline-flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
                      <MapPin size={11} className="text-oriental-red flex-shrink-0" />
                      <span className="text-xs font-semibold text-oriental-black capitalize">
                        {v.ubicacion === 'otro' ? (v.ubicacion_descripcion ?? 'Otro') : v.ubicacion}
                      </span>
                    </div>
                  )}
                  {/* PDI */}
                  <div className="flex items-center gap-1.5">
                    <Wrench size={11} className={v.pdi_hecho ? 'text-green-600' : 'text-gray-300'} />
                    <span className={`text-[11px] font-semibold ${v.pdi_hecho ? 'text-green-700' : 'text-gray-400'}`}>
                      {v.pdi_hecho ? 'PDI completado' : 'PDI pendiente'}
                    </span>
                  </div>
                  {v.vin && (
                    <p className="text-[10px] font-mono text-oriental-gray truncate">VIN: {v.vin}</p>
                  )}
                  {v.serial_motor && (
                    <p className="text-[10px] font-mono text-oriental-gray truncate">Motor: {v.serial_motor}</p>
                  )}
                </div>

                {/* Reserva */}
                {v.estado === 'reservado' && v.reserva_monto && (
                  <div className={`mt-3 rounded-lg px-3 py-2 ${reservaVencida ? 'bg-red-50 border border-red-200' : 'bg-purple-50 border border-purple-100'}`}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-purple-700">
                        <Lock size={10} /> Reservado
                      </span>
                      <span className="text-[11px] font-bold text-purple-800">
                        ${v.reserva_monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {vence && (
                      <p className={`text-[10px] mt-0.5 ${reservaVencida ? 'text-red-600 font-semibold' : 'text-purple-600'}`}>
                        {reservaVencida ? '⚠ Reserva vencida' : `Vence: ${vence.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                      </p>
                    )}
                  </div>
                )}

                {/* Vendido */}
                {v.estado === 'vendido' && (
                  <div className="mt-3 rounded-lg px-3 py-2 bg-gray-50 border border-gray-200">
                    <p className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                      <Tag size={10} /> Vendido · ciclo cerrado
                    </p>
                  </div>
                )}

                {/* Barra de progreso */}
                <ProgressBar estado={v.estado} />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
