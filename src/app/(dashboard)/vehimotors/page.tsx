import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Building2, CheckCircle2, Clock, ArrowRight } from 'lucide-react'

const ROL_PERMITIDO = ['jose', 'admin', 'director', 'mary', 'leysdem', 'carla']

function timeAgo(fecha: string) {
  const now = new Date()
  const d = new Date(fecha)
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return formatDate(fecha)
}

export default async function VehimotorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROL_PERMITIDO.includes(rol)) redirect('/dashboard')

  const { data: reportados } = await supabase
    .from('ingresos')
    .select('*, clientes(nombre, cedula_rif)')
    .eq('estado', 'reportado_vehimotors')
    .order('vehimotors_at', { ascending: false })

  const confirmados = (reportados ?? []).filter(i => i.confirmado_vehimotors_at)
  const pendientes  = (reportados ?? []).filter(i => !i.confirmado_vehimotors_at)

  const totalReportado  = (reportados ?? []).reduce((acc, i) => acc + Number(i.monto), 0)
  const totalConfirmado = confirmados.reduce((acc, i) => acc + Number(i.monto), 0)
  const totalPendiente  = pendientes.reduce((acc, i) => acc + Number(i.monto), 0)

  return (
    <div className="p-4 lg:p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
          <Building2 size={20} className="text-indigo-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-oriental-black">Reportados a Vehimotors</h1>
          <p className="text-oriental-gray text-xs">Pagos enviados y confirmados por Vehimotors</p>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4 text-center">
          <p className="text-[11px] text-oriental-gray uppercase tracking-wider mb-1">Total reportado</p>
          <p className="text-2xl font-extrabold text-oriental-black">{reportados?.length ?? 0}</p>
          <p className="text-xs text-oriental-gray mt-0.5">{formatCurrency(totalReportado)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-[11px] text-amber-600 uppercase tracking-wider mb-1">En espera</p>
          <p className="text-2xl font-extrabold text-amber-600">{pendientes.length}</p>
          <p className="text-xs text-oriental-gray mt-0.5">{formatCurrency(totalPendiente)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-[11px] text-green-600 uppercase tracking-wider mb-1">Confirmados</p>
          <p className="text-2xl font-extrabold text-green-600">{confirmados.length}</p>
          <p className="text-xs text-oriental-gray mt-0.5">{formatCurrency(totalConfirmado)}</p>
        </div>
      </div>

      {/* En espera de confirmación */}
      {pendientes.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <h2 className="text-sm font-bold text-oriental-black">En espera de confirmación</h2>
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{pendientes.length}</span>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-oriental-bg border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-oriental-gray uppercase tracking-wider">Recibo</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-oriental-gray uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-oriental-gray uppercase tracking-wider">Concepto</th>
                  <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-oriental-gray uppercase tracking-wider">Monto</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-oriental-gray uppercase tracking-wider">Reportado</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pendientes.map(ing => (
                  <tr key={ing.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-oriental-gray">{ing.numero_recibo}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-oriental-black text-xs">{(ing as any).clientes?.nombre ?? '—'}</p>
                      <p className="text-[11px] text-oriental-gray">{(ing as any).clientes?.cedula_rif}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-oriental-gray">{ing.concepto}</td>
                    <td className="px-4 py-3 text-right font-bold text-oriental-black text-sm">
                      {formatCurrency(ing.monto, ing.moneda)}
                    </td>
                    <td className="px-4 py-3 text-xs text-oriental-gray">
                      <div className="flex items-center gap-1">
                        <Clock size={11} className="text-amber-400" />
                        {ing.vehimotors_at ? timeAgo(ing.vehimotors_at) : '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/ingresos/${ing.id}`}
                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-semibold text-xs"
                      >
                        Ver <ArrowRight size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-amber-50 border-t border-amber-100">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-amber-700">Total pendiente de confirmar</td>
                  <td className="px-4 py-2 text-right font-extrabold text-amber-700">{formatCurrency(totalPendiente)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Confirmados */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <h2 className="text-sm font-bold text-oriental-black">Confirmados por Vehimotors</h2>
          {confirmados.length > 0 && (
            <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{confirmados.length}</span>
          )}
        </div>

        {confirmados.length === 0 ? (
          <div className="card p-8 text-center">
            <CheckCircle2 size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-oriental-gray text-sm">Vehimotors no ha confirmado pagos aún</p>
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
                  <tr key={ing.id} className="hover:bg-green-50/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-oriental-gray">{ing.numero_recibo}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-oriental-black text-xs">{(ing as any).clientes?.nombre ?? '—'}</p>
                      <p className="text-[11px] text-oriental-gray">{(ing as any).clientes?.cedula_rif}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-oriental-gray">{ing.concepto}</td>
                    <td className="px-4 py-3 text-right font-bold text-oriental-black text-sm">
                      {formatCurrency(ing.monto, ing.moneda)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-green-500" />
                        <span className="text-green-700 text-xs font-medium">
                          {ing.confirmado_vehimotors_at ? formatDate(ing.confirmado_vehimotors_at) : '—'}
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
              <tfoot className="bg-green-50 border-t border-green-100">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-green-700">Total confirmado por Vehimotors</td>
                  <td className="px-4 py-2 text-right font-extrabold text-green-700">{formatCurrency(totalConfirmado)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {(reportados ?? []).length === 0 && (
        <div className="card p-12 text-center mt-4">
          <Building2 size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-oriental-gray text-sm font-medium">No hay reportes a Vehimotors aún</p>
          <p className="text-oriental-gray text-xs mt-1">Los pagos reportados aparecerán aquí</p>
        </div>
      )}
    </div>
  )
}
