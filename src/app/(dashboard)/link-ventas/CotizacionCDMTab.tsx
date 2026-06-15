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

type Step = 'vehiculo' | 'form' | 'sending' | 'success'
type Modalidad = 'contado' | 'credito_24'
type Plan = 'vehimotors' | 'banco_100'
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

function calcResumen(v: Vehiculo, modalidad: Modalidad, plan: Plan, tasas: Tasas | null) {
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

export default function CotizacionCDMTab({ catalogo }: { catalogo: any[] }) {
  const disponibles: Vehiculo[] = catalogo.filter((v: any) => v.disponible)

  const [step, setStep] = useState<Step>('vehiculo')
  const [vehiculoSel, setVehiculoSel] = useState<Vehiculo | null>(null)
  const [modalidad, setModalidad] = useState<Modalidad>('contado')
  const [plan, setPlan] = useState<Plan>('vehimotors')
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
    setStep('form')
  }

  async function enviar() {
    if (!vehiculoSel) return
    if (!form.clienteNombre.trim() || !form.clienteCiRif.trim() || !form.clienteCorreo.trim()) { setErrorMsg('Nombre, C.I./RIF y correo son obligatorios.'); return }
    if (!/\S+@\S+\.\S+/.test(form.clienteCorreo.trim())) { setErrorMsg('El correo no es válido.'); return }
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
          modalidad, plan: modalidad === 'credito_24' ? plan : 'vehimotors',
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
  }

  const resumen = vehiculoSel ? calcResumen(vehiculoSel, modalidad, plan, tasas) : null

  /* ── PASO 1: Seleccionar vehículo ── */
  if (step === 'vehiculo') {
    return (
      <div>
        <div className="mb-5">
          <h2 className="text-base font-bold text-oriental-black">Generar cotización</h2>
          <p className="text-sm text-oriental-gray mt-1">Selecciona el vehículo disponible en showroom</p>
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
                <p className="text-[10px] font-bold text-oriental-red uppercase tracking-widest mb-0.5">{v.brand}</p>
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
          <div className="flex gap-2">
            {([['contado', 'Contado'], ['credito_24', 'Crédito 24 meses']] as [Modalidad, string][]).map(([val, lbl]) => (
              <button key={val} onClick={() => setModalidad(val)}
                className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-semibold transition-all ${modalidad === val ? 'border-oriental-black bg-oriental-black text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                {lbl}
              </button>
            ))}
          </div>

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

          {/* Resumen */}
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
