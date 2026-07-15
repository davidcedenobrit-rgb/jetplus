import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowLeftRight, Building2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

function fmtFecha(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function TransferenciasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (rol === 'almacen') redirect('/dashboard')

  const transferidos = await fetchAllRows<any>((from, to) => supabase
    .from('vehiculos_showroom')
    .select('id, marca, modelo, version, anio, color, placa, vin, serial_motor, transferido_a, transferido_at')
    .not('transferido_a', 'is', null)
    .order('transferido_at', { ascending: false })
    .range(from, to))

  // Resumen por destino
  const porDestino: Record<string, number> = {}
  for (const t of transferidos) {
    const k = t.transferido_a ?? '—'
    porDestino[k] = (porDestino[k] ?? 0) + 1
  }
  const destinos = Object.entries(porDestino).sort((a, b) => b[1] - a[1])

  return (
    <div className="p-4 lg:p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/showroom" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"><ArrowLeft size={18} className="text-oriental-gray" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black flex items-center gap-2"><ArrowLeftRight size={22} className="text-oriental-red" /> Transferencias</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Vehículos transferidos a otros concesionarios</p>
        </div>
      </div>

      {destinos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {destinos.map(([dest, n]) => (
            <span key={dest} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-xs font-semibold text-oriental-black">
              <Building2 size={12} className="text-oriental-gray" /> {dest} · {n}
            </span>
          ))}
        </div>
      )}

      {transferidos.length === 0 ? (
        <div className="card p-12 text-center">
          <ArrowLeftRight size={30} className="mx-auto text-gray-300 mb-3" />
          <p className="text-oriental-gray text-sm">Aún no hay vehículos transferidos.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-oriental-gray">Vehículo</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-oriental-gray">Placa</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-oriental-gray">Transferido a</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-oriental-gray">Fecha</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-oriental-gray">VIN / Serial motor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transferidos.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <Link href={`/showroom/${t.id}`} className="font-semibold text-oriental-black hover:underline">{t.marca} {t.modelo}</Link>
                      <p className="text-[11px] text-oriental-gray">{[t.version, t.color, t.anio].filter(Boolean).join(' · ')}</p>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-oriental-black">{t.placa ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 rounded-lg text-[11px] font-bold text-blue-800">
                        <Building2 size={11} /> {t.transferido_a}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-oriental-gray text-xs whitespace-nowrap">{fmtFecha(t.transferido_at)}</td>
                    <td className="px-4 py-2.5 text-oriental-gray font-mono text-[10px]">
                      {t.vin ? <div>{t.vin}</div> : null}
                      {t.serial_motor ? <div>{t.serial_motor}</div> : null}
                      {!t.vin && !t.serial_motor ? '—' : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-oriental-gray">{transferidos.length} vehículo{transferidos.length !== 1 ? 's' : ''} transferido{transferidos.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
    </div>
  )
}
