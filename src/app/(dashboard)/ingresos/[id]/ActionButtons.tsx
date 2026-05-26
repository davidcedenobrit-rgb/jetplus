'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle2, XCircle, AlertTriangle,
  Send, Landmark, Building2, Printer, BadgeCheck,
  User, Clock, X, Upload, Hash, CreditCard
} from 'lucide-react'
import DeleteButton from '@/components/DeleteButton'

const ROL_DIRECTOR = ['jose', 'admin', 'director']

interface Props {
  ingresoId: string
  estado: string
  monto: number
  moneda: string
  numeroRecibo: string
  rol?: string
}

// ─── Modal: José envía a depositar ───────────────────────────────────────────
function ModalEnviarDeposito({
  monto, moneda, onClose, onConfirm, loading
}: {
  monto: number; moneda: string
  onClose: () => void
  onConfirm: (responsable: string, hora: string, fecha: string) => Promise<void>
  loading: boolean
}) {
  const hoy = new Date()
  const fechaHoy = hoy.toISOString().split('T')[0]
  const horaActual = hoy.toTimeString().slice(0, 5)

  const [responsable, setResponsable] = useState('')
  const [fecha, setFecha] = useState(fechaHoy)
  const [hora, setHora] = useState(horaActual)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!responsable.trim()) return
    await onConfirm(responsable.trim(), hora, fecha)
  }

  const montoFmt = new Intl.NumberFormat('es-VE', {
    style: 'currency', currency: moneda === 'VES' ? 'VES' : 'USD',
    currencyDisplay: 'symbol', minimumFractionDigits: 2
  }).format(monto).replace('VES', 'Bs.')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-oriental-black flex items-center justify-center">
              <Landmark size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-oriental-black text-base">Enviar a depositar</h2>
              <p className="text-xs text-oriental-gray">Registra quién lleva el dinero</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} className="text-oriental-gray" />
          </button>
        </div>

        {/* Monto confirmación */}
        <div className="bg-oriental-bg rounded-xl p-4 mb-5 flex items-center justify-between">
          <p className="text-sm text-oriental-gray font-medium">Monto a depositar</p>
          <p className="text-2xl font-extrabold text-oriental-black">{montoFmt}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Responsable */}
          <div>
            <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">
              Responsable <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray" />
              <input
                type="text"
                value={responsable}
                onChange={e => setResponsable(e.target.value)}
                placeholder="Nombre de quien lleva el dinero"
                required
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm text-oriental-black focus:outline-none focus:ring-2 focus:ring-oriental-black/20 focus:border-oriental-black transition-colors"
              />
            </div>
          </div>

          {/* Fecha y hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-oriental-black focus:outline-none focus:ring-2 focus:ring-oriental-black/20 focus:border-oriental-black transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">
                <Clock size={11} className="inline mr-1" />Hora
              </label>
              <input
                type="time"
                value={hora}
                onChange={e => setHora(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-oriental-black focus:outline-none focus:ring-2 focus:ring-oriental-black/20 focus:border-oriental-black transition-colors"
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-oriental-gray hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !responsable.trim()}
              className="flex-1 px-4 py-2.5 rounded-lg bg-oriental-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Landmark size={15} />
              {loading ? 'Registrando...' : 'Registrar envío'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal: Ari confirma el depósito ─────────────────────────────────────────
function ModalConfirmarDeposito({
  ingresoId, onClose, onConfirm, loading
}: {
  ingresoId: string
  onClose: () => void
  onConfirm: (referencia: string, banco: string, archivoUrl: string | null) => Promise<void>
  loading: boolean
}) {
  const supabase = createClient()
  const [referencia, setReferencia] = useState('')
  const [banco, setBanco] = useState('')
  const [archivoFile, setArchivoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!referencia.trim() || !banco.trim()) return

    let archivoUrl: string | null = null

    if (archivoFile) {
      setUploading(true)
      setUploadError('')
      const ext = archivoFile.name.split('.').pop()
      const path = `depositos/${ingresoId}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('comprobantes').upload(path, archivoFile, { upsert: true })
      if (error) {
        setUploadError('Error al subir el comprobante. Intenta de nuevo.')
        setUploading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(path)
      archivoUrl = urlData.publicUrl
      setUploading(false)
    }

    await onConfirm(referencia.trim(), banco.trim(), archivoUrl)
  }

  const BANCOS = [
    'Banesco', 'Banco de Venezuela', 'Mercantil', 'BBVA Provincial',
    'Bicentenario', 'Banplus', 'Bancamiga', 'BNC', 'Otro'
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <BadgeCheck size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-oriental-black text-base">Confirmar depósito</h2>
              <p className="text-xs text-oriental-gray">Completa los datos del depósito realizado</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} className="text-oriental-gray" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Referencia */}
          <div>
            <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">
              N° Referencia <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Hash size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray" />
              <input
                type="text"
                value={referencia}
                onChange={e => setReferencia(e.target.value)}
                placeholder="Número de referencia bancaria"
                required
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm font-mono text-oriental-black focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Banco receptor */}
          <div>
            <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">
              Banco receptor <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <CreditCard size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray" />
              <select
                value={banco}
                onChange={e => setBanco(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm text-oriental-black focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors appearance-none bg-white"
              >
                <option value="">Seleccionar banco</option>
                {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          {/* Comprobante */}
          <div>
            <label className="block text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-1.5">
              Comprobante <span className="text-gray-400 font-normal normal-case">(opcional)</span>
            </label>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors group">
              <Upload size={20} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
              <span className="text-xs text-oriental-gray text-center">
                {archivoFile ? (
                  <span className="text-emerald-700 font-medium">{archivoFile.name}</span>
                ) : (
                  <>Arrastra o haz clic para subir<br />JPG, PNG, PDF — máx. 5 MB</>
                )}
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={e => setArchivoFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-oriental-gray hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || uploading || !referencia.trim() || !banco.trim()}
              className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <BadgeCheck size={15} />
              {uploading ? 'Subiendo...' : loading ? 'Guardando...' : 'Confirmar depósito'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ActionButtons({ ingresoId, estado, monto, moneda, numeroRecibo, rol = 'editor' }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState('')
  const [showModalDeposito, setShowModalDeposito] = useState(false)
  const [showModalConfirmar, setShowModalConfirmar] = useState(false)

  const esDirector = ROL_DIRECTOR.includes(rol)

  // Acción simple (sin modal)
  async function updateEstado(nuevoEstado: string, timestampField?: string) {
    setLoading(nuevoEstado)
    const update: Record<string, any> = { estado: nuevoEstado }
    if (timestampField) update[timestampField] = new Date().toISOString()

    if (nuevoEstado === 'aprobado') {
      const { data: { user } } = await supabase.auth.getUser()
      update.aprobado_por = user?.id
      update.fecha_aprobacion = new Date().toISOString()
    }

    await supabase.from('ingresos').update(update).eq('id', ingresoId)
    setLoading('')
    router.refresh()
  }

  // José envía a depositar con responsable + hora
  async function handleEnviarDeposito(responsable: string, hora: string, fecha: string) {
    setLoading('enviando_deposito')
    const { data: { user } } = await supabase.auth.getUser()

    // Timestamp combinado fecha+hora
    const fechaHoraISO = new Date(`${fecha}T${hora}:00`).toISOString()

    const update: Record<string, any> = {
      estado: 'enviado_deposito',
      deposito_at: fechaHoraISO,
      enviado_deposito_responsable: responsable,
    }

    await supabase.from('ingresos').update(update).eq('id', ingresoId)

    // Crear egreso automático a Vehimotors
    const year = new Date().getFullYear()
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    const seq = String(buf[0] % 1_000_000).padStart(6, '0')
    await supabase.from('egresos').insert({
      numero_egreso: `LOA-EGR-${year}-${seq}`,
      categoria: 'vehimotors',
      concepto: `Depósito a Vehimotors — ${numeroRecibo}`,
      monto,
      moneda,
      ingreso_id: ingresoId,
      estado: 'registrado',
      fecha_egreso: fecha,
      registrado_por: user?.id ?? '',
    })

    setLoading('')
    setShowModalDeposito(false)
    router.refresh()
  }

  // Ari confirma el depósito con referencia, banco y comprobante
  async function handleConfirmarDeposito(referencia: string, banco: string, archivoUrl: string | null) {
    setLoading('confirmando_deposito')
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('ingresos').update({
      estado: 'depositado',
      deposito_referencia: referencia,
      deposito_banco: banco,
      depositado_at: new Date().toISOString(),
    }).eq('id', ingresoId)

    // Guardar el comprobante en archivos si se subió
    if (archivoUrl && user?.id) {
      await supabase.from('archivos').insert({
        tipo: 'comprobante_deposito',
        url: archivoUrl,
        nombre: `Comprobante depósito - ${numeroRecibo}`,
        ingreso_id: ingresoId,
        subido_por: user.id,
      })
    }

    setLoading('')
    setShowModalConfirmar(false)
    router.refresh()
  }

  // Acciones sin modal
  const actions = [
    {
      label: 'Aprobar',
      icon: CheckCircle2,
      estado: 'aprobado',
      show: ['pendiente_aprobacion', 'correccion_requerida'],
      onlyRoles: ROL_DIRECTOR,
      style: 'bg-green-600 hover:bg-green-700 text-white',
    },
    {
      label: 'Rechazar',
      icon: XCircle,
      estado: 'rechazado',
      show: ['pendiente_aprobacion', 'correccion_requerida'],
      onlyRoles: ROL_DIRECTOR,
      style: 'bg-red-600 hover:bg-red-700 text-white',
    },
    {
      label: 'Solicitar corrección',
      icon: AlertTriangle,
      estado: 'correccion_requerida',
      show: ['pendiente_aprobacion'],
      onlyRoles: ROL_DIRECTOR,
      style: 'bg-orange-500 hover:bg-orange-600 text-white',
    },
    {
      label: 'Reportar a Carla',
      icon: Send,
      estado: 'enviado_carla',
      timestamp: 'enviado_carla_at',
      show: ['aprobado'],
      onlyRoles: ROL_DIRECTOR,
      style: 'bg-purple-600 hover:bg-purple-700 text-white',
    },
    {
      label: 'Entregado a Carla',
      icon: Send,
      estado: 'entregado_carla',
      timestamp: 'entregado_carla_at',
      show: ['depositado'],
      onlyRoles: ROL_DIRECTOR,
      style: 'bg-teal-600 hover:bg-teal-700 text-white',
    },
    {
      label: 'Reportar a Vehimotors',
      icon: Building2,
      estado: 'reportado_vehimotors',
      timestamp: 'vehimotors_at',
      show: ['depositado', 'enviado_deposito', 'entregado_carla'],
      onlyRoles: ROL_DIRECTOR,
      style: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    },
  ]

  const visibleActions = actions.filter(a =>
    a.show.includes(estado) &&
    (!('onlyRoles' in a) || (a as any).onlyRoles.includes(rol))
  )

  // Acciones con modal
  const showEnviarDeposito = esDirector && ['aprobado', 'enviado_carla'].includes(estado)
  const showConfirmarDeposito = estado === 'enviado_deposito'

  const hayAcciones = visibleActions.length > 0 || showEnviarDeposito || showConfirmarDeposito

  return (
    <>
      <div className="card p-5">
        <h3 className="text-sm font-bold text-oriental-black mb-4">Acciones</h3>

        {!hayAcciones ? (
          <p className="text-sm text-oriental-gray">No hay acciones disponibles para este estado.</p>
        ) : (
          <div className="space-y-2">
            {/* Acciones simples */}
            {visibleActions.map(action => (
              <button
                key={action.estado}
                onClick={() => updateEstado(action.estado, (action as any).timestamp)}
                disabled={loading !== ''}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${action.style}`}
              >
                <action.icon size={16} />
                {loading === action.estado ? 'Procesando...' : action.label}
              </button>
            ))}

            {/* Botón con modal: Mandar a depositar */}
            {showEnviarDeposito && (
              <button
                onClick={() => setShowModalDeposito(true)}
                disabled={loading !== ''}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-oriental-black hover:bg-gray-800 text-white transition-colors disabled:opacity-50"
              >
                <Landmark size={16} />
                Mandar a depositar
              </button>
            )}

            {/* Botón con modal: Confirmar depósito (visible a todos cuando está enviado_deposito) */}
            {showConfirmarDeposito && (
              <button
                onClick={() => setShowModalConfirmar(true)}
                disabled={loading !== ''}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
              >
                <BadgeCheck size={16} />
                Confirmar depósito
              </button>
            )}
          </div>
        )}

        <div className="border-t border-gray-100 mt-4 pt-4 space-y-2">
          <button
            onClick={() => window.print()}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-oriental-gray hover:bg-gray-50 transition-colors"
          >
            <Printer size={16} />
            Imprimir recibo
          </button>
          <p className="text-[11px] text-oriental-gray/60 text-center leading-tight px-1">
            💡 En Chrome: activa <strong>Más ajustes</strong> y desactiva<br />
            <em>"Encabezados y pies de página"</em> para una impresión limpia
          </p>
          <DeleteButton table="ingresos" id={ingresoId} redirectTo="/ingresos" label="Eliminar ingreso" />
        </div>
      </div>

      {/* Modales */}
      {showModalDeposito && (
        <ModalEnviarDeposito
          monto={monto}
          moneda={moneda}
          onClose={() => setShowModalDeposito(false)}
          onConfirm={handleEnviarDeposito}
          loading={loading === 'enviando_deposito'}
        />
      )}

      {showModalConfirmar && (
        <ModalConfirmarDeposito
          ingresoId={ingresoId}
          onClose={() => setShowModalConfirmar(false)}
          onConfirm={handleConfirmarDeposito}
          loading={loading === 'confirmando_deposito'}
        />
      )}
    </>
  )
}
