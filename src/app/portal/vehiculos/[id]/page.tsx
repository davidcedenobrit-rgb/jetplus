import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Car, ArrowLeft, Wrench, Calendar, TrendingUp } from 'lucide-react'
import BottomNav from '../../BottomNav'
import PortalHeader from '../../PortalHeader'

function fmtFecha(s: string | null) {
  if (!s) return '—'
  try { return new Date(s + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return s }
}

function fmtKm(km: number) { return km.toLocaleString('es-VE') }

export default async function VehiculoDetalleCliente({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.rol !== 'cliente') redirect('/portal/login')

  const admin = await createAdminClient()
  const { data: cuenta } = await admin.from('cliente_cuentas').select('cliente_id').eq('user_id', user.id).single()
  if (!cuenta) redirect('/portal/login')

  const { id } = await params
  const { data: vehiculo } = await admin
    .from('vehiculos')
    .select('*')
    .eq('id', id)
    .eq('cliente_id', cuenta.cliente_id)
    .maybeSingle()
  if (!vehiculo) notFound()

  const { data: servicios } = await admin
    .from('servicios_vehiculo')
    .select('id, numero, fecha_servicio, km, concepto')
    .eq('vehiculo_id', id)
    .order('fecha_servicio', { ascending: false })
    .limit(20)

  return (
    <div>
      <PortalHeader />
      <div className="px-5 pt-4 pb-2">
        <Link href="/portal/vehiculos" className="inline-flex items-center gap-1 text-xs font-semibold text-oriental-gray hover:text-oriental-red">
          <ArrowLeft size={12} /> Volver
        </Link>
      </div>

      <div className="mx-5 mb-4 bg-gradient-to-br from-oriental-black to-gray-800 rounded-2xl p-5 text-white shadow-xl">
        <div className="flex items-center gap-1.5 mb-1">
          <Car size={12} className="text-red-300" />
          <p className="text-[10px] font-bold text-red-300 uppercase tracking-widest">{vehiculo.marca}</p>
        </div>
        <p className="text-xl font-black">{vehiculo.modelo}</p>
        <p className="text-sm text-gray-300 mt-0.5">
          {vehiculo.anio ?? ''} {vehiculo.color ? `· ${vehiculo.color}` : ''}
        </p>
        {vehiculo.placa && (
          <div className="inline-block mt-3 px-3 py-1 bg-white/10 rounded-lg border border-white/20 font-mono text-sm font-bold">
            {vehiculo.placa}
          </div>
        )}
      </div>

      {/* Datos técnicos */}
      <div className="mx-5 mb-4 bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50 bg-gray-50">
          <p className="text-[10px] font-black text-oriental-gray uppercase tracking-widest">Datos del vehículo</p>
        </div>
        <div className="divide-y divide-gray-50">
          <DatoRow label="VIN / Chasis" value={vehiculo.vin ?? '—'} mono />
          <DatoRow label="Serial motor" value={vehiculo.serial_motor ?? '—'} mono />
          <DatoRow label="Fecha de entrega" value={fmtFecha(vehiculo.fecha_entrega)} />
          <DatoRow label="Tipo de compra" value={vehiculo.tipo_compra === 'financiado' ? 'Financiado' : 'Contado'} />
        </div>
      </div>

      {/* Historial servicios */}
      <div className="mx-5 mb-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Wrench size={14} className="text-oriental-red" />
          <p className="text-[10px] font-black text-oriental-gray uppercase tracking-widest">Historial de servicios</p>
        </div>
        {(!servicios || servicios.length === 0) ? (
          <div className="text-center py-8 bg-gray-50 rounded-2xl text-xs text-oriental-gray">
            Aún no hay servicios registrados
          </div>
        ) : (
          <div className="space-y-2">
            {servicios.map(s => (
              <div key={s.id} className="bg-white border border-gray-100 rounded-xl p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-[11px] font-mono font-bold text-oriental-red">{s.numero}</p>
                    <p className="text-sm text-oriental-black mt-0.5 line-clamp-2">{s.concepto}</p>
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-[11px] text-oriental-gray flex items-center gap-1 justify-end">
                      <Calendar size={10} /> {fmtFecha(s.fecha_servicio)}
                    </p>
                    <p className="text-[11px] font-bold text-oriental-black mt-0.5">{fmtKm(s.km)} km</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

function DatoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <p className="text-[11px] text-oriental-gray">{label}</p>
      <p className={`text-sm font-semibold text-oriental-black ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}
