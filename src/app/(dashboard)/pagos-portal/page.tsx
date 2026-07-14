import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Inbox, CheckCircle2, XCircle, ExternalLink, User, Car, Calendar, DollarSign, ArrowRight } from 'lucide-react'

const ROL_PERMITIDO = ['jose', 'admin', 'director', 'mary', 'leysdem']

export default async function PagosPortalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const rol = (user?.app_metadata?.rol as string) ?? 'editor'
  if (!ROL_PERMITIDO.includes(rol)) redirect('/dashboard')

  const pendientes = await fetchAllRows<any>((from, to) => supabase
    .from('ingresos')
    .select(`
      id, numero_recibo, concepto, monto, moneda, metodo_pago,
      referencia, banco_emisor, fecha_pago, fecha_registro, tasa_cambio,
      comprobante_url, observaciones, placa,
      clientes(nombre, cedula_rif, telefono, whatsapp),
      vehiculos(marca, modelo, placa)
    `)
    .eq('origen', 'portal_cliente')
    .eq('estado', 'pendiente_aprobacion')
    .order('fecha_registro', { ascending: true })
    .range(from, to))

  // Últimos verificados (histórico corto)
  const { data: verificados } = await supabase
    .from('ingresos')
    .select('id, numero_recibo, estado, monto, moneda, fecha_pago, clientes(nombre)')
    .eq('origen', 'portal_cliente')
    .neq('estado', 'pendiente_aprobacion')
    .order('fecha_registro', { ascending: false })
    .limit(10)

  const totalPendientes = pendientes?.length ?? 0

  return (
    <div className="p-4 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Inbox size={20} className="text-blue-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Pagos del portal</h1>
            <p className="text-oriental-gray text-sm">
              {totalPendientes === 0
                ? 'No hay pagos pendientes de verificación'
                : `${totalPendientes} ${totalPendientes === 1 ? 'pago pendiente' : 'pagos pendientes'} de verificación`}
            </p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-xs text-blue-900">
        Estos son los pagos que <b>los clientes</b> reportaron desde su portal. Verifica el comprobante y aprueba o rechaza. Una vez verificados aparecerán con el resto de ingresos en el módulo <Link href="/ingresos" className="underline font-bold">Ingresos</Link>.
      </div>

      {/* Pendientes */}
      {totalPendientes === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle2 size={40} className="mx-auto text-green-500 mb-3" />
          <p className="text-oriental-black font-semibold">Todo al día</p>
          <p className="text-oriental-gray text-sm mt-1">No hay pagos del portal pendientes por verificar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendientes!.map((p: any) => (
            <div key={p.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                {/* Info del pago */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-oriental-red bg-red-50 px-2 py-0.5 rounded">
                      {p.numero_recibo}
                    </span>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full">
                      📱 Reportado por el cliente
                    </span>
                    <span className="text-xs text-oriental-gray">
                      hace {tiempoRelativo(p.fecha_registro)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mt-3">
                    <InfoRow icon={User} label="Cliente" value={p.clientes?.nombre ?? '—'} sub={p.clientes?.cedula_rif} />
                    <InfoRow icon={DollarSign} label="Monto" value={formatCurrency(Number(p.monto), p.moneda === 'VES' ? 'VES' : 'USD')} sub={p.metodo_pago} bold />
                    {p.vehiculos && (
                      <InfoRow icon={Car} label="Vehículo" value={`${p.vehiculos.marca} ${p.vehiculos.modelo}`} sub={p.vehiculos.placa ?? p.placa} />
                    )}
                    <InfoRow icon={Calendar} label="Fecha del pago" value={formatDate(p.fecha_pago)} />
                  </div>

                  {p.referencia && (
                    <div className="mt-3 text-xs">
                      <span className="text-oriental-gray">Referencia: </span>
                      <span className="font-mono font-semibold text-oriental-black">{p.referencia}</span>
                      {p.banco_emisor && <span className="text-oriental-gray"> · {p.banco_emisor}</span>}
                    </div>
                  )}

                  {p.observaciones && (
                    <div className="mt-3 bg-gray-50 rounded p-2 text-xs text-oriental-black italic">
                      "{p.observaciones}"
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex flex-col gap-2 lg:min-w-[180px]">
                  {p.comprobante_url && (
                    <a
                      href={p.comprobante_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 hover:border-oriental-red hover:text-oriental-red text-xs font-bold rounded-lg text-oriental-black"
                    >
                      <ExternalLink size={12} /> Ver comprobante
                    </a>
                  )}
                  <Link
                    href={`/ingresos/${p.id}`}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-oriental-red hover:bg-red-700 text-white text-xs font-bold rounded-lg"
                  >
                    Verificar <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Últimos verificados */}
      {verificados && verificados.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-bold text-oriental-gray uppercase tracking-wider mb-3">
            Últimos verificados
          </h2>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-oriental-bg border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Recibo</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Cliente</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Monto</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Fecha</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {verificados.map((v: any) => {
                    const cfg = v.estado === 'aprobado' || v.estado === 'depositado' || v.estado === 'entregado_carla' || v.estado === 'reportado_vehimotors'
                      ? { color: 'bg-green-100 text-green-800', label: 'Aprobado', icon: CheckCircle2 }
                      : v.estado === 'rechazado'
                      ? { color: 'bg-red-100 text-red-800', label: 'Rechazado', icon: XCircle }
                      : { color: 'bg-yellow-100 text-yellow-800', label: 'En proceso', icon: CheckCircle2 }
                    const Icon = cfg.icon
                    return (
                      <tr key={v.id} className="hover:bg-oriental-bg/50 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs text-oriental-gray">{v.numero_recibo}</td>
                        <td className="px-4 py-2.5 text-oriental-black">{v.clientes?.nombre ?? '—'}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-oriental-black">
                          {formatCurrency(Number(v.monto), v.moneda === 'VES' ? 'VES' : 'USD')}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-oriental-gray">{formatDate(v.fecha_pago)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
                            <Icon size={11} /> {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <Link href={`/ingresos/${v.id}`} className="text-oriental-red text-xs font-medium hover:underline">
                            Detalle
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value, sub, bold }: { icon: any; label: string; value: string; sub?: string | null; bold?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={13} className="text-oriental-gray mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-oriental-gray uppercase tracking-wide">{label}</p>
        <p className={`text-sm ${bold ? 'font-bold' : 'font-medium'} text-oriental-black truncate`}>{value}</p>
        {sub && <p className="text-[11px] text-oriental-gray truncate">{sub}</p>}
      </div>
    </div>
  )
}

function tiempoRelativo(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const min = Math.floor((now - then) / 60000)
  if (min < 1) return 'un momento'
  if (min < 60) return `${min} min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} h`
  const dias = Math.floor(hr / 24)
  return `${dias} día${dias !== 1 ? 's' : ''}`
}
