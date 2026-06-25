import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDate, ESTADOS_EGRESO_LABEL, CATEGORIAS_EGRESO_LABEL } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, Building2 } from 'lucide-react'
import EgresoActionButtons from './EgresoActionButtons'
import EgresoTasaEditor from './EgresoTasaEditor'
import ComprobantesGallery from '@/components/ComprobantesGallery'

const ROLES_EDITAR_TASA = ['jose', 'admin', 'director', 'leysdem', 'mary', 'arianna']

export default async function EgresoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const rol = (user?.app_metadata?.rol as string) ?? 'editor'

  const { data: egreso } = await supabase
    .from('egresos')
    .select('*')
    .eq('id', id)
    .single()

  if (!egreso) notFound()

  const { data: archivos } = await supabase
    .from('archivos')
    .select('*')
    .eq('egreso_id', id)
    .order('created_at', { ascending: true })

  const estadoColors: Record<string, string> = {
    registrado: 'bg-gray-100 text-gray-700',
    pendiente_aprobacion: 'bg-yellow-100 text-yellow-800',
    aprobado: 'bg-green-100 text-green-800',
    rechazado: 'bg-red-100 text-red-800',
    correccion_requerida: 'bg-orange-100 text-orange-800',
    pagado: 'bg-blue-100 text-blue-800',
    reportado_carla: 'bg-purple-100 text-purple-800',
    reportado_vehimotors: 'bg-indigo-100 text-indigo-800',
    anulado: 'bg-gray-200 text-gray-400',
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/egresos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-oriental-black">{egreso.numero_egreso}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${estadoColors[egreso.estado] ?? 'bg-gray-100 text-gray-700'}`}>
              {ESTADOS_EGRESO_LABEL[egreso.estado]}
            </span>
          </div>
          <p className="text-oriental-gray text-sm mt-0.5">Registrado el {formatDate(egreso.fecha_registro)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Comprobante */}
          <div className="card overflow-hidden">
            <div className="bg-oriental-black px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-oriental-red rounded flex items-center justify-center">
                  <Building2 size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm tracking-tight">LA ORIENTAL AUTOMOTORS</p>
                  <p className="text-gray-400 text-[11px]">Comprobante de egreso</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-oriental-red font-mono font-bold text-sm">{egreso.numero_egreso}</p>
                <p className="text-gray-500 text-[11px]">{formatDate(egreso.fecha_egreso)}</p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-oriental-gray uppercase tracking-wider font-semibold mb-1">Categoría</p>
                  <p className="text-sm text-oriental-black font-medium">{CATEGORIAS_EGRESO_LABEL[egreso.categoria]}</p>
                </div>
                <div>
                  <p className="text-[11px] text-oriental-gray uppercase tracking-wider font-semibold mb-1">Área responsable</p>
                  <p className="text-sm text-oriental-black">{egreso.area_responsable ?? '—'}</p>
                </div>
              </div>

              <div className="border-t border-gray-100" />

              <div>
                <p className="text-[11px] text-oriental-gray uppercase tracking-wider font-semibold mb-1">Concepto</p>
                <p className="text-oriental-black font-medium">{egreso.concepto}</p>
                {egreso.descripcion && <p className="text-sm text-gray-600 mt-1">{egreso.descripcion}</p>}
              </div>

              <div className="border-t border-gray-100" />

              {/* Monto */}
              <div className="bg-oriental-bg rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-oriental-gray uppercase tracking-wider font-semibold">Monto del egreso</p>
                  <p className="text-sm text-oriental-gray mt-0.5">{egreso.moneda}</p>
                  {egreso.tasa_cambio && egreso.moneda === 'VES' && (
                    <p className="text-sm font-bold text-green-700 mt-1">
                      ≈ USD {(Number(egreso.monto) / Number(egreso.tasa_cambio)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                  {egreso.monto_bs && egreso.moneda === 'USD' && (
                    <p className="text-sm font-bold text-gray-500 mt-1">
                      Bs {Number(egreso.monto_bs).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
                <p className="text-3xl font-extrabold text-oriental-red">{formatCurrency(egreso.monto, egreso.moneda)}</p>
              </div>

              {/* Tasa de cambio */}
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                {ROLES_EDITAR_TASA.includes(rol) ? (
                  <EgresoTasaEditor
                    egresoId={egreso.id}
                    monto={Number(egreso.monto)}
                    moneda={egreso.moneda}
                    tasaActual={egreso.tasa_cambio ? Number(egreso.tasa_cambio) : null}
                  />
                ) : egreso.tasa_cambio ? (
                  <div>
                    <p className="text-[11px] text-oriental-gray uppercase tracking-wider font-semibold mb-0.5">Tasa Bs/$</p>
                    <p className="text-sm font-mono font-bold text-oriental-black">{Number(egreso.tasa_cambio).toFixed(4)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {egreso.moneda === 'VES'
                        ? `≈ USD ${(Number(egreso.monto) / Number(egreso.tasa_cambio)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : `Bs ${(Number(egreso.monto) * Number(egreso.tasa_cambio)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      }
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Sin equivalencia registrada — sin tasa</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-oriental-gray uppercase tracking-wider font-semibold mb-1">Beneficiario</p>
                  <p className="text-sm text-oriental-black">{egreso.beneficiario ?? '—'}</p>
                  {egreso.cedula_rif_benef && <p className="text-xs text-oriental-gray font-mono">{egreso.cedula_rif_benef}</p>}
                </div>
                <div>
                  <p className="text-[11px] text-oriental-gray uppercase tracking-wider font-semibold mb-1">Método de pago</p>
                  <p className="text-sm text-oriental-black">{egreso.metodo_pago ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-oriental-gray uppercase tracking-wider font-semibold mb-1">Banco origen</p>
                  <p className="text-sm text-oriental-black">{egreso.banco_origen ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-oriental-gray uppercase tracking-wider font-semibold mb-1">Referencia</p>
                  <p className="font-mono text-sm text-oriental-black">{egreso.referencia ?? '—'}</p>
                </div>
              </div>

              {egreso.observaciones && (
                <>
                  <div className="border-t border-gray-100" />
                  <div>
                    <p className="text-[11px] text-oriental-gray uppercase tracking-wider font-semibold mb-1">Observaciones</p>
                    <p className="text-sm text-gray-700">{egreso.observaciones}</p>
                  </div>
                </>
              )}

              {/* Firma */}
              <div className="border-t border-gray-100 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="border-b border-gray-300 mb-1 pb-8" />
                    <p className="text-[11px] text-oriental-gray uppercase tracking-wider">Aprobado por</p>
                    {egreso.aprobado_por && (
                      <p className="text-xs text-green-700 font-medium mt-1">
                        Aprobado {egreso.fecha_aprobacion ? formatDate(egreso.fecha_aprobacion) : ''}
                      </p>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="border-b border-gray-300 mb-1 pb-8" />
                    <p className="text-[11px] text-oriental-gray uppercase tracking-wider">Registrado por</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-oriental-bg border-t border-gray-100 px-6 py-3 flex items-center justify-between">
              <p className="text-[10px] text-oriental-gray">La Oriental Automotors C.A. — RIF: J-XXXXXXXXX-X</p>
              <p className="text-[10px] text-oriental-gray">Documento generado digitalmente</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <EgresoActionButtons egresoId={egreso.id} estado={egreso.estado} />

          {/* Timeline */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-oriental-black mb-4">Historial</h3>
            <div className="space-y-3">
              <TimelineItem label="Registrado" date={egreso.fecha_registro} active />
              <TimelineItem label="Aprobado" date={egreso.fecha_aprobacion} active={!!egreso.fecha_aprobacion} />
              <TimelineItem label="Reportado Carla" date={egreso.reportado_carla_at} active={!!egreso.reportado_carla_at} />
              <TimelineItem label="Reportado Vehimotors" date={egreso.vehimotors_at} active={!!egreso.vehimotors_at} />
            </div>
          </div>

          <ComprobantesGallery archivos={archivos ?? []} />
        </div>
      </div>
    </div>
  )
}

function TimelineItem({ label, date, active }: { label: string; date?: string | null; active: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${active ? 'bg-oriental-red' : 'bg-gray-200'}`} />
      <div className="flex-1">
        <p className={`text-sm ${active ? 'text-oriental-black font-medium' : 'text-gray-400'}`}>{label}</p>
      </div>
      {date && <p className="text-[11px] text-oriental-gray">{formatDate(date)}</p>}
    </div>
  )
}
