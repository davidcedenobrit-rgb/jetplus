import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { CheckCircle2, Clock, Send, Inbox, ArrowRight } from 'lucide-react'

const ROL_CARLA_VISIBLE = ['jose', 'admin', 'director', 'carla']

const estadoBadge: Record<string, { label: string; cls: string }> = {
  enviado_carla:     { label: 'Enviado por José',  cls: 'bg-purple-100 text-purple-800' },
  enviado_deposito:  { label: 'En depósito',        cls: 'bg-blue-100 text-blue-800' },
  depositado:        { label: 'Depositado',          cls: 'bg-amber-100 text-amber-800' },
  entregado_carla:   { label: 'Confirmado',          cls: 'bg-teal-100 text-teal-800' },
  reportado_vehimotors: { label: 'Vehimotors',      cls: 'bg-indigo-100 text-indigo-800' },
}

function timeAgo(fecha: string) {
  const now = new Date()
  const d = new Date(fecha)
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return formatDate(fecha)
}

export default async function CarlaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const rol = (user?.user_metadata?.rol as string) ?? 'editor'

  if (!ROL_CARLA_VISIBLE.includes(rol)) redirect('/dashboard')

  // Todo lo que José ha enviado a Carla (cualquier estado del flujo Carla)
  const { data: deJose } = await supabase
    .from('ingresos')
    .select('*, clientes(nombre, cedula_rif)')
    .in('estado', ['enviado_carla', 'enviado_deposito', 'depositado', 'entregado_carla', 'reportado_vehimotors'])
    .order('fecha_registro', { ascending: false })

  // Los que Rojas envió y Carla aún no confirmó
  const pendientes = (deJose ?? []).filter(i => i.estado === 'enviado_carla')

  // Ya confirmados por Carla
  const confirmados = (deJose ?? []).filter(i => i.estado === 'entregado_carla')

  const totalEnviado   = (deJose ?? []).reduce((acc, i) => acc + Number(i.monto), 0)
  const totalPendiente = pendientes.reduce((acc, i) => acc + Number(i.monto), 0)
  const totalConfirmado = confirmados.reduce((acc, i) => acc + Number(i.monto), 0)

  return (
    <div className="p-4 lg:p-6 h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center">
          <Inbox size={18} className="text-teal-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-oriental-black">Panel de Carla</h1>
          <p className="text-oriental-gray text-xs">Control de recibos enviados por José Rojas</p>
        </div>
      </div>

      {/* Layout dos columnas */}
      <div className="flex flex-col lg:flex-row gap-5 min-h-0">

        {/* ── PANEL IZQUIERDO: Todo lo que José envió ─────────────── */}
        <div className="lg:w-80 xl:w-96 flex-shrink-0">
          <div className="card overflow-hidden sticky top-4">
            {/* Header panel */}
            <div className="bg-oriental-black px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <Send size={14} className="text-teal-400" />
                <p className="text-xs font-bold text-white tracking-wide uppercase">Recibido de José Rojas</p>
              </div>
              <p className="text-[11px] text-gray-400">Todo lo que el director te ha enviado</p>
            </div>

            {/* Totales */}
            <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
              <div className="p-3 text-center">
                <p className="text-[10px] text-oriental-gray uppercase tracking-wider mb-0.5">Total</p>
                <p className="text-sm font-extrabold text-oriental-black">{deJose?.length ?? 0}</p>
                <p className="text-[10px] text-oriental-gray">{formatCurrency(totalEnviado)}</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-[10px] text-amber-600 uppercase tracking-wider mb-0.5">Pendiente</p>
                <p className="text-sm font-extrabold text-amber-600">{pendientes.length}</p>
                <p className="text-[10px] text-oriental-gray">{formatCurrency(totalPendiente)}</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-[10px] text-teal-600 uppercase tracking-wider mb-0.5">Confirmado</p>
                <p className="text-sm font-extrabold text-teal-600">{confirmados.length}</p>
                <p className="text-[10px] text-oriental-gray">{formatCurrency(totalConfirmado)}</p>
              </div>
            </div>

            {/* Feed */}
            <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
              {(deJose ?? []).length === 0 ? (
                <div className="p-8 text-center text-oriental-gray text-sm">
                  José no ha enviado recibos aún
                </div>
              ) : (deJose ?? []).map(ing => {
                const badge = estadoBadge[ing.estado] ?? { label: ing.estado, cls: 'bg-gray-100 text-gray-700' }
                return (
                  <Link
                    key={ing.id}
                    href={`/ingresos/${ing.id}`}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      ing.estado === 'depositado' ? 'bg-amber-500' :
                      ing.estado === 'entregado_carla' ? 'bg-teal-500' :
                      ing.estado === 'enviado_carla' ? 'bg-purple-500' : 'bg-blue-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-[10px] font-bold text-oriental-gray font-mono truncate">
                          {ing.numero_recibo}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-oriental-black truncate">
                        {(ing as any).clientes?.nombre ?? '—'}
                      </p>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[11px] font-bold text-oriental-black">
                          {formatCurrency(ing.monto, ing.moneda)}
                        </span>
                        <span className="text-[10px] text-oriental-gray">
                          {timeAgo(ing.fecha_registro ?? '')}
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── PANEL DERECHO ───────────────────────────────────────── */}
        <div className="flex-1 space-y-5 min-w-0">

          {/* Por confirmar */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <h2 className="text-sm font-bold text-oriental-black">Por confirmar recepción</h2>
              {pendientes.length > 0 && (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {pendientes.length}
                </span>
              )}
            </div>

            {pendientes.length === 0 ? (
              <div className="card p-6 text-center">
                <CheckCircle2 size={28} className="mx-auto text-teal-400 mb-2" />
                <p className="text-oriental-gray text-sm">Todo al día — no hay depósitos pendientes</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-oriental-bg border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-oriental-gray uppercase tracking-wider">Recibo</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-oriental-gray uppercase tracking-wider">Cliente</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-oriental-gray uppercase tracking-wider">Concepto</th>
                      <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-oriental-gray uppercase tracking-wider">Monto</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-oriental-gray uppercase tracking-wider">Fecha</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pendientes.map(ing => (
                      <tr key={ing.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-oriental-gray">{ing.numero_recibo}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-oriental-black text-xs">{(ing as any).clientes?.nombre}</p>
                          <p className="text-[11px] text-oriental-gray">{(ing as any).clientes?.cedula_rif}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-oriental-gray">{ing.concepto}</td>
                        <td className="px-4 py-3 text-right font-bold text-oriental-black text-sm">
                          {formatCurrency(ing.monto, ing.moneda)}
                        </td>
                        <td className="px-4 py-3 text-xs text-oriental-gray">
                          {ing.deposito_at ? formatDate(ing.deposito_at) : formatDate(ing.fecha_registro ?? '')}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/ingresos/${ing.id}`}
                            className="flex items-center gap-1 text-teal-600 hover:text-teal-700 font-semibold text-xs"
                          >
                            Confirmar <ArrowRight size={11} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-amber-50 border-t border-amber-100">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-amber-700">Total pendiente</td>
                      <td className="px-4 py-2 text-right font-extrabold text-amber-700">{formatCurrency(totalPendiente)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Confirmados */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-teal-500" />
              <h2 className="text-sm font-bold text-oriental-black">Confirmados por mí</h2>
              {confirmados.length > 0 && (
                <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {confirmados.length}
                </span>
              )}
            </div>

            {confirmados.length === 0 ? (
              <div className="card p-6 text-center">
                <p className="text-oriental-gray text-sm">Aún no has confirmado ningún recibo</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-oriental-bg border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-oriental-gray uppercase tracking-wider">Recibo</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-oriental-gray uppercase tracking-wider">Cliente</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-oriental-gray uppercase tracking-wider">Concepto</th>
                      <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-oriental-gray uppercase tracking-wider">Monto</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-oriental-gray uppercase tracking-wider">Confirmado</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {confirmados.map(ing => (
                      <tr key={ing.id} className="hover:bg-teal-50/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-oriental-gray">{ing.numero_recibo}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-oriental-black text-xs">{(ing as any).clientes?.nombre}</p>
                          <p className="text-[11px] text-oriental-gray">{(ing as any).clientes?.cedula_rif}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-oriental-gray">{ing.concepto}</td>
                        <td className="px-4 py-3 text-right font-bold text-oriental-black text-sm">
                          {formatCurrency(ing.monto, ing.moneda)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <CheckCircle2 size={12} className="text-teal-500" />
                            <span className="text-teal-700 text-xs font-medium">
                              {(ing as any).entregado_carla_at ? formatDate((ing as any).entregado_carla_at) : '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/ingresos/${ing.id}`} className="text-oriental-red text-xs font-medium hover:underline">
                            Ver
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-teal-50 border-t border-teal-100">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-teal-700">Total confirmado</td>
                      <td className="px-4 py-2 text-right font-extrabold text-teal-700">{formatCurrency(totalConfirmado)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
