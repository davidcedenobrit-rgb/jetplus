import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShoppingBag, Package } from 'lucide-react'
import NuevaCompraPlaza from './NuevaCompraPlaza'

export const dynamic = 'force-dynamic'

const ROL_ADMIN = ['jose', 'arianna', 'director', 'admin', 'mary', 'leysdem', 'almacen']

function fmtNum(n: number) {
  return Number(n).toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(Number(n)) * 100) % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })
}
function fmtMonto(n: number | null, moneda?: string | null) {
  if (n == null) return '—'
  return moneda === 'VES' ? `Bs. ${fmtNum(n)}` : `$${fmtNum(n)}`
}
// Equivalente en USD: los pagos en Bs se convierten con la tasa guardada de la compra.
function equivUsd(n: number | null, moneda?: string | null, tasa?: number | null) {
  if (n == null) return 0
  if (moneda === 'VES') return tasa && tasa > 0 ? Number(n) / Number(tasa) : 0
  return Number(n)
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
    .select('id, numero, proveedor_plaza, monto_plaza, moneda_plaza, tasa_plaza, fecha_compra_plaza, notas_plaza, created_at, repuestos_items(id), clientes(nombre), para_la_oriental, cliente_externo')
    .eq('estado', 'comprado_plaza')
    .order('fecha_compra_plaza', { ascending: false })
    .range(from, to))

  // Total en dólares: las compras en Bs se convierten con su tasa guardada.
  const totalUSD = compras.reduce((s, c) => s + equivUsd(c.monto_plaza, c.moneda_plaza, c.tasa_plaza), 0)

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
                  const destinatario = c.para_la_oriental ? 'Jetplus' : (c.clientes?.nombre ?? c.cliente_externo ?? '—')
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
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <span className="font-bold text-oriental-black">{fmtMonto(c.monto_plaza, c.moneda_plaza)}</span>
                        {c.moneda_plaza === 'VES' && (
                          <span className="block text-[11px] text-oriental-gray font-normal">
                            ≈ ${fmtNum(equivUsd(c.monto_plaza, c.moneda_plaza, c.tasa_plaza))} {c.tasa_plaza ? `· tasa ${fmtNum(Number(c.tasa_plaza))}` : ''}
                          </span>
                        )}
                      </td>
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
