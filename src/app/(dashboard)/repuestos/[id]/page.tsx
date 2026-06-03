import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package, CheckCircle2, History, FileText, Truck, AlertCircle } from 'lucide-react'
import RepuestosAcciones from './RepuestosAcciones'
import EliminarSolicitud from './EliminarSolicitud'

const PASOS = [
  { key: 'solicitado',              label: 'Solicitado',         desc: 'José Manuel registró la solicitud' },
  { key: 'verificado',              label: 'Verificado',         desc: 'Arianna aprobó la solicitud' },
  { key: 'cotizacion_enviada',      label: 'Cot. enviada',       desc: 'Email enviado a Vehimotors' },
  { key: 'cotizacion_recibida',     label: 'Cot. recibida',      desc: 'Vehimotors respondió' },
  { key: 'cotizacion_aprobada',     label: 'Cot. aprobada',      desc: 'José/Arianna aprobaron' },
  { key: 'factura_recibida',        label: 'Factura recibida',   desc: 'Vehimotors adjuntó factura' },
  { key: 'pago_enviado',            label: 'Pago enviado',       desc: 'Comprobante enviado' },
  { key: 'guia_recibida',           label: 'Guía recibida',      desc: 'Guía de despacho registrada' },
  { key: 'completado',              label: 'Completado',         desc: 'Pedido llegó al taller' },
]

