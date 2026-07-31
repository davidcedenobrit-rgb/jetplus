'use client'

import { useState, useEffect } from 'react'
import { FileText, X, Loader2, ExternalLink, Calculator } from 'lucide-react'

const fmt = (n: number) => Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100
const nz = (s: string) => parseFloat(String(s).replace(',', '.')) || 0

// Genera una PROFORMA a partir de una cotización aceptada (flujo nuevo:
// cotización → aprobación → PROFORMA → venta). La proforma es la cotización
// negociada + las condiciones de pago para ese cliente.
export default function ProformaPanel({
  cotId, numero, correoCliente, onDone, compact = false, plan, total = 0, editProforma = null, autoOpen = false,
}: {
  cotId: string
  numero: string
  correoCliente?: string | null
  onDone: () => void
  compact?: boolean
  plan?: string
  total?: number
  editProforma?: any
  autoOpen?: boolean
}) {
  const esBancaNacional = plan === 'banca_nacional'
  const esEdit = !!editProforma
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [enviarCorreo, setEnviarCorreo] = useState(false)
  const [correo, setCorreo] = useState(correoCliente ?? '')
  const [observaciones, setObservaciones] = useState('')
  const [aprobadoBanco, setAprobadoBanco] = useState('')
  const [restanteMetodo, setRestanteMetodo] = useState<'contado' | 'acuerdo'>('contado')
  const [resultado, setResultado] = useState<{ proformaId: string; numero: string; correoEnviado: boolean } | null>(null)
  const [yaExiste, setYaExiste] = useState<{ proformaId: string; numero: string } | null>(null)
  const [unidades, setUnidades] = useState<{ id: string; label: string; coincide: boolean }[]>([])
  const [showroomId, setShowroomId] = useState('')
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [preview, setPreview] = useState<any | null>(null)
  const [montos, setMontos] = useState({ precioBase: '', inicial: '', financiado: '', cuotaMensual: '', meses: '' })
  const setMonto = (k: keyof typeof montos, v: string) => setMontos(p => ({ ...p, [k]: v }))
  // Tasa % anual del crédito Vehimotor (viene predeterminada de la cotización).
  const [tasa, setTasa] = useState('')
  // Cuota amortizada: financiado + N cuotas + tasa % anual.
  const calcCuota = (fin: number, nc: number, t: number) => {
    if (nc <= 0) return 0
    const r = t / 100 / 12
    return r > 0 ? r2(fin * r * Math.pow(1 + r, nc) / (Math.pow(1 + r, nc) - 1)) : r2(fin / nc)
  }
  const recalcCuota = (fin: number, nc: number, t: number) => setMonto('cuotaMensual', String(calcCuota(fin, nc, t)))
  // INICIAL flexible: lista de abonos (monto + a los N días). Ej: 7.000 (día 0),
  // 3.000 (día 15), 5.000 (día 30), 5.000 (día 45).
  const [abonos, setAbonos] = useState<{ monto: string; dias: string }[]>([{ monto: '', dias: '0' }])
  const [textoManual, setTextoManual] = useState(false)
  const addAbono = () => setAbonos(a => [...a, { monto: '', dias: '' }])
  const rmAbono = (i: number) => setAbonos(a => a.length > 1 ? a.filter((_, j) => j !== i) : a)
  const setAbono = (i: number, k: 'monto' | 'dias', v: string) => setAbonos(a => a.map((r, j) => j === i ? { ...r, [k]: v } : r))
  const dividirResto = (n: number) => {
    const falta = r2(nz(montos.inicial) - r2(abonos.reduce((s, r) => s + nz(r.monto), 0)))
    if (falta <= 0 || n < 1) return
    const cuota = r2(falta / n)
    const baseDias = Math.max(0, ...abonos.map(a => Math.round(nz(a.dias)) || 0))
    setAbonos(a => [...a, ...Array.from({ length: n }, (_, i) => ({ monto: String(cuota), dias: String(baseDias + (i + 1) * 30) }))])
  }
  // Reparte TODO el inicial en n partes iguales (día 0, 30, 60…); el último ajusta el redondeo.
  const repartirInicial = (n: number) => {
    const total = nz(montos.inicial)
    if (total <= 0 || n < 1) return
    const cuota = r2(total / n)
    setAbonos(Array.from({ length: n }, (_, i) => ({
      monto: String(i === n - 1 ? r2(total - cuota * (n - 1)) : cuota),
      dias: String(i * 30),
    })))
  }
  // Ajusta el ÚLTIMO abono para que la suma cuadre exacto con el inicial.
  const ajustarUltimo = () => setAbonos(a => {
    const rest = r2(nz(montos.inicial) - a.slice(0, -1).reduce((s, r) => s + nz(r.monto), 0))
    return a.map((r, i) => i === a.length - 1 ? { ...r, monto: String(Math.max(0, rest)) } : r)
  })

  // Cálculos (en vivo)
  const inicialTotal = nz(montos.inicial)
  const sumAbonos = r2(abonos.reduce((s, r) => s + nz(r.monto), 0))
  const faltaInicial = r2(inicialTotal - sumAbonos)
  const vhFinanciado = nz(montos.financiado)
  const vhCuotas = Math.max(0, Math.round(nz(montos.meses)))
  const vhCuotaMonto = vhCuotas > 0 ? (nz(montos.cuotaMensual) || r2(vhFinanciado / vhCuotas)) : 0

  // Cronograma combinado: abonos del inicial + cuotas Vehimotor.
  const cronograma: { numero: number; tipo: string; etiqueta: string; monto: number; dias: number }[] = []
  { let n = 0
    abonos.forEach(a => { const m = nz(a.monto); if (m > 0) { n++; const d = Math.round(nz(a.dias)); cronograma.push({ numero: n, tipo: 'Inicial', etiqueta: d > 0 ? `Abono a los ${d} días` : 'Abono de contado', monto: m, dias: d }) } })
    for (let i = 1; i <= vhCuotas; i++) { n++; cronograma.push({ numero: n, tipo: 'Vehimotor', etiqueta: `Cuota ${i} de ${vhCuotas} (mensual)`, monto: vhCuotaMonto, dias: i * 30 }) }
  }

  // Texto de condiciones AUTOGENERADO desde los números.
  useEffect(() => {
    if (textoManual || !preview) return
    const abo = abonos.map(a => ({ m: nz(a.monto), d: Math.round(nz(a.dias)) })).filter(a => a.m > 0)
    const partes: string[] = []
    if (abo.length) {
      const detalle = abo.map(a => `$${fmt(a.m)}${a.d > 0 ? ` a los ${a.d} días` : ' de contado'}`).join(', ')
      partes.push(`El cliente se compromete a pagar el inicial ($${fmt(inicialTotal)}): ${detalle}.`)
    }
    if (vhFinanciado > 0.009 && vhCuotas > 0) {
      partes.push(`Luego el crédito Vehimotor: ${vhCuotas} cuotas de $${fmt(vhCuotaMonto)}, que inician al completar el inicial.`)
    }
    setObservaciones(partes.join(' '))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abonos, montos, textoManual, preview])

  const aprobadoNum = parseFloat(aprobadoBanco.replace(',', '.')) || 0
  const restante = Math.max(0, Number(total) - aprobadoNum)
  const pctBanco = Number(total) > 0 ? Math.round((aprobadoNum / Number(total)) * 100) : 0

  function abrir() {
    setOpen(true); setError(''); setResultado(null); setYaExiste(null)
    setEnviarCorreo(false); setCorreo(correoCliente ?? ''); setObservaciones('')
    setAprobadoBanco(''); setRestanteMetodo('contado')
    setShowroomId(''); setUnidades([]); setPreview(null)
    setMontos({ precioBase: '', inicial: '', financiado: '', cuotaMensual: '', meses: '' })
    setAbonos([{ monto: '', dias: '0' }]); setTextoManual(false); setTasa('')
    fetch(`/api/showroom/disponibles?cotizacionId=${cotId}`).then(r => r.ok ? r.json() : []).then(d => setUnidades(Array.isArray(d) ? d : [])).catch(() => {})

    // MODO EDICIÓN: trae la proforma completa y precarga TODO.
    if (esEdit) {
      fetch(`/api/proformas/${editProforma.id}`).then(r => r.ok ? r.json() : null).then((pf: any) => {
        if (!pf || pf.error) return
        const veh = pf.vehiculo_snapshot ?? {}
        const crono: any[] = Array.isArray(pf.cronograma_snapshot) ? pf.cronograma_snapshot : []
        const vm = crono.filter(c => c.tipo === 'Vehimotor' || !c.tipo)
        const ini = crono.filter(c => c.tipo === 'Inicial')
        setPreview({
          vehiculo: `${veh.marca ?? ''} ${veh.modelo ?? ''}`.trim(),
          modalidad: Number(pf.num_cuotas) > 0 ? 'credito' : 'contado',
          precioBase: Number(pf.precio_vehiculo) || 0, inicial: Number(pf.monto_inicial) || 0,
          financiado: Number(pf.monto_financiado) || 0, meses: Number(pf.num_cuotas) || 0, acuerdo: null,
        })
        setMontos({
          precioBase: String(r2(pf.precio_vehiculo)), inicial: String(r2(pf.monto_inicial)),
          financiado: String(r2(pf.monto_financiado)), meses: String(pf.num_cuotas || vm.length || ''),
          cuotaMensual: String(r2(vm[0]?.monto ?? 0)),
        })
        if (ini.length) {
          setAbonos(ini.map((c: any) => {
            const d = c.dias != null ? Math.round(Number(c.dias)) : Number(String(c.etiqueta || '').match(/(\d+)\s*d/)?.[1] ?? 0)
            return { monto: String(r2(c.monto)), dias: String(d) }
          }))
        }
        setObservaciones(pf.condiciones_personalizadas ?? '')
        setTextoManual(true)
        setShowroomId(pf.showroom_id ?? veh.showroom_id ?? '')
      }).catch(() => {})
      // Tasa por defecto (de la cotización) para el recálculo.
      fetch(`/api/proformas/preview?cotizacionId=${cotId}`).then(r => r.ok ? r.json() : null).then(d => { if (d && d.tasa != null) setTasa(String(d.tasa || '')) }).catch(() => {})
      return
    }

    fetch(`/api/proformas/preview?cotizacionId=${cotId}`).then(r => r.ok ? r.json() : null).then(d => {
      if (d && !d.error) {
        setPreview(d)
        setTasa(String(d.tasa || ''))
        setMontos({ precioBase: String(r2(d.precioBase)), inicial: String(r2(d.inicial)), financiado: String(r2(d.financiado)), cuotaMensual: String(r2(d.cuotaMensual)), meses: String(d.meses || '') })
        // Si ya hay acuerdo de cobro, precargar los abonos del inicial.
        if (d.acuerdo && d.inicial > 0) {
          const rows: { monto: string; dias: string }[] = []
          if (d.acuerdo.contado > 0) rows.push({ monto: String(r2(d.acuerdo.contado)), dias: '0' })
          const nc = Math.max(0, Math.round(d.acuerdo.numCuotas || 0))
          for (let i = 1; i <= nc; i++) rows.push({ monto: String(r2(d.acuerdo.cuotaMonto)), dias: String(i * 30) })
          if (rows.length) setAbonos(rows)
        }
      }
    }).catch(() => {})
  }

  // Auto-abrir (usado por el botón Editar de la lista).
  useEffect(() => { if (autoOpen) abrir() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  const cronogramaBody = () => cronograma.map(c => ({ numero: c.numero, tipo: c.tipo, etiqueta: c.etiqueta, monto: c.monto, dias: c.dias, estado: 'pendiente', monto_pagado: 0, fecha_vencimiento: null }))

  async function generar() {
    if (esBancaNacional && aprobadoNum <= 0) { setError('Indica el monto que aprobó el banco'); return }
    if (esBancaNacional && aprobadoNum > Number(total)) { setError('Lo aprobado por el banco no puede superar el total'); return }
    setSaving(true); setError('')

    // MODO EDICIÓN: PATCH a la proforma existente con todos los datos.
    if (esEdit) {
      try {
        const r = await fetch(`/api/proformas/${editProforma.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            precio: montos.precioBase, inicial: montos.inicial, financiado: montos.financiado, meses: montos.meses,
            condiciones: observaciones.trim() || null, cronograma: cronogramaBody(), showroomId: showroomId || null,
          }),
        })
        const j = await r.json().catch(() => ({}))
        setSaving(false)
        if (!r.ok) { setError(j.error ?? 'No se pudo guardar'); return }
        onDone()
      } catch { setError('Error de conexión'); setSaving(false) }
      return
    }

    try {
      const r = await fetch('/api/proformas/desde-cotizacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cotizacionId: cotId,
          enviarCorreo,
          correoDestino: enviarCorreo ? correo.trim() : null,
          observaciones: observaciones.trim() || null,
          showroomId: showroomId || null,
          montos: {
            precioBase: montos.precioBase, inicial: montos.inicial,
            financiado: montos.financiado, cuotaMensual: montos.cuotaMensual, meses: montos.meses,
            cronograma: cronogramaBody(),
          },
          ...(esBancaNacional ? { bancaNacional: { aprobado_banco: aprobadoNum, restante, restante_metodo: restanteMetodo } } : {}),
        }),
      })
      const j = await r.json()
      if (r.status === 409 && j.proformaId) {
        setYaExiste({ proformaId: j.proformaId, numero: j.numero })
        setSaving(false)
        return
      }
      if (!r.ok) { setError(j.error ?? 'No se pudo generar la proforma'); setSaving(false); return }
      setResultado({ proformaId: j.proformaId, numero: j.numero, correoEnviado: !!j.correoEnviado })
      setSaving(false)
    } catch {
      setError('Error de conexión'); setSaving(false)
    }
  }

  const cerrar = () => { setOpen(false); if (esEdit) onDone() }

  return (
    <>
      {esEdit ? null : compact ? (
        <button onClick={abrir}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors">
          <FileText size={12} /> Convertir en proforma
        </button>
      ) : (
        <button onClick={abrir}
          className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl text-sm transition-colors">
          <FileText size={15} /> Generar proforma
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && cerrar()} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="font-bold text-oriental-black text-base flex items-center gap-2"><FileText size={16} className="text-indigo-600" /> {esEdit ? 'Editar proforma' : 'Generar proforma'}</h2>
                <p className="text-xs text-oriental-gray font-mono">{numero}</p>
              </div>
              <button onClick={() => !saving && cerrar()} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><X size={16} /></button>
            </div>

            <div className="p-5">
              {error && <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-800">{error}</div>}

              {yaExiste ? (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                    Esta cotización ya tiene una proforma: <span className="font-mono font-bold">{yaExiste.numero}</span>.
                  </div>
                  <a href={`/api/proformas/${yaExiste.proformaId}/pdf`} target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-700 text-white text-sm font-semibold hover:bg-indigo-800">
                    <ExternalLink size={14} /> Ver proforma {yaExiste.numero}
                  </a>
                  <button onClick={() => setOpen(false)} className="w-full py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cerrar</button>
                </div>
              ) : resultado ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                    ✓ Proforma <span className="font-mono font-bold">{resultado.numero}</span> generada.
                    {resultado.correoEnviado && ' Correo enviado al cliente.'}
                  </div>
                  <a href={`/api/proformas/${resultado.proformaId}/pdf`} target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-700 text-white text-sm font-semibold hover:bg-indigo-800">
                    <ExternalLink size={14} /> Ver proforma {resultado.numero}
                  </a>
                  <div className="grid grid-cols-2 gap-2">
                    <a href={`/api/proformas/${resultado.proformaId}/acuerdo-pago/pdf`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-oriental-red text-white text-xs font-bold hover:bg-red-700">
                      <FileText size={13} /> Acuerdo de pago (cliente)
                    </a>
                    {preview?.acuerdo?.id ? (
                      <a href={`/api/acuerdos-cobro/${preview.acuerdo.id}/pdf`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-oriental-black text-white text-xs font-bold hover:bg-gray-800">
                        <FileText size={13} /> Acuerdo de cobro
                      </a>
                    ) : (
                      <span className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-gray-200 text-gray-400 text-xs font-medium">Sin acuerdo de cobro</span>
                    )}
                  </div>
                  <button onClick={() => { setOpen(false); onDone() }} className="w-full py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cerrar</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {esEdit ? 'Edita los montos, abonos del inicial, cuotas y condiciones de la proforma. Se recalcula el cronograma y el texto.' : 'Se creará la proforma con la estructura negociada de la cotización y el cronograma de pago del cliente. Sirve como el documento previo a la venta.'}
                  </p>

                  {/* Modalidad de pago en números → genera el texto y los montos de la proforma */}
                  {preview && (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 space-y-2.5">
                      <p className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1"><Calculator size={12} /> Así quedará la proforma</p>
                      {preview.vehiculo && <p className="text-[11px] text-gray-600">Vehículo: <b>{preview.vehiculo}</b> · Precio ref.: <b>${fmt(nz(montos.precioBase))}</b></p>}

                      {/* INICIAL — abonos flexibles */}
                      <div className="rounded-lg bg-white border border-indigo-200 p-2.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-indigo-700">Inicial — ¿cómo lo paga?</label>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-500">Total $</span>
                            <input inputMode="decimal" className="w-24 px-2 py-1 border border-gray-200 rounded text-sm text-right" value={montos.inicial} onChange={e => setMonto('inicial', e.target.value)} />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-gray-500">Repartir en partes iguales:</span>
                          {[1, 2, 3, 4, 6, 12].map(nn => (
                            <button key={nn} type="button" onClick={() => repartirInicial(nn)}
                              className="text-[11px] w-6 h-6 rounded border border-indigo-200 text-indigo-700 font-bold hover:bg-indigo-100">{nn}</button>
                          ))}
                        </div>
                        {abonos.map((a, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-400 w-4">{i + 1}.</span>
                            <span className="text-[10px] text-gray-500">$</span>
                            <input inputMode="decimal" placeholder="monto" className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm text-right" value={a.monto} onChange={e => setAbono(i, 'monto', e.target.value)} />
                            <span className="text-[10px] text-gray-500">a los</span>
                            <input inputMode="numeric" placeholder="0" className="w-12 px-1.5 py-1 border border-gray-200 rounded text-sm text-center" value={a.dias} onChange={e => setAbono(i, 'dias', e.target.value)} />
                            <span className="text-[10px] text-gray-500">días</span>
                            <button type="button" onClick={() => rmAbono(i)} className="text-gray-300 hover:text-red-500 text-xs px-1">✕</button>
                          </div>
                        ))}
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <div className="flex gap-1.5">
                            <button type="button" onClick={addAbono} className="text-[11px] text-indigo-600 font-bold hover:underline">+ Abono</button>
                            {faltaInicial > 0.009 && <button type="button" onClick={() => dividirResto(2)} className="text-[11px] text-indigo-600 hover:underline">÷ resto en 2</button>}
                            {faltaInicial > 0.009 && <button type="button" onClick={() => dividirResto(3)} className="text-[11px] text-indigo-600 hover:underline">÷ 3</button>}
                            {Math.abs(faltaInicial) >= 0.01 && abonos.length > 0 && <button type="button" onClick={ajustarUltimo} className="text-[11px] text-emerald-600 hover:underline">↧ ajustar último</button>}
                          </div>
                          <span className={`text-[10px] font-bold ${Math.abs(faltaInicial) < 0.01 ? 'text-green-600' : faltaInicial > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                            {Math.abs(faltaInicial) < 0.01 ? '✓ inicial completo' : faltaInicial > 0 ? `Falta $${fmt(faltaInicial)}` : `Sobra $${fmt(Math.abs(faltaInicial))}`}
                          </span>
                        </div>
                      </div>

                      {/* VEHIMOTOR */}
                      {preview.modalidad !== 'contado' && (
                        <div className="rounded-lg bg-white border border-indigo-200 p-2.5">
                          <label className="text-[11px] font-bold text-indigo-700">Crédito Vehimotor (después del inicial)</label>
                          <div className="grid grid-cols-4 gap-2 mt-1.5">
                            <div><label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Financiado ($)</label>
                              <input inputMode="decimal" className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right"
                                value={montos.financiado} onChange={e => { setMonto('financiado', e.target.value); recalcCuota(nz(e.target.value), Math.round(nz(montos.meses)), nz(tasa)) }} /></div>
                            <div><label className="block text-[10px] font-semibold text-gray-500 mb-0.5">N° cuotas</label>
                              <input inputMode="numeric" className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right"
                                value={montos.meses} onChange={e => { setMonto('meses', e.target.value); recalcCuota(nz(montos.financiado), Math.round(nz(e.target.value)), nz(tasa)) }} /></div>
                            <div><label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Tasa % anual</label>
                              <input inputMode="decimal" className="w-full px-2 py-1.5 border border-indigo-300 rounded text-sm text-right bg-indigo-50"
                                value={tasa} onChange={e => { setTasa(e.target.value); recalcCuota(nz(montos.financiado), Math.round(nz(montos.meses)), nz(e.target.value)) }} /></div>
                            <div><label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Cuota ($) auto</label>
                              <input readOnly className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right bg-gray-100 font-bold" value={montos.cuotaMensual} /></div>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">La cuota se calcula sola con la tasa. {nz(tasa) > 0 ? `Tasa ${nz(tasa)}% anual.` : 'Sin interés (tasa 0).'}</p>
                        </div>
                      )}

                      {/* TABLA cronograma */}
                      {cronograma.length > 0 && (
                        <div className="rounded-lg bg-white border border-indigo-200 overflow-hidden">
                          <div className="max-h-44 overflow-y-auto">
                            <table className="w-full text-[11px]">
                              <thead className="bg-indigo-100 text-indigo-800 sticky top-0"><tr>
                                <th className="text-left font-bold px-2 py-1">#</th>
                                <th className="text-left font-bold px-2 py-1">Concepto</th>
                                <th className="text-right font-bold px-2 py-1">Monto</th>
                              </tr></thead>
                              <tbody className="divide-y divide-gray-100">
                                {cronograma.map(c => (
                                  <tr key={c.numero} className={c.tipo === 'Inicial' ? 'bg-amber-50/40' : ''}>
                                    <td className="px-2 py-1 text-gray-400">{c.numero}</td>
                                    <td className="px-2 py-1 text-gray-600"><span className={`text-[9px] font-bold mr-1 ${c.tipo === 'Inicial' ? 'text-amber-600' : 'text-indigo-600'}`}>{c.tipo === 'Inicial' ? 'INI' : 'VM'}</span>{c.etiqueta}</td>
                                    <td className="px-2 py-1 text-right font-semibold text-oriental-black">${fmt(c.monto)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-gray-50 font-bold"><tr>
                                <td className="px-2 py-1" colSpan={2}>Total programado</td>
                                <td className="px-2 py-1 text-right">${fmt(cronograma.reduce((s, c) => s + c.monto, 0))}</td>
                              </tr></tfoot>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {esBancaNacional && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-3">
                      <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">🏦 Banca nacional — reparto del pago</p>
                      <p className="text-[11px] text-emerald-700">Total del vehículo: <b>${fmt(Number(total))}</b></p>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Monto que aprobó el banco ($)</label>
                        <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:border-emerald-600"
                          inputMode="decimal" value={aprobadoBanco} onChange={e => setAprobadoBanco(e.target.value)} placeholder="0,00" />
                        {aprobadoNum > 0 && <p className="text-[10px] text-emerald-700 mt-1">Equivale al <b>{pctBanco}%</b> del total.</p>}
                      </div>
                      <div className="rounded-lg bg-white border border-emerald-200 p-2.5 text-sm">
                        <div className="flex justify-between text-gray-600"><span>Aprobado por el banco</span><span className="font-mono font-bold text-emerald-700">${fmt(aprobadoNum)}</span></div>
                        <div className="flex justify-between text-gray-600 mt-0.5"><span>Restante (cliente)</span><span className="font-mono font-bold text-oriental-black">${fmt(restante)}</span></div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">El restante lo paga:</label>
                        <div className="flex gap-2">
                          {([['contado', 'De contado'], ['acuerdo', 'Acuerdo de pago']] as const).map(([v, l]) => (
                            <button key={v} type="button" onClick={() => setRestanteMetodo(v)}
                              className={`flex-1 py-1.5 rounded-lg border-2 text-xs font-bold transition-all ${restanteMetodo === v ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-200 text-gray-500'}`}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">Reservar unidad del showroom (opcional)</label>
                    <select value={showroomId} onChange={e => setShowroomId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red">
                      <option value="">Sin reservar unidad (se elige en la venta)</option>
                      {unidades.map(u => <option key={u.id} value={u.id}>{u.coincide ? '★ ' : ''}{u.label}</option>)}
                    </select>
                    {showroomId && <p className="text-[10px] text-amber-600 mt-1">La unidad quedará <b>RESERVADA</b> para este cliente al generar la proforma.</p>}
                    {unidades.length === 0 && <p className="text-[10px] text-gray-400 mt-1">No hay unidades en agencia disponibles; el carro se elige al registrar la venta.</p>}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-gray-500">Condiciones de pago <span className="text-indigo-600">(generado de los montos)</span></label>
                      {textoManual && <button type="button" onClick={() => setTextoManual(false)} className="text-[10px] text-indigo-600 font-bold hover:underline">↻ Regenerar</button>}
                    </div>
                    <textarea className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red resize-none" rows={3}
                      value={observaciones} onChange={e => { setObservaciones(e.target.value); setTextoManual(true) }}
                      placeholder="Se arma solo con los montos de arriba…" />
                  </div>

                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={enviarCorreo} onChange={e => setEnviarCorreo(e.target.checked)} className="w-4 h-4" />
                    Enviar la proforma al cliente por correo
                  </label>
                  {enviarCorreo && (
                    <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red" type="email"
                      value={correo} onChange={e => setCorreo(e.target.value)} placeholder="correo@cliente.com" />
                  )}

                  <div className="flex gap-2 pt-1">
                    <button onClick={cerrar} disabled={saving} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
                    <button onClick={generar} disabled={saving || (enviarCorreo && !correo.trim())} className="flex-1 py-2.5 rounded-lg bg-indigo-700 text-white text-sm font-semibold hover:bg-indigo-800 disabled:opacity-50 flex items-center justify-center gap-2">
                      {saving && <Loader2 size={14} className="animate-spin" />} {esEdit ? 'Guardar cambios' : 'Generar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
