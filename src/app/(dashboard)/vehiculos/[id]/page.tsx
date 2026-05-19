import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, Car, User, Calendar, Hash, CreditCard, TrendingUp } from 'lucide-react'
import DeleteButton from '@/components/DeleteButton'

export default async function VehiculoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: vehiculo } = await supabase
    .from('vehiculos')
    .select('*, clientes(id, nombre, cedula_rif, telefono)')
    .eq('id', id)
    .single()

  if (!vehiculo) notFound()

  const cliente = (vehiculo as any).clientes

  const { data: ingresos } = await supabase
    .from('ingresos')
    .select('id, numero_recibo, concepto, monto, moneda, fecha_pago, estado')
    .eq('vehiculo_id', id)
    .order('fecha_pago', { ascending: false })
    .limit(20)

  const estadoColors: Record<string, string> = {
    activo: 'bg-green-100 text-green-800',
    entregado: 'bg-blue-100 text-blue-800',
    en_transito: 'bg-yellow-100 text-yellow-800',
    reservado: 'bg-purple-100 text-purple-800',
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/vehiculos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-oriental-black">{vehiculo.marca} {vehiculo.modelo}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${estadoColors[vehiculo.estado] ?? 'bg-gray-100 text-gray-700'}`}>
              {vehiculo.estado}
            </span>
          </div>
          <p className="text-oriental-gray text-sm mt-0.5">{[vehiculo.version, vehiculo.anio, vehiculo.color].filter(Boolean).join(' · ')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info */}
        <div className="space-y-6">
          <div className="card p-6">
            <div className="w-14 h-14 bg-oriental-red/10 rounded-full flex items-center justify-center mb-4">
              <Car size={24} className="text-oriental-red" />
            </div>
            <h2 className="font-bold text-oriental-black mb-4">Datos del vehículo</h2>
            <div className="space-y-3">
              <InfoRow icon={Hash} label="Placa" value={vehiculo.placa ?? 'Sin placa'} mono />
              <InfoRow icon={Hash} label="VIN / Chasis" value={vehiculo.vin ?? '—'} mono />
              <InfoRow icon={Hash} label="Serial motor" value={vehiculo.serial_motor ?? '—'} mono />
              <InfoRow icon={CreditCard} label="Tipo compra" value={vehiculo.tipo_compra} capitalize />
              <InfoRow icon={Calendar} label="Entrega" value={vehiculo.fecha_entrega ? formatDate(vehiculo.fecha_entrega) : 'Pendiente'} />
            </div>
          </div>

          {/* Propietario */}
          {cliente && (
            <div className="card p-6">
              <h2 className="font-bold text-oriental-black mb-4 flex items-center gap-2">
                <User size={16} className="text-oriental-gray" /> Propietario
              </h2>
              <Link href={`/clientes/${cliente.id}`} className="block p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-oriental-bg/50 transition-all">
                <p className="font-semibold text-oriental-black">{cliente.nombre}</p>
                <p className="text-xs text-oriental-gray">{cliente.cedula_rif}</p>
                {cliente.telefono && <p className="text-xs text-oriental-gray mt-1">{cliente.telefono}</p>}
              </Link>
            </div>
          )}

          {vehiculo.observaciones && (
            <div className="card p-6">
              <p className="text-xs text-oriental-gray uppercase tracking-wider font-semibold mb-2">Observaciones</p>
              <p className="text-sm text-gray-700">{vehiculo.observaciones}</p>
            </div>
          )}

          <DeleteButton table="vehiculos" id={id} redirectTo="/vehiculos" label="Eliminar vehículo" />
        </div>

        {/* Ingresos asociados */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-oriental-black flex items-center gap-2">
                <TrendingUp size={18} className="text-oriental-gray" /> Ingresos del vehículo
              </h2>
              <Link href="/ingresos/nuevo" className="text-oriental-red text-xs font-semibold hover:underline">+ Registrar</Link>
            </div>
            {ingresos && ingresos.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-oriental-bg border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Recibo</th>
                      <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Concepto</th>
                      <th className="text-right px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Monto</th>
                      <th className="text-left px-3 py-2 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {ingresos.map(ing => (
                      <tr key={ing.id} className="hover:bg-oriental-bg/50 transition-colors">
                        <td className="px-3 py-2.5">
                          <Link href={`/ingresos/${ing.id}`} className="font-mono text-xs text-oriental-red hover:underline">{ing.numero_recibo}</Link>
                        </td>
                        <td className="px-3 py-2.5 text-oriental-black">{ing.concepto}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-oriental-black">{formatCurrency(ing.monto, ing.moneda)}</td>
                        <td className="px-3 py-2.5 text-oriental-gray">{formatDate(ing.fecha_pago)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-oriental-gray text-sm py-8 text-center">Sin ingresos asociados a este vehículo</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value, mono, capitalize: cap }: { icon: any; label: string; value: string; mono?: boolean; capitalize?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon size={14} className="text-oriental-gray flex-shrink-0" />
      <span className="text-oriental-gray">{label}:</span>
      <span className={`text-oriental-black font-medium ${mono ? 'font-mono' : ''} ${cap ? 'capitalize' : ''}`}>{value}</span>
    </div>
  )
}
