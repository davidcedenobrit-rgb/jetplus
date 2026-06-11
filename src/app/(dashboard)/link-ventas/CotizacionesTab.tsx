'use client'

import { useState, useEffect } from 'react'

interface Cotizacion {
  id: string
  numero: string
  fecha: string
  vencimiento: string
  vendedora_nombre: string
  cliente_nombre: string
  cliente_ci_rif: string
  cliente_correo: string
  marca: string
  modelo: string
  modalidad: 'contado' | 'credito_24'
  total_inicial: number
  costo_total: number
  created_at: string
}

function fmt(n: number) {
  return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtFecha(s: string) {
  try { return new Date(s + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return s }
}

export default function CotizacionesTab() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/cotizaciones')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCotizaciones(data) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="card p-8 text-center text-oriental-gray text-sm">Cargando cotizaciones...</div>
  }

  if (cotizaciones.length === 0) {
    return (
      <div className="card p-16 text-center text-oriental-gray">
        <p className="text-2xl mb-3">📄</p>
        <p className="font-semibold text-sm">No hay cotizaciones generadas todavía.</p>
        <p className="text-xs mt-1">Las cotizaciones aparecerán aquí cuando las vendedoras las generen desde la página pública.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-oriental-black">Cotizaciones</h2>
          <p className="text-xs text-oriental-gray mt-0.5">{cotizaciones.length} cotizacion{cotizaciones.length !== 1 ? 'es' : ''} generadas</p>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['N° Cotización', 'Fecha', 'Cliente', 'Vehículo', 'Modalidad', 'Vendedora', 'Total inicial'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-oriental-gray uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cotizaciones.map(c => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-bold text-oriental-red">{c.numero}</span>
                </td>
                <td className="px-4 py-3 text-xs text-oriental-gray whitespace-nowrap">{fmtFecha(c.fecha)}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-oriental-black text-xs">{c.cliente_nombre}</p>
                  <p className="text-[11px] text-oriental-gray">{c.cliente_ci_rif}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-xs text-oriental-black">{c.modelo}</p>
                  <p className="text-[11px] text-oriental-gray">{c.marca}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${c.modalidad === 'contado' ? 'bg-blue-50 text-blue-700' : 'bg-yellow-50 text-yellow-700'}`}>
                    {c.modalidad === 'contado' ? 'Contado' : 'Crédito 24m'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-semibold text-oriental-black">{c.vendedora_nombre}</td>
                <td className="px-4 py-3 text-right">
                  <p className="font-bold text-sm text-oriental-black">${fmt(c.total_inicial)}</p>
                  {c.modalidad === 'credito_24' && (
                    <p className="text-[11px] text-oriental-gray">Total: ${fmt(c.costo_total)}</p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {cotizaciones.map(c => (
          <div key={c.id} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="font-mono text-xs font-bold text-oriental-red">{c.numero}</span>
                <p className="text-[11px] text-oriental-gray mt-0.5">{fmtFecha(c.fecha)} · {c.vendedora_nombre}</p>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${c.modalidad === 'contado' ? 'bg-blue-50 text-blue-700' : 'bg-yellow-50 text-yellow-700'}`}>
                {c.modalidad === 'contado' ? 'Contado' : 'Crédito 24m'}
              </span>
            </div>
            <p className="font-bold text-sm text-oriental-black">{c.modelo}</p>
            <p className="text-xs text-oriental-gray mb-2">{c.cliente_nombre} · {c.cliente_ci_rif}</p>
            <p className="text-sm font-bold text-oriental-black">${fmt(c.total_inicial)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
