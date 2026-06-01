import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Package, Plus, CheckCircle2, Clock, AlertCircle, Truck } from 'lucide-react'

const ESTADOS: Record<string, { label: string; color: string; bg: string; step: number }> = {
  solicitado:           { label: 'Solicitado',         color: 'text-blue-700',   bg: 'bg-blue-100',   step: 1 },
  verificado:           { label: 'Verificado',         color: 'text-purple-700', bg: 'bg-purple-100', step: 2 },
  cotizacion_enviada:   { label: 'Cotización enviada', color: 'text-yellow-700', bg: 'bg-yellow-100', step: 3 },
  cotizacion_recibida:  { label: 'Cotización recibida',color: 'text-orange-700', bg: 'bg-orange-100', step: 4 },
  pago_enviado:         { label: 'Pago enviado',       color: 'text-indigo-700', bg: 'bg-indigo-100', step: 5 },
  guia_recibida:        { label: 'Guía recibida',      color: 'text-teal-700',   bg: 'bg-teal-100',   step: 6 },
  completado:           { label: 'Completado',         color: 'text-green-700',  bg: 'bg-green-100',  step: 7 },
  cancelado:            { label: 'Cancelado',          color: 'text-gray-500',   bg: 'bg-gray-100',   step: 0 },
}

function ProgressBar({ estado }: { estado: string }) {
  const step = ESTADOS[estado]?.step ?? 0
  const pct = Math.round(((step - 1) / 6) * 100)
  return (
    <div className="mt-3">
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${estado === 'completado' ? 'bg-green-500' : estado === 'cancelado' ? 'bg-gray-300' : 'bg-oriental-red'}`}
          style={{ width: `${Math.max(pct, 3)}%`, transition: 'width 0.3s' }} />
      </div>
      <p className="text-[10px] text-oriental-gray mt-0.5">{pct}% completado</p>
    </div>
  )
}

export default async function RepuestosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: solicitudes } = await supabase
    .from('solicitudes_repuestos')
    .select('*, repuestos_items(id)')
    .order('created_at', { ascending: false })

  const lista = solicitudes ?? []
  const activas   = lista.filter(s => !['completado', 'cancelado'].includes(s.estado))
  const completas = lista.filter(s => s.estado === 'completado')

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center">
            <Package size={20} className="text-oriental-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Repuestos</h1>
            <p className="text-oriental-gray text-sm">Solicitudes a Vehimotors · {activas.length} activa{activas.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Link href="/repuestos/nuevo" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nueva solicitud
        </Link>
      </div>

      {lista.length === 0 ? (
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activas.map(s => {
                  const est = ESTADOS[s.estado]
                  const itemCount = (s.repuestos_items ?? []).length
                  return (
                    <Link key={s.id} href={`/repuestos/${s.id}`} className="card p-5 hover:shadow-md transition-shadow block">
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-oriental-gray bg-gray-100 px-2 py-0.5 rounded">{s.numero}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${est?.bg} ${est?.color}`}>{est?.label}</span>
                      </div>
                      <p className="text-sm font-semibold text-oriental-black mt-2">{itemCount} repuesto{itemCount !== 1 ? 's' : ''}</p>
                      <p className="text-xs text-oriental-gray mt-0.5">
                        {new Date(s.created_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      {s.respuesta_vehimotors && (
                        <div className={`mt-2 text-[11px] font-semibold px-2 py-1 rounded-lg w-fit
                          ${s.respuesta_vehimotors === 'hay_todo' ? 'bg-green-50 text-green-700' :
                            s.respuesta_vehimotors === 'no_hay' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
                          {s.respuesta_vehimotors === 'hay_todo' ? '✅ Hay todo' : s.respuesta_vehimotors === 'no_hay' ? '❌ Sin stock' : '⚠️ Parcial'}
                        </div>
                      )}
                      <ProgressBar estado={s.estado} />
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {completas.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-600" /> Completadas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {completas.map(s => {
                  const itemCount = (s.repuestos_items ?? []).length
                  return (
                    <Link key={s.id} href={`/repuestos/${s.id}`} className="card p-5 hover:shadow-md transition-shadow block opacity-70">
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-oriental-gray bg-gray-100 px-2 py-0.5 rounded">{s.numero}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Completado</span>
                      </div>
                      <p className="text-sm font-semibold text-oriental-black mt-2">{itemCount} repuesto{itemCount !== 1 ? 's' : ''}</p>
                      <p className="text-xs text-oriental-gray mt-0.5">
                        {new Date(s.created_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
