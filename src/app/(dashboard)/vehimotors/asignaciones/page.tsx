import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Link2, ArrowRight, Building2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

const FASES: { estado: string; label: string; color: string }[] = [
  { estado: 'asignado',         label: 'Cliente asignado',   color: 'bg-blue-100 text-blue-700' },
  { estado: 'en_facturacion',   label: 'En facturación',     color: 'bg-amber-100 text-amber-700' },
  { estado: 'factura_recibida', label: 'Factura recibida',   color: 'bg-purple-100 text-purple-700' },
  { estado: 'completado',       label: 'Completado',         color: 'bg-green-100 text-green-700' },
]

function money(m: number | null, moneda: string) {
  if (m == null) return '—'
  return `${moneda} ${Number(m).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default async function AsignacionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) redirect('/dashboard')

  const vincs = await fetchAllRows<any>((f, t) => supabase
    .from('vinculaciones')
    .select('id, numero_sa, tipo_venta, monto_proforma, moneda, estado, asignado_at, vehiculos(marca, modelo, placa), clientes(nombre, cedula_rif)')
    .neq('estado', 'anulado')
    .order('asignado_at', { ascending: false })
    .range(f, t))

  const lista = vincs ?? []
  const porFase: Record<string, any[]> = {}
  for (const f of FASES) porFase[f.estado] = []
  for (const v of lista) (porFase[v.estado] ??= []).push(v)

  return (
    <div className="p-4 lg:p-8 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center"><Link2 size={20} className="text-indigo-700" /></div>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Asignaciones y Ventas</h1>
          <p className="text-oriental-gray text-sm">Del cliente asignado hasta la factura de Vehimotors · {lista.length} en proceso</p>
        </div>
      </div>

      <div className="space-y-5">
        {FASES.map(fase => {
          const items = porFase[fase.estado] ?? []
          return (
            <div key={fase.estado}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${fase.color}`}>{fase.label}</span>
                <span className="text-[11px] text-oriental-gray">{items.length}</span>
              </div>
              {items.length === 0 ? (
                <p className="text-xs text-oriental-gray pl-1 pb-2">—</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((v: any) => (
                    <Link key={v.id} href={`/vehimotors/asignaciones/${v.id}`} className="card p-4 hover:border-indigo-300 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-oriental-black text-sm">{v.vehiculos ? `${v.vehiculos.marca} ${v.vehiculos.modelo}` : 'Vehículo'}</p>
                        {v.numero_sa && <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{v.numero_sa}</span>}
                      </div>
                      <p className="text-xs text-oriental-gray">{v.clientes?.nombre ?? 'Sin cliente'}{v.vehiculos?.placa ? ` · ${v.vehiculos.placa}` : ''}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-bold text-oriental-black">{money(v.monto_proforma, v.moneda ?? 'USD')}</span>
                        <span className="text-[10px] text-oriental-gray capitalize">{v.tipo_venta ?? ''} · {formatDate(v.asignado_at)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {lista.length === 0 && (
          <div className="card p-12 text-center">
            <Building2 size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="text-oriental-gray font-medium">Aún no hay asignaciones</p>
            <p className="text-sm text-gray-400 mt-1">Desde la ficha de un vehículo con cliente, usa &quot;Asignar al cliente&quot;.</p>
          </div>
        )}
      </div>
    </div>
  )
}
