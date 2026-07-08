'use client'

import { FileSpreadsheet, FileText } from 'lucide-react'

const ESTADO_LABEL: Record<string, string> = {
  llegada: 'Recibido',
  por_enviar_pdi: 'Por enviar PDI',
  en_taller: 'En taller',
  en_agencia: 'Disponible',
  reservado: 'Reservado',
  vendido: 'Vendido',
}

interface Fila {
  marca: string | null
  modelo: string | null
  version: string | null
  anio: number | null
  color: string | null
  placa: string | null
  vin: string | null
  serial_motor: string | null
  estado: string | null
  ubicacion: string | null
  ubicacion_descripcion: string | null
  proforma_vehimotors: string | null
}

interface Props {
  filas: Fila[]
  tab: string
}

function esc(v: string | null | undefined) {
  return (v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export default function ExportButtons({ filas, tab }: Props) {
  function exportarExcel() {
    const cols = ['Marca', 'Modelo', 'Versión', 'Año', 'Color', 'Placa', 'VIN / Chasis', 'Serial motor', 'Estado', 'Ubicación', 'Proforma Vehimotors']
    const filasHtml = filas.map(f => {
      const ubic = f.ubicacion === 'otro' ? (f.ubicacion_descripcion ?? 'Otro') : (f.ubicacion ?? '')
      const vals = [
        f.marca, f.modelo, f.version, f.anio?.toString(), f.color, f.placa,
        f.vin, f.serial_motor, ESTADO_LABEL[f.estado ?? ''] ?? f.estado, ubic, f.proforma_vehimotors,
      ]
      return `<tr>${vals.map(v => `<td>${esc(v ?? '')}</td>`).join('')}</tr>`
    }).join('')

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8" /></head>
      <body>
        <table border="1">
          <thead><tr style="background:#C41E3A;color:#fff;font-weight:bold">${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
          <tbody>${filasHtml}</tbody>
        </table>
      </body></html>`

    const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `showroom-${tab}-${new Date().toISOString().slice(0, 10)}.xls`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={exportarExcel} className="btn-secondary flex items-center gap-2">
        <FileSpreadsheet size={16} className="text-green-700" />
        Excel
      </button>
      <a
        href={`/api/showroom/export/pdf?tab=${tab}`}
        target="_blank"
        rel="noreferrer"
        className="btn-secondary flex items-center gap-2"
      >
        <FileText size={16} className="text-oriental-red" />
        PDF
      </a>
    </div>
  )
}
