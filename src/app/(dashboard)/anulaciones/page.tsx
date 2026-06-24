import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Ban, CheckCircle2, XCircle, Clock } from 'lucide-react'

const ROLES_PERMITIDOS = ['jose', 'admin', 'director', 'mary', 'leysdem']

export default async function AnulacionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rol = (user.app_metadata?.rol as string) ?? 'editor'
  if (!ROLES_PERMITIDOS.includes(rol)) redirect('/dashboard')

  const { data: ingresos } = await supabase
    .from('ingresos')
    .select('*, clientes(nombre, cedula_rif)')
    .in('estado', ['pendiente_anulacion', 'anulado'])
    .order('anulacion_solicitada_at', { ascending: false })
    .limit(200)

  const pendientes = ingresos?.filter(i => i.estado === 'pendiente_anulacion') ?? []
  const anulados   = ingresos?.filter(i => i.estado === 'anulado') ?? []

  function estadoBadge(estado: string) {
    if (estado === 'pendiente_anulacion') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
          <Clock size={11} /> Pendiente
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-600">
        <Ban size={11} /> Anulado
      </span>
    )
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-oriental-black flex items-center gap-2">
          <Ban size={22} className="text-orange-600" />
          Anulaciones
        </h1>
        <p className="text-oriental-gray text-sm mt-1">
          {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''} · {anulados.length} anulado{anulados.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Pendientes de aprobación */}
      {pendientes.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold text-orange-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock size={14} /> Pendientes de aprobación de Rojas
          </h2>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-orange-50 border-b border-orange-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-orange-700 text-xs uppercase tracking-wider">Recibo</th>
                    <th className="text-left px-4 py-3 font-semibold text-orange-700 text-xs uppercase tracking-wider">Cliente</th>
                    <th className="text-left px-4 py-3 font-semibold text-orange-700 text-xs uppercase tracking-wider">Placa</th>
                    <th className="text-left px-4 py-3 font-semibold text-orange-700 text-xs uppercase tracking-wider">Concepto</th>
                    <th className="text-right px-4 py-3 font-semibold text-orange-700 text-xs uppercase tracking-wider">Monto</th>
                    <th className="text-left px-4 py-3 font-semibold text-orange-700 text-xs uppercase tracking-wider">Solicitado por</th>
                    <th className="text-left px-4 py-3 font-semibold text-orange-700 text-xs uppercase tracking-wider">Fecha solicitud</th>
                    <th className="text-left px-4 py-3 font-semibold text-orange-700 text-xs uppercase tracking-wider">Motivo</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pendientes.map(ingreso => (
                    <tr key={ingreso.id} className="hover:bg-orange-50/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-oriental-gray">{ingreso.numero_recibo}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-oriental-black">{(ingreso as any).clientes?.nombre}</p>
                        <p className="text-xs text-oriental-gray">{(ingreso as any).clientes?.cedula_rif}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{ingreso.placa ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{ingreso.concepto}</td>
                      <td className="px-4 py-3 text-right font-bold text-oriental-black">
                        {ingreso.moneda === 'VES' && ingreso.tasa_cambio
                          ? formatCurrency(Number(ingreso.monto) / Number(ingreso.tasa_cambio))
                          : formatCurrency(ingreso.monto, ingreso.moneda === 'VES' ? 'VES' : 'USD')}
                      </td>
                      <td className="px-4 py-3 text-oriental-gray text-xs">{ingreso.anulacion_solicitada_por ?? '—'}</td>
                      <td className="px-4 py-3 text-oriental-gray text-xs">
                        {ingreso.anulacion_solicitada_at
                          ? new Date(ingreso.anulacion_solicitada_at).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-orange-800">{ingreso.anulacion_motivo ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Link href={`/ingresos/${ingreso.id}`} className="text-oriental-red hover:text-oriental-red-dark font-medium text-xs">
                          Revisar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Anulados */}
      <section>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Ban size={14} /> Historial de anulaciones
        </h2>

        {anulados.length === 0 ? (
          <div className="card p-10 text-center">
            <Ban size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-oriental-gray text-sm">Sin ingresos anulados</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-oriental-bg border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Recibo</th>
                    <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Cliente</th>
                    <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Placa</th>
                    <th className="text-right px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Monto</th>
                    <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Solicitado por</th>
                    <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Motivo</th>
                    <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Observaciones</th>
                    <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Resuelto por</th>
                    <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Fecha resolución</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {anulados.map(ingreso => (
                    <tr key={ingreso.id} className="hover:bg-oriental-bg/50 transition-colors opacity-80">
                      <td className="px-4 py-3 font-mono text-xs text-oriental-gray">{ingreso.numero_recibo}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-oriental-black">{(ingreso as any).clientes?.nombre}</p>
                        <p className="text-xs text-oriental-gray">{(ingreso as any).clientes?.cedula_rif}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{ingreso.placa ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-500 line-through">
                        {ingreso.moneda === 'VES' && ingreso.tasa_cambio
                          ? formatCurrency(Number(ingreso.monto) / Number(ingreso.tasa_cambio))
                          : formatCurrency(ingreso.monto, ingreso.moneda === 'VES' ? 'VES' : 'USD')}
                      </td>
                      <td className="px-4 py-3 text-oriental-gray text-xs">{ingreso.anulacion_solicitada_por ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{ingreso.anulacion_motivo ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px] truncate" title={ingreso.anulacion_observaciones ?? ''}>
                        {ingreso.anulacion_observaciones ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-oriental-gray text-xs">{ingreso.anulacion_resuelta_por ?? '—'}</td>
                      <td className="px-4 py-3 text-oriental-gray text-xs">
                        {ingreso.anulacion_resuelta_at
                          ? new Date(ingreso.anulacion_resuelta_at).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                          : '—'}
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
          </div>
        )}
      </section>
    </div>
  )
}
