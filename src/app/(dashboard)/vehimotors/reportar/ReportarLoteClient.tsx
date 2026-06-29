'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Building2, Zap, X, Send, AlertCircle, CheckCircle2 } from 'lucide-react'
import ReporteVehimotorsModal from '../../ingresos/[id]/ReporteVehimotorsModal'
import { crearLoteReportesVehimotors } from '../../ingresos/[id]/reportes-vehimotors-actions'

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

function montoUSD(i: IngresoPendiente, monto: number): number {
  if (i.moneda === 'VES') {
    return i.tasaCambio && i.tasaCambio > 0 ? monto / i.tasaCambio : 0
  }
  return monto
}

export default function ReportarLoteClient({ ingresos, rol }: Props) {
  const router = useRouter()
  const [busqueda, setBusqueda] = useState('')
  const [filtroDirectos, setFiltroDirectos] = useState<'todos' | 'directos' | 'no_directos'>('todos')
  const [filtroMetodo, setFiltroMetodo] = useState('')
  const [ingresoModal, setIngresoModal] = useState<IngresoPendiente | null>(null)

  // Selección múltiple
  const [seleccionados, setSeleccionados] = useState<Record<string, boolean>>({})
  const [montosLote, setMontosLote] = useState<Record<string, string>>({})
  const [mostrarModalLote, setMostrarModalLote] = useState(false)
  const [enviandoLote, setEnviandoLote] = useState(false)
  const [resultadoLote, setResultadoLote] = useState<{ guardados: number; errores: string[] } | null>(null)

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

  const idsSeleccionados = useMemo(() => Object.keys(seleccionados).filter(id => seleccionados[id]), [seleccionados])
  const ingresosSeleccionados = useMemo(
    () => ingresos.filter(i => seleccionados[i.id]),
    [ingresos, seleccionados]
  )

  // Si en lote hay pagos directos pero no eres director, marcar como bloqueado
  const esJose = ['jose', 'admin', 'director'].includes(rol)
  const loteTieneDirectosBloqueados = !esJose && ingresosSeleccionados.some(i => METODOS_DIRECTOS.includes(i.metodoPago ?? ''))

  const totalLoteUSD = useMemo(() => {
    return ingresosSeleccionados.reduce((s, i) => {
      const monto = parseFloat(montosLote[i.id] ?? i.saldo.toString()) || 0
      return s + montoUSD(i, monto)
    }, 0)
  }, [ingresosSeleccionados, montosLote])

  function toggleSeleccionado(id: string) {
    setSeleccionados(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function seleccionarTodosFiltrados() {
    const sel = { ...seleccionados }
    for (const i of filtradas) sel[i.id] = true
    setSeleccionados(sel)
  }

  function deseleccionarTodos() {
    setSeleccionados({})
    setMontosLote({})
  }

  function fmt(n: number) {
    return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Formato que respeta la moneda real: Bs. para VES, $ para USD/USDT
  function fmtConMoneda(n: number, moneda: string) {
    if (moneda === 'VES') return `Bs. ${fmt(n)}`
    return `$${fmt(n)}`
  }

  async function confirmarLote() {
    setEnviandoLote(true)
    setResultadoLote(null)

    const items = ingresosSeleccionados.map(i => {
      const monto = parseFloat(montosLote[i.id] ?? i.saldo.toString()) || 0
      return {
        ingresoId: i.id,
        clienteReportadoId: i.cliente!.id,   // mismo cliente que pagó
        vehiculoId: null,                     // sin vehículo específico (lote rápido)
        placa: i.placa,
        proformaVehimotors: null,
        montoReportado: monto,
        observaciones: null,
      }
    })

    const res = await crearLoteReportesVehimotors(items)
    setEnviandoLote(false)
    const guardados = ('guardados' in res && typeof res.guardados === 'number') ? res.guardados : 0
    const errores = ('errores' in res && Array.isArray(res.errores)) ? res.errores : []
    setResultadoLote({ guardados, errores })

    if (guardados > 0) {
      setTimeout(() => {
        setMostrarModalLote(false)
        setResultadoLote(null)
        deseleccionarTodos()
        router.refresh()
      }, 2500)
    }
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          {(busqueda || filtroMetodo || filtroDirectos !== 'todos') && (
            <p className="text-[11px] text-oriental-gray">
              Mostrando <span className="font-bold text-oriental-black">{filtradas.length}</span> de {ingresos.length}
            </p>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={seleccionarTodosFiltrados}
              className="text-[11px] font-semibold text-indigo-700 hover:underline"
            >
              Seleccionar todos ({filtradas.length})
            </button>
            {idsSeleccionados.length > 0 && (
              <button onClick={deseleccionarTodos} className="text-[11px] font-semibold text-oriental-gray hover:underline">
                Limpiar selección
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden mb-24">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-oriental-bg border-b border-gray-200">
              <tr>
                <th className="w-10 text-center px-2 py-2.5"></th>
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
                const isSel = !!seleccionados[i.id]
                return (
                  <tr key={i.id} className={`hover:bg-gray-50 transition-colors ${isSel ? 'bg-indigo-50/50' : esDirecto ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-2 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggleSeleccionado(i.id)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
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
                      <span className="font-bold text-oriental-black text-sm">{fmtConMoneda(i.monto, i.moneda)}</span>
                      {i.moneda === 'VES' && i.tasaCambio && i.tasaCambio > 0 && (
                        <span className="block text-[10px] text-oriental-gray">≈ ${fmt(i.monto / i.tasaCambio)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {i.yaReportado > 0 ? (
                        <span className="text-xs text-indigo-700 font-semibold">{fmtConMoneda(i.yaReportado, i.moneda)}</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-extrabold text-amber-700 text-sm">{fmtConMoneda(i.saldo, i.moneda)}</span>
                      {i.moneda === 'VES' && i.tasaCambio && i.tasaCambio > 0 && (
                        <span className="block text-[10px] text-amber-600 font-normal">≈ ${fmt(i.saldo / i.tasaCambio)}</span>
                      )}
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
                  <td colSpan={10} className="px-4 py-12 text-center text-oriental-gray text-sm">
                    Sin resultados con los filtros actuales
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Barra inferior de selección múltiple */}
      {idsSeleccionados.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-indigo-700 text-white shadow-2xl z-30">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider opacity-80">Seleccionados</p>
              <p className="text-lg font-extrabold">
                {idsSeleccionados.length} pago{idsSeleccionados.length > 1 ? 's' : ''} · ${fmt(totalLoteUSD)} USD
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={deseleccionarTodos}
                className="px-3 py-2 text-xs font-semibold text-white/80 hover:text-white"
              >
                Limpiar
              </button>
              <button
                onClick={() => setMostrarModalLote(true)}
                disabled={loteTieneDirectosBloqueados}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-indigo-700 text-sm font-bold hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <Send size={14} />
                Reportar a Vehimotors
              </button>
            </div>
          </div>
          {loteTieneDirectosBloqueados && (
            <div className="bg-amber-600 text-white text-xs px-4 py-2 text-center">
              Hay pagos directos a VM en tu selección. Solo el director puede reportarlos.
            </div>
          )}
        </div>
      )}

      {/* Modal individual (mismo de la pantalla de detalle) */}
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

      {/* Modal de confirmación del lote */}
      {mostrarModalLote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={e => e.target === e.currentTarget && !enviandoLote && setMostrarModalLote(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Building2 size={18} className="text-indigo-700" />
                </div>
                <div>
                  <h3 className="font-bold text-oriental-black text-base">Reportar lote a Vehimotors</h3>
                  <p className="text-[11px] text-oriental-gray">Revisa los montos antes de enviar</p>
                </div>
              </div>
              <button onClick={() => !enviandoLote && setMostrarModalLote(false)} className="text-oriental-gray hover:text-oriental-black p-1" disabled={enviandoLote}>
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {resultadoLote && resultadoLote.guardados > 0 && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-green-800">¡Reportado!</p>
                    <p className="text-xs text-green-700">{resultadoLote.guardados} pago{resultadoLote.guardados > 1 ? 's' : ''} guardado{resultadoLote.guardados > 1 ? 's' : ''} y correo enviado.</p>
                  </div>
                </div>
              )}

              {resultadoLote && resultadoLote.errores.length > 0 && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={16} className="text-red-600" />
                    <p className="text-sm font-bold text-red-800">Errores en {resultadoLote.errores.length} ítem(s):</p>
                  </div>
                  <ul className="text-xs text-red-700 space-y-1 ml-6 list-disc">
                    {resultadoLote.errores.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}

              <p className="text-xs text-oriental-gray mb-3">
                Cada reporte se asigna al cliente que pagó (mismo cliente). Para cambiar el cliente destino, usa el botón "Reportar" individual en cada fila.
                <br />
                <span className="text-amber-700 font-semibold">El monto se ingresa en la moneda original del ingreso</span> (Bs. para VES, $ para USD/USDT). El total se calcula en USD.
              </p>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-2 py-2 text-[11px] font-semibold text-oriental-gray uppercase">Recibo</th>
                    <th className="text-left px-2 py-2 text-[11px] font-semibold text-oriental-gray uppercase">Cliente</th>
                    <th className="text-left px-2 py-2 text-[11px] font-semibold text-oriental-gray uppercase">Placa</th>
                    <th className="text-center px-2 py-2 text-[11px] font-semibold text-oriental-gray uppercase">Mon.</th>
                    <th className="text-right px-2 py-2 text-[11px] font-semibold text-oriental-gray uppercase">Saldo</th>
                    <th className="text-right px-2 py-2 text-[11px] font-semibold text-indigo-700 uppercase">A reportar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ingresosSeleccionados.map(i => {
                    const montoActual = parseFloat(montosLote[i.id] ?? i.saldo.toString()) || 0
                    const usdEquiv = i.moneda === 'VES' && i.tasaCambio && i.tasaCambio > 0 ? montoActual / i.tasaCambio : null
                    return (
                      <tr key={i.id}>
                        <td className="px-2 py-2 font-mono text-[11px] text-oriental-gray">{i.numeroRecibo}</td>
                        <td className="px-2 py-2 text-xs truncate max-w-[180px]" title={i.cliente?.nombre}>{i.cliente?.nombre ?? '—'}</td>
                        <td className="px-2 py-2 text-[11px] font-mono">{i.placa ?? '—'}</td>
                        <td className="px-2 py-2 text-center">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${i.moneda === 'VES' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                            {i.moneda}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right text-xs text-amber-700 font-bold whitespace-nowrap">{fmtConMoneda(i.saldo, i.moneda)}</td>
                        <td className="px-2 py-2 text-right">
                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-oriental-gray font-bold">{i.moneda === 'VES' ? 'Bs.' : '$'}</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={montosLote[i.id] ?? i.saldo.toString()}
                                onChange={e => setMontosLote(prev => ({ ...prev, [i.id]: e.target.value }))}
                                className="w-28 px-2 py-1 border border-gray-200 rounded text-right text-sm font-bold focus:outline-none focus:border-indigo-500"
                                disabled={enviandoLote || (resultadoLote?.guardados ?? 0) > 0}
                              />
                            </div>
                            {usdEquiv !== null && (
                              <span className="text-[10px] text-oriental-gray mt-0.5">≈ ${fmt(usdEquiv)}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-indigo-50">
                    <td colSpan={5} className="px-2 py-3 text-right text-xs font-bold uppercase tracking-wider text-indigo-900">Total consolidado en USD</td>
                    <td className="px-2 py-3 text-right text-lg font-extrabold text-indigo-900">${fmt(totalLoteUSD)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => !enviandoLote && setMostrarModalLote(false)}
                disabled={enviandoLote}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-oriental-gray hover:bg-gray-50 disabled:opacity-50"
              >
                {(resultadoLote?.guardados ?? 0) > 0 ? 'Cerrar' : 'Cancelar'}
              </button>
              {(resultadoLote?.guardados ?? 0) === 0 && (
                <button
                  onClick={confirmarLote}
                  disabled={enviandoLote}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-700 text-white text-sm font-bold hover:bg-indigo-800 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {enviandoLote ? 'Enviando...' : <><Send size={14} /> Confirmar y enviar correo</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
