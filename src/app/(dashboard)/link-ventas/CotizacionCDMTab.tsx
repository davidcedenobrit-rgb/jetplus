'use client'

import { useState, useEffect, useMemo } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */
type ShowroomItem = { marca: string; modelo: string; unidades: number }

function extractKey(model: string): string {
  const m = model.toUpperCase().replace(/[()]/g, '')
  if (m.includes('ZS')) {
    if (m.includes('CLASICO') || m.includes('CLÁSICO')) return 'ZS-CLASICO'
    return 'ZS-NEW'
  }
  if (m.includes('MG3')) {
    if (m.includes(' MT') || m.includes('SINCRONIC') || m.includes('SINCRÓNIC')) return 'MG3-MT'
    return 'MG3-AT'
  }
  const codes = ['MG5','MG6','MG7','RX5','RX8','RX9','D60','D90','S80','T60','T90','T50','HS5','HS']
  for (const c of codes) {
    if (m.includes(c)) return c
  }
  return m.split(/\s+/).find(t => /^[A-Z][A-Z0-9]{1,4}$/.test(t)) ?? m.split(' ')[0]
}

function unidadesEnShowroom(brand: string, model: string, stock: ShowroomItem[]): number {
  const key = extractKey(model)
  return stock
    .filter(s => s.marca.toUpperCase() === brand.toUpperCase() && extractKey(s.modelo) === key)
    .reduce((sum, s) => sum + s.unidades, 0)
}

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
  return Number(n).toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(Number(n))*100)%100===0?0:2, maximumFractionDigits: 2 })
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

