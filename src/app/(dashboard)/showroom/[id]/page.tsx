import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Car, MapPin, CheckCircle2, DollarSign, User, ExternalLink, History } from 'lucide-react'
import type { VehiculoShowroom } from '@/types/database'
import ShowroomDocumentos from './ShowroomDocumentos'
import ShowroomAcciones from './ShowroomAcciones'

const PASOS = [
  { key: 'llegada',        label: 'Recibido',         desc: 'Vehículo llegó a La Oriental' },
  { key: 'por_enviar_pdi', label: 'Por enviar a PDI', desc: 'Pendiente de ir al taller' },
  { key: 'en_taller',      label: 'En taller',        desc: 'Realizando PDI' },
  { key: 'en_agencia',     label: 'En agencia',       desc: 'Disponible para venta' },
  { key: 'reservado',      label: 'Reservado',        desc: 'Con reserva activa' },
  { key: 'vendido',        label: 'Vendido',          desc: 'Ciclo cerrado' },
]

function StepBar({ estado }: { estado: string }) {
  const idx = PASOS.findIndex(p => p.key === estado)
  return (
    <div className="card p-6 mb-6">
      <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-5">Progreso del vehículo</h2>
      <div className="relative">
        {/* Línea de fondo */}
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-100" />
        {/* Línea de progreso */}
        <div
          className="absolute top-4 left-4 h-0.5 bg-oriental-red transition-all"
          style={{ width: idx === 0 ? '0%' : `${(idx / (PASOS.length - 1)) * 100}%`, right: 'auto' }}
        />
        <div className="relative flex justify-between">
          {PASOS.map((p, i) => {
            const done = i < idx
            const active = i === idx
            return (
              <div key={p.key} className="flex flex-col items-center" style={{ width: `${100 / PASOS.length}%` }}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all z-10 bg-white
                  ${done ? 'border-oriental-red bg-oriental-red' : active ? 'border-oriental-red' : 'border-gray-200'}`}>
                  {done
                    ? <CheckCircle2 size={16} className="text-white" />
                    : <span className={`text-xs font-bold ${active ? 'text-oriental-red' : 'text-gray-300'}`}>{i + 1}</span>}
                </div>
                <p className={`text-[10px] font-semibold mt-2 text-center leading-tight ${active ? 'text-oriental-red' : done ? 'text-oriental-black' : 'text-gray-400'}`}>
                  {p.label}
                </p>
                {active && <p className="text-[9px] text-oriental-gray text-center mt-0.5">{p.desc}</p>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default async function ShowroomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rol = user.user_metadata?.rol as string
  const { id } = await params

  const { data: vehiculo } = await supabase
    .from('vehiculos_showroom')
    .select('*')
    .eq('id', id)
    .single()

  if (!vehiculo) notFound()
  const v = vehiculo as VehiculoShowroom

  // Documentos preventa
  const { data: archivos } = await supabase
    .from('archivos')
    .select('id, tipo, url, nombre, created_at')
    .eq('showroom_vehiculo_id', id)
    .order('created_at', { ascending: false })

  // Cliente vinculado (si vendido)
  let clienteVinculado: any = null
  if (v.cliente_id) {
    const { data: cl } = await supabase.from('clientes').select('id, nombre, cedula_rif').eq('id', v.cliente_id).single()
    clienteVinculado = cl
  }

  // Historial de estados
  const { data: historial } = await supabase
    .from('showroom_historial')
    .select('*')
    .eq('showroom_vehiculo_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  const esJose = ['jose', 'admin', 'director'].includes(rol)
  const hoy = new Date()
  const reservaVencida = v.reserva_vence ? new Date(v.reserva_vence) < hoy : false

  function fmt(n: number) {
    return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="p-8 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/showroom" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">{v.marca} {v.modelo}</h1>
          <p className="text-oriental-gray text-sm mt-0.5 flex items-center gap-2">
            {v.placa && <span className="font-mono font-bold">{v.placa}</span>}
            {v.color && <span>· {v.color}</span>}
            {v.anio && <span>· {v.anio}</span>}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              v.estado === 'vendido' ? 'bg-gray-100 text-gray-600' :
              v.estado === 'en_agencia' ? 'bg-green-100 text-green-700' :
              v.estado === 'reservado' ? 'bg-purple-100 text-purple-700' :
              'bg-red-100 text-red-700'
            }`}>
              {PASOS.find(p => p.key === v.estado)?.label ?? v.estado}
            </span>
          </p>
        </div>
      </div>

      {/* Barra de progreso */}
      <StepBar estado={v.estado} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda */}
        <div className="lg:col-span-2 space-y-6">

          {/* Datos del vehículo */}
          <div className="card p-6">
            <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-oriental-red rounded-full" />
              Datos del vehículo
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Marca',   value: v.marca },
                { label: 'Modelo',  value: v.modelo },
                { label: 'Versión', value: v.version },
                { label: 'Año',     value: v.anio?.toString() },
                { label: 'Color',   value: v.color },
                { label: 'Placa',   value: v.placa, mono: true },
                { label: 'VIN',     value: v.vin, mono: true },
                { label: 'Serial motor', value: v.serial_motor, mono: true },
                { label: 'Fecha llegada', value: v.fecha_llegada ? new Date(v.fecha_llegada + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) : null },
              ].map(({ label, value, mono }) =>
                value ? (
                  <div key={label}>
                    <p className="text-xs text-oriental-gray">{label}</p>
                    <p className={`text-sm font-semibold text-oriental-black mt-0.5 ${mono ? 'font-mono' : ''}`}>{value}</p>
                  </div>
                ) : null
              )}
            </div>
            {v.observaciones && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-oriental-gray">Observaciones</p>
                <p className="text-sm text-oriental-black mt-0.5">{v.observaciones}</p>
              </div>
            )}
          </div>

          {/* PDI */}
          <div className={`card p-5 border-2 ${v.pdi_hecho ? 'border-green-200 bg-green-50' : 'border-dashed border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${v.pdi_hecho ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <CheckCircle2 size={20} className={v.pdi_hecho ? 'text-green-600' : 'text-gray-400'} />
                </div>
                <div>
                  <p className="font-semibold text-oriental-black">PDI — Pre-Delivery Inspection</p>
                  <p className="text-xs text-oriental-gray mt-0.5">
                    {v.pdi_hecho
                      ? `Completado${v.fecha_pdi ? ' el ' + new Date(v.fecha_pdi + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}`
                      : 'Pendiente de realizar'}
                  </p>
                </div>
              </div>
              {v.pdi_hecho && <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-700">✓ Completado</span>}
            </div>
          </div>

          {/* Documentos preventa */}
          <ShowroomDocumentos showroomId={id} archivosIniciales={(archivos ?? []) as any} />

          {/* Historial de estados */}
          {(historial ?? []).length > 0 && (
            <div className="card p-6">
              <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
                <History size={14} className="text-oriental-gray" />
                Historial de cambios
              </h2>
              <div className="relative">
                <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-100" />
                <div className="space-y-4">
                  {(historial ?? []).map((h: any) => (
                    <div key={h.id} className="flex items-start gap-3 pl-8 relative">
                      <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-gray-300 bg-white" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {h.estado_anterior && (
                            <span className="text-[11px] text-oriental-gray bg-gray-100 px-2 py-0.5 rounded-full">{h.estado_anterior}</span>
                          )}
                          {h.estado_anterior && <span className="text-[10px] text-gray-400">→</span>}
                          <span className="text-[11px] font-bold text-oriental-black bg-oriental-bg px-2 py-0.5 rounded-full">{h.estado_nuevo}</span>
                        </div>
                        {h.notas && <p className="text-xs text-oriental-gray mt-0.5 italic">{h.notas}</p>}
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(h.created_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {h.usuario_email && <span className="ml-1">· {h.usuario_email}</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Cliente vinculado */}
          {v.estado === 'vendido' && clienteVinculado && (
            <div className="card p-5 border border-gray-200 bg-gray-50">
              <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-3 flex items-center gap-2">
                <User size={14} className="text-oriental-gray" />
                Vendido a
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-oriental-black">{clienteVinculado.nombre}</p>
                  <p className="text-xs text-oriental-gray mt-0.5 font-mono">{clienteVinculado.cedula_rif}</p>
                </div>
                <Link href={`/clientes/${clienteVinculado.id}`}
                  className="flex items-center gap-1.5 text-xs font-semibold text-oriental-red hover:underline">
                  Ver cliente <ExternalLink size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Columna derecha — acciones */}
        <div className="space-y-4">

          {/* Ubicación */}
          {v.ubicacion && (
            <div className="card p-5">
              <h3 className="text-sm font-bold text-oriental-black mb-2 flex items-center gap-2">
                <MapPin size={14} className="text-oriental-gray" /> Ubicación
              </h3>
              <p className="text-sm font-semibold text-oriental-black capitalize">
                {v.ubicacion === 'otro' ? (v.ubicacion_descripcion ?? 'Otro') : v.ubicacion}
              </p>
            </div>
          )}

          {/* Reserva activa */}
          {v.estado === 'reservado' && v.reserva_monto && (
            <div className={`card p-5 ${reservaVencida ? 'border border-red-200 bg-red-50' : 'border border-purple-200 bg-purple-50'}`}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-purple-800">
                <DollarSign size={14} /> Reserva activa
              </h3>
              <p className="text-2xl font-black text-purple-900">${fmt(v.reserva_monto)}</p>
              {v.reserva_vence && (
                <p className={`text-xs font-semibold mt-1 ${reservaVencida ? 'text-red-600' : 'text-purple-600'}`}>
                  {reservaVencida ? '⚠ Reserva vencida' : `Vence: ${new Date(v.reserva_vence + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                </p>
              )}
              {v.reserva_notas && <p className="text-xs text-purple-700 mt-2 italic">{v.reserva_notas}</p>}
            </div>
          )}

          {/* Panel de acciones */}
          <ShowroomAcciones vehiculo={v} esJose={esJose} userId={user.id} />
        </div>
      </div>
    </div>
  )
}
