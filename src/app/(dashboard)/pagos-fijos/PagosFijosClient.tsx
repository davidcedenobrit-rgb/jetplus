'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIAS_EGRESO_LABEL } from '@/lib/utils'
import { Plus, Repeat, Calendar, Trash2, Power, Receipt, Loader2, X, AlertTriangle } from 'lucide-react'
import ProveedorPicker from '../egresos/nuevo/ProveedorPicker'
import type { Proveedor } from '../egresos/actions'
import {
  listarPagosFijos, crearPagoFijo, togglePagoFijo, eliminarPagoFijo,
  registrarEgresoDePagoFijo, type PagoFijo, type Frecuencia,
} from './actions'

type CentroCosto = { id: string; nombre: string }

const FRECUENCIAS: { value: Frecuencia; label: string }[] = [
  { value: 'semanal',    label: 'Semanal' },
  { value: 'quincenal',  label: 'Quincenal' },
  { value: 'mensual',    label: 'Mensual' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'anual',      label: 'Anual' },
]
const FREC_LABEL: Record<string, string> = Object.fromEntries(FRECUENCIAS.map(f => [f.value, f.label]))

function fmtMonto(n: number, moneda: string) {
  const s = n.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(n) * 100) % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })
  return moneda === 'VES' ? `Bs. ${s}` : `$${s}`
}

function estadoVencimiento(proximo: string | null): { label: string; tone: 'ok' | 'due' | 'over' } {
  if (!proximo) return { label: 'Sin fecha', tone: 'ok' }
  const hoy = new Date().toISOString().split('T')[0]
  if (proximo < hoy) return { label: `Vencido — ${fmtFecha(proximo)}`, tone: 'over' }
  if (proximo === hoy) return { label: 'Vence hoy', tone: 'due' }
  return { label: fmtFecha(proximo), tone: 'ok' }
}