function StepBar({ estado }: { estado: string }) {
  const idx = PASOS.findIndex(p => p.key === estado)
  return (
    <div className="card p-6 mb-6">
      <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-5">Progreso del pedido</h2>
      <div className="relative overflow-x-auto">
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-100" />
        <div className="absolute top-4 left-4 h-0.5 bg-oriental-red transition-all"
          style={{ width: idx <= 0 ? '0%' : `${(idx / (PASOS.length - 1)) * 100}%`, right: 'auto' }} />
        <div className="relative flex justify-between min-w-max gap-2">
          {PASOS.map((p, i) => {
            const done = i < idx; const active = i === idx
            return (
              <div key={p.key} className="flex flex-col items-center w-16">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 z-10 bg-white transition-all
                  ${done ? 'border-oriental-red bg-oriental-red' : active ? 'border-oriental-red' : 'border-gray-200'}`}>
                  {done ? <CheckCircle2 size={16} className="text-white" />
                    : <span className={`text-xs font-bold ${active ? 'text-oriental-red' : 'text-gray-300'}`}>{i + 1}</span>}
                </div>
                <p className={`text-[9px] font-semibold mt-2 text-center leading-tight ${active ? 'text-oriental-red' : done ? 'text-oriental-black' : 'text-gray-400'}`}>
                  {p.label}
                </p>
              </div>
            )
          })}
        </div>
      </div>
      {idx >= 0 && (
        <p className="text-xs text-oriental-gray mt-4 text-center">{PASOS[idx]?.desc}</p>
      )}
    </div>
  )
}

export default async function RepuestoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rol = user.user_metadata?.rol as string
  const { id } = await params

  const { data: solicitud } = await supabase
    .from('solicitudes_repuestos')
    .select('*')
    .eq('id', id)
    .single()

  if (!solicitud) notFound()

  const { data: items } = await supabase
    .from('repuestos_items')
    .select('*')
    .eq('solicitud_id', id)
    .order('created_at')

  const { data: historial } = await supabase
    .from('repuestos_historial')
    .select('*')
    .eq('solicitud_id', id)
    .order('created_at', { ascending: false })

  const respuestaMap: Record<string, string> = {
    hay_todo: '✅ Hay todo disponible',
    no_hay:   '❌ Sin disponibilidad',
    parcial:  '⚠️ Disponibilidad parcial',
  }
  const respuestaLabel = solicitud.respuesta_vehimotors ? (respuestaMap[solicitud.respuesta_vehimotors] ?? null) : null

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/repuestos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-oriental-black font-mono">{solicitud.numero}</h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {items?.length ?? 0} repuesto{(items?.length ?? 0) !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-oriental-gray text-sm mt-0.5">
            Solicitado por {solicitud.solicitado_por_email} · {new Date(solicitud.created_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      <StepBar estado={solicitud.estado} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Respuesta de Vehimotors */}
          {respuestaLabel && (
            <div className={`card p-5 border ${solicitud.respuesta_vehimotors === 'hay_todo' ? 'border-green-200 bg-green-50' : solicitud.respuesta_vehimotors === 'no_hay' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}>
              <p className="font-bold text-oriental-black">{respuestaLabel}</p>
              <p className="text-xs text-oriental-gray mt-1">Respuesta confirmada por Vehimotors</p>
            </div>
          )}

          {/* Lista de repuestos */}
          <div className="card p-6">
            <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
              <Package size={14} className="text-oriental-gray" /> Repuestos
            </h2>
            <div className="space-y-2">
              {(items ?? []).map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-oriental-black">{item.descripcion}</p>
                    {item.referencia && <p className="text-xs font-mono text-oriental-gray mt-0.5">{item.referencia}</p>}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-oriental-black">×{item.cantidad}</span>
                    {item.precio_cotizado && (
                      <p className="text-xs text-green-700 font-semibold">${Number(item.precio_cotizado).toFixed(2)}</p>
                    )}
                  </div>
                  {item.disponible !== null && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.disponible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {item.disponible ? '✓' : '✗'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notas */}
          {(solicitud.notas_almacenista || solicitud.notas_arianna) && (
            <div className="card p-6">
              <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4">Notas</h2>
              {solicitud.notas_almacenista && (
                <div className="mb-3">
                  <p className="text-xs text-oriental-gray font-semibold mb-1">Almacenista</p>
                  <p className="text-sm text-oriental-black">{solicitud.notas_almacenista}</p>
                </div>
              )}
              {solicitud.notas_arianna && (
                <div>
                  <p className="text-xs text-oriental-gray font-semibold mb-1">Arianna</p>
                  <p className="text-sm text-oriental-black">{solicitud.notas_arianna}</p>
                </div>
              )}
            </div>
          )}

          {/* Rechazo */}
          {solicitud.estado === 'rechazado_verificacion' && (
            <div className="card p-5 border border-red-200 bg-red-50">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={15} className="text-red-600" />
                <p className="font-bold text-red-800">Solicitud rechazada por Arianna</p>
              </div>
              <p className="text-sm text-red-700">{solicitud.rechazo_motivo}</p>
            </div>
          )}

          {/* Cotización recibida */}
          {solicitud.cotizacion_url && (
            <div className="card p-5 border border-yellow-200 bg-yellow-50">
              <h2 className="text-sm font-bold text-yellow-800 mb-2 flex items-center gap-2">
                <FileText size={14} /> Cotización de Vehimotors
              </h2>
              {solicitud.cotizacion_observaciones && (
                <p className="text-xs text-yellow-700 mb-3 italic">"{solicitud.cotizacion_observaciones}"</p>
              )}
              <a href={solicitud.cotizacion_url} target="_blank" rel="noopener noreferrer"
                className="text-sm font-semibold text-yellow-800 hover:underline flex items-center gap-1">
                📄 Ver archivo de cotización →
              </a>
            </div>
          )}
          {!solicitud.cotizacion_url && solicitud.cotizacion_observaciones && (
            <div className="card p-5 border border-yellow-200 bg-yellow-50">
              <p className="text-xs font-semibold text-yellow-800 mb-1">Observaciones de Vehimotors:</p>
              <p className="text-sm text-yellow-700">{solicitud.cotizacion_observaciones}</p>
            </div>
          )}

          {/* Factura */}
          {solicitud.factura_url && (
            <div className="card p-5 border border-purple-200 bg-purple-50">
              <h2 className="text-sm font-bold text-purple-800 mb-2 flex items-center gap-2">
                <FileText size={14} /> Factura de Vehimotors
              </h2>
              <a href={solicitud.factura_url} target="_blank" rel="noopener noreferrer"
                className="text-sm font-semibold text-purple-800 hover:underline flex items-center gap-1">
                📄 Ver factura →
              </a>
            </div>
          )}

          {/* Documentos de pago */}
          {(solicitud.retencion_url || solicitud.comprobante_url || solicitud.otros_docs_url) && (
            <div className="card p-5 border border-green-200 bg-green-50">
              <h2 className="text-sm font-bold text-green-800 mb-3 flex items-center gap-2">
                <FileText size={14} /> Documentos de pago
              </h2>
              <div className="space-y-2">
                {solicitud.retencion_url && (
                  <a href={solicitud.retencion_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-semibold text-green-800 hover:underline flex items-center gap-1.5">
                    📋 Ver retenciones →
                  </a>
                )}
                {solicitud.comprobante_url && (
                  <a href={solicitud.comprobante_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-semibold text-green-800 hover:underline flex items-center gap-1.5">
                    📄 Ver comprobante de pago →
                  </a>
                )}
                {solicitud.otros_docs_url && (
                  <a href={solicitud.otros_docs_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-semibold text-green-800 hover:underline flex items-center gap-1.5">
                    📎 Ver otros documentos →
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Guía de despacho */}
          {solicitud.numero_guia && (
            <div className="card p-5 border border-teal-200 bg-teal-50">
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-teal-600" />
                <div>
                  <p className="text-sm font-bold text-teal-800">Guía de despacho</p>
                  <p className="text-sm font-mono font-bold text-teal-700">{solicitud.numero_guia}</p>
                  {solicitud.fecha_estimada_llegada && (
                    <p className="text-xs text-teal-600 mt-0.5">
                      Llegada estimada: {new Date(solicitud.fecha_estimada_llegada + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Historial */}
          {(historial ?? []).length > 0 && (
            <div className="card p-6">
              <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
                <History size={14} className="text-oriental-gray" /> Historial
              </h2>
              <div className="relative">
                <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-100" />
                <div className="space-y-4">
                  {(historial ?? []).map((h: any) => (
                    <div key={h.id} className="flex items-start gap-3 pl-8 relative">
                      <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-gray-300 bg-white" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-oriental-black">{h.estado_nuevo.replace(/_/g, ' ')}</p>
                        {h.notas && <p className="text-[11px] text-oriental-gray italic mt-0.5">{h.notas}</p>}
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(h.created_at).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          {h.usuario_email && ` · ${h.usuario_email}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Panel de acciones */}
        <div className="space-y-4">
          <RepuestosAcciones
            solicitud={solicitud}
            items={(items ?? []).map((i: any) => ({ id: i.id, descripcion: i.descripcion, referencia: i.referencia, cantidad: i.cantidad }))}
            rol={rol}
            userId={user.id}
            userEmail={user.email ?? ''}
          />
          {/* Eliminar solicitud — solo José y Arianna */}
          {['jose', 'admin', 'director', 'arianna'].includes(rol) && (
            <EliminarSolicitud solicitudId={solicitud.id} />
          )}
        </div>
      </div>
    </div>
  )
}
