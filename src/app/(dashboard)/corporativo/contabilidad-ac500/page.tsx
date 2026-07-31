import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import { BookOpenCheck, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'

const DIR = ['jose', 'admin', 'director', 'mary', 'leysdem']
const fmt = (n: number) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtFecha = (s: string) => { try { return new Date(s).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return s } }

// Contabilidad AC500: ingreso bruto por comisión de venta de precompra (4%/5%).
export default async function ContabilidadAC500Page() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!DIR.includes(rol)) redirect('/dashboard')

  const supabase = await createAdminClient()
  const rows = await fetchAllRows<any>((from, to) => supabase
    .from('contabilidad_ingresos')
    .select('id, concepto, monto, moneda, porcentaje, base_calculo, cliente_nombre, vehiculo, created_at')
    .eq('origen', 'ac500_porcentaje')
    .order('created_at', { ascending: false })
    .range(from, to))

  const ingresos = rows ?? []
  const totalBruto = ingresos.reduce((s: number, i: any) => s + Number(i.monto || 0), 0)

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center">
          <BookOpenCheck size={20} className="text-oriental-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Contabilidad — Comisiones AC500</h1>
          <p className="text-oriental-gray text-sm">Ingreso bruto por comisión de venta de precompra (4% / 5%)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="rounded-2xl bg-gradient-to-br from-oriental-black to-gray-800 text-white p-5">
          <p className="text-xs uppercase tracking-widest text-gray-400 font-bold flex items-center gap-2"><TrendingUp size={14} /> Ingreso bruto por comisión</p>
          <p className="text-3xl font-bold mt-1">${fmt(totalBruto)}</p>
          <p className="text-[11px] text-gray-400 mt-1">{ingresos.length} venta{ingresos.length === 1 ? '' : 's'} · antes de comisión del vendedor</p>
        </div>
        <div className="rounded-2xl border border-dashed border-gray-300 p-5 flex flex-col justify-center">
          <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">Ingreso neto de venta</p>
          <p className="text-lg font-semibold text-gray-400 mt-1">Pendiente</p>
          <p className="text-[11px] text-gray-400 mt-1">Se calcula al restar la comisión del vendedor (por definir).</p>
        </div>
      </div>

      {ingresos.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-10">Aún no hay comisiones registradas. Se generan al registrar el pago de la cuota 1 en cada proforma.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left font-bold px-3 py-2">Fecha</th>
                <th className="text-left font-bold px-3 py-2">Cliente</th>
                <th className="text-left font-bold px-3 py-2">Vehículo</th>
                <th className="text-right font-bold px-3 py-2">Base (c1-c5)</th>
                <th className="text-center font-bold px-3 py-2">%</th>
                <th className="text-right font-bold px-3 py-2">Comisión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ingresos.map((i: any) => (
                <tr key={i.id}>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmtFecha(i.created_at)}</td>
                  <td className="px-3 py-2 font-semibold text-oriental-black">{i.cliente_nombre || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{i.vehiculo || '—'}</td>
                  <td className="px-3 py-2 text-right text-gray-600">${fmt(Number(i.base_calculo || 0))}</td>
                  <td className="px-3 py-2 text-center text-gray-600">{i.porcentaje ?? '—'}%</td>
                  <td className="px-3 py-2 text-right font-bold text-green-700">${fmt(Number(i.monto || 0))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-bold">
              <tr>
                <td className="px-3 py-2" colSpan={5}>Total ingreso bruto</td>
                <td className="px-3 py-2 text-right text-green-700">${fmt(totalBruto)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
