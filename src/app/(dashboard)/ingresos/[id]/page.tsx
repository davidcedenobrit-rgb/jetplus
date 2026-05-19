import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDate, ESTADOS_RECIBO_LABEL } from '@/lib/utils'
import Link from 'next/link'
import {
  ArrowLeft, CheckCircle2, XCircle, AlertTriangle,
  Send, Landmark, Building2, Printer, FileText
} from 'lucide-react'
import ActionButtons from './ActionButtons'
import ComprobantesGallery from '@/components/ComprobantesGallery'

export default async function IngresoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: ingreso } = await supabase
    .from('ingresos')
    .select('*, clientes(nombre, cedula_rif, telefono, correo, direccion, ciudad)')
    .eq('id', id)
    .single()

  if (!ingreso) notFound()

  const { data: archivos } = await supabase
    .from('archivos')
    .select('*')
    .eq('ingreso_id', id)
    .order('created_at', { ascending: true })

  const cliente = (ingreso as any).clientes

  const estadoColors: Record<string, string> = {
    registrado: 'bg-gray-100 text-gray-700',
    pendiente_aprobacion: 'bg-yellow-100 text-yellow-800',
    aprobado: 'bg-green-100 text-green-800',
    rechazado: 'bg-red-100 text-red-800',
    correccion_requerida: 'bg-orange-100 text-orange-800',
    enviado_carla: 'bg-purple-100 text-purple-800',
    listo_depositar: 'bg-cyan-100 text-cyan-800',
    enviado_deposito: 'bg-blue-100 text-blue-800',
    depositado: 'bg-emerald-100 text-emerald-800',
    reportado_vehimotors: 'bg-indigo-100 text-indigo-800',
    anulado: 'bg-gray-200 text-gray-400',
  }

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/ingresos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-oriental-black">{ingreso.numero_recibo}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${estadoColors[ingreso.estado] ?? 'bg-gray-100 text-gray-700'}`}>
              {ESTADOS_RECIBO_LABEL[ingreso.estado]}
            </span>
          </div>
          <p className="text-oriental-gray text-sm mt-0.5">Registrado el {formatDate(ingreso.fecha_registro)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recibo digital */}
          <div className="card overflow-hidden">
            {/* Recibo header */}
            <div className="bg-oriental-black px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-oriental-red rounded flex items-center justify-center">
                  <Building2 size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm tracking-tight">LA ORIENTAL AUTOMOTORS</p>
                  <p className="text-gray-400 text-[11px]">MG & MAXUS · Maturín, Edo. Monagas</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-oriental-red font-mono font-bold text-sm">{ingreso.numero_recibo}</p>
                <p className="text-gray-500 text-[11px]">{formatDate(ingreso.fecha_pago)}</p>
              </div>
            </div>

            {/* Recibo body */}
            <div className="p-6 space-y-5">
              {/* Cliente */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-oriental-gray uppercase tracking-wider font-semibold mb-1">Cliente</p>
                  <p className="font-semibold text-oriental-black">{cliente?.nombre ?? '—'}</p>
                  <p className="text-sm text-oriental-gray">{cliente?.cedula_rif}</p>
                </div>
                <div>
                  <p className="text-[11px] text-oriental-gray uppercase tracking-wider font-semibold mb-1">Contacto</p>
                  <p className="text-sm text-oriental-black">{cliente?.telefono ?? '—'}</p>
                  <p className="text-sm text-oriental-gray">{cliente?.correo ?? '—'}</p>
                </div>
              </div>

              <div className="border-t border-gray-100" />

              {/* Vehículo y placa */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[11px] text-oriental-gray uppercase tracking-wider font-semibold mb-1">Vehículo</p>
                  <p className="text-sm text-oriental-black">{ingreso.vehiculo_id ? 'Vinculado' : '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-oriental-gray uppercase tracking-wider font-semibold mb-1">Placa</p>
                  <p className="font-mono font-bold text-oriental-black">{ingreso.placa ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-oriental-gray uppercase tracking-wider font-semibold mb-1">Concepto</p>
                  <p className="text-sm text-oriental-black">{ingreso.concepto}</p>
                </div>
              </div>

              <div className="border-t border-gray-100" />

              {/* Monto */}
              <div className="bg-oriental-bg rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-oriental-gray uppercase tracking-wider font-semibold">Monto recibido</p>
                  <p className="text-sm text-oriental-gray mt-0.5">{ingreso.moneda}</p>
                </div>
                <p className="text-3xl font-extrabold text-oriental-black">{formatCurrency(ingreso.monto, ingreso.moneda)}</p>
              </div>

              {/* Tasa de cambio (solo VES) */}
              {ingreso.moneda === 'VES' && ingreso.tasa_cambio && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-blue-600 uppercase tracking-wider font-semibold">Tasa de cambio</p>
                    <p className="text-sm text-blue-700 mt-0.5">Equivalente en USD: ~{formatCurrency(ingreso.monto / ingreso.tasa_cambio, 'USD')}</p>
                  </div>
                  <p className="text-2xl font-extrabold text-blue-800">{Number(ingreso.tasa_cambio).toFixed(2)} Bs/$</p>
                </div>
              )}

              {/* Pago */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-oriental-gray uppercase tracking-wider font-semibold mb-1">Forma de pago</p>
                  <p className="text-sm text-oriental-black">{ingreso.metodo_pago}</p>
                </div>
                <div>
                  <p className="text-[11px] text-oriental-gray uppercase tracking-wider font-semibold mb-1">Referencia</p>
                  <p className="font-mono text-sm text-oriental-black">{ingreso.referencia ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-oriental-gray uppercase tracking-wider font-semibold mb-1">Banco emisor</p>
                  <p className="text-sm text-oriental-black">{ingreso.banco_emisor ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-oriental-gray uppercase tracking-wider font-semibold mb-1">Banco receptor</p>
                  <p className="text-sm text-oriental-black">{ingreso.banco_receptor ?? '—'}</p>
                </div>
              </div>

              {ingreso.observaciones && (
                <>
                  <div className="border-t border-gray-100" />
                  <div>
                    <p className="text-[11px] text-oriental-gray uppercase tracking-wider font-semibold mb-1">Observaciones</p>
                    <p className="text-sm text-gray-700">{ingreso.observaciones}</p>
                  </div>
                </>
              )}

              {/* Firma */}
              <div className="border-t border-gray-100 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="border-b border-gray-300 mb-1 pb-8" />
                    <p className="text-[11px] text-oriental-gray uppercase tracking-wider">Firma / Aprobación</p>
                    {ingreso.aprobado_por && (
                      <p className="text-xs text-green-700 font-medium mt-1">
                        Aprobado {ingreso.fecha_aprobacion ? formatDate(ingreso.fecha_aprobacion) : ''}
                      </p>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="border-b border-gray-300 mb-1 pb-8" />
                    <p className="text-[11px] text-oriental-gray uppercase tracking-wider">Recibido por</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recibo footer */}
            <div className="bg-oriental-bg border-t border-gray-100 px-6 py-3 flex items-center justify-between">
              <p className="text-[10px] text-oriental-gray">La Oriental Automotors C.A. — RIF: J-XXXXXXXXX-X</p>
              <p className="text-[10px] text-oriental-gray">Documento generado digitalmente</p>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="space-y-4">
          <ActionButtons
            ingresoId={ingreso.id}
            estado={ingreso.estado}
            monto={ingreso.monto}
            moneda={ingreso.moneda}
            numeroRecibo={ingreso.numero_recibo}
          />

          {/* Timeline */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-oriental-black mb-4">Historial</h3>
            <div className="space-y-3">
              <TimelineItem label="Registrado" date={ingreso.fecha_registro} active />
              <TimelineItem label="Aprobado" date={ingreso.fecha_aprobacion} active={!!ingreso.fecha_aprobacion} />
              <TimelineItem label="Enviado a Carla" date={ingreso.enviado_carla_at} active={!!ingreso.enviado_carla_at} />
              <TimelineItem label="Depositado" date={ingreso.deposito_at} active={!!ingreso.deposito_at} />
              <TimelineItem label="Reportado Vehimotors" date={ingreso.vehimotors_at} active={!!ingreso.vehimotors_at} />
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
