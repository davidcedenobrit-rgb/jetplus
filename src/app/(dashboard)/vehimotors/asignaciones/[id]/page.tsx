import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Link2, Car, User, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import AvanzarClient from './AvanzarClient'

export const dynamic = 'force-dynamic'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

const FASES = [
  { estado: 'asignado', label: 'Cliente asignado' },
  { estado: 'en_facturacion', label: 'En facturación' },
  { estado: 'factura_recibida', label: 'Factura recibida' },
  { estado: 'completado', label: 'Completado' },
]

function money(m: number | null, moneda: string) {
  if (m == null) return '—'
  return `${moneda} ${Number(m).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default async function AsignacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) redirect('/dashboard')

  const { id } = await params
  const { data: v } = await supabase
    .from('vinculaciones')
    .select('*, vehiculos(id, marca, modelo, version, anio, color, placa, vin, serial_motor, proforma_vehimotors, tipo_compra), clientes(id, nombre, cedula_rif, telefono, correo)')
    .eq('id', id).single()
  if (!v) notFound()

  const { data: historial } = await supabase
    .from('vinculaciones_historial')
    .select('estado_nuevo, usuario_email, notas, created_at')
    .eq('vinculacion_id', id)
    .order('created_at', { ascending: false })

  const veh = (v as any).vehiculos
  const cli = (v as any).clientes
  const faseIdx = FASES.findIndex(f => f.estado === v.estado)

  return (
    <div className="p-4 lg:p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/vehimotors/asignaciones" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"><ArrowLeft size={18} className="text-oriental-gray" /></Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center"><Link2 size={20} className="text-indigo-700" /></div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">{veh ? `${veh.marca} ${veh.modelo}` : 'Asignación'}</h1>
            <p className="text-oriental-gray text-sm">{v.numero_sa ? `SA ${v.numero_sa} · ` : ''}{cli?.nombre ?? ''}</p>
          </div>
        </div>
      </div>

      {/* Progreso de fases */}
      <div className="card p-5 mb-5">
        <div className="flex items-center justify-between gap-2">
          {FASES.map((f, i) => {
            const done = i <= faseIdx
            return (
              <div key={f.estado} className="flex-1 flex flex-col items-center text-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{i + 1}</div>
                <p className={`text-[10px] mt-1 ${done ? 'text-oriental-black font-semibold' : 'text-oriental-gray'}`}>{f.label}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Datos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card p-5">
              <h2 className="font-bold text-oriental-black mb-3 flex items-center gap-2"><Car size={16} className="text-oriental-gray" /> Vehículo</h2>
              <div className="space-y-1.5 text-sm">
                <Row k="Marca / Modelo" val={veh ? `${veh.marca} ${veh.modelo}` : '—'} />
                <Row k="Placa" val={veh?.placa ?? '—'} />
                <Row k="VIN" val={veh?.vin ?? '—'} />
                <Row k="Proforma VM" val={veh?.proforma_vehimotors ?? '—'} />
                <Row k="Tipo de venta" val={v.tipo_venta ?? '—'} />
                <Row k="N° SA" val={v.numero_sa ?? '—'} />
                <Row k="Monto proforma" val={money(v.monto_proforma, v.moneda ?? 'USD')} />
              </div>
            </div>
            <div className="card p-5">
              <h2 className="font-bold text-oriental-black mb-3 flex items-center gap-2"><User size={16} className="text-oriental-gray" /> Cliente</h2>
              {cli ? (
                <div className="space-y-1.5 text-sm">
                  <Row k="Nombre" val={cli.nombre} />
                  <Row k="Cédula/RIF" val={cli.cedula_rif ?? '—'} />
                  <Row k="Teléfono" val={cli.telefono ?? '—'} />
                  <Row k="Correo" val={cli.correo ?? '—'} />
                </div>
              ) : <p className="text-sm text-oriental-gray">Sin cliente</p>}
            </div>
          </div>

          {/* Acciones de fase */}
          <AvanzarClient vinculacionId={id} estado={v.estado} />
        </div>

        {/* Historial */}
        <div className="card p-5">
          <h2 className="font-bold text-oriental-black mb-3 flex items-center gap-2"><FileText size={16} className="text-oriental-gray" /> Historial</h2>
          <div className="space-y-3">
            {(historial ?? []).length === 0 ? (
              <p className="text-sm text-oriental-gray">Sin eventos.</p>
            ) : (historial ?? []).map((h: any, i: number) => (
              <div key={i} className="border-l-2 border-gray-100 pl-3">
                <p className="text-xs font-semibold text-oriental-black">{FASES.find(f => f.estado === h.estado_nuevo)?.label ?? h.estado_nuevo}</p>
                {h.notas && <p className="text-[11px] text-oriental-gray">{h.notas}</p>}
                <p className="text-[10px] text-gray-400">{h.usuario_email} · {formatDate(h.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ k, val }: { k: string; val: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-oriental-gray text-xs w-28 flex-shrink-0">{k}:</span>
      <span className="text-oriental-black font-medium">{val}</span>
    </div>
  )
}
