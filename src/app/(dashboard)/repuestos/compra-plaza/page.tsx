import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShoppingBag, Package } from 'lucide-react'
import NuevaCompraPlaza from './NuevaCompraPlaza'

export const dynamic = 'force-dynamic'

const ROL_ADMIN = ['jose', 'arianna', 'director', 'admin', 'mary', 'leysdem', 'almacen']

function fmtMonto(n: number | null, moneda?: string | null) {
  if (n == null) return '—'
  const s = Number(n).toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(Number(n)) * 100) % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })
  return moneda === 'VES' ? `Bs. ${s}` : `$${s}`
}
function fmtFecha(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function CompraPlazaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''

  const compras = await fetchAllRows<any>((from, to) => supabase
    .from('solicitudes_repuestos')
    .select('id, numero, proveedor_plaza, monto_plaza, moneda_pago, fecha_compra_plaza, notas_plaza, created_at, repuestos_items(id), clientes(nombre), para_la_oriental, cliente_externo')
    .eq('estado', 'comprado_plaza')
    .order('fecha_compra_plaza', { ascending: false })
    .range(from, to))

  const totalUSD = compras
    .filter(c => (c.moneda_pago ?? 'USD') !== 'VES')
    .reduce((s, c) => s + Number(c.monto_plaza ?? 0), 0)

  return (
    <div className="p-4 lg:p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/repuestos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-oriental-black flex items-center gap-2">
            <ShoppingBag size={22} className="text-purple-600" /> Compra en plaza
          </h1>
          <p className="text-oriental-gray text-sm mt-0.5">Compras locales de repuestos (con o sin cotización de Vehimotors)</p>
        </div>
        {ROL_ADMIN.includes(rol) && <NuevaCompraPlaza />}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs text-oriental-gray uppercase tracking-wider mb-1">Compras registradas</p>
          <p className="text-2xl font-bold text-oriental-black">{compras.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-oriental-gray uppercase tracking-wider mb-1">Total (USD)</p>
          <p className="text-2xl font-bold text-oriental-black">${totalUSD.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(totalUSD) * 100) % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      {compras.length === 0 ? (
        <div className="card p-12 text-center">
          <ShoppingBag size={30} className="mx-auto text-gray-300 mb-3" />
          <p className="text-oriental-gray text-sm">Aún no hay compras en plaza registradas.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-oriental-gray text-xs">N°</th>
                  <th className="text-left px-4 py-2.5 font-medium text-oriental-gray text-xs">Proveedor</th>
                  <th className="text-left px-4 py-2.5 font-medium text-oriental-gray text-xs">Destinatario</th>
                  <th className="text-right px-4 py-2.5 font-medium text-oriental-gray text-xs">Ítems</th>
                  <th className="text-right px-4 py-2.5 font-medium text-oriental-gray text-xs">Monto</th>
                  <th className="text-left px-4 py-2.5 font-medium text-oriental-gray text-xs">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {compras.map(c => {
                  const destinatario = c.para_la_oriental ? 'La Oriental' : (c.clientes?.nombre ?? c.cliente_externo ?? '—')
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <Link href={`/repuestos/${c.id}`} className="font-mono text-xs font-bold text-oriental-red hover:underline">{c.numero}</Link>
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-oriental-black">{c.proveedor_plaza ?? '—'}</td>
                      <td className="px-4 py-2.5 text-oriental-gray text-xs">{destinatario}</td>
                      <td className="px-4 py-2.5 text-right text-oriental-gray text-xs">
                        <span className="inline-flex items-center gap-1"><Package size={11} /> {(c.repuestos_items ?? []).length}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-oriental-black whitespace-nowrap">{fmtMonto(c.monto_plaza, c.moneda_pago)}</td>
                      <td className="px-4 py-2.5 text-oriental-gray text-xs whitespace-nowrap">{fmtFecha(c.fecha_compra_plaza)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