function fmtFecha(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PagosFijosClient() {
  const router = useRouter()
  const [pagos, setPagos] = useState<PagoFijo[]>([])
  const [centros, setCentros] = useState<CentroCosto[]>([])
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [procesando, setProcesando] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Form
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState<'USD' | 'VES'>('USD')
  const [frecuencia, setFrecuencia] = useState<Frecuencia>('mensual')
  const [proximoPago, setProximoPago] = useState('')
  const [centroCosto, setCentroCosto] = useState('')
  const [categoria, setCategoria] = useState('')
  const [proveedor, setProveedor] = useState<Proveedor | null>(null)
  const [notas, setNotas] = useState('')

  async function recargar() {
    const { pagos } = await listarPagosFijos()
    setPagos(pagos)
    setLoading(false)
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.from('centros_costo').select('id, nombre').eq('activo', true).order('orden')
      .then(({ data }) => { if (data) setCentros(data) })
    recargar()
  }, [])

  function resetForm() {
    setConcepto(''); setMonto(''); setMoneda('USD'); setFrecuencia('mensual')
    setProximoPago(''); setCentroCosto(''); setCategoria(''); setProveedor(null); setNotas('')
    setError('')
  }

  async function guardar() {
    setError('')
    const montoNum = parseFloat(monto)
    if (!concepto.trim()) { setError('El concepto es requerido'); return }
    if (isNaN(montoNum) || montoNum <= 0) { setError('El monto debe ser mayor a 0'); return }
    setGuardando(true)
    const res = await crearPagoFijo({
      concepto, monto: montoNum, moneda, frecuencia,
      centro_costo_id: centroCosto || null,
      categoria: categoria || null,
      proveedor_id: proveedor?.id ?? null,
      beneficiario: proveedor?.nombre ?? null,
      proximo_pago: proximoPago || null,
      notas: notas || null,
    })
    setGuardando(false)
    if (res.error) { setError(res.error); return }
    resetForm(); setCreando(false); recargar()
  }

  async function generar(id: string) {
    setProcesando(id)
    const res = await registrarEgresoDePagoFijo(id)
    setProcesando(null)
    if (res.error) { setError(res.error); return }
    await recargar()
    router.refresh()
  }

  async function toggle(p: PagoFijo) {
    await togglePagoFijo(p.id, !p.activo)
    recargar()
  }

  async function borrar(id: string) {
    if (!confirm('¿Eliminar este pago fijo? No borra los egresos ya generados.')) return
    await eliminarPagoFijo(id)
    recargar()
  }

  const centroNombre = (id: string | null) => id ? (centros.find(c => c.id === id)?.nombre ?? id) : null

  return (
    <div>
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <AlertTriangle size={15} className="text-oriental-red flex-shrink-0" />
          <p className="text-oriental-red text-sm flex-1">{error}</p>
          <button onClick={() => setError('')}><X size={15} className="text-oriental-red" /></button>
        </div>
      )}

      {/* Botón nuevo */}
      {!creando && (
        <button onClick={() => setCreando(true)} className="btn-primary flex items-center gap-2 mb-5">
          <Plus size={16} /> Nuevo pago fijo
        </button>
      )}

      {/* Form nuevo */}
      {creando && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider flex items-center gap-2">
              <div className="w-1 h-4 bg-oriental-red rounded-full" /> Nuevo pago fijo
            </h2>
            <button onClick={() => { resetForm(); setCreando(false) }} className="text-oriental-gray hover:text-oriental-black"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Concepto *</label>
              <input type="text" className="input" placeholder="Ej: Alquiler del local, Nómina quincenal, Internet" value={concepto} onChange={e => setConcepto(e.target.value)} />
            </div>
            <div>
              <label className="label">Monto *</label>
              <input type="number" step="0.01" min="0" className="input font-semibold" placeholder="0.00" value={monto} onChange={e => setMonto(e.target.value)} />
            </div>
            <div>
              <label className="label">Moneda</label>
              <div className="flex gap-2">
                {(['USD', 'VES'] as const).map(m => (
                  <button key={m} type="button" onClick={() => setMoneda(m)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${moneda === m ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Frecuencia *</label>
              <select className="select" value={frecuencia} onChange={e => setFrecuencia(e.target.value as Frecuencia)}>
                {FRECUENCIAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Próximo pago</label>
              <input type="date" className="input" value={proximoPago} onChange={e => setProximoPago(e.target.value)} />
            </div>
            <div>
              <label className="label">Centro de costo</label>
              <select className="select" value={centroCosto} onChange={e => setCentroCosto(e.target.value)}>
                <option value="">Seleccionar...</option>
                {centros.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Categoría</label>
              <select className="select" value={categoria} onChange={e => setCategoria(e.target.value)}>
                <option value="">Seleccionar...</option>
                {Object.entries(CATEGORIAS_EGRESO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Beneficiario (proveedor)</label>
              <ProveedorPicker proveedor={proveedor} onChange={setProveedor} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Notas</label>
              <input type="text" className="input" placeholder="Opcional" value={notas} onChange={e => setNotas(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-5">
            <button onClick={guardar} disabled={guardando} className="btn-primary flex items-center gap-2 py-2.5 px-5">
              {guardando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Guardar pago fijo
            </button>
            <button onClick={() => { resetForm(); setCreando(false) }} className="btn-secondary py-2.5 px-5">Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="card p-12 text-center text-oriental-gray text-sm">Cargando...</div>
      ) : pagos.length === 0 ? (
        <div className="card p-12 text-center">
          <Repeat size={30} className="mx-auto text-gray-300 mb-3" />
          <p className="text-oriental-gray text-sm">Aún no hay pagos fijos. Crea el primero para que el sistema te recuerde cuándo pagar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pagos.map(p => {
            const venc = estadoVencimiento(p.proximo_pago)
            return (
              <div key={p.id} className={`card p-4 ${!p.activo ? 'opacity-60' : ''}`}>
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-oriental-black">{p.concepto}</p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-oriental-gray bg-gray-100 px-2 py-0.5 rounded-full">
                        <Repeat size={11} /> {FREC_LABEL[p.frecuencia] ?? p.frecuencia}
                      </span>
                      {!p.activo && <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Inactivo</span>}
                    </div>
                    <p className="text-xs text-oriental-gray mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      {p.beneficiario && <span>{p.beneficiario}</span>}
                      {centroNombre(p.centro_costo_id) && <span>· {centroNombre(p.centro_costo_id)}</span>}
                      {p.categoria && <span>· {CATEGORIAS_EGRESO_LABEL[p.categoria] ?? p.categoria}</span>}
                    </p>
                  </div>

                  <div className="text-right md:w-40">
                    <p className="font-bold text-oriental-black">{fmtMonto(p.monto, p.moneda)}</p>
                    <p className={`text-[11px] font-semibold inline-flex items-center gap-1 ${
                      venc.tone === 'over' ? 'text-oriental-red' : venc.tone === 'due' ? 'text-orange-600' : 'text-oriental-gray'
                    }`}>
                      <Calendar size={11} /> {venc.label}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => generar(p.id)}
                      disabled={procesando === p.id || !p.activo}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-oriental-black text-white text-xs font-semibold hover:bg-black disabled:opacity-50"
                      title="Generar el egreso de este período"
                    >
                      {procesando === p.id ? <Loader2 size={13} className="animate-spin" /> : <Receipt size={13} />} Registrar egreso
                    </button>
                    <button onClick={() => toggle(p)} className="p-2 rounded-lg border border-gray-200 text-oriental-gray hover:bg-gray-50" title={p.activo ? 'Desactivar' : 'Activar'}>
                      <Power size={14} />
                    </button>
                    <button onClick={() => borrar(p.id)} className="p-2 rounded-lg border border-gray-200 text-oriental-gray hover:text-oriental-red hover:bg-red-50" title="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {p.ultimo_pago_at && (
                  <p className="text-[10px] text-oriental-gray mt-2">Último egreso generado: {new Date(p.ultimo_pago_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
