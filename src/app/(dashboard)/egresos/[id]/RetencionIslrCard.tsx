'use client'

import { FileText, ExternalLink } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function RetencionIslrCard({ egreso }: { egreso: any }) {
  const moneda = egreso.moneda === 'VES' ? 'Bs' : (egreso.moneda ?? 'USD')
  const f = (n: number) => Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const sustr = Number(egreso.ret_islr_sustraendo) || 0

  return (
    <div className="card p-5 border-indigo-200">
      <h3 className="text-sm font-bold text-oriental-black mb-3 flex items-center gap-2">
        <FileText size={15} className="text-indigo-600" /> Retención de ISLR
      </h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-oriental-gray">N° comprobante</span><span className="font-mono font-bold">{egreso.ret_islr_comprobante}</span></div>
        <div className="flex justify-between"><span className="text-oriental-gray">F. emisión</span><span className="font-medium">{egreso.ret_islr_fecha_emision ?? '—'}</span></div>
        <div className="flex justify-between"><span className="text-oriental-gray">Concepto</span><span className="font-medium text-right max-w-[60%]">COD-{egreso.ret_islr_codigo}</span></div>
        <div className="flex justify-between"><span className="text-oriental-gray">Base (sin IVA)</span><span className="font-medium">{moneda} {f(egreso.ret_islr_base)}</span></div>
        <div className="flex justify-between"><span className="text-oriental-gray">% Retención</span><span className="font-medium">{Number(egreso.ret_islr_pct)}%{sustr > 0 ? ` − ${f(sustr)}` : ''}</span></div>
        <div className="flex justify-between"><span className="text-oriental-gray">ISLR retenido</span><span className="font-bold text-indigo-700">{moneda} {f(egreso.ret_islr_monto)}</span></div>
      </div>

      <div className="mt-4">
        <a href={`/api/egresos/${egreso.id}/comprobante-islr`} target="_blank" rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700">
          <ExternalLink size={13} /> Ver comprobante ISLR (PDF)
        </a>
      </div>
    </div>
  )
}
