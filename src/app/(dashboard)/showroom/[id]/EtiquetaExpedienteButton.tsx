'use client'

import { Tag } from 'lucide-react'

interface Props {
  marca: string | null
  modelo: string | null
  version: string | null
  anio: number | null
  color: string | null
  placa: string | null
  fechaLlegada: string | null
  proformaVehimotors: string | null
  vin: string | null
  serialMotor: string | null
}

function esc(s: unknown): string {
  return String(s ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export default function EtiquetaExpedienteButton(p: Props) {
  function imprimir() {
    const fecha = p.fechaLlegada
      ? new Date(p.fechaLlegada + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—'
    const filas: [string, string][] = [
      ['Marca', esc(p.marca)],
      ['Modelo', esc(p.modelo)],
      ['Versión', esc(p.version)],
      ['Año', esc(p.anio)],
      ['Color', esc(p.color)],
      ['Placa', esc(p.placa)],
      ['Fecha llegada', esc(fecha)],
      ['Proforma Vehimotors', esc(p.proformaVehimotors)],
      ['VIN / Chasis', esc(p.vin)],
      ['Serial motor', esc(p.serialMotor)],
    ]
    const rows = filas.map(([k, val]) =>
      `<tr><td class="k">${k}</td><td class="v">${val}</td></tr>`).join('')

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Etiqueta de expediente</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; color:#111; padding:16px; }
  .label { width: 360px; border: 2px solid #111; border-radius: 8px; overflow:hidden; }
  .head { background:#111; color:#fff; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; }
  .head .lo { font-size:13px; font-weight:900; letter-spacing:-.3px; }
  .head .lo span { color:#e11d2a; }
  .head .t { font-size:9px; text-transform:uppercase; letter-spacing:1px; color:#bbb; }
  table { width:100%; border-collapse:collapse; }
  td { padding:5px 12px; border-bottom:1px solid #eee; font-size:11px; vertical-align:top; }
  td.k { color:#666; width:42%; }
  td.v { font-weight:700; font-family:'Courier New',monospace; }
  tr:last-child td { border-bottom:none; }
  @media print { body { padding:0; } }
</style></head><body>
<div class="label">
  <div class="head"><div class="lo">LA ORIENTAL <span>AUTOMOTORS</span></div><div class="t">Expediente</div></div>
  <table><tbody>${rows}</tbody></table>
</div>
<script>window.onload=()=>window.print()</script>
</body></html>`
    const w = window.open('', '_blank', 'width=520,height=640')
    if (w) { w.document.write(html); w.document.close() }
  }

  return (
    <button onClick={imprimir}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-oriental-gray hover:bg-gray-50">
      <Tag size={14} /> Etiqueta expediente
    </button>
  )
}
