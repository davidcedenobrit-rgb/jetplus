'use client'

import { useState } from 'react'
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { exportReporteExcel, exportReportePDF } from '@/lib/export-reporte'
import type { ReportePayload } from '@/lib/reporte-tipos'

// Barra de exportación estándar (Excel + PDF con membrete Jetplus).
export default function ExportBar({ build }: { build: () => ReportePayload }) {
  const [pdfLoading, setPdfLoading] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => exportReporteExcel(build())}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-green-700 hover:bg-green-50">
        <FileSpreadsheet size={15} /> Excel
      </button>
      <button onClick={async () => { setPdfLoading(true); await exportReportePDF(build()); setPdfLoading(false) }} disabled={pdfLoading}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-oriental-red hover:bg-red-50 disabled:opacity-50">
        {pdfLoading ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />} PDF
      </button>
    </div>
  )
}
