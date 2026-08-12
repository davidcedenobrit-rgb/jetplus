'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { METODOS_PAGO, BANCOS_VE } from '@/lib/utils'
import ProveedorPicker from '../../nuevo/ProveedorPicker'
import type { Proveedor } from '../../actions'
import { editarEgreso } from '../edit-actions'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function EditarEgresoForm({ egreso, proveedorInicial, centros, categorias }: {
  egreso: any
  proveedorInicial: Proveedor | null
  centros: { id: string; nombre: string }[]
  categorias: { clave: string; nombre: string }[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [categoria, setCategoria] = useState<string>(egreso.categoria ?? '')
  const [concepto, setConcepto] = useState<string>(egreso.concepto ?? '')
  const [descripcion, setDescripcion] = useState<string>(egreso.descripcion ?? '')
  const [monto, setMonto] = useState<string>(String(egreso.monto ?? ''))
  const [moneda, setMoneda] = useState<'USD' | 'VES'>(egreso.moneda === 'VES' ? 'VES' : 'USD')
  const [tasaCambio, setTasaCambio] = useState<string>(egreso.tasa_cambio != null ? String(egreso.tasa_cambio) : '')
  const [metodoPago, setMetodoPago] = useState<string>(egreso.metodo_pago ?? '')
  const [bancoOrigen, setBancoOrigen] = useState<string>(egreso.banco_origen ?? '')
  const [bancoDestino, setBancoDestino] = useState<string>(egreso.banco_destino ?? '')
  const [proveedor, setProveedor] = useState<Proveedor | null>(proveedorInicial)
  const [direccionBenef, setDireccionBenef] = useState<string>(egreso.beneficiario_direccion ?? proveedorInicial?.direccion ?? '')
  const [referencia, setReferencia] = useState<string>(egreso.referencia ?? '')
  const [fechaEgreso, setFechaEgreso] = useState<string>((egreso.fecha_egreso ?? '').slice(0, 10))
  const [centroCosto, setCentroCosto] = useState<string>(egreso.centro_costo_id ?? '')
  const [origenCapital, setOrigenCapital] = useState<string>(egreso.origen_capital ?? '')
  const [tipoMov, setTipoMov] = useState<'gasto' | 'inversion'>(egreso.tipo_movimiento === 'inversion' ? 'inversion' : 'gasto')
  const [observaciones, setObservaciones] = useState<string>(egreso.observaciones ?? '')

  async function onProveedor(p: Proveedor | null) {
    setProveedor(p)
    if (p?.direccion) setDireccionBenef(p.direccion)
    if (p?.banco) setBancoDestino(p.banco)
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    const montoNum = parseFloat(monto)
    if (!categoria) { setError('Selecciona una categoría'); return }
    if (isNaN(montoNum) || montoNum <= 0) { setError('El monto debe ser mayor a 0'); return }
    if (!concepto.trim()) { setError('El concepto es requerido'); return }
    setLoading(true); setError('')
    const centroNombre = centros.find(c => c.id === centroCosto)?.nombre ?? null
    const tasaNum = parseFloat(tasaCambio)
    const r = await editarEgreso(egreso.id, {
      categoria, concepto, descripcion: descripcion || null,
      monto: montoNum, moneda, tasa_cambio: !isNaN(tasaNum) && tasaNum > 0 ? tasaNum : null,
      metodo_pago: metodoPago || null, banco_origen: bancoOrigen || null, banco_destino: bancoDestino.trim() || null,
      beneficiario: proveedor?.nombre ?? egreso.beneficiario ?? null,
      cedula_rif_benef: proveedor?.rif ?? egreso.cedula_rif_benef ?? null,
      beneficiario_direccion: direccionBenef.trim() || null,
      proveedor_id: proveedor?.id ?? null,
      referencia: referencia || null, fecha_egreso: fechaEgreso,
      centro_costo_id: centroCosto || null, area_responsable: centroNombre,
      origen_capital: origenCapital.trim() || null, tipo_movimiento: tipoMov,
      observaciones: observaciones || null,
    })
    setLoading(false)
    if (r.error) { setError(r.error); return }
    router.push(`/egresos/${egreso.id}`); router.refresh()
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/egresos/${egreso.id}`} className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"><ArrowLeft size={18} className="text-oriental-gray" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Editar egreso {egreso.numero_egreso}</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Corrige los datos y guarda. La retención de IVA no se modifica desde aquí.</p>
        </div>
      </div>

      <form onSubmit={guardar} className="space-y-4">
        <div className="card p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="label">Categoría *</label>
            <select className="select" value={categoria} onChange={e => setCategoria(e.target.value)}>
              <option value="">Seleccionar…</option>
              {categorias.map(c => <option key={c.clave} value={c.clave}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="md:col-span-2"><label className="label">Concepto *</label><input className="input" value={concepto} onChange={e => setConcepto(e.target.value)} /></div>
          <div className="md:col-span-2"><label className="label">Descripción</label><input className="input" value={descripcion} onChange={e => setDescripcion(e.target.value)} /></div>

          <div><label className="label">Monto *</label><input className="input font-mono" type="number" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} /></div>
          <div>
            <label className="label">Moneda</label>
            <select className="select" value={moneda} onChange={e => setMoneda(e.target.value as 'USD' | 'VES')}>
              <option value="USD">USD</option>
              <option value="VES">VES (Bs)</option>
            </select>
          </div>
          <div><label className="label">Tasa Bs/$</label><input className="input font-mono" type="number" step="0.0001" value={tasaCambio} onChange={e => setTasaCambio(e.target.value)} placeholder="Opcional" /></div>
          <div><label className="label">Fecha del egreso</label><input className="input" type="date" value={fechaEgreso} onChange={e => setFechaEgreso(e.target.value)} /></div>

          <div>
            <label className="label">Centro de costo</label>
            <select className="select" value={centroCosto} onChange={e => setCentroCosto(e.target.value)}>
              <option value="">Sin centro</option>
              {centros.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tipo</label>
            <select className="select" value={tipoMov} onChange={e => setTipoMov(e.target.value as 'gasto' | 'inversion')}>
              <option value="gasto">Gasto</option>
              <option value="inversion">Inversión</option>
            </select>
          </div>
        </div>

        <div className="card p-5 space-y-3">
          <div>
            <label className="label">Beneficiario (proveedor)</label>
            <ProveedorPicker proveedor={proveedor} onChange={onProveedor} />
          </div>
          <div>
            <label className="label">Dirección fiscal del proveedor</label>
            <textarea className="textarea" rows={2} value={direccionBenef} onChange={e => setDireccionBenef(e.target.value)} />
          </div>
        </div>

        <div className="card p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">Método de pago</label>
            <select className="select" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
              <option value="">Seleccionar…</option>
              {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Banco origen (Jetplus)</label>
            <select className="select" value={bancoOrigen} onChange={e => setBancoOrigen(e.target.value)}>
              <option value="">Seleccionar…</option>
              {BANCOS_VE.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Banco destino (proveedor)</label>
            <input type="text" className="input" value={bancoDestino} onChange={e => setBancoDestino(e.target.value)} list="bancos-edit" placeholder="Banco del proveedor" />
            <datalist id="bancos-edit">{BANCOS_VE.map(b => <option key={b} value={b} />)}</datalist>
          </div>
          <div><label className="label">Referencia</label><input className="input font-mono" value={referencia} onChange={e => setReferencia(e.target.value)} /></div>
          <div className="md:col-span-2"><label className="label">Origen de capital</label><input className="input" value={origenCapital} onChange={e => setOrigenCapital(e.target.value)} placeholder="Ej: Banco Mercantil, Caja fuerte…" /></div>
          <div className="md:col-span-2"><label className="label">Observaciones</label><textarea className="textarea" rows={2} value={observaciones} onChange={e => setObservaciones(e.target.value)} /></div>
        </div>

        {error && <p className="text-sm text-oriental-red">{error}</p>}

        <div className="flex gap-2">
          <Link href={`/egresos/${egreso.id}`} className="flex-1 btn-secondary py-2.5 text-center">Cancelar</Link>
          <button type="submit" disabled={loading} className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar cambios
          </button>
        </div>
      </form>
    </div>
  )
}
