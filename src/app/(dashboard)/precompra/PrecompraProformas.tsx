'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Loader2, FileDown, Upload, FileText, ShieldCheck, CheckCircle2, PenLine, Send, Vault } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */
const fmt = (n: number | null | undefined) => Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtFecha = (s: string | null) => { if (!s) return '—'; try { return new Date(s + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return s } }

const DOC_TIPOS_NATURAL = ['Cédula', 'RIF', 'Comprobante de reserva']
const DOC_TIPOS_JURIDICA = ['RIF de la empresa', 'Registro mercantil', 'Cédula del firmante', 'RIF del firmante', 'Comprobante de reserva']

export default function PrecompraProformas() {
  const [cots, setCots] = useState<any[]>([])
  const [proformas, setProformas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editar, setEditar] = useState<any | null>(null)   // cotización o proforma a editar

  async function cargar() {
    setLoading(true)
    const [a, b] = await Promise.all([
      fetch('/api/precompra/cotizaciones').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/precompra/proforma').then(r => r.ok ? r.json() : []).catch(() => []),
    ])
    setCots(Array.isArray(a) ? a : [])
    setProformas(Array.isArray(b) ? b : [])
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  const cotsPendientes = useMemo(() => cots.filter(c => !c.tiene_proforma), [cots])

  if (loading) return <div className="py-16 text-center text-gray-400"><Loader2 className="animate-spin inline" size={20} /></div>

  return (
    <div className="space-y-8">
      {/* Cotizaciones AC500 → generar proforma */}
      <div>
        <h3 className="text-sm font-bold text-oriental-black mb-2">Cotizaciones Asegúrate $500 sin proforma</h3>
        {cotsPendientes.length === 0 ? (
          <p className="text-sm text-gray-400">No hay cotizaciones pendientes. Genera una en la pestaña «Generar cotización».</p>
        ) : (
          <div className="space-y-2">
            {cotsPendientes.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-2 border border-gray-200 rounded-xl p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-oriental-black truncate">{c.cliente_nombre} <span className="text-gray-400 font-normal">· {c.numero}</span></p>
                  <p className="text-xs text-gray-500 truncate">{c.marca} {c.modelo}{c.ac500_meses ? ` · ${c.ac500_meses} meses` : ''} · {fmtFecha(c.fecha)}</p>
                </div>
                <button onClick={() => setEditar({ tipo: 'cotizacion', ...c })}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-800 text-white text-xs font-bold hover:bg-blue-900">
                  Generar proforma
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Proformas AC500 */}
      <div>
        <h3 className="text-sm font-bold text-oriental-black mb-2">Proformas de compra programada</h3>
        {proformas.length === 0 ? (
          <p className="text-sm text-gray-400">Aún no hay proformas.</p>
        ) : (
          <div className="space-y-3">
            {proformas.map(p => <ProformaCard key={p.id} p={p} onEdit={() => setEditar({ tipo: 'proforma', ...p })} onChange={cargar} />)}
          </div>
        )}
      </div>

      {editar && <ProformaModal registro={editar} onClose={() => setEditar(null)} onSaved={() => { setEditar(null); cargar() }} />}
    </div>
  )
}

function ProformaCard({ p, onEdit, onChange }: { p: any; onEdit: () => void; onChange: () => void }) {
  const [subiendo, setSubiendo] = useState<string>('')
  const [firmando, setFirmando] = useState(false)
  const [correo, setCorreo] = useState(p.correo_destino || '')
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState('')
  const [cobrando, setCobrando] = useState(false)
  const tipos = p.tipo_persona === 'juridica' ? DOC_TIPOS_JURIDICA : DOC_TIPOS_NATURAL
  const docs: any[] = Array.isArray(p.documentos) ? p.documentos : []
  const tieneDoc = (t: string) => docs.some(d => d.tipo === t)

  async function enviar() {
    if (!correo.trim()) { setMsg('Escribe el correo de destino'); return }
    setEnviando(true); setMsg('')
    const r = await fetch(`/api/precompra/proforma/${p.id}/enviar`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ correoDestino: correo }),
    })
    const j = await r.json().catch(() => ({}))
    setEnviando(false)
    if (r.ok) { setMsg('Enviado ✓'); onChange() } else setMsg(j.error ?? 'No se pudo enviar')
  }

  async function cobrarCuota1() {
    if (!confirm('¿Registrar el pago de la cuota 1? Esto hará caer $500 en la bóveda.')) return
    setCobrando(true); setMsg('')
    const r = await fetch(`/api/precompra/proforma/${p.id}/cuota1`, { method: 'POST' })
    const j = await r.json().catch(() => ({}))
    setCobrando(false)
    if (r.ok) { setMsg('Cuota 1 registrada · $500 a bóveda ✓'); onChange() }
    else setMsg(j.error ?? 'No se pudo registrar')
  }

  async function subir(tipo: string, file: File) {
    setSubiendo(tipo)
    const fd = new FormData()
    fd.append('file', file); fd.append('tipo', tipo)
    const r = await fetch(`/api/precompra/proforma/${p.id}/documento`, { method: 'POST', body: fd })
    setSubiendo('')
    if (r.ok) onChange()
    else alert((await r.json().catch(() => ({}))).error ?? 'No se pudo subir')
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-oriental-black text-sm truncate">{p.cliente_nombre}</span>
            {p.ciclo && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700">Ciclo #{p.ciclo}</span>}
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-600">{p.estado}</span>
          </div>
          <p className="text-xs text-gray-500 truncate">{p.marca} {p.modelo}{p.colores ? ` · ${p.colores}` : ''} · Total ${fmt(p.total_pagar)}</p>
        </div>
        <button onClick={onEdit} className="shrink-0 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-oriental-red hover:bg-red-50">Editar datos</button>
      </div>

      {/* Documentos */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {tipos.map(t => (
          <label key={t} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer transition-colors ${tieneDoc(t) ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-400'}`}>
            {subiendo === t ? <Loader2 size={11} className="animate-spin" /> : tieneDoc(t) ? <CheckCircle2 size={11} /> : <Upload size={11} />}
            {t}
            <input type="file" className="hidden" accept="image/*,application/pdf"
              onChange={e => { const f = e.target.files?.[0]; if (f) subir(t, f); e.currentTarget.value = '' }} />
          </label>
        ))}
      </div>
      {docs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {docs.map((d, i) => (
            <a key={i} href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:underline">
              <FileText size={11} /> {d.tipo}
            </a>
          ))}
        </div>
      )}

      {/* Firma + Anexos */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button onClick={() => setFirmando(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${p.firma_cliente ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-blue-800 border-blue-300 hover:bg-blue-50'}`}>
          {p.firma_cliente ? <CheckCircle2 size={13} /> : <PenLine size={13} />} {p.firma_cliente ? 'Firmado' : 'Firmar digital'}
        </button>
        <a href={`/api/precompra/proforma/${p.id}/anexo?variante=oriental`} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-oriental-red text-white text-xs font-bold hover:bg-red-700">
          <FileDown size={13} /> Anexo A Oriental
        </a>
        <a href={`/api/precompra/proforma/${p.id}/anexo?variante=vehimotors`} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-oriental-black text-white text-xs font-bold hover:bg-gray-800">
          <FileDown size={13} /> Anexo A Vehimotors
        </a>
        {p.cuota1_pagada ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 text-xs font-bold">
            <Vault size={13} /> Cuota 1 pagada · $500 en bóveda
          </span>
        ) : (
          <button onClick={cobrarCuota1} disabled={cobrando}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 disabled:opacity-50">
            {cobrando ? <Loader2 size={13} className="animate-spin" /> : <Vault size={13} />} Registrar pago cuota 1
          </button>
        )}
      </div>

      {/* Envío a Vehimotors (correo abierto) */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center border-t border-gray-100 pt-3">
        <input value={correo} onChange={e => setCorreo(e.target.value)} placeholder="Correo de Vehimotors (Marilyn)…"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red" />
        <button onClick={enviar} disabled={enviando}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-800 text-white text-xs font-bold hover:bg-blue-900 disabled:opacity-50">
          {enviando ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Enviar a Vehimotors
        </button>
      </div>
      {msg && <p className={`text-[11px] mt-1 ${msg.includes('✓') ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}
      {p.enviado_at && <p className="text-[10px] text-gray-400 mt-1">Último envío: {fmtFecha(p.enviado_at)} → {p.enviado_a}</p>}

      {firmando && <FirmaModal proformaId={p.id} onClose={() => setFirmando(false)} onSaved={() => { setFirmando(false); onChange() }} />}
    </div>
  )
}

function FirmaModal({ proformaId, onClose, onSaved }: { proformaId: string; onClose: () => void; onSaved: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const [saving, setSaving] = useState(false)
  const [vacia, setVacia] = useState(true)

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!; const r = c.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) }
  }
  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true; setVacia(false)
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = pos(e); ctx.beginPath(); ctx.moveTo(x, y)
    ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#111827'
    const { x, y } = pos(e); ctx.lineTo(x, y); ctx.stroke()
  }
  function end() { drawing.current = false }
  function limpiar() {
    const c = canvasRef.current!; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); setVacia(true)
  }
  async function guardar() {
    if (vacia) { onClose(); return }
    setSaving(true)
    const dataUrl = canvasRef.current!.toDataURL('image/png')
    const r = await fetch(`/api/precompra/proforma/${proformaId}/firma`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataUrl }),
    })
    setSaving(false)
    if (r.ok) onSaved(); else alert((await r.json().catch(() => ({}))).error ?? 'No se pudo guardar la firma')
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && onClose()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-oriental-black text-sm flex items-center gap-2"><PenLine size={15} className="text-blue-800" /> Firma del cliente</h3>
          <button onClick={() => !saving && onClose()} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><X size={16} /></button>
        </div>
        <p className="text-xs text-gray-500 mb-2">El cliente firma con el dedo o el mouse. Se adjuntará al Anexo A.</p>
        <canvas ref={canvasRef} width={480} height={200}
          onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end}
          className="w-full h-[200px] border-2 border-dashed border-gray-300 rounded-lg touch-none bg-gray-50" />
        <div className="flex gap-2 mt-3">
          <button onClick={limpiar} className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Limpiar</button>
          <button onClick={guardar} disabled={saving} className="flex-1 py-2 rounded-lg bg-oriental-red text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />} Guardar firma
          </button>
        </div>
      </div>
    </div>
  )
}

function ProformaModal({ registro, onClose, onSaved }: { registro: any; onClose: () => void; onSaved: () => void }) {
  const esCot = registro.tipo === 'cotizacion'
  const [f, setF] = useState({
    tipoPersona: registro.tipo_persona || 'natural',
    clienteNombre: registro.cliente_nombre || '',
    clienteCedula: registro.cliente_cedula || '',
    clienteRif: registro.cliente_rif || registro.cliente_ci_rif || '',
    clienteDireccion: registro.cliente_direccion || '',
    clienteTelefono: registro.cliente_telefono || '',
    clienteCorreo: registro.cliente_correo || '',
    estadoCivil: registro.estado_civil || '',
    conyugeNombre: registro.conyuge?.nombre || '',
    conyugeCedula: registro.conyuge?.cedula || '',
    conyugeRif: registro.conyuge?.rif || '',
    registroMercantil: registro.registro_mercantil || '',
    colores: registro.colores || registro.color || '',
    ciclo: String(registro.ciclo || ''),
    fechaPlan: (registro.fecha_plan || registro.fecha || '').slice(0, 10),
    notas: registro.notas || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))
  const casado = /casad/i.test(f.estadoCivil)

  async function guardar() {
    setSaving(true); setError('')
    const body: any = {
      id: esCot ? undefined : registro.id,
      cotizacionId: esCot ? registro.id : registro.cotizacion_id,
      tipoPersona: f.tipoPersona,
      clienteNombre: f.clienteNombre, clienteCedula: f.clienteCedula, clienteRif: f.clienteRif,
      clienteDireccion: f.clienteDireccion, clienteTelefono: f.clienteTelefono, clienteCorreo: f.clienteCorreo,
      estadoCivil: f.estadoCivil,
      conyuge: casado ? { nombre: f.conyugeNombre, cedula: f.conyugeCedula, rif: f.conyugeRif } : null,
      registroMercantil: f.registroMercantil,
      colores: f.colores, ciclo: f.ciclo, fechaPlan: f.fechaPlan, notas: f.notas,
    }
    const r = await fetch('/api/precompra/proforma', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json().catch(() => ({}))
    setSaving(false)
    if (!r.ok) { setError(j.error ?? 'No se pudo guardar'); return }
    onSaved()
  }

  const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red'
  const lbl = 'block text-[11px] font-semibold text-gray-500 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && onClose()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-bold text-oriental-black text-base flex items-center gap-2"><ShieldCheck size={16} className="text-blue-800" /> Proforma — Asegúrate $500</h2>
            <p className="text-xs text-oriental-gray">{registro.marca} {registro.modelo}</p>
          </div>
          <button onClick={() => !saving && onClose()} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-800">{error}</div>}
          <div>
            <label className={lbl}>Tipo de persona</label>
            <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
              {(['natural', 'juridica'] as const).map(v => (
                <button key={v} type="button" onClick={() => set('tipoPersona', v)}
                  className={`px-3 py-1.5 text-xs font-bold ${f.tipoPersona === v ? 'bg-oriental-red text-white' : 'bg-white text-gray-600'}`}>
                  {v === 'juridica' ? 'Jurídica' : 'Natural'}
                </button>
              ))}
            </div>
          </div>
          <div><label className={lbl}>{f.tipoPersona === 'juridica' ? 'Razón social *' : 'Nombre completo *'}</label><input className={inp} value={f.clienteNombre} onChange={e => set('clienteNombre', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Cédula {f.tipoPersona === 'juridica' ? 'del firmante *' : '*'}</label><input className={inp} value={f.clienteCedula} onChange={e => set('clienteCedula', e.target.value)} placeholder="V-..." /></div>
            <div><label className={lbl}>RIF *</label><input className={inp} value={f.clienteRif} onChange={e => set('clienteRif', e.target.value)} placeholder={f.tipoPersona === 'juridica' ? 'J-...' : 'V-...'} /></div>
          </div>
          <div><label className={lbl}>Dirección (como en RIF) *</label><input className={inp} value={f.clienteDireccion} onChange={e => set('clienteDireccion', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Teléfono *</label><input className={inp} value={f.clienteTelefono} onChange={e => set('clienteTelefono', e.target.value)} /></div>
            <div><label className={lbl}>Correo *</label><input className={inp} value={f.clienteCorreo} onChange={e => set('clienteCorreo', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Estado civil *</label><input className={inp} value={f.estadoCivil} onChange={e => set('estadoCivil', e.target.value)} placeholder="Soltero / Casado..." /></div>
            {f.tipoPersona === 'juridica' && <div><label className={lbl}>Registro mercantil *</label><input className={inp} value={f.registroMercantil} onChange={e => set('registroMercantil', e.target.value)} /></div>}
          </div>
          {casado && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2">
              <p className="text-[11px] font-bold text-amber-700">Datos del cónyuge (obligatorio si es casado)</p>
              <input className={inp} value={f.conyugeNombre} onChange={e => set('conyugeNombre', e.target.value)} placeholder="Nombre del cónyuge" />
              <div className="grid grid-cols-2 gap-2">
                <input className={inp} value={f.conyugeCedula} onChange={e => set('conyugeCedula', e.target.value)} placeholder="Cédula" />
                <input className={inp} value={f.conyugeRif} onChange={e => set('conyugeRif', e.target.value)} placeholder="RIF" />
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><label className={lbl}>Color(es) *</label><input className={inp} value={f.colores} onChange={e => set('colores', e.target.value)} placeholder="Blanco / Plata" /></div>
            <div><label className={lbl}>Ciclo</label><input className={inp} value={f.ciclo} onChange={e => set('ciclo', e.target.value)} placeholder="5" inputMode="numeric" /></div>
          </div>
          <div><label className={lbl}>Notas (interno)</label><textarea className={`${inp} resize-none`} rows={2} value={f.notas} onChange={e => set('notas', e.target.value)} /></div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
            <button onClick={guardar} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-oriental-red text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />} Guardar proforma
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
