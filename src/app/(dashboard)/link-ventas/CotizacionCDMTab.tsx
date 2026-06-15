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
  gcr_banco?: number | null
  cuota_banco?: number | null
}

interface AC500Item {
  id: string
  brand: string
  model: string
  reserva: number | null
  p6_activo: boolean | null
  p6_c1: number | null; p6_c2: number | null; p6_c3: number | null
  p6_c4: number | null; p6_c5: number | null; p6_c6: number | null; p6_total: number | null
  p9_activo: boolean | null
  p9_c1: number | null; p9_c2: number | null; p9_c3: number | null
  p9_c4: number | null; p9_c5: number | null; p9_c6: number | null
  p9_c7: number | null; p9_c8: number | null; p9_c9: number | null; p9_total: number | null
  p12_activo: boolean | null
  p12_c1: number | null; p12_c2: number | null; p12_c3: number | null
  p12_c4: number | null; p12_c5: number | null; p12_c6: number | null
  p12_c7: number | null; p12_c8: number | null; p12_c9: number | null
  p12_c10: number | null; p12_c11: number | null; p12_c12: number | null; p12_total: number | null
}

interface AC500Schedule {
  reserva: number
  meses: 6 | 9 | 12
  cuotas: { label: string; monto: number }[]
  total: number
}

type Step = 'vehiculo' | 'form' | 'sending' | 'success'
type Modalidad = 'contado' | 'credito_24' | 'ac500'
type Plan = 'vehimotors' | 'banco_100'
type AC500Meses = 6 | 9 | 12
interface Tasas { tasa_bcv: number; tasa_vhm: number }

const ROJAS_CODIGO = 'R000'