export default function CotizacionCDMTab({ catalogo, showroomStock = [] }: { catalogo: any[]; showroomStock?: ShowroomItem[] }) {
  // Priorizar los que están en showroom (con stock) sobre los que son por encargo
  const disponibles: Vehiculo[] = useMemo(() => {
    const conStock: Vehiculo[] = []
    const sinStock: Vehiculo[] = []
    for (const v of catalogo as Vehiculo[]) {
      if (unidadesEnShowroom(v.brand, v.model, showroomStock) > 0) conStock.push(v)
      else sinStock.push(v)
    }
    return [...conStock, ...sinStock]
  }, [catalogo, showroomStock])

  const [step, setStep] = useState<Step>('vehiculo')
  const [vehiculoSel, setVehiculoSel] = useState<Vehiculo | null>(null)
  const [modalidad, setModalidad] = useState<Modalidad>('contado')
  const [plan, setPlan] = useState<Plan>('vehimotors')
  const [form, setForm] = useState({ clienteNombre: '', clienteCiRif: '', clienteCorreo: '', clienteTelefono: '', clienteDireccion: '', clienteCiudadEstado: '', clienteCodigoPostal: '', agenteRetencion: false })
  const [errorMsg, setErrorMsg] = useState('')
  const [numeroCot, setNumeroCot] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  // AC500
  const [ac500Meses, setAc500Meses] = useState<6 | 9>(6)
  const [planesAC500, setPlanesAC500] = useState<PlanAC500[]>([])
  const [planAC500Sel, setPlanAC500Sel] = useState<PlanAC500 | null>(null)
  const [loadingPlanes, setLoadingPlanes] = useState(false)

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

  function handleVistaPrevia() {
    if (!vehiculoSel) return
    if (!form.clienteNombre.trim() || !form.clienteCiRif.trim() || !form.clienteCorreo.trim()) { setErrorMsg('Nombre, C.I./RIF y correo son obligatorios para la vista previa.'); return }
    if (!/\S+@\S+\.\S+/.test(form.clienteCorreo.trim())) { setErrorMsg('El correo no es válido.'); return }
    if (plan === 'ac500' && !planAC500Sel) { setErrorMsg('Selecciona un modelo del plan Asegúrate con $500.'); return }
    setErrorMsg('')
    setShowPreview(true)
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
          <p className="text-sm text-oriental-gray mt-1">
            Todos los modelos del catálogo — los <span className="text-green-700 font-semibold">verdes están en showroom</span>, los <span className="text-amber-700 font-semibold">ámbar se cotizan por encargo</span>.
          </p>
        </div>

        {disponibles.length === 0 ? (
          <div className="card p-12 text-center text-oriental-gray">
            <p className="text-2xl mb-3">🚗</p>
            <p className="font-semibold">No hay vehículos en el catálogo.</p>
            <p className="text-sm mt-1">Agrégalos desde la pestaña Catálogo de vehículos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {disponibles.map(v => {
              const unidades = unidadesEnShowroom(v.brand, v.model, showroomStock)
              const enShowroom = unidades > 0
              return (
                <button
                  key={v.id}
                  onClick={() => seleccionarVehiculo(v)}
                  className={`card p-4 text-left hover:border-oriental-red hover:shadow-md transition-all group relative ${enShowroom ? '' : 'opacity-90'}`}
                >
                  {v.img_url && (
                    <div className="w-full h-36 rounded-lg overflow-hidden mb-3 bg-gray-50">
                      <img src={v.img_url} alt={v.model} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <p className="text-[10px] font-bold text-oriental-red uppercase tracking-widest">{v.brand}</p>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {enShowroom ? (
                        <span className="text-[9px] font-bold bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                          En showroom · {unidades} u
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                          Por encargo
                        </span>
                      )}
                      {!v.disponible && (
                        <span className="text-[9px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full whitespace-nowrap">No público</span>
                      )}
                    </div>
                  </div>
                  <p className="font-bold text-oriental-black text-sm mb-2">{v.model}</p>
                  <p className="text-xs text-oriental-gray">Precio base: <span className="font-bold text-oriental-black">${fm(v.cash)}</span></p>
                  <div className="mt-3 pt-2 border-t border-gray-100 flex justify-end">
                    <span className="text-xs font-semibold text-oriental-red group-hover:underline">Seleccionar →</span>
                  </div>
                </button>
              )
            })}
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
      <>
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

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setStep('vehiculo')} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleVistaPrevia} disabled={isSending}
            className="px-4 py-2.5 border-2 border-oriental-black text-oriental-black rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50">
            👁 Vista previa
          </button>
          <button onClick={enviar} disabled={isSending}
            className="flex-1 py-2.5 bg-oriental-red text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50">
            {isSending ? 'Generando cotización...' : '📄 Generar y enviar'}
          </button>
        </div>
      </div>

      {/* ── MODAL VISTA PREVIA ── */}
      {showPreview && vehiculoSel && (() => {
        const prev = vehiculoSel
        const hoyDate = new Date()
        const vencDate = new Date(hoyDate); vencDate.setDate(vencDate.getDate() + 2)
        const fDate = (d: Date) => d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
        const precioBase = prev.cash ?? 0
        const iva = precioBase * 0.16

        type Row = [string, number]
        let rows: Row[] = []
        let labelInicial = 'TOTAL A PAGAR'
        let totalInicial = 0
        let cuotaMensual: number | null = null
        let financiamiento: number | null = null
        let costoTotal: number | null = null

        if (plan === 'ac500') {
          // handled in AC500 block
        } else if (modalidad === 'contado') {
          const gastos = prev.gc ?? 0
          rows = [['100% Precio Base', precioBase], ['I.V.A. 16%', iva], ['Gastos (traslado, póliza, notaría)', gastos]]
          totalInicial = precioBase + iva + gastos
          labelInicial = 'TOTAL A PAGAR'
        } else if (plan === 'banco_100') {
          const placaMonto = prev.placa_monto ?? 400
          const totalVeh = precioBase + iva + placaMonto
          const fin = totalVeh * 0.70
          const dif = fin * (prev.diferencial_pct ?? 30) / 100
          const gastosBanco = (prev.poliza_vehiculo_banco ?? 0) + (prev.poliza_vida_banco ?? 0) + (prev.honorarios_banco ?? 0) + (prev.gastos_internos_banco ?? 0) + (prev.alfombras_banco ?? 0) + dif
          totalInicial = totalVeh * 0.30 + gastosBanco
          financiamiento = fin
          const r = (prev.tasa_banco_pct ?? 16) / 100 / 12
          cuotaMensual = fin * r * Math.pow(1 + r, 24) / (Math.pow(1 + r, 24) - 1)
          costoTotal = totalInicial + cuotaMensual * 24
          rows = [['Total Precio Vehículo', totalVeh], ['Inicial (30%)', totalVeh * 0.30], ['Gastos banco', gastosBanco]]
          labelInicial = 'TOTAL INICIAL A PAGAR'
        } else {
          const gastos = prev.gcr ?? 0
          const inicial40 = precioBase * 0.4
          totalInicial = inicial40 + iva + gastos
          financiamiento = precioBase * 0.6
          cuotaMensual = prev.tasa_credito ?? 0
          costoTotal = totalInicial + (cuotaMensual ?? 0) * 24
          rows = [['40% Precio Base', inicial40], ['I.V.A. 16%', iva], ['Gastos (traslado, póliza, notaría)', gastos]]
          labelInicial = 'INICIAL A PAGAR'
        }

        const planBadge = plan === 'ac500' ? '🛡 Asegúrate $500' : modalidad === 'contado' ? 'Contado' : plan === 'banco_100' ? 'Crédito 100% Banco' : 'Crédito 24m — Vehimotors'

        return (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center">
            <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Vista previa de cotización</p>
                  <p className="text-base font-bold text-oriental-black">{prev.brand} {prev.model}</p>
                </div>
                <button onClick={() => setShowPreview(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-bold transition-colors">✕</button>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Plan badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold bg-oriental-black text-white px-3 py-1.5 rounded-full">{planBadge}</span>
                  <span className="text-xs text-gray-400">válida por 2 días hábiles</span>
                </div>

                {/* Client + cotizacion meta */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Datos del cliente</p>
                    {([['Cliente', form.clienteNombre], ['C.I./RIF', form.clienteCiRif], ['Correo', form.clienteCorreo], form.clienteTelefono ? ['Teléfono', form.clienteTelefono] : null] as ([string, string] | null)[]).filter((x): x is [string, string] => Boolean(x)).map(([k, v]) => (
                      <div key={k}>
                        <p className="text-[10px] text-gray-400">{k}</p>
                        <p className="text-xs font-semibold text-oriental-black break-all">{v || '—'}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cotización</p>
                    <p className="text-sm font-extrabold text-oriental-red mb-2">PROVISIONAL</p>
                    <div className="space-y-1.5">
                      <div>
                        <p className="text-[10px] text-gray-400">Fecha</p>
                        <p className="text-xs font-bold text-oriental-black">{fDate(hoyDate)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Vencimiento</p>
                        <p className="text-xs font-bold text-oriental-black">{fDate(vencDate)}</p>
                      </div>
                      {form.agenteRetencion && <span className="inline-block text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">Ag. Retención</span>}
                    </div>
                  </div>
                </div>

                {/* Financial summary (non-AC500) */}
                {plan !== 'ac500' && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-oriental-black px-4 py-2.5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Resumen financiero</p>
                    </div>
                    {rows.map(([label, val]) => (
                      <div key={label} className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100">
                        <span className="text-xs text-gray-500">{label}</span>
                        <span className="text-xs font-semibold text-oriental-black">${fmt(val)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center px-4 py-3 bg-amber-50">
                      <span className="text-xs font-bold text-amber-800 uppercase">{labelInicial}</span>
                      <span className="text-sm font-extrabold text-amber-900">${fmt(totalInicial)}</span>
                    </div>
                    {financiamiento != null && cuotaMensual != null && (
                      <>
                        <div className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100">
                          <span className="text-xs text-gray-500">{plan === 'banco_100' ? 'Financiamiento 70%' : 'Financiamiento 60%'}</span>
                          <span className="text-xs font-semibold text-oriental-black">${fmt(financiamiento)}</span>
                        </div>
                        <div className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100">
                          <span className="text-xs text-gray-500">24 cuotas mensuales</span>
                          <span className="text-xs font-semibold text-oriental-black">${fmt(cuotaMensual)} c/u</span>
                        </div>
                        {costoTotal != null && (
                          <div className="flex justify-between items-center px-4 py-3 bg-green-50">
                            <span className="text-xs font-bold text-green-800 uppercase">Costo Total</span>
                            <span className="text-sm font-extrabold text-green-900">${fmt(costoTotal)}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* AC500 schedule preview */}
                {plan === 'ac500' && planAC500Sel && (() => {
                  const cprev = buildCuotasPreview(planAC500Sel)
                  return (
                    <div className="border border-blue-200 rounded-xl overflow-hidden">
                      <div className="bg-blue-900 px-4 py-2.5 flex justify-between items-center">
                        <p className="text-xs font-bold text-white">ASEGÚRATE $500 — {planAC500Sel.meses} MESES</p>
                        <p className="text-[10px] text-blue-300">Cronograma de pagos</p>
                      </div>
                      <div className="bg-blue-50 flex justify-between items-center px-4 py-2.5 border-b border-blue-200">
                        <span className="text-xs font-bold text-blue-900">Cuota 0 — Reserva (Separación)</span>
                        <span className="text-xs font-bold text-blue-900">${fmt(planAC500Sel.cuota_0)}</span>
                      </div>
                      {cprev.slice(1).map((c, i) => (
                        <div key={i} className="flex justify-between items-center px-4 py-2 border-b border-gray-100">
                          <span className="text-xs text-gray-600">{c.label}</span>
                          <span className="text-xs font-semibold text-oriental-black">${fmt(c.monto)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center px-4 py-3 bg-blue-100">
                        <span className="text-xs font-bold text-blue-900 uppercase">Total a pagar</span>
                        <span className="text-sm font-extrabold text-blue-900">${fmt(planAC500Sel.total)}</span>
                      </div>
                    </div>
                  )
                })()}

                <p className="text-[11px] text-gray-400 text-center bg-gray-50 rounded-lg px-3 py-2">
                  Los precios son referenciales y están sujetos a disponibilidad al momento de la compra.
                </p>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-3">
                <button onClick={() => setShowPreview(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors">
                  Volver a editar
                </button>
                <button onClick={() => { setShowPreview(false); enviar() }} className="flex-1 py-2.5 bg-oriental-red text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors">
                  📄 Enviar cotización
                </button>
              </div>
            </div>
          </div>
        )
      })()}
      </>
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
