'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { METODOS_PAGO, BANCOS_VE, CATEGORIAS_EGRESO_LABEL, CONCEPTOS_POR_CATEGORIA } from '@/lib/utils'
import { ArrowLeft, Save, FileText, User, Tag, CreditCard, ReceiptText } from 'lucide-react'
import Link from 'next/link'
import FileUpload from '@/components/FileUpload'
import { crearEgreso, type Proveedor } from '../actions'
import IvaBloque from '@/components/IvaBloque'
import ProveedorPicker from './ProveedorPicker'
import { desglosarIva } from '@/lib/iva'

type CentroCosto = { id: string; nombre: string }

// Encabezado de sección con ícono, para un formulario más ordenado y bonito.
function SectionHead({ n, icon, title, sub }: { n: number; icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-oriental-red/10 text-oriental-red flex items-center justify-center flex-shrink-0">{icon}</div>
      <div>
        <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider flex items-center gap-2">
          <span className="text-oriental-red">{n}.</span> {title}
        </h2>
        {sub && <p className="text-[11px] text-oriental-gray">{sub}</p>}
      </div>
    </div>
  )
}

export default function NuevoEgresoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [centros, setCentros] = useState<CentroCosto[]>([])
  const [centroCosto, setCentroCosto] = useState('')
  const [esComun, setEsComun] = useState(false)
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
  const [bancoDestino, setBancoDestino] = useState('')
  const [proveedor, setProveedor] = useState<Proveedor | null>(null)
  const [direccionBeneficiario, setDireccionBeneficiario] = useState('')
  const [referencia, setReferencia] = useState('')
  const [fechaEgreso, setFechaEgreso] = useState(new Date().toISOString().split('T')[0])
  const [observaciones, setObservaciones] = useState('')
  const [numeroSa, setNumeroSa] = useState('')
  const [ivaAplica, setIvaAplica] = useState(false)
  const [ivaTasa, setIvaTasa] = useState('16')
  const [montoExento, setMontoExento] = useState('')
  // Soporte y retención de IVA
  const [tipoSoporte, setTipoSoporte] = useState<'' | 'factura' | 'nota_entrega'>('')
  const [fechaFactura, setFechaFactura] = useState('')
  const [numeroFactura, setNumeroFactura] = useState('')
  const [numeroControl, setNumeroControl] = useState('')
  const [retIvaAplica, setRetIvaAplica] = useState(false)
  const [retIvaPct, setRetIvaPct] = useState<'75' | '100'>('75')
  const [retIvaFechaEmision, setRetIvaFechaEmision] = useState(new Date().toISOString().split('T')[0])
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
    // Prellenar la tasa con la BCV del día (editable si se pagó a otra tasa).
    fetch('/api/cotizaciones/tasas')
      .then(r => r.json())
      .then(d => { if (Number(d?.tasa_bcv) > 0) setTasaCambio(prev => prev || String(d.tasa_bcv)) })
      .catch(() => {})
  }, [])

  // Al elegir un proveedor, prellena su dirección y su banco (editables). La
  // dirección/banco quedan anclados al proveedor: si se editan, se guardan en él.
  useEffect(() => {
    if (proveedor?.direccion) setDireccionBeneficiario(proveedor.direccion)
    if (proveedor?.banco) setBancoDestino(proveedor.banco)
  }, [proveedor])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const montoNum = parseFloat(monto)
    if (!categoria) { setError('Selecciona una categoría'); return }
    if (isNaN(montoNum) || montoNum <= 0) { setError('El monto debe ser mayor a 0'); return }

    const conceptoFinal = concepto === '__otro__' ? conceptoPersonalizado.trim() : concepto
    if (!conceptoFinal) { setError('El concepto es requerido'); return }

    // Retención de IVA: requiere IVA y datos de factura obligatorios.
    if (retIvaAplica) {
      if (!ivaAplica) { setError('Para retener IVA, marca "Incluye IVA" y su desglose.'); return }
      if (!fechaFactura || !numeroFactura.trim() || !numeroControl.trim()) {
        setError('La retención de IVA requiere fecha, número y número de control de la factura.'); return
      }
      if (!proveedor) { setError('Selecciona el proveedor (sujeto retenido) para la retención.'); return }
    }

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
      banco_destino: bancoDestino.trim() || null,
      beneficiario: proveedor?.nombre ?? null,
      cedula_rif_benef: proveedor?.rif ?? null,
      beneficiario_direccion: direccionBeneficiario.trim() || null,
      referencia: referencia || null,
      fecha_egreso: fechaEgreso,
      area_responsable: centroNombre,
      observaciones: observaciones || null,
      numero_sa: numeroSa || null,
      centro_costo_id: esComun ? null : (centroCosto || null),
      es_comun: esComun,
      origen_capital: origenCapital.trim() || null,
      tipo_movimiento: tipoMovimiento,
      proveedor_id: proveedor?.id ?? null,
      iva_aplica: ivaAplica,
      iva_tasa: ivaAplica ? (parseFloat(ivaTasa) || 0) : null,
      monto_exento: ivaAplica ? (parseFloat(montoExento) || 0) : null,
      tipo_soporte: tipoSoporte || null,
      fecha_factura: fechaFactura || null,
      numero_factura: numeroFactura.trim() || null,
      numero_control: numeroControl.trim() || null,
      ret_iva_aplica: retIvaAplica,
      ret_iva_pct: retIvaAplica ? Number(retIvaPct) : null,
      ret_iva_fecha_emision: retIvaAplica ? retIvaFechaEmision : null,
      comprobantes,
    })

    if (result.error) { setError(result.error); setLoading(false); return }

    router.push('/egresos')
    router.refresh()
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/egresos" className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-oriental-gray hover:bg-gray-50">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Registrar egreso</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Nuevo gasto operativo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 1 ── FACTURA E IVA ── */}
        <div className="card p-6">
          <SectionHead n={1} icon={<FileText size={16} />} title="Factura e IVA" sub="Soporte, montos e IVA del gasto" />

          {/* Tipo de soporte */}
          <div className="mb-4">
            <label className="label">Tipo de soporte</label>
            <div className="flex gap-2 flex-wrap">
              {([['', 'Sin especificar'], ['factura', 'Factura'], ['nota_entrega', 'Nota de entrega']] as const).map(([v, l]) => (
                <button key={v} type="button" onClick={() => setTipoSoporte(v)}
                  className={`px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all ${tipoSoporte === v ? 'border-oriental-red bg-oriental-red text-white' : 'border-gray-200 text-gray-500 hover:border-oriental-red'}`}>
                  {l}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-oriental-gray mt-1">La factura va al libro de compra. La nota de entrega no aplica para retenciones.</p>
          </div>

          {/* Datos de la factura */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label">Fecha de la factura {retIvaAplica && <span className="text-oriental-red">*</span>}</label>
              <input type="date" className="input" value={fechaFactura} onChange={e => setFechaFactura(e.target.value)} />
            </div>
            <div>
              <label className="label">N° de factura {retIvaAplica && <span className="text-oriental-red">*</span>}</label>
              <input type="text" className="input font-mono" placeholder="00-0000000" value={numeroFactura} onChange={e => setNumeroFactura(e.target.value)} />
            </div>
            <div>
              <label className="label">N° de control {retIvaAplica && <span className="text-oriental-red">*</span>}</label>
              <input type="text" className="input font-mono" placeholder="00-00000000" value={numeroControl} onChange={e => setNumeroControl(e.target.value)} />
            </div>
          </div>

          {/* Moneda / Monto / Tasa / Equivalente / IVA / Fecha */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
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
              <label className="label">Monto *</label>
              <input type="number" step="0.01" min="0" className="input font-semibold text-lg" placeholder="0.00" value={monto} onChange={e => setMonto(e.target.value)} required />
            </div>
            <div>
              <label className="label">Tasa de pago (Bs/$)</label>
              <input type="number" step="0.0001" min="0" className="input font-semibold text-lg"
                placeholder="Ej: 98.50" value={tasaCambio} onChange={e => setTasaCambio(e.target.value)} />
              <p className="text-[10px] text-oriental-gray mt-1">Viene la BCV del día; edítala si pagaste a otra tasa. Se usa para ver este egreso en bolívares en los reportes.</p>
            </div>
            {parseFloat(monto) > 0 && parseFloat(tasaCambio) > 0 && (
              <div className="md:col-span-2 -mt-1">
                {moneda === 'VES' ? (
                  <div className="inline-flex items-baseline gap-2.5 rounded-xl bg-green-50 border border-green-200 px-4 py-2.5">
                    <span className="text-[11px] font-bold text-green-700 uppercase tracking-wide">Equivale a</span>
                    <span className="text-2xl font-extrabold text-green-800 font-mono tabular-nums">${(parseFloat(monto) / parseFloat(tasaCambio)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-sm font-bold text-green-700">USD</span>
                  </div>
                ) : (
                  <div className="inline-flex items-baseline gap-2.5 rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Equivale a</span>
                    <span className="text-2xl font-extrabold text-oriental-black font-mono tabular-nums">Bs {(parseFloat(monto) * parseFloat(tasaCambio)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="label">Fecha del egreso *</label>
              <input type="date" className="input" value={fechaEgreso} onChange={e => setFechaEgreso(e.target.value)} required />
            </div>
            <div className="md:col-span-2">
              <label className="label">IVA</label>
              <IvaBloque aplica={ivaAplica} setAplica={setIvaAplica} tasa={ivaTasa} setTasa={setIvaTasa} total={parseFloat(monto) || 0} moneda={moneda} exento={montoExento} setExento={setMontoExento} />
            </div>
          </div>
        </div>

        {/* 2 ── RETENCIÓN DE IVA (comprobante) ── */}
        <div className="card p-0 overflow-hidden border border-emerald-200">
          <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-6 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/15 text-white flex items-center justify-center flex-shrink-0"><ReceiptText size={16} /></div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2"><span className="text-emerald-200">2.</span> Retención de IVA</h2>
              <p className="text-[11px] text-emerald-100">Genera el comprobante de retención para el proveedor (SENIAT)</p>
            </div>
          </div>

          <div className="p-6">
            <label className={`flex items-center gap-3 rounded-xl border-2 p-3 cursor-pointer transition-colors ${retIvaAplica ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300'}`}>
              <input type="checkbox" checked={retIvaAplica} onChange={e => setRetIvaAplica(e.target.checked)} className="w-5 h-5 accent-emerald-600" />
              <span className="text-sm font-semibold text-oriental-black">Aplica retención de IVA — emitir comprobante al proveedor</span>
            </label>

            {retIvaAplica && (() => {
              const total = parseFloat(monto) || 0
              const exentoNum = Math.max(0, Math.min(parseFloat(montoExento) || 0, total))
              const gravado = Math.max(0, total - exentoNum)
              const tasaNum = parseFloat(ivaTasa) || 0
              const iva = ivaAplica && gravado > 0 && tasaNum > 0 ? desglosarIva(gravado, tasaNum).iva : 0
              const base = ivaAplica && gravado > 0 && tasaNum > 0 ? desglosarIva(gravado, tasaNum).base : 0
              const retenido = Math.round(iva * Number(retIvaPct)) / 100
              const f = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              return (
                <div className="mt-4 space-y-4">
                  {!ivaAplica && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                      <span className="text-xs text-red-600 font-medium">Marca primero &quot;Incluye IVA&quot; en la sección 1 para calcular la retención.</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-oriental-gray">Porcentaje a retener</label>
                    {(['75', '100'] as const).map(p => (
                      <button key={p} type="button" onClick={() => setRetIvaPct(p)}
                        className={`px-4 py-1.5 rounded-lg border-2 text-xs font-bold transition-colors ${retIvaPct === p ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-200 text-gray-500 hover:border-emerald-400'}`}>
                        {p}%
                      </button>
                    ))}
                  </div>
                  <div className="rounded-xl border border-emerald-200 overflow-hidden">
                    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-emerald-100">
                      <Detalle label="Base imponible" value={`${moneda} ${f(base)}`} />
                      <Detalle label={`IVA (${tasaNum}%)`} value={`${moneda} ${f(iva)}`} />
                      <Detalle label={`Retenido (${retIvaPct}%)`} value={`${moneda} ${f(retenido)}`} fuerte />
                      <Detalle label="Total con IVA" value={`${moneda} ${f(total)}`} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Fecha de emisión del comprobante</label>
                    <input type="date" className="input max-w-xs" value={retIvaFechaEmision} onChange={e => setRetIvaFechaEmision(e.target.value)} />
                    <p className="text-[11px] text-oriental-gray mt-1">Por defecto hoy. La puedes editar (define el período fiscal y la numeración). El N° de comprobante se genera automáticamente.</p>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        {/* 3 ── BENEFICIARIO ── */}
        <div className="card p-6">
          <SectionHead n={3} icon={<User size={16} />} title="Beneficiario" sub="Proveedor y su dirección (aparece en el comprobante de retención)" />
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="label">Beneficiario (proveedor)</label>
              <ProveedorPicker proveedor={proveedor} onChange={setProveedor} />
              <p className="text-[11px] text-oriental-gray mt-1">Busca un proveedor o créalo en línea (nombre, RIF, correo, teléfono, N° de cuenta).</p>
            </div>
            <div>
              <label className="label">Dirección fiscal del proveedor</label>
              <textarea className="textarea" rows={2} placeholder="Dirección fiscal del proveedor" value={direccionBeneficiario} onChange={e => setDireccionBeneficiario(e.target.value)} />
              <p className="text-[11px] text-oriental-gray mt-1">Queda anclada al proveedor: si la editas, se guarda en su ficha y aparece en el comprobante de retención.</p>
            </div>
          </div>
        </div>

        {/* 4 ── CLASIFICACIÓN ── */}
        <div className="card p-6">
          <SectionHead n={4} icon={<Tag size={16} />} title="Clasificación" sub="Centro de costo, categoría y concepto" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Centro de costo {esComun ? '' : '*'}</label>
              <select className="select" value={centroCosto} onChange={e => setCentroCosto(e.target.value)} required={!esComun} disabled={esComun}>
                <option value="">Seleccionar...</option>
                {centros.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 mt-2 text-xs text-oriental-gray cursor-pointer">
                <input type="checkbox" checked={esComun} onChange={e => setEsComun(e.target.checked)} className="rounded" />
                Gasto común (se reparte por % entre las líneas de ingreso)
              </label>
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
            <div className="md:col-span-2">
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
          </div>
        </div>

        {/* 5 ── DETALLES DE PAGO ── */}
        <div className="card p-6">
          <SectionHead n={5} icon={<CreditCard size={16} />} title="Detalles de pago" sub="Cómo y desde dónde se pagó" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Método de pago</label>
              <select className="select" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                <option value="">Seleccionar...</option>
                {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Banco origen (La Oriental)</label>
              <select className="select" value={bancoOrigen} onChange={e => setBancoOrigen(e.target.value)}>
                <option value="">Seleccionar...</option>
                {BANCOS_VE.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Banco destino (proveedor)</label>
              <input type="text" className="input" placeholder="Banco del proveedor que recibe el pago"
                value={bancoDestino} onChange={e => setBancoDestino(e.target.value)} list="bancos-ve-destino" />
              <datalist id="bancos-ve-destino">
                {BANCOS_VE.map(b => <option key={b} value={b} />)}
              </datalist>
              {proveedor?.numero_cuenta && <p className="text-[11px] text-oriental-gray mt-1">Cta. del proveedor: <b className="font-mono text-oriental-black">{proveedor.numero_cuenta}</b></p>}
            </div>
            <div>
              <label className="label">Referencia</label>
              <input type="text" className="input font-mono" placeholder="N° referencia" value={referencia} onChange={e => setReferencia(e.target.value)} />
            </div>
            <div>
              <label className="label">Origen de capital</label>
              <input type="text" className="input" placeholder="Ej: Caja fuerte, Banco Mercantil, Aporte socios" value={origenCapital} onChange={e => setOrigenCapital(e.target.value)} />
            </div>
            {(categoria === 'repuestos' || categoria === 'cr_avanza_motors' || categoria === 'costos_repuestos') && (
              <div className="md:col-span-2">
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
            <div className="md:col-span-2">
              <label className="label">Comprobantes (adjuntos)</label>
              <FileUpload files={comprobantes} onFilesChange={setComprobantes} />
            </div>
          </div>
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

// Celda del desglose de retención (estilo tarjeta dentro del bloque verde).
function Detalle({ label, value, fuerte }: { label: string; value: string; fuerte?: boolean }) {
  return (
    <div className={`px-3 py-2.5 ${fuerte ? 'bg-emerald-50' : 'bg-white'}`}>
      <p className="text-[10px] text-oriental-gray uppercase tracking-wide">{label}</p>
      <p className={`font-mono text-sm ${fuerte ? 'font-bold text-emerald-700' : 'text-oriental-black'}`}>{value}</p>
    </div>
  )
}
