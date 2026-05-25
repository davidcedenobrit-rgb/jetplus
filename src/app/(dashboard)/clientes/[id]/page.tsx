import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, User, Phone, Mail, MapPin, Car, TrendingUp, FileText, AlertCircle } from 'lucide-react'
import DeleteButton from '@/components/DeleteButton'
import DocumentosCliente from './DocumentosCliente'

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: cliente } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single()

  if (!cliente) notFound()

  const { data: vehiculos } = await supabase
    .from('vehiculos')
    .select('*')
    .eq('cliente_id', id)
    .order('created_at', { ascending: false })

  const { data: ingresos } = await supabase
    .from('ingresos')
    .select('id, numero_recibo, concepto, monto, moneda, fecha_pago, estado')
    .eq('cliente_id', id)
    .order('fecha_pago', { ascending: false })
    .limit(10)

  // Cuotas vencidas por vehículo
  const hoy = new Date().toISOString().split('T')[0]
  const { data: creditos } = await supabase
    .from('creditos')
    .select('id, vehiculo_id, plan_tipo, moneda, vehiculos(marca, modelo, placa)')
    .eq('cliente_id', id)
    .eq('estado', 'activo')

  let cuotasVencidasPorCredito: { creditoId: string; vehiculoLabel: string; moneda: string; monto: number; cantidad: number }[] = []

  if (creditos && creditos.length > 0) {
    const creditoIds = creditos.map(c => c.id)
    const { data: cuotasVencidas } = await supabase
      .from('cuotas')
      .select('credito_id, monto, mora')
      .in('credito_id', creditoIds)
      .or(`estado.eq.vencida,and(estado.eq.pendiente,fecha_vencimiento.lt.${hoy})`)

    if (cuotasVencidas) {
      const grouped: Record<string, { monto: number; cantidad: number }> = {}
      cuotasVencidas.forEach(c => {
        if (!grouped[c.credito_id]) grouped[c.credito_id] = { monto: 0, cantidad: 0 }
        grouped[c.credito_id].monto += Number(c.monto) + Number(c.mora ?? 0)
        grouped[c.credito_id].cantidad++
      })

      cuotasVencidasPorCredito = Object.entries(grouped).map(([cid, data]) => {
        const credito = creditos.find(c => c.id === cid)!
        const v = (credito as any).vehiculos
        const planLabel = credito.plan_tipo === 'inicial_la_oriental' ? ' (Inicial Oriental)'
          : credito.plan_tipo === 'financiamiento_vehimotors' ? ' (Vehimotors)'
          : ''
        return {
          creditoId: cid,
          vehiculoLabel: v ? `${v.marca} ${v.modelo} ${v.placa ? `· ${v.placa}` : ''}${planLabel}` : `Crédito${planLabel}`,
          moneda: credito.moneda,
          monto: data.monto,
          cantidad: data.cantidad,
        }
      })
    }
  }

  // Documentos del cliente
  const { data: documentos } = await supabase
    .from('archivos')
    .select('*')
    .eq('cliente_id', id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/clientes" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-oriental-black">{cliente.nombre}</h1>
          <p className="text-oriental-gray text-sm mt-0.5">{cliente.cedula_rif} · {cliente.tipo === 'juridico' ? 'Persona jurídica' : 'Persona natural'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info del cliente */}
        <div className="space-y-6">
          <div className="card p-6">
            <div className="w-14 h-14 bg-oriental-red/10 rounded-full flex items-center justify-center mb-4">
              <User size={24} className="text-oriental-red" />
            </div>
            <h2 className="font-bold text-oriental-black mb-4">Información</h2>
            <div className="space-y-3">
              {cliente.telefono && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone size={14} className="text-oriental-gray" />
                  <span className="text-oriental-black">{cliente.telefono}</span>
                </div>
              )}
              {cliente.whatsapp && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone size={14} className="text-green-600" />
                  <span className="text-oriental-black">{cliente.whatsapp}</span>
                </div>
              )}
              {cliente.correo && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail size={14} className="text-oriental-gray" />
                  <span className="text-oriental-black">{cliente.correo}</span>
                </div>
              )}
              {(cliente.direccion || cliente.ciudad) && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin size={14} className="text-oriental-gray" />
                  <span className="text-oriental-black">{[cliente.direccion, cliente.ciudad].filter(Boolean).join(', ')}</span>
                </div>
              )}
            </div>
            {cliente.observaciones && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-oriental-gray uppercase tracking-wider font-semibold mb-1">Observaciones</p>
                <p className="text-sm text-gray-700">{cliente.observaciones}</p>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-4">Registrado el {formatDate(cliente.created_at)}</p>
          </div>

          {/* Cuotas vencidas */}
          {cuotasVencidasPorCredito.length > 0 && (
            <div className="card p-6 border border-red-200 bg-red-50/30">
              <h2 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                <AlertCircle size={16} className="text-red-600" /> Cuotas vencidas
              </h2>
              <div className="space-y-3">
                {cuotasVencidasPorCredito.map(cv => (
                  <Link key={cv.creditoId} href={`/creditos/${cv.creditoId}`} className="block p-3 rounded-lg border border-red-200 bg-white hover:border-red-400 transition-colors">
                    <p className="text-xs text-oriental-gray mb-1">{cv.vehiculoLabel}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-red-600">{cv.cantidad} cuota{cv.cantidad > 1 ? 's' : ''} vencida{cv.cantidad > 1 ? 's' : ''}</span>
                      <span className="font-bold text-red-700">{formatCurrency(cv.monto, cv.moneda)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <DeleteButton table="clientes" id={id} redirectTo="/clientes" label="Eliminar cliente" />
        </div>

        {/* Vehículos, Ingresos y Docs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehículos */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-oriental-black flex items-center gap-2">
                <Car size={18} className="text-oriental-gray" /> Vehículos
              </h2>
              <Link href={`/vehiculos/nuevo?cliente_id=${id}`} className="text-oriental-red text-xs font-semibold hover:underline">
                + Agregar
              </Link>
            </div>
            {vehiculos && vehiculos.length > 0 ? (
              <div className="space-y-3">
                {vehiculos.map(v => (
                  <Link key={v.id} href={`/vehiculos/${v.id}`} className="block">
                    <div className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-oriental-bg/50 transition-all">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Car size={18} className="text-oriental-gray" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-oriental-black text-sm">{v.marca} {v.modelo}</p>
                        <p className="text-xs text-oriental-gray">{v.version} · {v.anio} · {v.color}</p>
                      </div>
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded font-bold">{v.placa ?? '—'}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-oriental-gray text-sm py-4 text-center">Sin vehículos registrados</p>
            )}
          </div>

          {/* Últimos ingresos */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-oriental-black flex items-center gap-2">
                <TrendingUp size={18} className="text-oriental-gray" /> Últimos ingresos
              </h2>
              <Link href={`/ingresos/nuevo?cliente_id=${id}`} className="text-oriental-red text-xs font-semibold hover:underline">
                + Registrar
              </Link>
            </div>
            {ingresos && ingresos.length > 0 ? (
              <div className="space-y-2">
                {ingresos.map(ing => (
                  <Link key={ing.id} href={`/ingresos/${ing.id}`} className="block">
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-oriental-bg/50 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-oriental-black">{ing.concepto}</p>
                        <p className="text-xs text-oriental-gray">{ing.numero_recibo} · {formatDate(ing.fecha_pago)}</p>
                      </div>
                      <p className="font-bold text-oriental-black text-sm">{formatCurrency(ing.monto, ing.moneda)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-oriental-gray text-sm py-4 text-center">Sin ingresos registrados</p>
            )}
          </div>

          {/* Documentación del cliente */}
          <div className="card p-6">
            <h2 className="font-bold text-oriental-black mb-4 flex items-center gap-2">
              <FileText size={18} className="text-oriental-gray" /> Documentación del cliente
            </h2>
            <DocumentosCliente clienteId={id} documentosIniciales={documentos ?? []} />
          </div>
        </div>
      </div>
    </div>
  )
}
