'use client'

import { useState, useEffect } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Vehiculo {
  id: string
  brand: string
  model: string
  img_url: string | null
  cash: number | null
  gc: number | null
  gcr: number | null
  tasa_credito: number | null
  disponible: boolean | null
  placa_monto?: number | null
  poliza_vehiculo_banco?: number | null
  poliza_vida_banco?: number | null
  honorarios_banco?: number | null
  gastos_internos_banco?: number | null
  alfombras_banco?: number | null
  diferencial_pct?: number | null
  tasa_banco_pct?: number | null
}

interface PlanAC500 {
  id: string
  marca: string
  modelo: string
  meses: number
  cuota_0: number
  cuota_1: number
  cuota_2: number
  cuota_3: number
  cuota_4: number
  cuota_5: number
  cuota_6: number
  cuota_7: number
  cuota_8: number
  cuota_9: number
  total: number
}

type Step = 'vehiculo' | 'form' | 'sending' | 'success'
type Modalidad = 'contado' | 'credito_24'
type Plan = 'vehimotors' | 'banco_100' | 'ac500'

const ROJAS_CODIGO = 'R000'

function fmt(n: number | null | undefined) {
  if (n == null || n === 0) return '0,00'
  return Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fm(n: number | null | undefined) {
  if (!n) return '0'
  return Number(n).toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function calcResumen(v: Vehiculo, modalidad: Modalidad, plan: Plan) {
  const precio = v.cash ?? 0
  const iva = precio * 0.16
  if (modalidad === 'contado') {
    const gastos = v.gc ?? 0
    return { label: 'TOTAL A PAGAR', total: precio + iva + gastos, cuota: null, financiamiento: null }
  }
  if (plan === 'banco_100') {
    const placaMonto = v.placa_monto ?? 400
    const totalVeh = precio + iva + placaMonto
    const fin = totalVeh * 0.70
    const dif = fin * (v.diferencial_pct ?? 30) / 100
    const gastosBanco = (v.poliza_vehiculo_banco ?? 0) + (v.poliza_vida_banco ?? 0) + (v.honorarios_banco ?? 0) + (v.gastos_internos_banco ?? 0) + (v.alfombras_banco ?? 0)
    const gastos = gastosBanco + dif
    const inicial = totalVeh * 0.30
    const tasaBanco = v.tasa_banco_pct ?? 16
    const r = tasaBanco / 100 / 12
    const cuota = fin * r * Math.pow(1 + r, 24) / (Math.pow(1 + r, 24) - 1)
    return { label: 'TOTAL INICIAL A PAGAR', total: inicial + gastos, cuota, financiamiento: fin }
  }
  const gastos = v.gcr ?? 0
  const inicial = precio * 0.4 + iva + gastos
  return { label: 'INICIAL A PAGAR', total: inicial, cuota: v.tasa_credito ?? 0, financiamiento: precio * 0.6 }
}

function buildCuotasPreview(p: PlanAC500): { label: string; monto: number }[] {
  const arr: { label: string; monto: number }[] = [{ label: 'Cuota 0 — Reserva (Pago inicial)', monto: p.cuota_0 }]
  for (let i = 1; i <= p.meses; i++) {
    arr.push({
      label: i === p.meses ? `Cuota ${i} (Entrega)` : `Cuota ${i}`,
      monto: p[`cuota_${i}` as keyof PlanAC500] as number,
    })
  }
  return arr
}

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red bg-white'
const labelCls = 'block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1'

export default function CotizacionCDMTab({ catalogo }: { catalogo: any[] }) {
  const disponibles: Vehiculo[] = catalogo

  const [step, setStep] = useState<Step>('vehiculo')
  const [vehiculoSel, setVehiculoSel] = useState<Vehiculo | null>(null)
  const [modalidad, setModalidad] = useState<Modalidad>('contado')
  const [plan, setPlan] = useState<Plan>('vehimotors')
  const [form, setForm] = useState({ clienteNombre: '', clienteCiRif: '', clienteCorreo: '', clienteTelefono: '', clienteDireccion: '', clienteCiudadEstado: '', clienteCodigoPostal: '', agenteRetencion: false })
  const [errorMsg, setErrorMsg] = useState('')
  const [numeroCot, setNumeroCot] = useState('')

  // AC500
  const [ac500Meses, setAc500Meses] = useState<6 | 9>(6)
  const [planesAC500, setPlanesAC500] = useState<PlanAC500[]>([])
  const [planAC500Sel, setPlanAC500Sel] = useState<PlanAC500 | null>(null)
  const [loadingPlanes, setLoadingPlanes] = useState(false)

  // Load AC500 plans when plan=ac500 or meses changes
  useEffect(() => {
    if (plan !== 'ac500') return
    setLoadingPlanes(true)
    setPlanAC500Sel(null)
    fetch(`/api/planes-ac500?meses=${ac500Meses}`)
      .then(r => r.json())
      .then((data: PlanAC500[]) => {
        const lista = data ?? []
        const filtered = vehiculoSel ? lista.filter(p => p.marca === vehiculoSel.brand) : lista
        setPlanesAC500(filtered)
        setLoadingPlanes(false)
      })
      .catch(() => setLoadingPlanes(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, ac500Meses, vehiculoSel?.brand])

  function seleccionarVehiculo(v: Vehiculo) {
    setVehiculoSel(v)
    setModalidad('contado')
    setPlan('vehimotors')
    setPlanAC500Sel(null)
    setStep('form')
  }

  async function enviar() {
    if (!vehiculoSel) return
    if (!form.clienteNombre.trim() || !form.clienteCiRif.trim() || !form.clienteCorreo.trim()) { setErrorMsg('Nombre, C.I./RIF y correo son obligatorios.'); return }
    if (!/\S+@\S+\.\S+/.test(form.clienteCorreo.trim())) { setErrorMsg('El correo no es válido.'); return }
    if (plan === 'ac500' && !planAC500Sel) { setErrorMsg('Selecciona un modelo del plan Asegúrate con $500.'); return }
    setStep('sending'); setErrorMsg('')
    try {
      const r = await fetch('/api/cotizaciones', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: ROJAS_CODIGO, vehiculoId: vehiculoSel.id,
          clienteNombre: form.clienteNombre, clienteCiRif: form.clienteCiRif,
          clienteCorreo: form.clienteCorreo, clienteTelefono: form.clienteTelefono || null,
          clienteDireccion: form.clienteDireccion || null, clienteCiudadEstado: form.clienteCiudadEstado || null,
          clienteCodigoPostal: form.clienteCodigoPostal || null, agenteRetencion: form.agenteRetencion,
          modalidad: 'credito_24',
          plan,
          ...(plan === 'ac500' && planAC500Sel ? { ac500PlanId: planAC500Sel.id, ac500Meses } : {}),
        }),
      })
      const json = await r.json()
      if (json.ok) { setNumeroCot(json.numero); setStep('success') }
      else { setErrorMsg(json.error ?? 'Error al generar.'); setStep('form') }
    } catch { setErrorMsg('Error de conexión.'); setStep('form') }
  }

  function reset() {
    setStep('vehiculo'); setVehiculoSel(null); setModalidad('contado'); setPlan('vehimotors')
    setForm({ clienteNombre: '', clienteCiRif: '', clienteCorreo: '', clienteTelefono: '', clienteDireccion: '', clienteCiudadEstado: '', clienteCodigoPostal: '', agenteRetencion: false })
    setErrorMsg(''); setNumeroCot('')
    setPlanAC500Sel(null); setPlanesAC500([])
  }

  const resumen = vehiculoSel
    ? plan === 'ac500'
      ? planAC500Sel
        ? { label: 'PAGO INICIAL (Cuota 0)', total: planAC500Sel.cuota_0, cuota: null, financiamiento: planAC500Sel.total - planAC500Sel.cuota_0 }
        : null
      : calcResumen(vehiculoSel, modalidad, plan)
    : null

  /* ── PASO 1: Seleccionar vehículo ── */
  if (step === 'vehiculo') {
    return (
      <div>
        <div className="mb-5">
          <h2 className="text-base font-bold text-oriental-black">Generar cotización</h2>
          <p className="text-sm text-oriental-gray mt-1">Todos los modelos del catálogo — los marcados como "No público" no aparecen en la web</p>
        </div>

        {disponibles.length === 0 ? (
          <div className="card p-12 text-center text-oriental-gray">
            <p className="text-2xl mb-3">🚗</p>
            <p className="font-semibold">No hay vehículos disponibles en showroom.</p>
            <p className="text-sm mt-1">Actívalos desde la pestaña Catálogo de vehículos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {disponibles.map(v => (
              <button
                key={v.id}
                onClick={() => seleccionarVehiculo(v)}
                className="card p-4 text-left hover:border-oriental-red hover:shadow-md transition-all group"
              >
                {v.img_url && (
                  <div className="w-full h-36 rounded-lg overflow-hidden mb-3 bg-gray-50">
                    <img src={v.img_url} alt={v.model} className="w-full h-full object-contain" />
                  </div>
                )}
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <p className="text-[10px] font-bold text-oriental-red uppercase tracking-widest">{v.brand}</p>
                  {!v.disponible && (
                    <span className="text-[9px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full whitespace-nowrap">No público</span>
                  )}
                </div>
                <p className="font-bold text-oriental-black text-sm mb-2">{v.model}</p>
                <p className="text-xs text-oriental-gray">Precio base: <span className="font-bold text-oriental-black">${fm(v.cash)}</span></p>
                <div className="mt-3 pt-2 border-t border-gray-100 flex justify-end">
                  <span className="text-xs font-semibold text-oriental-red group-hover:underline">Seleccionar →</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  /* ── PASO 2: Formulario ── */
  if (step === 'form' || step === 'sending') {
    const isSending = step === 'sending'
    const cuotasPreview = planAC500Sel ? buildCuotasPreview(planAC500Sel) : []

    return (
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStep('vehiculo')} className="text-oriental-gray hover:text-oriental-black text-sm font-medium">← Cambiar vehículo</button>
          <span className="text-gray-300">|</span>
          <h2 className="text-base font-bold text-oriental-black">{vehiculoSel?.brand} {vehiculoSel?.model}</h2>
        </div>

        {/* Modalidad */}
        <div className="card p-4 mb-4">
          <p className={labelCls}>Modalidad de venta</p>
          <div className="flex gap-2 flex-wrap">
            {([['contado', 'Contado'], ['credito_24', 'Crédito 24 meses']] as [Modalidad, string][]).map(([val, lbl]) => (
              <button key={val} onClick={() => { setModalidad(val); if (val === 'contado') setPlan('vehimotors') }}
                className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-semibold transition-all ${modalidad === val && plan !== 'ac500' ? 'border-oriental-black bg-oriental-black text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                {lbl}
              </button>
            ))}
            <button
              onClick={() => { setModalidad('credito_24'); setPlan('ac500') }}
              className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-semibold transition-all ${plan === 'ac500' ? 'border-blue-800 bg-blue-800 text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              🛡 Asegúrate $500
            </button>
          </div>

          {/* Sub-plan para crédito 24 */}
          {modalidad === 'credito_24' && plan !== 'ac500' && (
            <div className="mt-3">
              <p className={labelCls}>Plan de financiamiento</p>
              <div className="flex gap-2">
                {(['vehimotors', 'banco_100'] as Plan[]).map(p => (
                  <button key={p} onClick={() => setPlan(p)}
                    className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-semibold transition-all ${plan === p ? 'border-oriental-red bg-oriental-red text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    {p === 'vehimotors' ? 'Plan Vehimotors' : 'Plan 100% Banco'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AC500 — selector de meses y plan */}
          {plan === 'ac500' && (
            <div className="mt-3 space-y-3">
              <div>
                <p className={labelCls}>Plazo</p>
                <div className="flex gap-2">
                  {([6, 9] as (6 | 9)[]).map(m => (
                    <button key={m} onClick={() => setAc500Meses(m)}
                      className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-semibold transition-all ${ac500Meses === m ? 'border-blue-800 bg-blue-800 text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {m} meses
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className={labelCls}>Modelo del plan</p>
                {loadingPlanes ? (
                  <p className="text-xs text-gray-400 py-2">Cargando planes...</p>
                ) : planesAC500.length === 0 ? (
                  <p className="text-xs text-amber-700 py-2">No hay planes disponibles para esta marca.</p>
                ) : (
                  <select
                    className={inputCls}
                    value={planAC500Sel?.id ?? ''}
                    onChange={e => {
                      const found = planesAC500.find(p => p.id === e.target.value) ?? null
                      setPlanAC500Sel(found)
                    }}
                  >
                    <option value="">— Seleccionar modelo —</option>
                    {planesAC500.map(p => (
                      <option key={p.id} value={p.id}>{p.modelo}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Cuota schedule preview */}
              {planAC500Sel && cuotasPreview.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-2">
                    Plan {planAC500Sel.meses} meses — {planAC500Sel.modelo}
                  </p>
                  <div className="space-y-1">
                    {cuotasPreview.map((c, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">{c.label}</span>
                        <span className={`text-xs font-bold ${i === 0 ? 'text-blue-800' : 'text-gray-800'}`}>${fmt(c.monto)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-1 mt-1 border-t border-blue-300">
                      <span className="text-xs font-bold text-blue-900 uppercase">Total</span>
                      <span className="text-sm font-bold text-blue-900">${fmt(planAC500Sel.total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resumen financiero (non-AC500) */}
          {resumen && plan !== 'ac500' && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2">Resumen estimado</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">{resumen.label}</span>
                <span className="text-sm font-bold text-amber-900">${fmt(resumen.total)}</span>
              </div>
              {resumen.cuota != null && resumen.cuota > 0 && (
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-600">Cuota mensual × 24</span>
                  <span className="text-sm font-bold text-amber-700">${fmt(resumen.cuota)}</span>
                </div>
              )}
            </div>
          )}

          {/* Resumen AC500 — inicial */}
          {plan === 'ac500' && resumen && (
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">{resumen.label}</span>
                <span className="text-sm font-bold text-blue-900">${fmt(resumen.total)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Datos del cliente */}
        <div className="card p-4 mb-4">
          <p className="text-xs font-bold text-oriental-black uppercase tracking-wider mb-4">Datos del cliente</p>
          <div className="grid gap-3">
            <div>
              <label className={labelCls}>Nombre completo *</label>
              <input className={inputCls} value={form.clienteNombre} onChange={e => setForm(p => ({ ...p, clienteNombre: e.target.value }))} placeholder="Nombre del cliente" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>C.I. / RIF *</label>
                <input className={inputCls} value={form.clienteCiRif} onChange={e => setForm(p => ({ ...p, clienteCiRif: e.target.value }))} placeholder="V-12345678" />
              </div>
              <div>
                <label className={labelCls}>Teléfono</label>
                <input className={inputCls} value={form.clienteTelefono} onChange={e => setForm(p => ({ ...p, clienteTelefono: e.target.value }))} placeholder="0414-..." />
              </div>
            </div>
            <div>
              <label className={labelCls}>Correo electrónico *</label>
              <input className={inputCls} type="email" value={form.clienteCorreo} onChange={e => setForm(p => ({ ...p, clienteCorreo: e.target.value }))} placeholder="cliente@email.com" />
            </div>
            <div>
              <label className={labelCls}>Dirección</label>
              <input className={inputCls} value={form.clienteDireccion} onChange={e => setForm(p => ({ ...p, clienteDireccion: e.target.value }))} placeholder="Av. Principal..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Ciudad / Estado</label>
                <input className={inputCls} value={form.clienteCiudadEstado} onChange={e => setForm(p => ({ ...p, clienteCiudadEstado: e.target.value }))} placeholder="Maturín - Monagas" />
              </div>
              <div>
                <label className={labelCls}>Código Postal</label>
                <input className={inputCls} value={form.clienteCodigoPostal} onChange={e => setForm(p => ({ ...p, clienteCodigoPostal: e.target.value }))} placeholder="6201" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 font-medium">
              <input type="checkbox" checked={form.agenteRetencion} onChange={e => setForm(p => ({ ...p, agenteRetencion: e.target.checked }))} className="w-4 h-4 accent-oriental-red" />
              Agente de Retención
            </label>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            <p className="text-sm text-red-600 font-semibold">{errorMsg}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => setStep('vehiculo')} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={enviar} disabled={isSending}
            className="flex-1 py-2.5 bg-oriental-red text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50">
            {isSending ? 'Generando cotización...' : '📄 Generar y enviar cotización'}
          </button>
        </div>
      </div>
    )
  }

  /* ── PASO 3: Éxito ── */
  return (
    <div className="max-w-md mx-auto text-center py-12">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
      <h3 className="text-xl font-bold text-oriental-black mb-2">¡Cotización enviada!</h3>
      <p className="text-sm text-oriental-gray mb-1">
        Número: <strong className="text-oriental-red">{numeroCot}</strong>
      </p>
      <p className="text-sm text-oriental-gray mb-8">El PDF fue enviado al correo del cliente.</p>
      <button onClick={reset} className="w-full py-2.5 bg-oriental-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors">
        Generar otra cotización
      </button>
    </div>
  )
}