function fmt(n: number | null | undefined) {
  if (n == null || n === 0) return '0,00'
  return Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fm(n: number | null | undefined) {
  if (!n) return '0'
  return Number(n).toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function buildAC500Schedule(v: AC500Item, meses: AC500Meses): AC500Schedule | null {
  const reserva = Number(v.reserva) || 500
  if (meses === 6) {
    if (!v.p6_activo) return null
    const labels = ['Cuota 1 (Día 0)', 'Cuota 2 (Día 30)', 'Cuota 3 (Día 60)', 'Cuota 4 (Día 90)', 'Cuota 5 (Día 120)', 'Cuota 6 (Entrega)']
    const cuotas = [v.p6_c1, v.p6_c2, v.p6_c3, v.p6_c4, v.p6_c5, v.p6_c6].map((m, i) => ({ label: labels[i], monto: Number(m) || 0 }))
    const total = Number(v.p6_total) || (reserva + cuotas.reduce((s, c) => s + c.monto, 0))
    return { reserva, meses, cuotas, total }
  }
  if (meses === 9) {
    if (!v.p9_activo) return null
    const labels = ['Cuota 1 (Día 0)', 'Cuota 2 (Día 30)', 'Cuota 3 (Día 60)', 'Cuota 4 (Día 90)', 'Cuota 5 (Día 120)', 'Cuota 6 (Día 150)', 'Cuota 7 (Día 180)', 'Cuota 8 (Día 210)', 'Cuota 9 (Entrega)']
    const cuotas = [v.p9_c1, v.p9_c2, v.p9_c3, v.p9_c4, v.p9_c5, v.p9_c6, v.p9_c7, v.p9_c8, v.p9_c9].map((m, i) => ({ label: labels[i], monto: Number(m) || 0 }))
    const total = Number(v.p9_total) || (reserva + cuotas.reduce((s, c) => s + c.monto, 0))
    return { reserva, meses, cuotas, total }
  }
  // 12m
  if (!v.p12_activo) return null
  const labels12 = ['Cuota 1 (Día 0)', 'Cuota 2 (Día 30)', 'Cuota 3 (Día 60)', 'Cuota 4 (Día 90)', 'Cuota 5 (Día 120)', 'Cuota 6 (Día 150)', 'Cuota 7 (Día 180)', 'Cuota 8 (Día 210)', 'Cuota 9 (Día 240)', 'Cuota 10 (Día 270)', 'Cuota 11 (Día 300)', 'Cuota 12 (Entrega)']
  const cuotas12 = [v.p12_c1, v.p12_c2, v.p12_c3, v.p12_c4, v.p12_c5, v.p12_c6, v.p12_c7, v.p12_c8, v.p12_c9, v.p12_c10, v.p12_c11, v.p12_c12].map((m, i) => ({ label: labels12[i], monto: Number(m) || 0 }))
  const total12 = Number(v.p12_total) || (reserva + cuotas12.reduce((s, c) => s + c.monto, 0))
  return { reserva, meses, cuotas: cuotas12, total: total12 }
}

function calcResumen(v: Vehiculo, modalidad: Modalidad, plan: Plan, tasas: Tasas | null) {
  if (modalidad === 'ac500') return null
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
    let dif = 0
    if (tasas && tasas.tasa_bcv > 0 && tasas.tasa_vhm > tasas.tasa_bcv)
      dif = fin * (tasas.tasa_vhm - tasas.tasa_bcv) / tasas.tasa_bcv
    const gastos = (v.gcr_banco ?? 0) + dif
    const inicial = totalVeh * 0.30
    return { label: 'TOTAL INICIAL A PAGAR', total: inicial + gastos, cuota: v.cuota_banco ?? 0, financiamiento: fin }
  }
  const gastos = v.gcr ?? 0
  const inicial = precio * 0.4 + iva + gastos
  return { label: 'INICIAL A PAGAR', total: inicial, cuota: v.tasa_credito ?? 0, financiamiento: precio * 0.6 }
}

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red bg-white'
const labelCls = 'block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1'
const selectCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red bg-white'

export default function CotizacionCDMTab({ catalogo, ac500 }: { catalogo: any[]; ac500: any[] }) {
  const disponibles: Vehiculo[] = catalogo
  const ac500Items: AC500Item[] = (ac500 as AC500Item[]).filter(v => v.p6_activo || v.p9_activo || v.p12_activo)

  const [step, setStep] = useState<Step>('vehiculo')
  const [vehiculoSel, setVehiculoSel] = useState<Vehiculo | null>(null)
  const [modalidad, setModalidad] = useState<Modalidad>('contado')
  const [plan, setPlan] = useState<Plan>('vehimotors')
  const [ac500VehSel, setAC500VehSel] = useState<AC500Item | null>(null)
  const [ac500Meses, setAC500Meses] = useState<AC500Meses>(6)
  const [tasas, setTasas] = useState<Tasas | null>(null)
  const [form, setForm] = useState({ clienteNombre: '', clienteCiRif: '', clienteCorreo: '', clienteTelefono: '', clienteDireccion: '', clienteCiudadEstado: '', clienteCodigoPostal: '', agenteRetencion: false })
  const [errorMsg, setErrorMsg] = useState('')
  const [numeroCot, setNumeroCot] = useState('')

  useEffect(() => {
    fetch('/api/cotizaciones/tasas').then(r => r.json()).then(d => setTasas({ tasa_bcv: d.tasa_bcv, tasa_vhm: d.tasa_vhm })).catch(() => {})
  }, [])

  function seleccionarVehiculo(v: Vehiculo) {
    setVehiculoSel(v)
    setModalidad('contado')
    setPlan('vehimotors')
    setAC500VehSel(null)
    setAC500Meses(6)
    setStep('form')
  }

  function handleAC500VehChange(id: string) {
    const v = ac500Items.find(x => x.id === id) ?? null
    setAC500VehSel(v)
    if (v) {
      if (v.p6_activo) setAC500Meses(6)
      else if (v.p9_activo) setAC500Meses(9)
      else if (v.p12_activo) setAC500Meses(12)
    }
  }

  async function enviar() {
    if (!vehiculoSel) return
    if (!form.clienteNombre.trim() || !form.clienteCiRif.trim() || !form.clienteCorreo.trim()) { setErrorMsg('Nombre, C.I./RIF y correo son obligatorios.'); return }
    if (!/\S+@\S+\.\S+/.test(form.clienteCorreo.trim())) { setErrorMsg('El correo no es válido.'); return }
    if (modalidad === 'ac500') {
      if (!ac500VehSel) { setErrorMsg('Selecciona el vehículo del plan AC500.'); return }
      const planActivo = ac500Meses === 6 ? ac500VehSel.p6_activo : ac500Meses === 9 ? ac500VehSel.p9_activo : ac500VehSel.p12_activo
      if (!planActivo) { setErrorMsg(`El plan de ${ac500Meses} meses no está disponible para este vehículo.`); return }
    }
    setStep('sending'); setErrorMsg('')
    try {
      const body: any = {
        codigo: ROJAS_CODIGO, vehiculoId: vehiculoSel.id,
        clienteNombre: form.clienteNombre, clienteCiRif: form.clienteCiRif,
        clienteCorreo: form.clienteCorreo, clienteTelefono: form.clienteTelefono || null,
        clienteDireccion: form.clienteDireccion || null, clienteCiudadEstado: form.clienteCiudadEstado || null,
        clienteCodigoPostal: form.clienteCodigoPostal || null, agenteRetencion: form.agenteRetencion,
        modalidad,
      }
      if (modalidad === 'ac500') {
        body.ac500VehiculoId = ac500VehSel!.id
        body.ac500Meses = ac500Meses
      } else {
        body.plan = modalidad === 'credito_24' ? plan : 'vehimotors'
      }
      const r = await fetch('/api/cotizaciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await r.json()
      if (json.ok) { setNumeroCot(json.numero); setStep('success') }
      else { setErrorMsg(json.error ?? 'Error al generar.'); setStep('form') }
    } catch { setErrorMsg('Error de conexión.'); setStep('form') }
  }

  function reset() {
    setStep('vehiculo'); setVehiculoSel(null); setModalidad('contado'); setPlan('vehimotors')
    setAC500VehSel(null); setAC500Meses(6)
    setForm({ clienteNombre: '', clienteCiRif: '', clienteCorreo: '', clienteTelefono: '', clienteDireccion: '', clienteCiudadEstado: '', clienteCodigoPostal: '', agenteRetencion: false })
    setErrorMsg(''); setNumeroCot('')
  }

  const resumen = vehiculoSel ? calcResumen(vehiculoSel, modalidad, plan, tasas) : null
  const ac500Schedule = (modalidad === 'ac500' && ac500VehSel) ? buildAC500Schedule(ac500VehSel, ac500Meses) : null

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
    const mesesDisponibles = ([6, 9, 12] as AC500Meses[]).filter(m =>
      ac500VehSel ? (m === 6 ? ac500VehSel.p6_activo : m === 9 ? ac500VehSel.p9_activo : ac500VehSel.p12_activo) : false
    )

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
            {([
              ['contado', 'Contado'],
              ['credito_24', 'Crédito 24 meses'],
              ['ac500', '🛡 Asegúrate $500'],
            ] as [Modalidad, string][]).map(([val, lbl]) => (
              <button key={val} onClick={() => setModalidad(val)}
                className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-semibold transition-all whitespace-nowrap ${
                  modalidad === val
                    ? val === 'ac500'
                      ? 'border-blue-700 bg-blue-700 text-white'
                      : 'border-oriental-black bg-oriental-black text-white'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>
                {lbl}
              </button>
            ))}
          </div>

          {/* Sub-opciones Crédito 24m */}
          {modalidad === 'credito_24' && (
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

          {/* Sub-opciones AC500 */}
          {modalidad === 'ac500' && (
            <div className="mt-3 space-y-3">
              <div>
                <p className={labelCls}>Vehículo del plan</p>
                {ac500Items.length === 0 ? (
                  <p className="text-xs text-orange-600 font-semibold">No hay vehículos con planes AC500 activos. Actívalos en la pestaña "Asegúrate con $500".</p>
                ) : (
                  <select className={selectCls} value={ac500VehSel?.id ?? ''} onChange={e => handleAC500VehChange(e.target.value)}>
                    <option value="">— Seleccionar vehículo AC500 —</option>
                    {ac500Items.map(v => (
                      <option key={v.id} value={v.id}>{v.brand} {v.model}</option>
                    ))}
                  </select>
                )}
              </div>

              {ac500VehSel && mesesDisponibles.length > 0 && (
                <div>
                  <p className={labelCls}>Plan en meses</p>
                  <div className="flex gap-2">
                    {mesesDisponibles.map(m => (
                      <button key={m} onClick={() => setAC500Meses(m)}
                        className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-semibold transition-all ${ac500Meses === m ? 'border-blue-700 bg-blue-700 text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                        {m} meses
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Cronograma preview */}
              {ac500Schedule && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5">
                  <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-2.5">Cronograma de pagos — {ac500Schedule.meses} meses</p>
                  <div className="flex justify-between items-center mb-1.5 pb-1.5 border-b border-blue-200">
                    <span className="text-xs font-bold text-blue-900">Cuota 0 — RESERVA</span>
                    <span className="text-xs font-bold text-blue-900">${fmt(ac500Schedule.reserva)}</span>
                  </div>
                  {ac500Schedule.cuotas.map((c, i) => (
                    <div key={i} className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-600">{c.label}</span>
                      <span className="text-xs font-bold text-gray-800">${fmt(c.monto)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-blue-300">
                    <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">TOTAL A PAGAR</span>
                    <span className="text-sm font-bold text-blue-900">${fmt(ac500Schedule.total)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resumen estándar (contado/crédito) */}
          {resumen && (
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
