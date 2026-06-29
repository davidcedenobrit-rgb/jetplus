'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Filter, Building2, ExternalLink, Zap } from 'lucide-react'
import ReporteVehimotorsModal from '../../ingresos/[id]/ReporteVehimotorsModal'

const METODOS_DIRECTOS = ['Transferencia bancaria a Vehimotor', 'USDT VE']

type Cliente = {
  id: string
  nombre: string
  cedula_rif: string | null
}

type IngresoPendiente = {
  id: string
  numeroRecibo: string
  concepto: string
  monto: number
  moneda: string
  tasaCambio: number | null
  metodoPago: string | null
  bancoEmisor: string | null
  bancoReceptor: string | null
  referencia: string | null
  fechaPago: string
  placa: string | null
  yaReportado: number
  saldo: number
  cliente: Cliente | null
}

interface Props {
  ingresos: IngresoPendiente[]
  rol: string
}

export default function ReportarLoteClient({ ingresos, rol }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [filtroDirectos, setFiltroDirectos] = useState<'todos' | 'directos' | 'no_directos'>('todos')
  const [filtroMetodo, setFiltroMetodo] = useState('')
  const [ingresoModal, setIngresoModal] = useState<IngresoPendiente | null>(null)

  const metodosUnicos = useMemo(
    () => Array.from(new Set(ingresos.map(i => i.metodoPago).filter((m): m is string => !!m))).sort(),
    [ingresos]
  )

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return ingresos.filter(i => {
      const esDirecto = METODOS_DIRECTOS.includes(i.metodoPago ?? '')
      if (filtroDirectos === 'directos' && !esDirecto) return false
      if (filtroDirectos === 'no_directos' && esDirecto) return false
      if (filtroMetodo && i.metodoPago !== filtroMetodo) return false
      if (q) {
        const buscable = `${i.numeroRecibo} ${i.placa ?? ''} ${i.cliente?.nombre ?? ''} ${i.cliente?.cedula_rif ?? ''} ${i.referencia ?? ''}`.toLowerCase()
        if (!buscable.includes(q)) return false
      }
      return true
    })
  }, [ingresos, busqueda, filtroDirectos, filtroMetodo])

  function fmt(n: number) {
    return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <>
      {/* Filtros */}
      <div className="card p-4 mb-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray" />
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar recibo, placa, cliente..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red"
            />
          </div>
          <select
            value={filtroMetodo}
            onChange={e => setFiltroMetodo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red bg-white"
          >
            <option value="">Todos los métodos</option>
            {metodosUnicos.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={filtroDirectos}
            onChange={e => setFiltroDirectos(e.target.value as any)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red bg-white"
          >
            <option value="todos">Todos los pagos</option>
            <option value="directos">Solo directos a VM</option>
            <option value="no_directos">Sin pagos directos</option>
          </select>
        </div>
        {(busqueda || filtroMetodo || filtroDirectos !== 'todos') && (
          <p className="text-[11px] text-oriental-gray">
            Mostrando <span className="font-bold text-oriental-black">{filtradas.length}</span> de {ingresos.length}
          </p>
        )}
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-oriental-bg border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-oriental-gray uppercase tracking-wider">Recibo</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-oriental-gray uppercase tracking-wider">Cliente que pagó</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-oriental-gray uppercase tracking-wider">Placa</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-oriental-gray uppercase tracking-wider">Método</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-oriental-gray uppercase tracking-wider">Monto</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-oriental-gray uppercase tracking-wider">Ya rep.</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Saldo</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-oriental-gray uppercase tracking-wider">Fecha</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtradas.map(i => {
                const esDirecto = METODOS_DIRECTOS.includes(i.metodoPago ?? '')
                return (
                  <tr key={i.id} className={`hover:bg-gray-50 transition-colors ${esDirecto ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <Link href={`/ingresos/${i.id}`} className="font-mono text-xs text-indigo-700 hover:underline">
                        {i.numeroRecibo}
                      </Link>
                      <p className="text-[10px] text-oriental-gray mt-0.5 truncate max-w-[160px]" title={i.concepto}>
                        {i.concepto}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-oriental-black text-xs truncate max-w-[180px]" title={i.cliente?.nombre}>
                        {i.cliente?.nombre ?? '—'}
                      </p>
                      <p className="text-[10px] text-oriental-gray">{i.cliente?.cedula_rif ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] bg-gray-100 px-1.5 py-0.5 rounded font-bold">{i.placa ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-oriental-gray">
                      <span className={esDirecto ? 'font-bold text-amber-700' : ''}>
                        {esDirecto && '⚡ '}{i.metodoPago ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-oriental-black text-sm">${fmt(i.monto)}</span>
                      <span className="block text-[10px] text-oriental-gray">{i.moneda}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {i.yaReportado > 0 ? (
                        <span className="text-xs text-indigo-700 font-semibold">${fmt(i.yaReportado)}</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-extrabold text-amber-700 text-sm">${fmt(i.saldo)}</span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-oriental-gray whitespace-nowrap">
                      {new Date(i.fechaPago + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setIngresoModal(i)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-colors"
                      >
                        <Zap size={11} /> Reportar
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-oriental-gray text-sm">
                    Sin resultados con los filtros actuales
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de reporte (reutiliza el del detalle individual) */}
      {ingresoModal && ingresoModal.cliente && (
        <ReporteVehimotorsModal
          ingresoId={ingresoModal.id}
          ingresoMonto={ingresoModal.monto}
          ingresoMoneda={ingresoModal.moneda}
          metodoPago={ingresoModal.metodoPago}
          clienteOriginal={ingresoModal.cliente}
          totalYaReportado={ingresoModal.yaReportado}
          rol={rol}
          onClose={() => setIngresoModal(null)}
        />
      )}
    </>
  )
}
