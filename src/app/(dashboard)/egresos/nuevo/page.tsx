'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { METODOS_PAGO, BANCOS_VE, CATEGORIAS_EGRESO_LABEL } from '@/lib/utils'
import { EgresoSchema } from '@/lib/validations'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import FileUpload from '@/components/FileUpload'

export default function NuevoEgresoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [categoria, setCategoria] = useState('')
  const [concepto, setConcepto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState<'USD' | 'VES'>('USD')
  const [metodoPago, setMetodoPago] = useState('')
  const [bancoOrigen, setBancoOrigen] = useState('')
  const [beneficiario, setBeneficiario] = useState('')
  const [cedulaRifBenef, setCedulaRifBenef] = useState('')
  const [referencia, setReferencia] = useState('')
  const [fechaEgreso, setFechaEgreso] = useState(new Date().toISOString().split('T')[0])
  const [areaResponsable, setAreaResponsable] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [comprobantes, setComprobantes] = useState<{ url: string; nombre: string }[]>([])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsed = EgresoSchema.safeParse({
      categoria,
      concepto,
      descripcion: descripcion || null,
      monto: parseFloat(monto),
      moneda,
      metodo_pago: metodoPago || null,
      banco_origen: bancoOrigen || null,
      beneficiario: beneficiario || null,
      cedula_rif_benef: cedulaRifBenef || null,
      referencia: referencia || null,
      fecha_egreso: fechaEgreso,
      area_responsable: areaResponsable || null,
      observaciones: observaciones || null,
    })
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Datos inválidos')
      return
    }

    setLoading(true)
    setError('')

    const year = new Date().getFullYear()
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    const seq = String(buf[0] % 1_000_000).padStart(6, '0')
    const numero_egreso = `LOA-EGR-${year}-${seq}`

    const { data: { user } } = await supabase.auth.getUser()

    const { data: inserted, error: insertError } = await supabase.from('egresos').insert({
      numero_egreso,
      categoria,
      concepto,
      descripcion: descripcion || null,
      monto: parsed.data.monto,
      moneda,
      metodo_pago: metodoPago || null,
      banco_origen: bancoOrigen || null,
      beneficiario: beneficiario || null,
      cedula_rif_benef: cedulaRifBenef || null,
      referencia: referencia || null,
      fecha_egreso: fechaEgreso,
      area_responsable: areaResponsable || null,
      observaciones: observaciones || null,
      estado: 'pendiente_aprobacion',
      registrado_por: user?.id ?? '',
    }).select('id').single()

    if (insertError || !inserted) { setError(insertError?.message ?? 'Error al guardar'); setLoading(false); return }

    if (comprobantes.length > 0) {
      await supabase.from('archivos').insert(
        comprobantes.map(c => ({
          tipo: 'comprobante',
          url: c.url,
          nombre: c.nombre,
          egreso_id: inserted.id,
          subido_por: user?.id ?? '',
        }))
      )
    }

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
              <label className="label">Categoría *</label>
              <select className="select" value={categoria} onChange={e => setCategoria(e.target.value)} required>
                <option value="">Seleccionar...</option>
                {Object.entries(CATEGORIAS_EGRESO_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Área responsable</label>
              <input type="text" className="input" placeholder="Ej: Administración, Taller" value={areaResponsable} onChange={e => setAreaResponsable(e.target.value)} />
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
              <input type="text" className="input" placeholder="Descripción breve del gasto" value={concepto} onChange={e => setConcepto(e.target.value)} required />
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
            <div>
              <label className="label">Beneficiario</label>
              <input type="text" className="input" placeholder="Nombre del beneficiario" value={beneficiario} onChange={e => setBeneficiario(e.target.value)} />
            </div>
            <div>
              <label className="label">Cédula / RIF beneficiario</label>
              <input type="text" className="input font-mono" placeholder="V-12345678" value={cedulaRifBenef} onChange={e => setCedulaRifBenef(e.target.value)} />
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
