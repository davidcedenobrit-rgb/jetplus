import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Package, Plus, CheckCircle2, Clock } from 'lucide-react'
import RepuestosCardDeleteBtn from './RepuestosCardDeleteBtn'
import RepuestosActivasGrid from './RepuestosActivasGrid'
import CatalogoRepuestos from './CatalogoRepuestos'

const ROL_ADMIN = ['jose', 'arianna', 'director', 'admin', 'mary', 'leysdem', 'almacen']
const COMPLETAS_LIMIT = 10

const ESTADOS: Record<string, { label: string; color: string; bg: string; step: number }> = {
  solicitado:           { label: 'Solicitado',         color: 'text-blue-700',   bg: 'bg-blue-100',   step: 1 },
  verificado:           { label: 'Verificado',         color: 'text-purple-700', bg: 'bg-purple-100', step: 2 },
  cotizacion_enviada:   { label: 'Cotización enviada', color: 'text-yellow-700', bg: 'bg-yellow-100', step: 3 },
  cotizacion_recibida:  { label: 'Cotización recibida',color: 'text-orange-700', bg: 'bg-orange-100', step: 4 },
  pago_enviado:         { label: 'Pago enviado',       color: 'text-indigo-700', bg: 'bg-indigo-100', step: 5 },
  guia_recibida:        { label: 'Guía recibida',      color: 'text-teal-700',   bg: 'bg-teal-100',   step: 6 },
  completado:           { label: 'Completado',         color: 'text-green-700',  bg: 'bg-green-100',  step: 7 },
  cancelado:            { label: 'Cancelado',          color: 'text-gray-500',   bg: 'bg-gray-100',   step: 0 },
  sin_stock:            { label: 'Sin stock',          color: 'text-red-700',    bg: 'bg-red-100',    step: 0 },
}

function ProgressBar({ estado }: { estado: string }) {
  const step = ESTADOS[estado]?.step ?? 0
  const pct = Math.round(((step - 1) / 6) * 100)
  return (
    <div className="mt-3">
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${estado === 'completado' ? 'bg-green-500' : (estado === 'cancelado' || estado === 'sin_stock') ? 'bg-gray-300' : 'bg-oriental-red'}`}
          style={{ width: `${Math.max(pct, 3)}%`, transition: 'width 0.3s' }} />
      </div>
      <p className="text-[10px] text-oriental-gray mt-0.5">{pct}% completado</p>
    </div>
  )
}

export default async function RepuestosPage({
  searchParams,
}: {
  searchParams: Promise<{ todas?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rol = (user.app_metadata?.rol as string) ?? ''
  const puedeEliminar = ROL_ADMIN.includes(rol)
  const isAdmin = ROL_ADMIN.includes(rol)

  const { todas } = await searchParams
  const mostrarTodas = todas === '1'

  // Activas: sin límite (suelen ser pocas)
  const { data: activasData } = await supabase
    .from('solicitudes_repuestos')
    .select('*, repuestos_items(id), clientes(id, nombre)')
    .not('estado', 'in', '(completado,cancelado)')
    .order('created_at', { ascending: false })

  // Completadas: paginadas
  const completadasQuery = supabase
    .from('solicitudes_repuestos')
    .select('*, repuestos_items(id), clientes(id, nombre)', { count: 'exact' })
    .eq('estado', 'completado')
    .order('created_at', { ascending: false })

  if (!mostrarTodas) {
    completadasQuery.limit(COMPLETAS_LIMIT)
  }

  const { data: completasData, count: totalCompletas } = await completadasQuery

  const activas  = activasData ?? []
  const completas = completasData ?? []
  const hayMasCompletas = !mostrarTodas && (totalCompletas ?? 0) > COMPLETAS_LIMIT
  const totalActivas = activas.length

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center">
            <Package size={20} className="text-oriental-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Repuestos</h1>
            <p className="text-oriental-gray text-sm">Solicitudes a Vehimotors · {totalActivas} activa{totalActivas !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Link href="/repuestos/nuevo" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nueva solicitud
        </Link>
      </div>

      {activas.length === 0 && completas.length === 0 ? (
        <div className="card p-16 text-center">
          <Package size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-oriental-gray font-medium">No hay solicitudes de repuestos</p>
          <p className="text-sm text-gray-400 mt-1">Crea la primera solicitud para enviar a Vehimotors</p>
        </div>
      ) : (
        <div className="space-y-8">
          {activas.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock size={14} className="text-oriental-red" /> En proceso
              </h2>
              <RepuestosActivasGrid solicitudes={activas as any} puedeEliminar={puedeEliminar} />
            </div>
          )}

          {completas.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-600" /> Completadas
                {totalCompletas != null && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 ml-1">{totalCompletas}</span>
                )}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {completas.map(s => {
                  const itemCount = (s.repuestos_items ?? []).length
                  return (
                    <div key={s.id} className="relative card hover:shadow-md transition-shadow opacity-70">
                      {puedeEliminar && <RepuestosCardDeleteBtn solicitudId={s.id} numero={s.numero} />}
                      <Link href={`/repuestos/${s.id}`} className="block p-5">
                        <div className="flex items-start justify-between mb-2 pr-6">
                          <span className="font-mono text-xs font-bold text-oriental-gray bg-gray-100 px-2 py-0.5 rounded">{s.numero}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Completado</span>
                        </div>
                        <p className="text-sm font-semibold text-oriental-black mt-2">{itemCount} repuesto{itemCount !== 1 ? 's' : ''}</p>
                        <p className="text-xs text-oriental-gray mt-0.5">
                          {new Date(s.created_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </Link>
                    </div>
                  )
                })}
              </div>

              {/* Paginación completadas */}
              {hayMasCompletas && (
                <div className="mt-4 text-center">
                  <Link
                    href="/repuestos?todas=1"
                    className="text-sm text-oriental-red font-semibold hover:underline">
                    Ver todas las completadas ({totalCompletas})
                  </Link>
                </div>
              )}
              {mostrarTodas && (totalCompletas ?? 0) > COMPLETAS_LIMIT && (
                <div className="mt-4 text-center">
                  <Link
                    href="/repuestos"
                    className="text-sm text-oriental-gray font-semibold hover:underline">
                    Ver menos
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <CatalogoRepuestos isAdmin={isAdmin} />
    </div>
  )
}
