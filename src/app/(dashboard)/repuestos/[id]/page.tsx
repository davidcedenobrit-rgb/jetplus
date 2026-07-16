import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package, CheckCircle2, History, FileText, Truck, AlertCircle } from 'lucide-react'
import RepuestosAcciones from './RepuestosAcciones'
import EliminarSolicitud from './EliminarSolicitud'
import ComprarEnPlazaButton from './ComprarEnPlazaButton'
import ReenviarCotizacionButton from '../ReenviarCotizacionButton'
import EmailTrackingBadge from '@/components/email-tracking/EmailTrackingBadge'

const PASOS = [
  { key: 'solicitado',              label: 'Solicitado',         desc: 'José Manuel registró la solicitud' },
  { key: 'verificado',              label: 'Verificado',         desc: 'Arianna aprobó la solicitud' },
  { key: 'cotizacion_enviada',      label: 'Cot. enviada',       desc: 'Email enviado a Vehimotors' },
  { key: 'cotizacion_recibida',     label: 'Cot. recibida',      desc: 'Vehimotors respondió' },
  { key: 'cotizacion_aprobada',     label: 'Cot. aprobada',      desc: 'José/Arianna aprobaron' },
  { key: 'factura_recibida',        label: 'Factura recibida',   desc: 'Vehimotors adjuntó factura' },
  { key: 'pago_enviado',            label: 'Pago enviado',       desc: 'Comprobante enviado' },
  { key: 'enviado_almacen',         label: 'En almacén',         desc: 'Enviado a almacén para despacho' },
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

  const rol = user.app_metadata?.rol as string
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

  // Disponibilidad efectiva por ítem según la respuesta de Vehimotors.
  //  true = VM lo tiene · false = VM NO lo tiene (va a plaza) · null = aún sin respuesta
  const respuestaVM = solicitud.respuesta_vehimotors as string | null
  function itemHay(item: any): boolean | null {
    if (respuestaVM === 'hay_todo') return true
    if (respuestaVM === 'no_hay') return false
    if (item.disponible === true) return item.cantidad_disponible == null || item.cantidad_disponible > 0
    if (item.disponible === false) return false
    return null
  }
  const itemsSinStock = (items ?? []).filter(it => itemHay(it) === false)

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/repuestos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-oriental-black font-mono">{solicitud.numero ?? solicitud.numero_scr}</h1>
            {solicitud.numero && solicitud.numero_scr && (
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">{solicitud.numero_scr}</span>
            )}
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
              {(solicitud.respuesta_vehimotors === 'no_hay' || solicitud.respuesta_vehimotors === 'parcial')
                && !['completado', 'comprado_plaza', 'cancelado'].includes(solicitud.estado) && (
                <div className="mt-3 pt-3 border-t border-red-200">
                  <p className="text-xs text-oriental-gray mb-2">
                    {itemsSinStock.length > 0
                      ? 'Vehimotors no tiene estos repuestos. Selecciónalos y regístralos como compra en plaza.'
                      : '¿Vehimotors no tiene stock? Registra la compra local del repuesto.'}
                  </p>
                  <ComprarEnPlazaButton
                    solicitudId={solicitud.id}
                    numero={solicitud.numero ?? solicitud.numero_scr ?? ''}
                    items={itemsSinStock.map((it: any) => ({ id: it.id, descripcion: it.descripcion, referencia: it.referencia, cantidad: it.cantidad }))}
                  />
                </div>
              )}
            </div>
          )}

          {/* Compra en plaza registrada */}
          {solicitud.estado === 'comprado_plaza' && (
            <div className="card p-5 border-2 border-purple-200 bg-purple-50">
              <h2 className="text-sm font-bold text-purple-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Package size={14} /> Compra en plaza
              </h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] font-bold text-oriental-gray uppercase">Proveedor</p>
                  <p className="font-semibold text-oriental-black">{solicitud.proveedor_plaza ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-oriental-gray uppercase">Monto</p>
                  <p className="font-semibold text-oriental-black">
                    USD {Number(solicitud.monto_plaza ?? 0).toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(Number(solicitud.monto_plaza ?? 0))*100)%100===0?0:2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-oriental-gray uppercase">Fecha</p>
                  <p className="font-semibold text-oriental-black">
                    {solicitud.fecha_compra_plaza
                      ? new Date(solicitud.fecha_compra_plaza + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </p>
                </div>
                {solicitud.egreso_plaza_id && (
                  <div>
                    <p className="text-[10px] font-bold text-oriental-gray uppercase">Egreso vinculado</p>
                    <Link
                      href={`/egresos/${solicitud.egreso_plaza_id}`}
                      className="text-sm font-semibold text-purple-800 hover:underline">
                      Ver egreso →
                    </Link>
                  </div>
                )}
              </div>
              {solicitud.notas_plaza && (
                <div className="mt-3 pt-3 border-t border-purple-200">
                  <p className="text-[10px] font-bold text-oriental-gray uppercase mb-1">Notas</p>
                  <p className="text-xs text-oriental-black">{solicitud.notas_plaza}</p>
                </div>
              )}
            </div>
          )}

          {/* Lista de repuestos */}
          <div className="card p-6">
            <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
              <Package size={14} className="text-oriental-gray" /> Repuestos
            </h2>
            <div className="space-y-2">
              {(items ?? []).map((item: any) => {
                const hay = itemHay(item)
                return (
                <div key={item.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-oriental-black">{item.descripcion}</p>
                      {item.referencia && <p className="text-xs font-mono text-oriental-gray mt-0.5">{item.referencia}</p>}
                      {item.comprar_plaza && (
                        <span className="inline-block mt-1 text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">🛒 A comprar en plaza</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-oriental-black">×{item.cantidad}</span>
                      {item.cantidad_disponible !== null && hay === true && (
                        <p className="text-xs text-green-700 font-semibold">Disp: {item.cantidad_disponible}</p>
                      )}
                      {item.precio_cotizado && (
                        <p className="text-xs text-green-700 font-semibold">${Number(item.precio_cotizado).toFixed(2)}</p>
                      )}
                    </div>
                    {hay !== null && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${hay ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {hay ? '✓ Hay' : '✗ No hay'}
                      </span>
                    )}
                  </div>
                  {hay === false && (item.tiempo_importacion || item.cotizacion_importacion_url) && (
                    <div className="mt-2 pt-2 border-t border-gray-200 flex flex-col gap-1">
                      {item.tiempo_importacion && (
                        <p className="text-xs text-orange-700 font-semibold">⏱ Importación: {item.tiempo_importacion}</p>
                      )}
                      {item.cotizacion_importacion_url && (
                        <a href={item.cotizacion_importacion_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-700 font-semibold hover:underline">
                          📦 Ver cotización de importación →
                        </a>
                      )}
                    </div>
                  )}
                </div>
                )
              })}
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

          {/* Documentos: cotización + factura + pago consolidados */}
          {(solicitud.cotizacion_url || solicitud.cotizacion_observaciones || solicitud.cotizacion_importacion_url || solicitud.cotizacion_importacion_obs || solicitud.factura_url || solicitud.retencion_url || solicitud.comprobante_url || solicitud.otros_docs_url || solicitud.comprobante_almacen_url) && (
            <div className="card p-5 border border-blue-200 bg-blue-50">
              <h2 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                <FileText size={14} /> Documentos
              </h2>
              <div className="space-y-2">
                {solicitud.cotizacion_url && (
                  <a href={solicitud.cotizacion_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-semibold text-blue-800 hover:underline flex items-center gap-1.5">
                    📄 Cotización de Vehimotors →
                  </a>
                )}
                {solicitud.cotizacion_observaciones && (
                  <p className="text-xs text-blue-700 italic pl-5">"{solicitud.cotizacion_observaciones}"</p>
                )}
                {solicitud.cotizacion_importacion_url && (
                  <a href={solicitud.cotizacion_importacion_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-semibold text-blue-800 hover:underline flex items-center gap-1.5">
                    📦 Cotización de importación →
                  </a>
                )}
                {solicitud.cotizacion_importacion_obs && (
                  <p className="text-xs text-blue-700 italic pl-5">"{solicitud.cotizacion_importacion_obs}"</p>
                )}
                {solicitud.factura_url && (
                  <a href={solicitud.factura_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-semibold text-blue-800 hover:underline flex items-center gap-1.5">
                    🧾 Factura de Vehimotors →
                  </a>
                )}
                {solicitud.comprobante_url && (
                  <a href={solicitud.comprobante_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-semibold text-blue-800 hover:underline flex items-center gap-1.5">
                    💳 Comprobante de pago →
                  </a>
                )}
                {solicitud.retencion_url && (
                  <a href={solicitud.retencion_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-semibold text-blue-800 hover:underline flex items-center gap-1.5">
                    📋 Retenciones →
                  </a>
                )}
                {solicitud.otros_docs_url && (
                  <a href={solicitud.otros_docs_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-semibold text-blue-800 hover:underline flex items-center gap-1.5">
                    📎 Otros documentos →
                  </a>
                )}
                {solicitud.comprobante_almacen_url && (
                  <a href={solicitud.comprobante_almacen_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-semibold text-blue-800 hover:underline flex items-center gap-1.5">
                    🏪 Comprobante almacén →
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Datos de almacén */}
          {(solicitud.correos_almacen || solicitud.numero_cotizacion_vehimotors) && (
            <div className="card p-5 border border-blue-200 bg-blue-50">
              <h2 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                <Truck size={14} /> Envío a almacén
              </h2>
              {solicitud.numero_cotizacion_vehimotors && (
                <p className="text-sm font-mono font-bold text-blue-900 mb-1">Cot: {solicitud.numero_cotizacion_vehimotors}</p>
              )}
              {solicitud.correos_almacen && (
                <p className="text-xs text-blue-700">Notificado a: {solicitud.correos_almacen}</p>
              )}
            </div>
          )}

          {/* Guía de despacho */}
          {solicitud.numero_guia && (
            <div className="card p-5 border border-teal-200 bg-teal-50">
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-teal-600" />
                <div>
                  <p className="text-sm font-bold text-teal-800">Guía de despacho</p>
                  {solicitud.empresa_envio && (
                    <p className="text-xs text-teal-600 font-semibold">{solicitud.empresa_envio}</p>
                  )}
                  <p className="text-sm font-mono font-bold text-teal-700">{solicitud.numero_guia}</p>
                  {solicitud.fecha_estimada_llegada && (
                    <p className="text-xs text-teal-600 mt-0.5">
                      Llegada estimada: {new Date(solicitud.fecha_estimada_llegada + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
              {solicitud.guia_url && (
                <a href={solicitud.guia_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-semibold text-teal-700 hover:underline flex items-center gap-1 mt-2">
                  📄 Ver guía →
                </a>
              )}
            </div>
          )}

          {/* Novedad de recepción */}
          {solicitud.novedad_recepcion && (
            <div className="card p-5 border border-orange-200 bg-orange-50">
              <h2 className="text-sm font-bold text-orange-800 mb-2 flex items-center gap-2">
                ⚠️ Novedad reportada al recibir
              </h2>
              <p className="text-sm text-orange-700">{solicitud.novedad_recepcion}</p>
              {solicitud.novedad_foto_url && (
                <a href={solicitud.novedad_foto_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-semibold text-orange-700 hover:underline flex items-center gap-1 mt-2">
                  📷 Ver foto →
                </a>
              )}
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
          {(solicitud.estado === 'cotizacion_enviada' || solicitud.resend_email_id || solicitud.email_ultimo_estado) && (
            <div className="card p-5">
              <h3 className="text-sm font-bold text-oriental-black mb-3">Tracking del correo</h3>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <EmailTrackingBadge
                    estado={solicitud.email_ultimo_estado as any}
                    ultimoEventoAt={solicitud.email_ultimo_evento_at ?? null}
                    resendEmailId={solicitud.resend_email_id ?? null}
                    entidadTipo="solicitud_repuesto"
                    entidadId={solicitud.id}
                    size="sm"
                  />
                  <p className="text-[11px] text-oriental-gray mt-2">
                    {solicitud.email_ultimo_evento_at
                      ? `Ultimo evento: ${new Date(solicitud.email_ultimo_evento_at).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                      : 'Sin eventos de entrega registrados todavia.'}
                  </p>
                </div>
              </div>
              {solicitud.estado === 'cotizacion_enviada' && (
                <ReenviarCotizacionButton solicitudId={solicitud.id} userEmail={user.email ?? ''} className="mt-4" />
              )}
            </div>
          )}
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
