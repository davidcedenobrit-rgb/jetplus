'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, Loader2, Landmark } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const ROJAS_CODIGO = 'R000'

const CLAVES: { k: string; label: string }[] = [
  { k: 'poliza_vehiculo', label: 'Póliza vehículo' },
  { k: 'poliza_vida', label: 'Póliza vida' },
  { k: 'honorarios', label: 'Honorarios' },
  { k: 'gastos_int', label: 'Gastos internos' },
  { k: 'gastos_vhm', label: 'Gastos Vehimotor' },
  { k: 'transporte', label: 'Transporte' },
  { k: 'accesorios', label: 'Accesorios' },
  { k: 'igtf', label: 'IGTF' },
  { k: 'notaria', label: 'Notaría / otros' },
]

const fmt = (n: number) => Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num = (s: string | undefined) => parseFloat(String(s ?? '').replace(',', '.')) || 0

type Caso = {
  id: string; created_at: string; estado: string
  cliente_nombre: string; cliente_ci_rif: string; cliente_correo: string | null
  cliente_telefono: string | null; cliente_direccion: string | null
  cliente_ciudad_estado: string | null; cliente_codigo_postal: string | null
  concesionario_id: string | null
  vehiculo_id: string | null; marca: string | null; modelo: string | null
  precio_base: number; placa_monto: number
  aprobado_pct: number | null; merma_pct: number | null
  gastos_estructura: any; condiciones: string | null; notas: string | null
  expediente: { url: string; nombre: string | null }[] | null
  cotizacion_id: string | null; cotizado_at: string | null
}

const ESTADOS = [
  { k: 'pendiente_vm', label: 'Pendiente Vehimotors', cls: 'bg-amber-100 text-amber-700' },
  { k: 'cotizado', label: 'Cotizado', cls: 'bg-green-100 text-green-700' },
  { k: 'rechazado', label: 'Rechazado', cls: 'bg-red-100 text-red-700' },
]

