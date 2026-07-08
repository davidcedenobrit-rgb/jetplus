'use client'

import { useState, useEffect, useMemo } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Cotizacion {
  id: string
  numero: string
  fecha: string
  marca: string
  modelo: string
  modalidad: string
  plan: string
  total_inicial: number
  cuota_mensual: number | null
  estado: string
  descuento_solicitado: boolean
  motivo_rechazo: string | null
  created_at: string
}

interface ClienteAgrupado {
  ci_rif: string
  nombre: string
  correo: string
  telefono: string | null
  direccion: string | null
  ciudad_estado: string | null
  cotizaciones: Cotizacion[]
  ultimaFecha: string
  diasDesdeUltima: number
}

function fmt(n: number | null | undefined) {
  if (n == null) return '0,00'
  return Number(n).toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(Number(n))*100)%100===0?0:2, maximumFractionDigits: 2 })
}

function fmtFecha(s: string) {
  try { return new Date(s + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return s }
}

function diasEntre(a: string, b: string) {
  const da = new Date(a + 'T12:00:00').getTime()
  const db = new Date(b + 'T12:00:00').getTime()
  return Math.round(Math.abs(da - db) / 86_400_000)
}

const ESTADO_CFG: Record<string, { label: string; cls: string }> = {
  sin_respuesta: { label: 'Sin respuesta', cls: 'bg-gray-100 text-gray-600' },
  aceptada:      { label: 'Aceptada',      cls: 'bg-green-100 text-green-700' },
  rechazada:     { label: 'No interesó',   cls: 'bg-red-100 text-red-700' },
  pospuesta:     { label: 'Por ahora no',  cls: 'bg-amber-100 text-amber-700' },
}

function EstadoBadge({ estado }: { estado: string }) {
  const cfg = ESTADO_CFG[estado] ?? ESTADO_CFG.sin_respuesta
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
}

function PlanBadge({ modalidad, plan }: { modalidad: string; plan: string }) {
  if (modalidad === 'contado') return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Contado</span>
  if (plan === 'banco_100') return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">100% Banco</span>
  if (modalidad === 'ac500') return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-900 text-white">AC500</span>
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">Cred. 24m</span>
}

function ClientePanel({ cliente, onClose }: { cliente: ClienteAgrupado; onClose: () => void }) {
  const sortedCots = [...cliente.cotizaciones].sort((a, b) => b.fecha.localeCompare(a.fecha))
  const intervalos = sortedCots.length > 1
    ? sortedCots.slice(0, -1).map((c, i) => diasEntre(c.fecha, sortedCots[i + 1].fecha))
    : []
  const promedioIntervalo = intervalos.length > 0
    ? Math.round(intervalos.reduce((s, d) => s + d, 0) / intervalos.length)
    : null

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <p className="font-bold text-oriental-black text-sm">{cliente.nombre}</p>
            <p className="text-xs text-gray-400 font-mono">{cliente.ci_rif}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm">✕</button>
        </div>

        <div className="flex-1 px-5 py-4 space-y-4">
          {/* Datos de contacto */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Datos de contacto</p>
            {[
              ['Correo', cliente.correo],
              ['Teléfono', cliente.telefono],
              ['Ciudad', cliente.ciudad_estado],
              ['Dirección', cliente.direccion],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex justify-between items-start gap-2">
                <span className="text-xs text-gray-400 shrink-0">{k}</span>
                <span className="text-xs font-semibold text-oriental-black text-right break-all">{v}</span>
              </div>
            ))}
          </div>

          {/* Resumen de actividad */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-oriental-black rounded-xl p-3 text-center">
              <p className="text-xl font-extrabold text-white">{cliente.cotizaciones.length}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Cotización{cliente.cotizaciones.length !== 1 ? 'es' : ''}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-extrabold text-oriental-black">{cliente.diasDesdeUltima}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Días desde última</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${promedioIntervalo ? 'bg-blue-50' : 'bg-gray-50'}`}>
              <p className="text-xl font-extrabold text-oriental-black">{promedioIntervalo ?? '—'}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Días entre visitas</p>
            </div>
          </div>

          {promedioIntervalo && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-blue-800">
                📅 Patrón de retorno: regresa aprox. cada <strong>{promedioIntervalo} días</strong>
                {promedioIntervalo <= 45 && ' — cliente frecuente'}
                {promedioIntervalo > 45 && promedioIntervalo <= 100 && ' — seguimiento mensual recomendado'}
                {promedioIntervalo > 100 && ' — seguimiento trimestral recomendado'}
              </p>
            </div>
          )}

          {/* Alerta de seguimiento */}
          {cliente.diasDesdeUltima >= 30 && cliente.cotizaciones[0]?.estado === 'sin_respuesta' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-amber-800">
                ⚠️ Sin respuesta hace <strong>{cliente.diasDesdeUltima} días</strong> — buen momento para hacer seguimiento
              </p>
            </div>
          )}

          {/* Historial de cotizaciones */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Historial de cotizaciones</p>
            <div className="space-y-3">
              {sortedCots.map((cot, idx) => (
                <div key={cot.id} className={`border rounded-xl p-3 ${idx === 0 ? 'border-oriental-red/30 bg-red-50/30' : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div>
                      {idx === 0 && <span className="text-[9px] font-bold text-oriental-red uppercase tracking-wider">Más reciente · </span>}
                      <span className="text-[10px] font-mono font-bold text-oriental-red">{cot.numero}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{fmtFecha(cot.fecha)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <EstadoBadge estado={cot.estado} />
                      {cot.descuento_solicitado && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">💬 pidió descuento</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-oriental-black">{cot.marca} {cot.modelo}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <PlanBadge modalidad={cot.modalidad} plan={cot.plan} />
                    <div className="text-right">
                      <p className="text-xs font-bold text-oriental-black">${fmt(cot.total_inicial)}</p>
                      {cot.cuota_mensual && <p className="text-[10px] text-gray-400">{fmt(cot.cuota_mensual)}/mes</p>}
                    </div>
                  </div>
                  {cot.motivo_rechazo && (
                    <p className="text-[10px] text-red-600 italic mt-1.5 border-t border-red-100 pt-1.5">"{cot.motivo_rechazo}"</p>
                  )}
                  {idx < sortedCots.length - 1 && (
                    <p className="text-[10px] text-gray-400 mt-2 text-center border-t border-gray-100 pt-2">
                      ↑ {diasEntre(cot.fecha, sortedCots[idx + 1].fecha)} días después de la anterior
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ClientesHistorialTab() {
  const [raw, setRaw] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [selected, setSelected] = useState<ClienteAgrupado | null>(null)
  const [orden, setOrden] = useState<'reciente' | 'frecuente' | 'pendiente'>('reciente')

  useEffect(() => {
    fetch('/api/cotizaciones?limit=500')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setRaw(data) })
      .finally(() => setLoading(false))
  }, [])

  const hoy = new Date().toISOString().slice(0, 10)

  const clientes = useMemo<ClienteAgrupado[]>(() => {
    const mapa: Record<string, ClienteAgrupado> = {}
    for (const c of raw) {
      const key = (c.cliente_ci_rif ?? '').toLowerCase().trim() || (c.cliente_correo ?? '').toLowerCase().trim()
      if (!key) continue
      if (!mapa[key]) {
        mapa[key] = {
          ci_rif: c.cliente_ci_rif,
          nombre: c.cliente_nombre,
          correo: c.cliente_correo,
          telefono: c.cliente_telefono,
          direccion: c.cliente_direccion,
          ciudad_estado: c.cliente_ciudad_estado,
          cotizaciones: [],
          ultimaFecha: c.fecha,
          diasDesdeUltima: 0,
        }
      }
      const entry = mapa[key]
      entry.cotizaciones.push({
        id: c.id, numero: c.numero, fecha: c.fecha,
        marca: c.marca, modelo: c.modelo,
        modalidad: c.modalidad, plan: c.plan,
        total_inicial: Number(c.total_inicial),
        cuota_mensual: c.cuota_mensual ? Number(c.cuota_mensual) : null,
        estado: c.estado, descuento_solicitado: !!c.descuento_solicitado,
        motivo_rechazo: c.motivo_rechazo, created_at: c.created_at,
      })
      if (c.fecha > entry.ultimaFecha) {
        entry.ultimaFecha = c.fecha
        entry.nombre = c.cliente_nombre
        entry.telefono = c.cliente_telefono
        entry.correo = c.cliente_correo
        entry.direccion = c.cliente_direccion
        entry.ciudad_estado = c.cliente_ciudad_estado
      }
    }
    return Object.values(mapa).map(cl => ({
      ...cl,
      diasDesdeUltima: diasEntre(cl.ultimaFecha, hoy),
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw])

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    let lista = q
      ? clientes.filter(c =>
          c.nombre.toLowerCase().includes(q) ||
          c.ci_rif?.toLowerCase().includes(q) ||
          c.correo?.toLowerCase().includes(q) ||
          c.telefono?.toLowerCase().includes(q)
        )
      : clientes
    if (orden === 'reciente') lista = [...lista].sort((a, b) => b.ultimaFecha.localeCompare(a.ultimaFecha))
    if (orden === 'frecuente') lista = [...lista].sort((a, b) => b.cotizaciones.length - a.cotizaciones.length)
    if (orden === 'pendiente') lista = [...lista].filter(c => c.cotizaciones.some(x => x.estado === 'sin_respuesta' || x.estado === 'pospuesta'))
      .sort((a, b) => b.diasDesdeUltima - a.diasDesdeUltima)
    return lista
  }, [clientes, busqueda, orden])

  if (loading) return <div className="card p-8 text-center text-oriental-gray text-sm">Cargando clientes...</div>

  if (clientes.length === 0) {
    return (
      <div className="card p-16 text-center text-oriental-gray">
        <p className="text-2xl mb-3">👥</p>
        <p className="font-semibold text-sm">No hay clientes registrados todavía.</p>
        <p className="text-xs mt-1">Los clientes aparecerán aquí al generar cotizaciones.</p>
      </div>
    )
  }

  return (
    <div>
      {selected && <ClientePanel cliente={selected} onClose={() => setSelected(null)} />}

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-oriental-black">Historial de clientes</h2>
          <p className="text-xs text-oriental-gray mt-0.5">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} únicos · {raw.length} cotizacione{raw.length !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'reciente', label: 'Más recientes' },
            { key: 'frecuente', label: 'Más activos' },
            { key: 'pendiente', label: 'Pendientes' },
          ] as { key: typeof orden; label: string }[]).map(o => (
            <button key={o.key} onClick={() => setOrden(o.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                orden === o.key ? 'border-oriental-black bg-oriental-black text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Buscador */}
      <div className="relative mb-5">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          placeholder="Buscar por nombre, C.I., correo o teléfono..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oriental-red bg-white"
        />
      </div>

      {filtrados.length === 0 ? (
        <div className="card p-10 text-center text-oriental-gray text-sm">No se encontraron clientes.</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Cliente', 'C.I. / RIF', 'Contacto', 'Cotizaciones', 'Último contacto', 'Días sin contacto', 'Última respuesta'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-oriental-gray uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map(c => {
                  const ultimaCot = [...c.cotizaciones].sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
                  const tieneDescuento = c.cotizaciones.some(x => x.descuento_solicitado)
                  const tienePendiente = c.cotizaciones.some(x => x.estado === 'sin_respuesta' || x.estado === 'pospuesta')
                  return (
                    <tr key={c.ci_rif} onClick={() => setSelected(c)} className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-xs text-oriental-black">{c.nombre}</p>
                        {tieneDescuento && <span className="text-[9px] font-bold text-amber-600">💬 pidió descuento</span>}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-600">{c.ci_rif}</td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-600">{c.correo}</p>
                        {c.telefono && <p className="text-[11px] text-gray-400">{c.telefono}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-oriental-black text-sm">{c.cotizaciones.length}</span>
                          {c.cotizaciones.length > 1 && <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded-full">recurrente</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmtFecha(c.ultimaFecha)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold ${c.diasDesdeUltima >= 60 && tienePendiente ? 'text-red-600' : c.diasDesdeUltima >= 30 && tienePendiente ? 'text-amber-600' : 'text-gray-500'}`}>
                          {c.diasDesdeUltima}d
                        </span>
                      </td>
                      <td className="px-4 py-3"><EstadoBadge estado={ultimaCot?.estado ?? 'sin_respuesta'} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtrados.map(c => {
              const ultimaCot = [...c.cotizaciones].sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
              const tieneDescuento = c.cotizaciones.some(x => x.descuento_solicitado)
              const tienePendiente = ultimaCot?.estado === 'sin_respuesta' || ultimaCot?.estado === 'pospuesta'
              return (
                <div key={c.ci_rif} onClick={() => setSelected(c)} className="card p-4 cursor-pointer active:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-sm text-oriental-black">{c.nombre}</p>
                      <p className="text-[11px] font-mono text-gray-400">{c.ci_rif}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <EstadoBadge estado={ultimaCot?.estado ?? 'sin_respuesta'} />
                      {c.cotizaciones.length > 1 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{c.cotizaciones.length} visitas</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">{c.correo}</p>
                  {c.telefono && <p className="text-[11px] text-gray-400">{c.telefono}</p>}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                    <span className="text-[11px] text-gray-400">Último: {fmtFecha(c.ultimaFecha)}</span>
                    <div className="flex items-center gap-2">
                      {tieneDescuento && <span className="text-[9px] font-bold text-amber-600">💬 descuento</span>}
                      <span className={`text-xs font-bold ${c.diasDesdeUltima >= 60 && tienePendiente ? 'text-red-600' : c.diasDesdeUltima >= 30 && tienePendiente ? 'text-amber-600' : 'text-gray-400'}`}>
                        {c.diasDesdeUltima}d sin contacto
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
