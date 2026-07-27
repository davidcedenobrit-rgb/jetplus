'use client'

import { useState } from 'react'
import { FileText, ExternalLink, Mail, Loader2, Check, CalendarDays } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function RetencionCard({ egreso }: { egreso: any }) {
  const [comprobante, setComprobante] = useState<string>(egreso.ret_iva_comprobante ?? '')
  const [fecha, setFecha] = useState<string>(egreso.ret_iva_fecha_emision ?? '')
  const [editando, setEditando] = useState(false)
  const [savingFecha, setSavingFecha] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState<boolean>(!!egreso.ret_iva_email_enviado_at)
  const [msg, setMsg] = useState('')

  const moneda = egreso.moneda === 'VES' ? 'Bs' : (egreso.moneda ?? 'USD')
  const f = (n: number) => Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  async function guardarFecha() {
    setSavingFecha(true); setMsg('')
    try {
      const r = await fetch(`/api/egresos/${egreso.id}/retencion`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fechaEmision: fecha }),
      })
      const j = await r.json()
      if (r.ok) { setComprobante(j.ret_iva_comprobante ?? comprobante); setEditando(false) }
      else setMsg(j.error ?? 'No se pudo actualizar')
    } finally { setSavingFecha(false) }
  }

  async function enviar() {
    setEnviando(true); setMsg('')
    try {
      const r = await fetch(`/api/egresos/${egreso.id}/retencion`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const j = await r.json()
      if (r.ok) { setEnviado(true); setMsg(`Enviado a ${j.correo}`) }
      else setMsg(j.error ?? 'No se pudo enviar')
    } finally { setEnviando(false) }
  }

  return (
    <div className="card p-5 border-oriental-red/20">
      <h3 className="text-sm font-bold text-oriental-black mb-3 flex items-center gap-2">
        <FileText size={15} className="text-oriental-red" /> Retención de IVA
      </h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-oriental-gray">N° comprobante</span><span className="font-mono font-bold">{comprobante}</span></div>
        <div className="flex justify-between items-center">
          <span className="text-oriental-gray">F. emisión</span>
          {editando ? (
            <div className="flex items-center gap-1">
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="border border-gray-200 rounded px-2 py-1 text-xs" />
              <button onClick={guardarFecha} disabled={savingFecha} className="p-1 rounded bg-green-600 text-white disabled:opacity-50">{savingFecha ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}</button>
            </div>
          ) : (
            <button onClick={() => setEditando(true)} className="font-medium text-oriental-black flex items-center gap-1 hover:text-oriental-red">
              {fecha || '—'} <CalendarDays size={12} className="text-gray-400" />
            </button>
          )}
        </div>
        <div className="flex justify-between"><span className="text-oriental-gray">% retenido</span><span className="font-medium">{egreso.ret_iva_pct}%</span></div>
        <div className="flex justify-between"><span className="text-oriental-gray">IVA retenido</span><span className="font-bold text-oriental-red">{moneda} {f(egreso.ret_iva_monto)}</span></div>
      </div>

      <div className="flex flex-col gap-2 mt-4">
        <a href={`/api/egresos/${egreso.id}/comprobante-retencion`} target="_blank" rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-oriental-red text-white text-xs font-bold hover:bg-red-700">
          <ExternalLink size={13} /> Ver comprobante (PDF)
        </a>
        <button onClick={enviar} disabled={enviando}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-oriental-black text-xs font-bold hover:bg-gray-50 disabled:opacity-50">
          {enviando ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
          {enviado ? 'Reenviar al proveedor' : 'Enviar al proveedor'}
        </button>
      </div>
      {msg && <p className="text-[11px] text-oriental-gray mt-2">{msg}</p>}
    </div>
  )
}
