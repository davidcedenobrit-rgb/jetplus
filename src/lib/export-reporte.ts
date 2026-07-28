import type { ReportePayload } from './reporte-tipos'

// Descarga el reporte como PDF con membrete de La Oriental (server-side).
export async function exportReportePDF(payload: ReportePayload) {
  const r = await fetch('/api/reportes/pdf', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
  if (!r.ok) { alert('No se pudo generar el PDF.'); return }
  const blob = await r.blob()
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Descarga el reporte como Excel (.xls tipo HTML — abre en Excel sin dependencias).
// Mantiene la línea gráfica de La Oriental: cabecera roja con el nombre y el título.
export function exportReporteExcel(payload: ReportePayload) {
  const ROJO = '#C41E3A', NEGRO = '#111827'
  let body = ''
  body += `<tr><td colspan="12" style="background:${ROJO};color:#fff;font-size:16px;font-weight:bold;padding:8px">LA ORIENTAL AUTOMOTORS, C.A.</td></tr>`
  body += `<tr><td colspan="12" style="background:${NEGRO};color:#fff;font-size:13px;font-weight:bold;padding:6px">${esc(payload.titulo)}${payload.periodo ? ` — ${esc(payload.periodo)}` : ''}</td></tr>`
  body += `<tr><td colspan="12" style="height:6px"></td></tr>`

  if (payload.kpis?.length) {
    body += `<tr>` + payload.kpis.map(k => `<td style="border:1px solid #d1d5db;padding:6px"><div style="font-size:9px;color:#6b7280">${esc(k.label)}</div><div style="font-size:13px;font-weight:bold">${esc(k.value)}</div></td>`).join('') + `</tr>`
    body += `<tr><td colspan="12" style="height:8px"></td></tr>`
  }

  for (const sec of payload.secciones) {
    const cols = sec.headers.length
    const right = new Set(sec.right ?? Array.from({ length: cols }, (_, i) => i).filter(i => i > 0))
    body += `<tr><td colspan="${cols}" style="background:${NEGRO};color:#fff;font-weight:bold;padding:5px">${esc(sec.titulo)}</td></tr>`
    body += `<tr>` + sec.headers.map((h, i) => `<th style="background:#f3f4f6;border:1px solid #d1d5db;padding:4px;text-align:${right.has(i) ? 'right' : 'left'}">${esc(h)}</th>`).join('') + `</tr>`
    if (sec.rows.length === 0) {
      body += `<tr><td colspan="${cols}" style="border:1px solid #d1d5db;padding:6px;text-align:center;color:#6b7280">Sin datos.</td></tr>`
    } else {
      for (const row of sec.rows) {
        body += `<tr>` + row.map((c, i) => `<td style="border:1px solid #d1d5db;padding:4px;text-align:${right.has(i) ? 'right' : 'left'}">${esc(c)}</td>`).join('') + `</tr>`
      }
    }
    body += `<tr><td colspan="${cols}" style="height:8px"></td></tr>`
  }

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table>${body}</table></body></html>`
  const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const nombre = payload.titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  a.href = url; a.download = `${nombre || 'reporte'}.xls`; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}
