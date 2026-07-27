import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import { redirect } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { CheckCircle2, Clock, Send, Inbox, ArrowRight, Wallet, DollarSign } from 'lucide-react'
import { NOMBRES_CUSTODIOS_FIJOS } from '@/lib/custodios'

const CANAL_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  personal_jose: 'Cta. José',
  personal_carla: 'Cta. Carla',
  personal_mary: 'Cta. Mary',
  personal_leysdem: 'Cta. Leysdem',
  zelle: 'Zelle',
  usdt: 'USDT',
  otro: 'Otro',
}

const ROL_LABELS: Record<string, string> = {
  jose: 'José Rojas',
  carla: 'Carla',
  mary: 'Mary',
  leysdem: 'Leysdem',
}

const ROL_CARLA_VISIBLE = ['jose', 'admin', 'director', 'carla', 'mary', 'leysdem']

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
  const rol = (user?.app_metadata?.rol as string) ?? 'editor'

  if (!ROL_CARLA_VISIBLE.includes(rol)) redirect('/dashboard')

  // Todo lo que José ha enviado a Carla (cualquier estado del flujo Carla)
  const deJose = await fetchAllRows<any>((from, to) => supabase
    .from('ingresos')
    .select('*, clientes(nombre, cedula_rif)')
    .in('estado', ['enviado_carla', 'enviado_deposito', 'depositado', 'entregado_carla', 'reportado_vehimotors'])
    .order('fecha_registro', { ascending: false })
    .range(from, to))

  // Efectivo en poder de cada custodio (canales con billete/cuenta personal)
  const CANALES_CUSTODIA = ['efectivo', 'personal_jose', 'personal_carla', 'personal_mary', 'personal_leysdem', 'zelle', 'usdt', 'otro']
  const enCustodia = await fetchAllRows<any>((from, to) => supabase
    .from('ingresos')
    .select('id, numero_recibo, monto, moneda, tasa_cambio, canal_destino, custodio_id, custodio_externo, fecha_pago, clientes(nombre)')
    .in('canal_destino', CANALES_CUSTODIA)
    .in('estado', ['aprobado', 'enviado_carla', 'entregado_carla'])
    .or('custodio_id.not.is.null,custodio_externo.not.is.null')
    .order('fecha_pago', { ascending: false })
    .range(from, to))

  const { data: custodiosData } = await supabase
    .from('usuarios')
    .select('id, nombre, rol')
    .in('rol', ['jose', 'carla', 'mary', 'leysdem'])

  // Todo total en piso se expresa en USD. Un pago en bolívares se convierte
  // con su tasa; NUNCA se suma el monto en Bs como si fueran dólares.
  const montoUSD = (i: any) =>
    i?.moneda === 'VES' && Number(i?.tasa_cambio) > 0
      ? Number(i.monto) / Number(i.tasa_cambio)
      : Number(i.monto)

  const custodiosMap = new Map<string, { id: string; nombre: string; rol: string; total: number; ingresos: any[] }>()
  for (const u of custodiosData ?? []) {
    custodiosMap.set(u.id, { id: u.id, nombre: u.nombre, rol: u.rol, total: 0, ingresos: [] })
  }
  // Custodios externos (nombre libre): se agrupan por nombre, sin drill-down
  const externosMap = new Map<string, { nombre: string; total: number; ingresos: any[] }>()
  for (const ing of enCustodia ?? []) {
    if (ing.custodio_id) {
      const c = custodiosMap.get(ing.custodio_id)
      if (!c) continue
      c.total += montoUSD(ing)
      c.ingresos.push(ing)
    } else if ((ing as any).custodio_externo) {
      const nombre = (ing as any).custodio_externo as string
      const e = externosMap.get(nombre) ?? { nombre, total: 0, ingresos: [] }
      e.total += montoUSD(ing)
      e.ingresos.push(ing)
      externosMap.set(nombre, e)
    }
  }
  const custodios = Array.from(custodiosMap.values()).sort((a, b) => b.total - a.total)
  const custodiosExternos = Array.from(externosMap.values()).sort((a, b) => b.total - a.total)
  const totalEfectivoConsolidado =
    custodios.reduce((s, c) => s + c.total, 0) + custodiosExternos.reduce((s, e) => s + e.total, 0)

  // Los que Rojas envió y Carla aún no confirmó
  const pendientes = (deJose ?? []).filter(i => i.estado === 'enviado_carla')

  // Ya confirmados por Carla
  const confirmados = (deJose ?? []).filter(i => i.estado === 'entregado_carla')

  const totalEnviado   = (deJose ?? []).reduce((acc, i) => acc + montoUSD(i), 0)
  const totalPendiente = pendientes.reduce((acc, i) => acc + montoUSD(i), 0)
  const totalConfirmado = confirmados.reduce((acc, i) => acc + montoUSD(i), 0)

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

      {/* Efectivo en poder de cada persona */}
      {(custodios.length > 0 || custodiosExternos.length > 0) && (
        <div className="card p-4 mb-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Wallet size={16} className="text-oriental-red" />
              <h2 className="text-sm font-bold text-oriental-black">Efectivo / cuentas personales en piso</h2>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
              <DollarSign size={12} className="text-oriental-gray" />
              <span className="text-[10px] font-bold text-oriental-gray uppercase tracking-wide">Total en piso</span>
              <span className="text-sm font-black text-oriental-black">
                {formatCurrency(totalEfectivoConsolidado)}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {custodios.map(c => {
              const canalesDelCustodio = new Map<string, number>()
              for (const ing of c.ingresos) {
                const k = ing.canal_destino as string
                canalesDelCustodio.set(k, (canalesDelCustodio.get(k) ?? 0) + montoUSD(ing))
              }
              return (
                <Link
                  key={c.id}
                  href={`/carla/${c.id}`}
                  className={`rounded-xl border p-3 block transition-all ${c.total > 0 ? 'bg-white border-gray-200 hover:border-oriental-red hover:shadow-md' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-oriental-gray uppercase tracking-wide">
                      {ROL_LABELS[c.rol] ?? c.nombre}
                    </p>
                    <span className="text-[9px] text-oriental-gray bg-gray-100 rounded px-1.5 py-0.5">
                      {c.ingresos.length}
                    </span>
                  </div>
                  <p className={`text-lg font-black mb-1 ${c.total > 0 ? 'text-oriental-black' : 'text-gray-400'}`}>
                    {formatCurrency(c.total)}
                  </p>
                  {c.total > 0 && (
                    <div className="space-y-0.5 mt-2 pt-2 border-t border-gray-100">
                      {Array.from(canalesDelCustodio.entries()).map(([canal, monto]) => (
                        <div key={canal} className="flex justify-between text-[10px]">
                          <span className="text-oriental-gray">{CANAL_LABELS[canal] ?? canal}</span>
                          <span className="font-semibold text-oriental-black">${monto.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(monto)*100)%100===0?0:2, maximumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Link>
              )
            })}

            {/* Custodios por nombre. Los custodios fijos (José, Carla, Mary, Leysdem)
                se muestran como custodios normales; el resto como externos (ámbar). */}
            {custodiosExternos.map(e => {
              const esFijo = NOMBRES_CUSTODIOS_FIJOS.has(e.nombre)
              const canalesExt = new Map<string, number>()
              for (const ing of e.ingresos) {
                const k = ing.canal_destino as string
                canalesExt.set(k, (canalesExt.get(k) ?? 0) + Number(ing.monto))
              }
              return (
                <div key={`ext-${e.nombre}`} className={`rounded-xl border p-3 ${esFijo ? 'bg-white border-gray-200' : 'bg-amber-50/50 border-amber-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className={`text-[10px] font-bold uppercase tracking-wide truncate ${esFijo ? 'text-oriental-gray' : 'text-amber-800'}`}>{e.nombre}</p>
                    <span className={`text-[9px] rounded px-1.5 py-0.5 ${esFijo ? 'text-oriental-gray bg-gray-100' : 'text-amber-700 bg-amber-100'}`}>{e.ingresos.length}</span>
                  </div>
                  <p className="text-lg font-black text-oriental-black mb-1">{formatCurrency(e.total)}</p>
                  <div className={`space-y-0.5 mt-2 pt-2 border-t ${esFijo ? 'border-gray-100' : 'border-amber-100'}`}>
                    {Array.from(canalesExt.entries()).map(([canal, monto]) => (
                      <div key={canal} className="flex justify-between text-[10px]">
                        <span className={esFijo ? 'text-oriental-gray' : 'text-amber-700'}>{CANAL_LABELS[canal] ?? canal}</span>
                        <span className="font-semibold text-oriental-black">${monto.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(monto)*100)%100===0?0:2, maximumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                  {!esFijo && <p className="text-[9px] text-amber-600 mt-2">Custodio externo (no es usuario del sistema)</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

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
