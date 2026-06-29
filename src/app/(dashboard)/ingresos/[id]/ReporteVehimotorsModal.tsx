'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X, Search, Send, AlertCircle, Building2, Car } from 'lucide-react'
import {
  crearReporteVehimotors,
  buscarClientes,
  getVehiculosCliente,
} from './reportes-vehimotors-actions'

const METODOS_DIRECTOS_VM = ['Transferencia bancaria a Vehimotor', 'USDT VE']
const ROL_DIRECTOR = ['jose', 'admin', 'director']

interface Cliente {
  id: string
  nombre: string
  cedula_rif: string | null
}

interface Vehiculo {
  id: string
  marca: string
  modelo: string
  placa: string | null
  proforma_vehimotors: string | null
}

interface Props {
  ingresoId: string
  ingresoMonto: number
  ingresoMoneda: string
  metodoPago: string | null
  clienteOriginal: Cliente
  totalYaReportado: number
  rol: string
  onClose: () => void
}

function fmtUSD(n: number) {
  return `$${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function ReporteVehimotorsModal({
  ingresoId,
  ingresoMonto,
  ingresoMoneda,
  metodoPago,
  clienteOriginal,
  totalYaReportado,
  rol,
  onClose,
}: Props) {
  const router = useRouter()
  const esJose = ROL_DIRECTOR.includes(rol)
  const esDirecto = METODOS_DIRECTOS_VM.includes(metodoPago ?? '')

  const puedeCambiarCliente = esJose && !esDirecto
  const bloqueadoPorPermiso = esDirecto && !esJose

  const saldoRestante = Math.max(0, ingresoMonto - totalYaReportado)

  // Estado del formulario
  const [clienteSel, setClienteSel] = useState<Cliente>(clienteOriginal)
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [vehiculoSel, setVehiculoSel] = useState<Vehiculo | null>(null)
  const [proformaManual, setProformaManual] = useState('')
  const [monto, setMonto] = useState(saldoRestante > 0 ? saldoRestante.toString() : '')
  const [observaciones, setObservaciones] = useState('')

  // Búsqueda de cliente (solo si esJose && !esDirecto)
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<Cliente[]>([])
  const [buscando, setBuscando] = useState(false)
  const [mostrarResultados, setMostrarResultados] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Cargar vehículos del cliente seleccionado
  const cargarVehiculos = useCallback(async (clienteId: string) => {
    const { vehiculos: vhs } = await getVehiculosCliente(clienteId)
    setVehiculos(vhs)
    if (vhs.length === 1) {
      setVehiculoSel(vhs[0])
      setProformaManual(vhs[0].proforma_vehimotors ?? '')
    } else {
      setVehiculoSel(null)
      setProformaManual('')
    }
  }, [])

  useEffect(() => {
    cargarVehiculos(clienteOriginal.id)
  }, [clienteOriginal.id, cargarVehiculos])

  // Búsqueda con debounce
  useEffect(() => {
    if (!puedeCambiarCliente || busqueda.trim().length < 2) {
      setResultados([])
      return
    }
    const t = setTimeout(async () => {
      setBuscando(true)
      const { clientes } = await buscarClientes(busqueda)
      setResultados(clientes)
      setBuscando(false)
    }, 250)
    return () => clearTimeout(t)
  }, [busqueda, puedeCambiarCliente])

  function elegirCliente(c: Cliente) {
    setClienteSel(c)
    setBusqueda('')
    setMostrarResultados(false)
    setResultados([])
    cargarVehiculos(c.id)
  }

  function elegirVehiculo(v: Vehiculo | null) {
    setVehiculoSel(v)
    setProformaManual(v?.proforma_vehimotors ?? '')
  }

  async function reportar() {
    setError('')
    const montoNum = parseFloat(monto)
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      setError('El monto debe ser mayor a 0')
      return
    }

    setLoading(true)
    const res = await crearReporteVehimotors({
      ingresoId,
      clienteReportadoId: clienteSel.id,
      vehiculoId: vehiculoSel?.id ?? null,
      placa: vehiculoSel?.placa ?? null,
      proformaVehimotors: proformaManual || vehiculoSel?.proforma_vehimotors || null,
      montoReportado: montoNum,
      observaciones: observaciones || null,
    })
    setLoading(false)

    if ('error' in res && res.error) {
      setError(res.error)
      return
    }
    onClose()
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Building2 size={18} className="text-indigo-700" />
            </div>
            <div>
              <h3 className="font-bold text-oriental-black text-base">Reportar a Vehimotors</h3>
              <p className="text-[11px] text-oriental-gray">Asignar pago a un cliente para informar a VM</p>
            </div>
          </div>
          <button onClick={onClose} className="text-oriental-gray hover:text-oriental-black p-1"><X size={20} /></button>
        </div>

        {bloqueadoPorPermiso && (
          <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex items-start gap-2">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Solo José Rojas puede reportar este pago</p>
              <p className="text-xs text-red-600 mt-0.5">El método "{metodoPago}" es un pago directo a Vehimotors y requiere autorización del director.</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Resumen del ingreso */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-[10px] font-bold text-oriental-gray uppercase tracking-wider mb-2">Resumen del ingreso</p>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-[11px] text-oriental-gray">Pagó</p>
                <p className="font-semibold text-oriental-black truncate">{clienteOriginal.nombre}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-oriental-gray">Total ingreso</p>
                <p className="font-bold text-oriental-black">{fmtUSD(ingresoMonto)} <span className="text-[10px] text-oriental-gray">{ingresoMoneda}</span></p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-oriental-gray">Ya reportado</p>
                <p className="font-bold text-indigo-700">{fmtUSD(totalYaReportado)}</p>
              </div>
            </div>
            <div className={`mt-3 pt-3 border-t border-gray-200 flex justify-between items-center ${saldoRestante > 0 ? 'text-amber-700' : 'text-green-700'}`}>
              <span className="text-xs font-bold uppercase tracking-wider">Saldo por reportar</span>
              <span className="text-lg font-extrabold">{fmtUSD(saldoRestante)}</span>
            </div>
            {esDirecto && (
              <p className="text-[11px] text-indigo-700 mt-2 font-medium">
                ⚡ Pago directo a Vehimotors — debe reportarse al cliente que pagó.
              </p>
            )}
          </div>

          {/* Cliente destino */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Cliente a reportar</label>
            {puedeCambiarCliente ? (
              <div className="relative">
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-oriental-black text-sm truncate">{clienteSel.nombre}</p>
                    <p className="text-[11px] text-oriental-gray">{clienteSel.cedula_rif ?? '—'}</p>
                  </div>
                  <button
                    onClick={() => setMostrarResultados(!mostrarResultados)}
                    className="text-[11px] text-oriental-red font-semibold hover:underline whitespace-nowrap"
                  >
                    Cambiar
                  </button>
                </div>
                {mostrarResultados && (
                  <div className="mt-2 border border-gray-200 rounded-lg p-2 bg-white shadow-sm">
                    <div className="relative mb-2">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray" />
                      <input
                        type="text"
                        autoFocus
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        placeholder="Buscar por nombre o cédula..."
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red"
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {buscando && <p className="text-xs text-oriental-gray py-2 text-center">Buscando...</p>}
                      {!buscando && busqueda.length >= 2 && resultados.length === 0 && (
                        <p className="text-xs text-oriental-gray py-2 text-center">Sin resultados</p>
                      )}
                      {resultados.map(c => (
                        <button
                          key={c.id}
                          onClick={() => elegirCliente(c)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-sm transition-colors"
                        >
                          <p className="font-semibold text-oriental-black">{c.nombre}</p>
                          <p className="text-[11px] text-oriental-gray">{c.cedula_rif ?? '—'}</p>
                        </button>
                      ))}
                      {!busqueda && (
                        <p className="text-xs text-oriental-gray py-2 text-center">Escribe 2+ caracteres</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                <p className="font-semibold text-oriental-black text-sm">{clienteSel.nombre}</p>
                <p className="text-[11px] text-oriental-gray">{clienteSel.cedula_rif ?? '—'}</p>
                {!esJose && (
                  <p className="text-[11px] text-amber-700 mt-1.5">Solo el director puede cambiar el cliente reportado</p>
                )}
              </div>
            )}
          </div>

          {/* Vehículo + Proforma */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Vehículo a reportar</label>
            {vehiculos.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-700">
                <Car size={13} className="inline mr-1" /> Este cliente no tiene vehículos registrados.
              </div>
            ) : (
              <select
                value={vehiculoSel?.id ?? ''}
                onChange={e => {
                  const v = vehiculos.find(x => x.id === e.target.value)
                  elegirVehiculo(v ?? null)
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red"
              >
                <option value="">Seleccionar vehículo...</option>
                {vehiculos.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.marca} {v.modelo} {v.placa ? `· ${v.placa}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Proforma Vehimotors</label>
            <input
              type="text"
              value={proformaManual}
              onChange={e => setProformaManual(e.target.value)}
              placeholder="S05750"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-oriental-red"
            />
            {vehiculoSel?.proforma_vehimotors && proformaManual !== vehiculoSel.proforma_vehimotors && (
              <p className="text-[11px] text-amber-600 mt-1">Proforma del vehículo: {vehiculoSel.proforma_vehimotors}</p>
            )}
          </div>

          {/* Monto */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Monto a reportar</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-lg font-bold focus:outline-none focus:border-oriental-red"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-[11px] text-oriental-gray">Moneda: {ingresoMoneda}</p>
              {saldoRestante > 0 && (
                <button onClick={() => setMonto(saldoRestante.toString())} className="text-[11px] text-oriental-red font-semibold hover:underline">
                  Usar saldo restante ({fmtUSD(saldoRestante)})
                </button>
              )}
            </div>
            {parseFloat(monto) > saldoRestante && saldoRestante > 0 && (
              <p className="text-[11px] text-blue-700 mt-1.5 bg-blue-50 px-2 py-1.5 rounded">
                ℹ️ Estás reportando más del saldo del ingreso. Esto se permite (cobertura desde bancos).
              </p>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Observaciones (opcional)</label>
            <textarea
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              rows={2}
              placeholder="Notas internas para este reporte..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">
              <AlertCircle size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-oriental-gray hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={reportar}
            disabled={loading || bloqueadoPorPermiso || !monto || parseFloat(monto) <= 0}
            className="flex-1 py-2.5 rounded-xl bg-indigo-700 text-white text-sm font-bold hover:bg-indigo-800 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Reportando...' : <><Send size={14} /> Reportar a VM</>}
          </button>
        </div>
      </div>
    </div>
  )
}
