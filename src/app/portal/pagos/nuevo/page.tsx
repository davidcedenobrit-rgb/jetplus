'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Upload, Check, Loader2, AlertCircle, DollarSign, Car, Calendar, X } from 'lucide-react'

interface Vehiculo { id: string; marca: string; modelo: string; placa: string | null }
interface Credito { id: string; plan_tipo: string; vehiculo_id: string }
interface Cuota { id: string; numero_cuota: number; monto: number; monto_pagado: number; fecha_vencimiento: string; estado: string; credito_id: string }

const METODOS = [
  { value: 'Transferencia bancaria', label: 'Transferencia bancaria' },
  { value: 'Zelle', label: 'Zelle' },
  { value: 'USDT VE', label: 'USDT / Binance' },
  { value: 'Binance', label: 'Binance' },
  { value: 'Pago Móvil', label: 'Pago Móvil' },
  { value: 'Efectivo USD', label: 'Efectivo USD' },
  { value: 'Efectivo VES', label: 'Efectivo Bs.' },
  { value: 'Otro', label: 'Otro' },
]

function fmtFecha(s: string) {
  try { return new Date(s + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return s }
}

function fmtMoney(n: number) {
  return n.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(n)*100)%100===0?0:2, maximumFractionDigits: 2 })
}

export default function NuevoPagoPortalPage() {
  const router = useRouter()
  const supabase = createClient()

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [creditos, setCreditos] = useState<Credito[]>([])
  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [loading, setLoading] = useState(true)

  const [aplicarA, setAplicarA] = useState<'cuota' | 'generico'>('cuota')
  const [cuotaId, setCuotaId] = useState<string | null>(null)
  const [vehiculoId, setVehiculoId] = useState<string | null>(null)
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState<'USD' | 'USDT' | 'VES'>('USD')
  const [metodoPago, setMetodoPago] = useState('Transferencia bancaria')
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10))
  const [referencia, setReferencia] = useState('')
  const [bancoOrigen, setBancoOrigen] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null)
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<{ numero: string } | null>(null)

  useEffect(() => {
    (async () => {
      // Obtener cliente_id del user autenticado
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: cuenta } = await supabase
        .from('cliente_cuentas')
        .select('cliente_id')
        .eq('user_id', user.id)
        .eq('activo', true)
        .maybeSingle()

      if (!cuenta?.cliente_id) {
        setError('No se pudo identificar su cuenta de cliente')
        setLoading(false)
        return
      }

      // Filtrar explicitamente por cliente_id (no depende solo de RLS)
      const { data: veh } = await supabase
        .from('vehiculos')
        .select('id, marca, modelo, placa')
        .eq('cliente_id', cuenta.cliente_id)

      const { data: cred } = await supabase
        .from('creditos')
        .select('id, plan_tipo, vehiculo_id')
        .eq('cliente_id', cuenta.cliente_id)
        .eq('estado', 'activo')

      setVehiculos(veh ?? [])
      setCreditos(cred ?? [])
      const credIds = (cred ?? []).map(c => c.id)
      if (credIds.length > 0) {
        const { data: cu } = await supabase
          .from('cuotas')
          .select('id, numero_cuota, monto, monto_pagado, fecha_vencimiento, estado, credito_id')
          .in('credito_id', credIds)
          .in('estado', ['pendiente', 'vencida', 'abono_parcial'])
          .order('fecha_vencimiento', { ascending: true })
        setCuotas(cu ?? [])
      }
      // Pre-selecciones
      if ((veh ?? []).length === 1) setVehiculoId(veh![0].id)
      setLoading(false)
    })()
  }, [])

  async function subirComprobante(file: File) {
    setUploading(true); setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesión expirada')
      const path = `portal-clientes/${user.id}/${Date.now()}.${file.name.split('.').pop() ?? 'jpg'}`
      const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, file, { upsert: false })
      if (upErr) throw new Error(upErr.message)
      const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(path)
      setComprobanteUrl(urlData.publicUrl)
      setComprobanteFile(file)
    } catch (e: any) {
      setError(e?.message ?? 'Error subiendo el comprobante')
      setComprobanteFile(null)
      setComprobanteUrl(null)
    } finally {
      setUploading(false)
    }
  }

  async function enviar() {
    setError(null)
    const montoNum = parseFloat(monto.replace(',', '.'))
    if (isNaN(montoNum) || montoNum <= 0) { setError('Ingresa un monto válido'); return }
    if (aplicarA === 'cuota' && !cuotaId) { setError('Elige la cuota a la que aplicar el pago o cambia a "Abono al vehículo"'); return }
    if (aplicarA === 'generico' && !vehiculoId) { setError('Elige el vehículo al que aplicar el abono'); return }
    if (!comprobanteUrl) { setError('El comprobante del pago es obligatorio'); return }

    setSaving(true)
    const res = await fetch('/api/portal-clientes/registrar-pago', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cuotaId: aplicarA === 'cuota' ? cuotaId : null,
        vehiculoId: aplicarA === 'generico' ? vehiculoId : null,
        monto: montoNum,
        moneda,
        metodoPago,
        referencia: referencia || null,
        bancoOrigen: bancoOrigen || null,
        fechaPago,
        comprobanteUrl,
        observaciones: observaciones || null,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json()
      setError(j.error ?? 'Error al enviar el pago')
      return
    }
    const j = await res.json()
    setExito({ numero: j.numeroRecibo })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-oriental-red" />
      </div>
    )
  }

  if (exito) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check size={30} className="text-green-700" />
        </div>
        <h1 className="text-xl font-black text-oriental-black mb-1">Pago reportado</h1>
        <p className="text-sm text-oriental-gray mb-1">Su comprobante: <span className="font-mono font-bold text-oriental-black">{exito.numero}</span></p>
        <p className="text-xs text-oriental-gray mb-8 max-w-xs">
          El equipo de Jetplus ya recibió una notificación. Le confirmaremos cuando esté verificado.
        </p>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Link href="/portal/pagos" className="px-5 py-3 bg-oriental-red text-white font-bold rounded-xl">Ver mis pagos</Link>
          <Link href="/portal/inicio" className="px-5 py-3 border border-gray-200 text-oriental-black font-semibold rounded-xl">Volver al inicio</Link>
        </div>
      </div>
    )
  }

  const cuotasFiltradas = vehiculoId
    ? cuotas.filter(c => {
        const cred = creditos.find(x => x.id === c.credito_id)
        return cred?.vehiculo_id === vehiculoId
      })
    : cuotas

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/portal/pagos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50">
          <ArrowLeft size={16} className="text-oriental-gray" />
        </Link>
        <div>
          <h1 className="text-base font-black text-oriental-black">Reportar pago</h1>
          <p className="text-[11px] text-oriental-gray">Complete los datos y adjunte el comprobante</p>
        </div>
      </header>

      <div className="p-5 space-y-4">
        {/* Vehiculo */}
        {vehiculos.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">No hay vehículos asignados a su cuenta</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Contacte al equipo de Jetplus para vincular su vehículo antes de reportar un pago.
              </p>
            </div>
          </div>
        ) : vehiculos.length === 1 ? (
          <div className="bg-white rounded-2xl p-4">
            <label className="text-[11px] font-bold text-oriental-gray uppercase tracking-wide mb-2 block">Vehículo</label>
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-3">
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
                <Car size={18} className="text-oriental-red" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-oriental-black truncate">
                  {vehiculos[0].marca} {vehiculos[0].modelo}
                </p>
                {vehiculos[0].placa && (
                  <p className="text-[11px] text-oriental-gray font-mono">Placa: {vehiculos[0].placa}</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4">
            <label className="text-[11px] font-bold text-oriental-gray uppercase tracking-wide mb-2 block">Vehículo</label>
            <select
              value={vehiculoId ?? ''}
              onChange={e => { setVehiculoId(e.target.value || null); setCuotaId(null) }}
              className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-oriental-red"
            >
              <option value="">Seleccionar…</option>
              {vehiculos.map(v => (
                <option key={v.id} value={v.id}>
                  {v.marca} {v.modelo}{v.placa ? ` · ${v.placa}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Aplicar a */}
        <div className="bg-white rounded-2xl p-4">
          <label className="text-[11px] font-bold text-oriental-gray uppercase tracking-wide mb-3 block">¿A qué aplica el pago?</label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => setAplicarA('cuota')}
              className={`p-3 border-2 rounded-xl text-xs font-bold ${
                aplicarA === 'cuota' ? 'border-oriental-red bg-red-50 text-oriental-red' : 'border-gray-200 text-oriental-gray'
              }`}
            >
              Cuota específica
            </button>
            <button
              onClick={() => setAplicarA('generico')}
              className={`p-3 border-2 rounded-xl text-xs font-bold ${
                aplicarA === 'generico' ? 'border-oriental-red bg-red-50 text-oriental-red' : 'border-gray-200 text-oriental-gray'
              }`}
            >
              Abono al vehículo
            </button>
          </div>

          {aplicarA === 'cuota' ? (
            cuotasFiltradas.length === 0 ? (
              <p className="text-xs text-oriental-gray text-center py-4">
                No hay cuotas pendientes {vehiculoId ? 'para este vehículo' : 'en este momento'}.
              </p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {cuotasFiltradas.map(c => {
                  const restante = Math.max(0, Number(c.monto) - Number(c.monto_pagado ?? 0))
                  const sel = cuotaId === c.id
                  return (
                    <button
                      key={c.id}
                      onClick={() => setCuotaId(c.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                        sel ? 'border-oriental-red bg-red-50' : 'border-gray-100 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-left">
                        <p className="text-xs font-bold text-oriental-black">Cuota {c.numero_cuota}</p>
                        <p className="text-[10px] text-oriental-gray flex items-center gap-1">
                          <Calendar size={9} /> {fmtFecha(c.fecha_vencimiento)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-oriental-black">${fmtMoney(restante)}</p>
                        <p className="text-[9px] text-oriental-gray">{c.estado}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          ) : (
            <p className="text-xs text-oriental-gray">
              El pago se registrará como abono. El equipo decidirá a qué cuota aplicarlo.
            </p>
          )}
        </div>

        {/* Monto y moneda */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <div>
            <label className="text-[11px] font-bold text-oriental-gray uppercase tracking-wide mb-1 block">Monto</label>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  inputMode="decimal"
                  value={monto}
                  onChange={e => setMonto(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-base font-bold bg-white focus:outline-none focus:border-oriental-red"
                />
              </div>
              <select
                value={moneda}
                onChange={e => setMoneda(e.target.value as any)}
                className="px-2 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-oriental-red font-semibold"
              >
                <option value="USD">USD</option>
                <option value="USDT">USDT</option>
                <option value="VES">Bs.</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-oriental-gray uppercase tracking-wide mb-1 block">Método de pago</label>
            <select
              value={metodoPago}
              onChange={e => setMetodoPago(e.target.value)}
              className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-oriental-red"
            >
              {METODOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-oriental-gray uppercase tracking-wide mb-1 block">Fecha del pago</label>
            <input
              type="date"
              value={fechaPago}
              onChange={e => setFechaPago(e.target.value)}
              className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-oriental-red"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-oriental-gray uppercase tracking-wide mb-1 block">Referencia / N.° de transacción</label>
            <input
              type="text"
              value={referencia}
              onChange={e => setReferencia(e.target.value)}
              placeholder="Opcional"
              className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-oriental-red"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-oriental-gray uppercase tracking-wide mb-1 block">Banco / Origen</label>
            <input
              type="text"
              value={bancoOrigen}
              onChange={e => setBancoOrigen(e.target.value)}
              placeholder="Ej: Banesco, Zelle, Binance…"
              className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-oriental-red"
            />
          </div>
        </div>

        {/* Comprobante */}
        <div className="bg-white rounded-2xl p-4">
          <label className="text-[11px] font-bold text-oriental-gray uppercase tracking-wide mb-2 block">
            Comprobante *
          </label>
          {comprobanteUrl ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <Check size={16} className="text-green-700" />
                <p className="text-xs font-semibold text-green-800 truncate">
                  {comprobanteFile?.name ?? 'Comprobante subido'}
                </p>
              </div>
              <button
                onClick={() => { setComprobanteUrl(null); setComprobanteFile(null) }}
                className="text-xs text-red-600 font-bold flex items-center gap-1"
              >
                <X size={12} /> Cambiar
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-6 hover:bg-gray-50 cursor-pointer">
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-oriental-red" />
                  <span className="text-sm font-semibold text-oriental-gray">Subiendo…</span>
                </>
              ) : (
                <>
                  <Upload size={16} className="text-oriental-red" />
                  <span className="text-sm font-semibold text-oriental-black">Subir foto o PDF</span>
                </>
              )}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={e => e.target.files?.[0] && subirComprobante(e.target.files[0])}
              />
            </label>
          )}
          <p className="text-[10px] text-oriental-gray mt-2">Foto de la transferencia, captura del banco, o PDF del comprobante.</p>
        </div>

        {/* Observaciones */}
        <div className="bg-white rounded-2xl p-4">
          <label className="text-[11px] font-bold text-oriental-gray uppercase tracking-wide mb-1 block">Observaciones</label>
          <textarea
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            rows={2}
            placeholder="Opcional: cualquier detalle que le sirva al equipo…"
            className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-oriental-red"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle size={14} className="text-red-700 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <button
          onClick={enviar}
          disabled={saving || uploading || !comprobanteUrl}
          className="w-full py-3.5 bg-oriental-red text-white text-sm font-bold rounded-xl hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-red-100"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? 'Enviando…' : 'Enviar reporte de pago'}
        </button>

        <p className="text-[11px] text-oriental-gray text-center px-4">
          Al enviar, el equipo de Jetplus recibirá una notificación para verificar el pago.
        </p>
      </div>
    </div>
  )
}
