import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Clock, Package } from 'lucide-react'

const ROL_CARLA_VISIBLE = ['jose', 'admin', 'director', 'carla']

export default async function CarlaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const rol = (user?.user_metadata?.rol as string) ?? 'editor'

  // Solo roles permitidos pueden ver esta página
  if (!ROL_CARLA_VISIBLE.includes(rol)) redirect('/dashboard')

  // Ingresos enviados por Rojas a Carla y aún no confirmados
  const { data: pendientes } = await supabase
    .from('ingresos')
    .select('*, clientes(nombre, cedula_rif)')
    .eq('estado', 'enviado_carla')
    .order('enviado_carla_at', { ascending: true })

  // Ingresos ya entregados a Carla
  const { data: entregados } = await supabase
    .from('ingresos')
    .select('*, clientes(nombre, cedula_rif)')
    .eq('estado', 'entregado_carla')
    .order('entregado_carla_at', { ascending: false })
    .limit(50)

  const totalPendiente = pendientes?.reduce((acc, i) => acc + Number(i.monto), 0) ?? 0
  const totalEntregado = entregados?.reduce((acc, i) => acc + Number(i.monto), 0) ?? 0

  return (
    <div className="p-4 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Registro de Carla</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Control de depósitos entregados y pendientes</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock size={18} className="text-amber-600" />
            </div>
            <p className="text-sm font-medium text-oriental-gray">Enviados por Rojas</p>
          </div>
          <p className="text-2xl font-extrabold text-oriental-black">{pendientes?.length ?? 0}</p>
          <p className="text-xs text-oriental-gray mt-1">{formatCurrency(totalPendiente)} total</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 size={18} className="text-teal-600" />
            </div>
            <p className="text-sm font-medium text-oriental-gray">Entregados a Carla</p>
          </div>
          <p className="text-2xl font-extrabold text-oriental-black">{entregados?.length ?? 0}</p>
          <p className="text-xs text-oriental-gray mt-1">{formatCurrency(totalEntregado)} total</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-oriental-red/10 rounded-lg flex items-center justify-center">
              <Package size={18} className="text-oriental-red" />
            </div>
            <p className="text-sm font-medium text-oriental-gray">Monto por confirmar</p>
          </div>
          <p className="text-2xl font-extrabold text-oriental-black">{formatCurrency(totalPendiente)}</p>
          <p className="text-xs text-oriental-gray mt-1">en {pendientes?.length ?? 0} recibos</p>
        </div>
      </div>

      {/* Pendientes de entrega */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <h2 className="text-base font-bold text-oriental-black">Por confirmar recepción</h2>
          {(pendientes?.length ?? 0) > 0 && (
            <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full">
              {pendientes!.length}
            </span>
          )}
        </div>

        {(!pendientes || pendientes.length === 0) ? (
          <div className="card p-8 text-center">
            <CheckCircle2 size={32} className="mx-auto text-teal-400 mb-3" />
            <p className="text-oriental-gray text-sm">No hay recibos pendientes de confirmación</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-oriental-bg border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Recibo</th>
                  <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Placa</th>
                  <th className="text-right px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Monto</th>
                  <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Enviado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pendientes.map(ingreso => (
                  <tr key={ingreso.id} className="hover:bg-amber-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-oriental-gray">{ingreso.numero_recibo}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-oriental-black">{(ingreso as any).clientes?.nombre}</p>
                      <p className="text-xs text-oriental-gray">{(ingreso as any).clientes?.cedula_rif}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{ingreso.placa ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-oriental-black">
                      {formatCurrency(ingreso.monto, ingreso.moneda)}
                    </td>
                    <td className="px-4 py-3 text-oriental-gray text-xs">
                      {(ingreso as any).enviado_carla_at ? formatDate((ingreso as any).enviado_carla_at) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/ingresos/${ingreso.id}`} className="text-oriental-red hover:text-oriental-red-dark font-medium text-xs">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ya entregados */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
          <h2 className="text-base font-bold text-oriental-black">Entregados a Carla</h2>
          {(entregados?.length ?? 0) > 0 && (
            <span className="bg-teal-100 text-teal-800 text-xs font-semibold px-2 py-0.5 rounded-full">
              {entregados!.length}
            </span>
          )}
        </div>

        {(!entregados || entregados.length === 0) ? (
          <div className="card p-8 text-center">
            <p className="text-oriental-gray text-sm">Aún no hay entregas registradas</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-oriental-bg border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Recibo</th>
                  <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Placa</th>
                  <th className="text-right px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Monto</th>
                  <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Fecha entrega</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entregados.map(ingreso => (
                  <tr key={ingreso.id} className="hover:bg-teal-50/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-oriental-gray">{ingreso.numero_recibo}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-oriental-black">{(ingreso as any).clientes?.nombre}</p>
                      <p className="text-xs text-oriental-gray">{(ingreso as any).clientes?.cedula_rif}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{ingreso.placa ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-oriental-black">
                      {formatCurrency(ingreso.monto, ingreso.moneda)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-teal-500 flex-shrink-0" />
                        <span className="text-teal-700 text-xs font-medium">
                          {(ingreso as any).entregado_carla_at ? formatDate((ingreso as any).entregado_carla_at) : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/ingresos/${ingreso.id}`} className="text-oriental-red hover:text-oriental-red-dark font-medium text-xs">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-oriental-bg border-t border-gray-200">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-oriental-gray uppercase tracking-wider">Total entregado</td>
                  <td className="px-4 py-3 text-right font-extrabold text-oriental-black">{formatCurrency(totalEntregado)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
