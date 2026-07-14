'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Receipt, Loader2, X, Printer } from 'lucide-react'

interface Props {
  vehiculoId: string
  marca: string | null
  modelo: string | null
  placa: string | null
  clienteNombre: string | null
  vendedoraActual: string | null
  fechaVentaActual: string | null
}

const VENDEDORAS = ['Ocdiris', 'Diana', 'Angelsy']
const DIRECTIVA = ['Rojas', 'Carla', 'Carlos']

function esc(s: unknown): string {
  return String(s ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export default function EtiquetaVentaButton(p: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [vendedora, setVendedora] = useState(p.vendedoraActual ?? '')
  const [fecha, setFecha] = useState(p.fechaVentaActual ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' }))

  function imprimir(vend: string, fec: string) {
    const fechaFmt = fec ? new Date(fec + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Etiqueta de venta</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; color:#111; padding:16px; }
  .label { width: 360px; border: 2px solid #111; border-radius: 8px; overflow:hidden; }
  .head { background:#111; color:#fff; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; }
  .head .lo { font-size:13px; font-weight:900; letter-spacing:-.3px; }
  .head .lo span { color:#e11d2a; }
  .head .t { font-size:9px; text-transform:uppercase; letter-spacing:1px; color:#bbb; }
  .veh { padding:8px 12px; background:#f5f5f5; border-bottom:1px solid #ddd; font-size:12px; font-weight:700; }
  table { width:100%; border-collapse:collapse; }
  td { padding:6px 12px; border-bottom:1px solid #eee; font-size:12px; vertical-align:top; }
  td.k { color:#666; width:38%; }
  td.v { font-weight:700; }
  tr:last-child td { border-bottom:none; }
  @media print { body { padding:0; } }
</style></head><body>
<div class="label">
  <div class="head"><div class="lo">LA ORIENTAL <span>AUTOMOTORS</span></div><div class="t">Venta</div></div>
  <div class="veh">${esc(p.marca)} ${esc(p.modelo)}${p.placa ? ' · ' + esc(p.placa) : ''}</div>
  <table><tbody>
    <tr><td class="k">Cliente</td><td class="v">${esc(p.clienteNombre)}</td></tr>
    <tr><td class="k">Vendedora</td><td class="v">${esc(vend)}</td></tr>
    <tr><td class="k">Fecha de venta</td><td class="v">${esc(fechaFmt)}</td></tr>
  </tbody></table>
</div>
<script>window.onload=()=>window.print()</script>
</body></html>`
    const w = window.open('', '_blank', 'width=520,height=560')
    if (w) { w.document.write(html); w.document.close() }
  }

  async function guardarEImprimir() {
    setError('')
    if (!vendedora) { setError('Selecciona quién vendió'); return }
    setSaving(true)
    const { error: err } = await supabase.from('vehiculos_showroom')
      .update({ vendedora_venta: vendedora, fecha_venta: fecha || null, updated_at: new Date().toISOString() })
      .eq('id', p.vehiculoId)
    setSaving(false)
    if (err) { setError(err.message); return }
    imprimir(vendedora, fecha)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-oriental-gray hover:bg-gray-50">
        <Receipt size={14} /> Etiqueta de venta
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-oriental-black">Etiqueta de venta</h2>
              <button onClick={() => !saving && setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X size={16} className="text-oriental-gray" /></button>
            </div>
            <p className="text-xs text-oriental-gray mb-3">Cliente: <span className="font-semibold text-oriental-black">{p.clienteNombre ?? '—'}</span></p>
            <div className="space-y-3">
              <div>
                <label className="label">¿Quién vendió? *</label>
                <select className="select" value={vendedora} onChange={e => setVendedora(e.target.value)}>
                  <option value="">Seleccionar…</option>
                  <optgroup label="Vendedoras">
                    {VENDEDORAS.map(v => <option key={v} value={v}>{v}</option>)}
                  </optgroup>
                  <optgroup label="Directiva">
                    {DIRECTIVA.map(v => <option key={v} value={v}>{v}</option>)}
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="label">Fecha de venta *</label>
                <input className="input" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
              </div>
            </div>
            {error && <p className="text-xs text-oriental-red mt-2">{error}</p>}
            <div className="flex gap-2 pt-4">
              <button onClick={() => !saving && setOpen(false)} className="flex-1 btn-secondary py-2.5">Cancelar</button>
              <button onClick={guardarEImprimir} disabled={saving} className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />} Guardar e imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
