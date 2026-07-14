import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeftRight } from 'lucide-react'

export default async function TasasPage() {
  const supabase = await createClient()

  const ingresos = await fetchAllRows<any>((from, to) => supabase
    .from('ingresos')
    .select('id, numero_recibo, monto, tasa_cambio, fecha_pago, clientes(nombre)')
    .eq('moneda', 'VES')
    .not('tasa_cambio', 'is', null)
    .order('fecha_pago', { ascending: false })
    .range(from, to))

  const registros = (ingresos ?? []).map((i: any) => ({
    id: i.id,
    recibo: i.numero_recibo,
    cliente: i.clientes?.nombre ?? '—',
    monto_ves: i.monto,
    tasa: i.tasa_cambio,
    equiv_usd: i.monto / i.tasa_cambio,
    fecha: i.fecha_pago,
  }))

  const tasasPorFecha = registros.reduce((acc: Record<string, typeof registros>, r) => {
    const key = r.fecha
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  const fechas = Object.keys(tasasPorFecha).sort((a, b) => b.localeCompare(a))

  const tasaPromedio = registros.length > 0
    ? registros.reduce((sum, r) => sum + r.tasa, 0) / registros.length
    : 0

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-10 h-10 bg-oriental-red rounded-xl flex items-center justify-center">
          <ArrowLeftRight size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Control de tasas</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Historial de tasas de cambio usadas en pagos VES</p>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <p className="text-[11px] text-oriental-gray uppercase tracking-wider font-semibold mb-1">Total pagos en VES</p>
          <p className="text-2xl font-extrabold text-oriental-black">{registros.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-[11px] text-oriental-gray uppercase tracking-wider font-semibold mb-1">Tasa promedio</p>
          <p className="text-2xl font-extrabold text-oriental-black">{tasaPromedio.toFixed(2)} <span className="text-sm font-normal text-oriental-gray">Bs/$</span></p>
        </div>
        <div className="card p-5">
          <p className="text-[11px] text-oriental-gray uppercase tracking-wider font-semibold mb-1">Última tasa registrada</p>
          <p className="text-2xl font-extrabold text-oriental-black">
            {registros.length > 0 ? `${registros[0].tasa.toFixed(2)} Bs/$` : '—'}
          </p>
        </div>
      </div>

      {/* Tabla agrupada por fecha */}
      {fechas.length === 0 ? (
        <div className="card p-12 text-center">
          <ArrowLeftRight size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-oriental-gray">No hay pagos en bolívares con tasa registrada</p>
          <p className="text-sm text-gray-400 mt-1">Cuando registres un ingreso en VES con tasa, aparecerá aquí</p>
        </div>
      ) : (
        <div className="space-y-6">
          {fechas.map(fecha => {
            const items = tasasPorFecha[fecha]
            const tasaPromDia = items.reduce((s: number, r: any) => s + r.tasa, 0) / items.length
            return (
              <div key={fecha} className="card overflow-hidden">
                <div className="bg-oriental-bg px-5 py-3 flex items-center justify-between border-b border-gray-100">
                  <p className="font-bold text-oriental-black text-sm">{formatDate(fecha)}</p>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-oriental-gray">{items.length} pago{items.length > 1 ? 's' : ''}</span>
                    <span className="text-sm font-bold text-oriental-black bg-white border border-gray-200 px-3 py-1 rounded-full">
                      {tasaPromDia.toFixed(2)} Bs/$
                    </span>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-2.5 text-[11px] text-oriental-gray uppercase tracking-wider font-semibold">Recibo</th>
                      <th className="text-left px-5 py-2.5 text-[11px] text-oriental-gray uppercase tracking-wider font-semibold">Cliente</th>
                      <th className="text-right px-5 py-2.5 text-[11px] text-oriental-gray uppercase tracking-wider font-semibold">Monto VES</th>
                      <th className="text-right px-5 py-2.5 text-[11px] text-oriental-gray uppercase tracking-wider font-semibold">Tasa</th>
                      <th className="text-right px-5 py-2.5 text-[11px] text-oriental-gray uppercase tracking-wider font-semibold">Equiv. USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r: any) => (
                      <tr key={r.id} className="border-b border-gray-50 hover:bg-oriental-bg/50 transition-colors">
                        <td className="px-5 py-3">
                          <a href={`/ingresos/${r.id}`} className="font-mono text-oriental-red hover:underline text-xs">{r.recibo}</a>
                        </td>
                        <td className="px-5 py-3 text-oriental-black">{r.cliente}</td>
                        <td className="px-5 py-3 text-right font-semibold">{formatCurrency(r.monto_ves, 'VES')}</td>
                        <td className="px-5 py-3 text-right font-bold text-oriental-black">{r.tasa.toFixed(2)}</td>
                        <td className="px-5 py-3 text-right text-oriental-gray">{formatCurrency(r.equiv_usd, 'USD')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
