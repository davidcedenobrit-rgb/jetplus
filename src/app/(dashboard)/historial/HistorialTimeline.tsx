'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText, Calendar, Download, ExternalLink, Car, DollarSign } from 'lucide-react'

type DocumentoTimeline = {
  id: string
  tipo: 'cotizacion' | 'proforma'
  numero: string
  fecha: string
  estado?: string | null
  vehiculoLabel?: string | null
  extraInfo?: string | null
  pdfUrl: string
  detalleUrl?: string | null
  clienteNombre: string
  clienteCiRif: string
  monto?: number | null
}

interface Props {
  documentos: DocumentoTimeline[]
  estadoCotColors: Record<string, string>
  estadoCotLabel: Record<string, string>
}

function fmtDate(s: string) {
  try {
    return new Date(s + 'T12:00:00').toLocaleDateString('es-VE', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch {
    return s
  }
}

function fmtMoney(n: number | null | undefined) {
  if (n == null) return null
  return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function HistorialTimeline({ documentos, estadoCotColors, estadoCotLabel }: Props) {
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'cotizacion' | 'proforma'>('todos')

  const docsFiltered = documentos.filter(d => filtroTipo === 'todos' || d.tipo === filtroTipo)

  if (documentos.length === 0) {
    return (
      <div className="card p-8 text-center">
        <FileText size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-oriental-black font-semibold mb-1">Sin documentos emitidos</p>
        <p className="text-sm text-oriental-gray">Este cliente aún no tiene cotizaciones ni proformas.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Filtros */}
      <div className="flex items-center gap-2 mb-4">
        {[
          { value: 'todos', label: `Todos (${documentos.length})` },
          { value: 'cotizacion', label: `Cotizaciones (${documentos.filter(d => d.tipo === 'cotizacion').length})` },
          { value: 'proforma', label: `Proformas (${documentos.filter(d => d.tipo === 'proforma').length})` },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFiltroTipo(f.value as any)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filtroTipo === f.value
                ? 'bg-oriental-black text-white border-oriental-black'
                : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative pl-6">
        {/* Línea vertical */}
        <div className="absolute left-2 top-2 bottom-2 w-px bg-gray-200" />

        <div className="space-y-4">
          {docsFiltered.map((d, i) => {
            const isCot = d.tipo === 'cotizacion'
            const dotBg = isCot ? 'bg-blue-500' : 'bg-amber-500'
            const cardAccent = isCot ? 'border-l-blue-400' : 'border-l-amber-400'
            const tipoLabel = isCot ? 'Cotización' : 'Proforma'
            const tipoBadgeColor = isCot ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'

            return (
              <div key={`${d.tipo}-${d.id}`} className="relative">
                {/* Dot */}
                <div className={`absolute -left-6 top-4 w-4 h-4 rounded-full ${dotBg} border-2 border-white shadow-sm`} />

                <div className={`card p-4 border-l-4 ${cardAccent} hover:shadow-md transition-shadow`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${tipoBadgeColor}`}>
                        {tipoLabel}
                      </span>
                      <span className="font-mono font-bold text-oriental-black text-sm">{d.numero}</span>
                      {d.estado && isCot && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${estadoCotColors[d.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                          {estadoCotLabel[d.estado] ?? d.estado}
                        </span>
                      )}
                      {d.estado && !isCot && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${d.estado === 'enviada' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {d.estado === 'enviada' ? 'Enviada por correo' : 'Emitida'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-oriental-gray flex-shrink-0">
                      <Calendar size={12} />
                      {fmtDate(d.fecha)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    {d.vehiculoLabel && (
                      <div className="flex items-center gap-2 text-sm">
                        <Car size={14} className="text-oriental-gray flex-shrink-0" />
                        <span className="text-oriental-black font-medium truncate">{d.vehiculoLabel}</span>
                      </div>
                    )}
                    {d.extraInfo && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText size={14} className="text-oriental-gray flex-shrink-0" />
                        <span className="text-oriental-gray">{d.extraInfo}</span>
                      </div>
                    )}
                    {d.monto != null && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign size={14} className="text-oriental-gray flex-shrink-0" />
                        <span className="text-oriental-black font-semibold">${fmtMoney(d.monto)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <a
                      href={d.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-oriental-red text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Download size={12} />
                      Ver PDF
                    </a>
                    {d.detalleUrl && (
                      <Link
                        href={d.detalleUrl}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-oriental-black text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <ExternalLink size={12} />
                        Ir al detalle
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {docsFiltered.length === 0 && filtroTipo !== 'todos' && (
        <div className="card p-6 text-center mt-2">
          <p className="text-sm text-oriental-gray">Sin {filtroTipo === 'cotizacion' ? 'cotizaciones' : 'proformas'} para este cliente.</p>
        </div>
      )}
    </div>
  )
}
