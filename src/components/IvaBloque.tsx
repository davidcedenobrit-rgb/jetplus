'use client'

import { desglosarIva } from '@/lib/iva'

// Bloque de IVA para los formularios de Ingresos y Egresos.
// `total` es el monto que ya escribe el usuario; al activar IVA se muestra el
// desglose base + IVA calculado con la alícuota indicada.
export default function IvaBloque({
  aplica, setAplica, tasa, setTasa, total, moneda,
}: {
  aplica: boolean
  setAplica: (v: boolean) => void
  tasa: string
  setTasa: (v: string) => void
  total: number
  moneda: string
}) {
  const tasaNum = parseFloat(tasa)
  const { base, iva } = aplica && total > 0 && tasaNum > 0 ? desglosarIva(total, tasaNum) : { base: 0, iva: 0 }
  const fmt = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="rounded-xl border border-gray-200 p-3 bg-gray-50/60">
      <label className="flex items-center gap-2 text-sm font-medium text-oriental-black cursor-pointer">
        <input type="checkbox" checked={aplica} onChange={e => setAplica(e.target.checked)} className="w-4 h-4" />
        Incluye IVA
      </label>

      {aplica && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-oriental-gray">Alícuota</label>
            <div className="relative">
              <input
                type="number" step="0.01" min="0" max="100"
                value={tasa}
                onChange={e => setTasa(e.target.value)}
                className="input w-24 pr-7 text-sm"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-oriental-gray">%</span>
            </div>
            <span className="text-[11px] text-oriental-gray">0% = exento</span>
          </div>
          {total > 0 && tasaNum > 0 && (
            <div className="grid grid-cols-3 gap-2 text-sm">
              <Celda label="Base imponible" value={`${moneda} ${fmt(base)}`} />
              <Celda label={`IVA (${tasaNum}%)`} value={`${moneda} ${fmt(iva)}`} />
              <Celda label="Total" value={`${moneda} ${fmt(total)}`} fuerte />
            </div>
          )}
          <p className="text-[11px] text-oriental-gray">El monto que registras es el <b>total</b>; el sistema separa base e IVA para el libro fiscal.</p>
        </div>
      )}
    </div>
  )
}

function Celda({ label, value, fuerte }: { label: string; value: string; fuerte?: boolean }) {
  return (
    <div className={`rounded-lg border px-2.5 py-1.5 ${fuerte ? 'border-oriental-black/20 bg-white' : 'border-gray-200 bg-white'}`}>
      <p className="text-[10px] text-oriental-gray uppercase tracking-wide">{label}</p>
      <p className={`font-mono ${fuerte ? 'font-bold text-oriental-black' : 'text-oriental-black'}`}>{value}</p>
    </div>
  )
}
