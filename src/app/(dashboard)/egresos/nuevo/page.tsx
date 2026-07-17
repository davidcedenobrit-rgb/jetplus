'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { METODOS_PAGO, BANCOS_VE, CATEGORIAS_EGRESO_LABEL, CONCEPTOS_POR_CATEGORIA } from '@/lib/utils'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import FileUpload from '@/components/FileUpload'
import { crearEgreso, type Proveedor } from '../actions'
import IvaBloque from '@/components/IvaBloque'
import ProveedorPicker from './ProveedorPicker'

type CentroCosto = { id: string; nombre: string }

export default function NuevoEgresoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [centros, setCentros] = useState<CentroCosto[]>([])
  const [centroCosto, setCentroCosto] = useState('')
  const [origenCapital, setOrigenCapital] = useState('')
  const [tipoMovimiento, setTipoMovimiento] = useState<'gasto' | 'inversion'>('gasto')

  const [categoria, setCategoria] = useState('')
  const [concepto, setConcepto] = useState('')
  const [conceptoPersonalizado, setConceptoPersonalizado] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState<'USD' | 'VES'>('USD')
  const [tasaCambio, setTasaCambio] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [bancoOrigen, setBancoOrigen] = useState('')
  const [proveedor, setProveedor] = useState<Proveedor | null>(null)
  const [referencia, setReferencia] = useState('')
  const [fechaEgreso, setFechaEgreso] = useState(new Date().toISOString().split('T')[0])
  const [observaciones, setObservaciones] = useState('')
  const [numeroSa, setNumeroSa] = useState('')
  const [ivaAplica, setIvaAplica] = useState(false)
  const [ivaTasa, setIvaTasa] = useState('16')
  const [comprobantes, setComprobantes] = useState<{ url: string; nombre: string }[]>([])
  const [categorias, setCategorias] = useState<{ clave: string; nombre: string }[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('centros_costo')
      .select('id, nombre')
      .eq('activo', true)
      .order('orden')
      .then(({ data }) => { if (data) setCentros(data) })
    supabase
      .from('categorias_egreso')
      .select('clave, nombre')
      .eq('activo', true)
      .order('orden')
      .then(({ data }) => { if (data) setCategorias(data) })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const montoNum = parseFloat(monto)
    if (!categoria) { setError('Selecciona una categoría'); return }
    if (isNaN(montoNum) || montoNum <= 0) { setError('El monto debe ser mayor a 0'); return }

    const conceptoFinal = concepto === '__otro__' ? conceptoPersonalizado.trim() : concepto
    if (!conceptoFinal) { setError('El concepto es requerido'); return }

    setLoading(true)
    setError('')

    const tasaNum = parseFloat(tasaCambio)
    const centroNombre = centros.find(c => c.id === centroCosto)?.nombre ?? null
    const result = await crearEgreso({
      categoria,
      concepto: conceptoFinal,
      descripcion: descripcion || null,
      monto: montoNum,
      moneda,
      tasa_cambio: !isNaN(tasaNum) && tasaNum > 0 ? tasaNum : null,
      metodo_pago: metodoPago || null,
      banco_origen: bancoOrigen || null,
      beneficiario: proveedor?.nombre ?? null,
      cedula_rif_benef: proveedor?.rif ?? null,
      referencia: referencia || null,
      fecha_egreso: fechaEgreso,
      area_responsable: centroNombre,
      observaciones: observaciones || null,
      numero_sa: numeroSa || null,
      centro_costo_id: centroCosto || null,
      origen_capital: origenCapital.trim() || null,
      tipo_movimiento: tipoMovimiento,
      proveedor_id: proveedor?.id ?? null,
      iva_aplica: ivaAplica,
      iva_tasa: ivaAplica ? (parseFloat(ivaTasa) || 0) : null,
      comprobantes,
    })

    if (result.error) { setError(result.error); setLoading(false); return }

    router.push('/egresos')
    router.refresh()
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/egresos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Registrar egreso</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Nuevo gasto operativo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Categoría */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" />
            Clasificación
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Centro de costo *</label>
              <select className="select" value={centroCosto} onChange={e => setCentroCosto(e.target.value)} required>
                <option value="">Seleccionar...</option>
                {centros.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Categoría *</label>
              <select className="select" value={categoria} onChange={e => { setCategoria(e.target.value); setConcepto(''); setConceptoPersonalizado('') }} required>
                <option value="">Seleccionar...</option>
                {(categorias.length > 0
                  ? categorias.map(c => [c.clave, c.nombre] as [string, string])
                  : Object.entries(CATEGORIAS_EGRESO_LABEL)
                ).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Tipo de movimiento *</label>
              <div className="flex gap-2">
                {([['gasto', 'Gasto'], ['inversion', 'Inversión']] as const).map(([val, lbl]) => (
                  <button key={val} type="button" onClick={() => setTipoMovimiento(val)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                      tipoMovimiento === val ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
                    }`}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Origen de capital</label>
              <input type="text" className="input" placeholder="Ej: Caja fuerte, Banco Mercantil, Aporte socios" value={origenCapital} onChange={e => setOrigenCapital(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Concepto */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" />
            Detalle del egreso
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Concepto *</label>
              {categoria && CONCEPTOS_POR_CATEGORIA[categoria] ? (
                <>
                  <select
                    className="select"
                    value={concepto}
                    onChange={e => { setConcepto(e.target.value); setConceptoPersonalizado('') }}
                    required
                  >
                    <option value="">Seleccionar concepto...</option>
                    {CONCEPTOS_POR_CATEGORIA[categoria].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="__otro__">Otro (escribir)</option>
                  </select>
                  {concepto === '__otro__' && (
                    <input
                      type="text"
                      className="input mt-2"
                      placeholder="Describe el concepto"
                      value={conceptoPersonalizado}
                      onChange={e => setConceptoPersonalizado(e.target.value)}
                      required
                    />
                  )}
                </>
              ) : (
                <input
                  type="text"
                  className="input"
                  placeholder="Descripción breve del gasto"
                  value={concepto}
                  onChange={e => setConcepto(e.target.value)}
                  required
                />
              )}
            </div>
            <div className="md:col-span-2">
              <label className="label">Descripción detallada</label>
              <textarea className="textarea" rows={2} placeholder="Detalles adicionales..." value={descripcion} onChange={e => setDescripcion(e.target.value)} />
            </div>
            <div>
              <label className="label">Monto *</label>
              <input type="number" step="0.01" min="0" className="input font-semibold" placeholder="0.00" value={monto} onChange={e => setMonto(e.target.value)} required />
            </div>
            <div>
              <label className="label">Moneda *</label>
              <div className="flex gap-2">
                {(['USD', 'VES'] as const).map(m => (
                  <button key={m} type="button" onClick={() => setMoneda(m)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                      moneda === m ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Fecha del egreso *</label>
              <input type="date" className="input" value={fechaEgreso} onChange={e => setFechaEgreso(e.target.value)} required />
            </div>
            <div>
              <label className="label">Tasa Bs/$ al momento del pago</label>
              <input
                type="number" step="0.0001" min="0"
                className="input font-mono"
                placeholder="Ej: 98.50"
                value={tasaCambio}
                onChange={e => setTasaCambio(e.target.value)}
              />
              {tasaCambio && parseFloat(monto) > 0 && !isNaN(parseFloat(tasaCambio)) && (
                <p className="text-[11px] text-gray-500 mt-1">
                  = Bs {(parseFloat(monto) * parseFloat(tasaCambio)).toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(parseFloat(monto) * parseFloat(tasaCambio))*100)%100===0?0:2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="label">IVA</label>
              <IvaBloque aplica={ivaAplica} setAplica={setIvaAplica} tasa={ivaTasa} setTasa={setIvaTasa} total={parseFloat(monto) || 0} moneda={moneda} />
            </div>
            <div>
              <label className="label">Método de pago</label>
              <select className="select" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                <option value="">Seleccionar...</option>
                {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Beneficiario y banco */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" />
            Beneficiario y pago
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Beneficiario (proveedor)</label>
              <ProveedorPicker proveedor={proveedor} onChange={setProveedor} />
              <p className="text-[11px] text-oriental-gray mt-1">Busca un proveedor o créalo en línea (nombre, RIF, correo, teléfono, N° de cuenta).</p>
            </div>
            <div>
              <label className="label">Banco origen</label>
              <select className="select" value={bancoOrigen} onChange={e => setBancoOrigen(e.target.value)}>
                <option value="">Seleccionar...</option>
                {BANCOS_VE.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Referencia</label>
              <input type="text" className="input font-mono" placeholder="N° referencia" value={referencia} onChange={e => setReferencia(e.target.value)} />
            </div>
            {(categoria === 'repuestos' || categoria === 'cr_avanza_motors' || categoria === 'costos_repuestos') && (
              <div>
                <label className="label">N° SA — Cotización Vehimotors</label>
                <input
                  type="text"
                  className="input font-mono"
                  placeholder="Ej: SA-2024-001234"
                  value={numeroSa}
                  onChange={e => setNumeroSa(e.target.value)}
                />
                <p className="text-[11px] text-oriental-gray mt-1">Número de SA de la cotización emitida por Vehimotors</p>
              </div>
            )}
            <div className="md:col-span-2">
              <label className="label">Observaciones</label>
              <textarea className="textarea" rows={3} placeholder="Notas adicionales..." value={observaciones} onChange={e => setObservaciones(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── COMPROBANTES ── */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" />
            Comprobantes
          </h2>
          <FileUpload files={comprobantes} onFilesChange={setComprobantes} />
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <div className="w-1.5 h-1.5 bg-oriental-red rounded-full flex-shrink-0" />
            <p className="text-oriental-red text-sm">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary flex items-center gap-2 py-3 px-6" disabled={loading}>
            <Save size={16} /> {loading ? 'Guardando...' : 'Registrar egreso'}
          </button>
          <Link href="/egresos" className="btn-secondary py-3 px-6">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