export default function BancaNacionalTab({ catalogo = [] }: { catalogo?: any[] }) {
  const [casos, setCasos] = useState<Caso[]>([])
  const [loading, setLoading] = useState(true)
  const [proc, setProc] = useState<Caso | null>(null)

  async function cargar() {
    setLoading(true)
    try {
      const r = await fetch('/api/bn-casos')
      const j = await r.json()
      if (Array.isArray(j)) setCasos(j)
    } catch { /* noop */ }
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  const grupos = useMemo(() => {
    const g: Record<string, Caso[]> = { pendiente_vm: [], cotizado: [], rechazado: [] }
    for (const c of casos) (g[c.estado] ?? (g[c.estado] = [])).push(c)
    return g
  }, [casos])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-oriental-black flex items-center gap-2"><Landmark size={18} className="text-blue-800" /> Banca Nacional</h2>
          <p className="text-sm text-oriental-gray mt-1">Casos gestionados ante el banco vía Vehimotors. Coloca la conversión del día y genera la proforma.</p>
        </div>
        <button onClick={cargar} className="text-xs font-semibold text-blue-700 hover:underline">↻ Actualizar</button>
      </div>

      {loading ? (
        <p className="text-center text-sm text-gray-400 py-10">Cargando casos…</p>
      ) : casos.length === 0 ? (
        <div className="card p-10 text-center text-oriental-gray">
          <p className="text-2xl mb-2">🏦</p>
          <p className="font-semibold">No hay casos de Banca Nacional.</p>
          <p className="text-sm mt-1">Se crean desde Generar cotización → Banca nacional → BN Vehimotors.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {ESTADOS.map(est => (
            grupos[est.k]?.length ? (
              <div key={est.k}>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">{est.label} · {grupos[est.k].length}</p>
                <div className="space-y-2">
                  {grupos[est.k].map(c => (
                    <div key={c.id} className="border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="font-semibold text-oriental-black text-sm truncate">{c.marca} {c.modelo}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${est.cls}`}>{est.label}</span>
                        </div>
                        <p className="text-gray-500 text-xs truncate">{c.cliente_nombre} {c.cliente_ci_rif && <span className="text-gray-400">· {c.cliente_ci_rif}</span>}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Precio base ${fmt(c.precio_base)}{c.aprobado_pct ? ` · Aprobado ${fmt(c.aprobado_pct)}%` : ''}</p>
                        {c.expediente && c.expediente.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {c.expediente.map((d, i) => (
                              <a key={i} href={d.url} target="_blank" rel="noopener noreferrer"
                                className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100">
                                📎 {d.nombre || `Doc ${i + 1}`}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {c.estado === 'cotizado' && c.cotizacion_id && (
                          <a href={`/api/cotizaciones/${c.cotizacion_id}/pdf`} target="_blank" rel="noopener noreferrer"
                            className="px-3 py-1.5 border border-blue-200 rounded-lg text-xs font-bold text-blue-700 hover:bg-blue-50">Ver PDF</a>
                        )}
                        {c.estado === 'pendiente_vm' && (
                          <button onClick={() => setProc(c)}
                            className="px-3 py-1.5 bg-blue-800 hover:bg-blue-900 text-white rounded-lg text-xs font-bold">Procesar aprobación</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          ))}
        </div>
      )}

      {proc && <ProcesarModal caso={proc} catalogo={catalogo} onClose={() => setProc(null)} onDone={() => { setProc(null); cargar() }} />}
    </div>
  )
}

function seedGastos(cat: any): Record<string, string> {
  const n = (x: any) => Number(x ?? 0)
  const out: Record<string, string> = {}
  for (const { k } of CLAVES) {
    // Los gastos de banca nacional se toman de la estructura de contado del carro.
    const val = k === 'notaria' ? 0 : n(cat?.[`${k}_c`])
    out[k] = val ? String(val) : ''
  }
  return out
}

function ProcesarModal({ caso, catalogo, onClose, onDone }: { caso: Caso; catalogo: any[]; onClose: () => void; onDone: () => void }) {
  const cat = useMemo(() => catalogo.find(v => v.id === caso.vehiculo_id), [catalogo, caso.vehiculo_id])
  const [aprobadoPct, setAprobadoPct] = useState(caso.aprobado_pct ? String(caso.aprobado_pct) : '70')
  const [mermaPct, setMermaPct] = useState(caso.merma_pct ? String(caso.merma_pct) : '')
  const [lineas, setLineas] = useState<Record<string, string>>(
    caso.gastos_estructura && typeof caso.gastos_estructura === 'object'
      ? Object.fromEntries(CLAVES.map(({ k }) => [k, caso.gastos_estructura[k] != null ? String(caso.gastos_estructura[k]) : '']))
      : seedGastos(cat)
  )
  const [condiciones, setCondiciones] = useState(caso.condiciones ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const calc = useMemo(() => {
    const precio = Number(caso.precio_base) || 0
    const iva = precio * 0.16
    const placa = Number(caso.placa_monto) || 400
    const gastos = CLAVES.reduce((s, { k }) => s + num(lineas[k]), 0)
    const totalBanco = precio + iva + placa
    const apr = Math.min(100, Math.max(0, num(aprobadoPct)))
    const merma = Math.min(100, Math.max(0, num(mermaPct)))
    const aprobadoBanco = totalBanco * (apr / 100)
    const aprobadoReal = aprobadoBanco * (1 - merma / 100)
    const diferencial = aprobadoBanco - aprobadoReal
    const inicialCliente = totalBanco - aprobadoReal + gastos
    return { precio, iva, placa, gastos, totalBanco, apr, merma, aprobadoBanco, aprobadoReal, diferencial, inicialCliente }
  }, [caso, aprobadoPct, mermaPct, lineas])

  async function generar() {
    if (calc.apr <= 0) { setError('Indica el % aprobado por el banco.'); return }
    if (num(mermaPct) <= 0) { setError('Indica la conversión al día (% de merma).'); return }
    setSaving(true); setError('')
    try {
      // 1) Generar la cotización (reusa numeración, PDF y correo del flujo normal).
      const r = await fetch('/api/cotizaciones', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: ROJAS_CODIGO, vehiculoId: caso.vehiculo_id,
          clienteNombre: caso.cliente_nombre, clienteCiRif: caso.cliente_ci_rif,
          clienteCorreo: caso.cliente_correo ?? '', clienteTelefono: caso.cliente_telefono,
          clienteDireccion: caso.cliente_direccion, clienteCiudadEstado: caso.cliente_ciudad_estado,
          clienteCodigoPostal: caso.cliente_codigo_postal, agenteRetencion: false,
          modalidad: 'contado', plan: 'banca_nacional', cantidad: 1,
          concesionarioId: caso.concesionario_id ?? 'la-oriental',
          precioBaseOverride: caso.precio_base,
          gastosOverride: calc.gastos,
          condicionesPersonalizadas: condiciones.trim() || null,
          bnVehimotors: { aprobadoPct: calc.apr, mermaPct: calc.merma, placaMonto: caso.placa_monto },
        }),
      })
      const j = await r.json()
      if (!j.ok) { setError(j.error ?? 'No se pudo generar la cotización'); setSaving(false); return }
      // 2) Marcar el caso como cotizado.
      await fetch(`/api/bn-casos/${caso.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'cotizado', cotizacion_id: j.id,
          aprobado_pct: calc.apr, merma_pct: calc.merma,
          gastos_estructura: lineas, condiciones: condiciones.trim() || null,
        }),
      })
      setSaving(false); onDone()
    } catch { setError('Error de conexión'); setSaving(false) }
  }

  async function rechazar() {
    setSaving(true)
    await fetch(`/api/bn-casos/${caso.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'rechazado' }),
    })
    setSaving(false); onDone()
  }

  const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && onClose()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-bold text-oriental-black text-base flex items-center gap-2"><Landmark size={16} className="text-blue-800" /> Procesar aprobación</h2>
            <p className="text-xs text-oriental-gray">{caso.marca} {caso.modelo} · {caso.cliente_nombre}</p>
          </div>
          <button onClick={() => !saving && onClose()} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-800">{error}</div>}

          {caso.expediente && caso.expediente.length > 0 && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-2.5">
              <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1.5">Expediente del cliente</p>
              <div className="flex flex-wrap gap-1.5">
                {caso.expediente.map((d, i) => (
                  <a key={i} href={d.url} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] px-2 py-1 rounded-lg bg-white border border-blue-200 text-blue-700 font-semibold hover:bg-blue-100">
                    📎 {d.nombre || `Doc ${i + 1}`}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Aprobado por el banco (%)</label>
              <input className={inp} inputMode="decimal" value={aprobadoPct} onChange={e => setAprobadoPct(e.target.value)} placeholder="70" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Conversión al día (% merma)</label>
              <input className={inp} inputMode="decimal" value={mermaPct} onChange={e => setMermaPct(e.target.value)} placeholder="30" />
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Estructura de gastos ($)</p>
            <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
              {CLAVES.map(({ k, label }) => (
                <div key={k} className="flex items-center justify-between px-3 py-1.5">
                  <span className="text-sm text-gray-600">{label}</span>
                  <input className="w-28 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:border-oriental-red"
                    inputMode="decimal" value={lineas[k] ?? ''} onChange={e => setLineas(p => ({ ...p, [k]: e.target.value }))} />
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
                <span className="text-xs font-bold text-gray-600 uppercase">Gastos totales</span>
                <span className="text-sm font-bold text-oriental-black">${fmt(calc.gastos)}</span>
              </div>
            </div>
          </div>

          {/* Cuadro de resultado */}
          <div className="rounded-xl border border-blue-200 overflow-hidden text-sm">
            <div className="bg-blue-900 px-4 py-2"><p className="text-[11px] font-bold text-white uppercase tracking-wider">Cuadro Banca Nacional</p></div>
            {[
              ['Precio base', calc.precio],
              ['IVA 16%', calc.iva],
              ['Placa', calc.placa],
              ['Total para el banco', calc.totalBanco],
              [`Aprobado banco (${fmt(calc.apr)}%)`, calc.aprobadoBanco],
              [`Conversión al día (−${fmt(calc.merma)}%) → real`, calc.aprobadoReal],
              ['Diferencial', calc.diferencial],
              ['Gastos', calc.gastos],
            ].map(([l, v]) => (
              <div key={String(l)} className="flex justify-between px-4 py-1.5 border-b border-gray-100">
                <span className="text-gray-500 text-xs">{l}</span>
                <span className="font-semibold text-oriental-black text-xs">${fmt(v as number)}</span>
              </div>
            ))}
            <div className="flex justify-between px-4 py-2.5 bg-amber-50">
              <span className="font-bold text-amber-800 text-xs uppercase">Inicial a pagar (cliente)</span>
              <span className="font-extrabold text-amber-900">${fmt(calc.inicialCliente)}</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Condiciones / propuesta (opcional)</label>
            <textarea className={`${inp} resize-none`} rows={3} value={condiciones} onChange={e => setCondiciones(e.target.value)}
              placeholder="Ej: usted paga esta inicial para llevarse el carro; el resto lo cubre el banco en 24 meses." />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={rechazar} disabled={saving} className="px-4 py-2.5 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">Rechazar</button>
            <button onClick={generar} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-blue-800 text-white text-sm font-semibold hover:bg-blue-900 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />} Generar cotización
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
