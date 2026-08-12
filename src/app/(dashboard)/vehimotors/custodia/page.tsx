import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Coins, ArrowLeft, AlertTriangle, CheckCircle2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

const ROL_PERMITIDO = ['jose', 'admin', 'director', 'mary', 'leysdem']

// Un ingreso en custodia se considera "entregado/reportado a Vehimotors" cuando
// ya se reportó (estado reportado_vehimotors) o VM confirmó su recepción.
function entregado(i: { estado: string; confirmado_vehimotors_at: string | null }): boolean {
  return i.estado === 'reportado_vehimotors' || !!i.confirmado_vehimotors_at
}

function fmt(n: number, moneda: string): string {
  const s = n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return moneda === 'VES' ? `Bs. ${s}` : `${moneda} ${s}`
}

export default async function CustodiaVehimotorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROL_PERMITIDO.includes(rol)) redirect('/dashboard')

  // Ingresos marcados como custodia de Vehimotors (dinero que NO es de Jetplus)
  const fondos = await fetchAllRows<any>((from, to) => supabase
    .from('ingresos')
    .select('id, numero_recibo, concepto, monto, moneda, fecha_pago, estado, titular_fondos, confirmado_vehimotors_at, clientes(nombre, cedula_rif)')
    .eq('titular_fondos', 'vehimotors')
    .neq('estado', 'anulado')
    .neq('estado', 'rechazado')
    .order('fecha_pago', { ascending: false })
    .range(from, to))

  const lista = fondos ?? []

  // Saldo por moneda: total en custodia, ya entregado, y pendiente por entregar
  const porMoneda: Record<string, { total: number; entregado: number; pendiente: number }> = {}
  for (const i of lista) {
    const mon = i.moneda ?? 'USD'
    porMoneda[mon] ??= { total: 0, entregado: 0, pendiente: 0 }
    const m = Number(i.monto)
    porMoneda[mon].total += m
    if (entregado(i)) porMoneda[mon].entregado += m
    else porMoneda[mon].pendiente += m
  }
  const monedas = Object.keys(porMoneda).sort()
  const pendientes = lista.filter(i => !entregado(i))

  return (
    <div className="p-4 lg:p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"><ArrowLeft size={18} className="text-oriental-gray" /></Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center"><Coins size={20} className="text-amber-700" /></div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Fondos en custodia — Vehimotors</h1>
            <p className="text-oriental-gray text-sm">Dinero que Jetplus cobró y debe entregar a Vehimotors (no es ingreso propio)</p>
          </div>
        </div>
      </div>

      {/* Aviso explicativo */}
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          Aquí solo aparecen los ingresos marcados como <b>&quot;Vehimotors (custodia)&quot;</b> al registrarlos. Es dinero de terceros: <b>no</b> cuenta como ingreso propio de Jetplus.
        </p>
      </div>

      {/* Saldos por moneda */}
      {monedas.length === 0 ? (
        <div className="card p-12 text-center">
          <Coins size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-oriental-gray font-medium">No hay fondos en custodia registrados</p>
          <p className="text-sm text-gray-400 mt-1">Al registrar un ingreso, márcalo como &quot;Vehimotors (custodia)&quot; para que aparezca aquí.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {monedas.map(mon => {
              const r = porMoneda[mon]
              return (
                <div key={mon} className="card p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-oriental-black">Total cobrado por VM</p>
                    <span className="text-[10px] font-bold text-oriental-gray bg-gray-100 px-1.5 py-0.5 rounded">{mon}</span>
                  </div>
                  <p className="text-xl font-black text-oriental-black mb-3">{fmt(r.total, mon)}</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-green-700 font-semibold">✅ Ya entregado / reportado</span><span className="font-bold text-oriental-black">{fmt(r.entregado, mon)}</span></div>
                    <div className="flex justify-between border-t border-gray-100 pt-1.5">
                      <span className="text-amber-700 font-bold">⚠ Por entregar</span>
                      <span className="font-black text-amber-800">{fmt(r.pendiente, mon)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pendientes por entregar */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 bg-oriental-bg border-b border-gray-200 flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-oriental-black">Por entregar a Vehimotors ({pendientes.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Recibo</th>
                    <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Cliente</th>
                    <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Concepto</th>
                    <th className="text-right px-4 py-2 font-medium text-oriental-gray text-xs">Monto</th>
                    <th className="text-left px-4 py-2 font-medium text-oriental-gray text-xs">Fecha</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pendientes.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-oriental-gray"><CheckCircle2 size={22} className="text-green-500 mx-auto mb-1" />Todo entregado. No hay fondos pendientes.</td></tr>
                  ) : pendientes.map(i => (
                    <tr key={i.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono text-[11px] text-oriental-gray">{i.numero_recibo}</td>
                      <td className="px-4 py-2.5 font-semibold text-oriental-black">{i.clientes?.nombre ?? '—'}</td>
                      <td className="px-4 py-2.5 text-gray-700">{i.concepto}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-oriental-black whitespace-nowrap">{fmt(Number(i.monto), i.moneda)}</td>
                      <td className="px-4 py-2.5 text-oriental-gray text-xs">{formatDate(i.fecha_pago)}</td>
                      <td className="px-4 py-2.5"><Link href={`/ingresos/${i.id}`} className="text-oriental-red hover:underline text-xs font-medium">Ver</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <p className="text-[11px] text-oriental-gray mt-4">
        &quot;Por entregar&quot; = fondos en custodia que aún no se han reportado a Vehimotors. Un ingreso se considera entregado cuando su estado es
        &quot;Reportado a Vehimotors&quot; o VM confirmó su recepción. Excluye anulados y rechazados.
      </p>
    </div>
  )
}
