import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Package, Plus, Send, Inbox, CheckCircle2, XCircle, ShoppingBag, FileCheck, Receipt, DollarSign, Truck, FilePlus } from 'lucide-react'
import RepuestosCardDeleteBtn from './RepuestosCardDeleteBtn'
import RepuestosActivasGrid from './RepuestosActivasGrid'
import CatalogoRepuestos from './CatalogoRepuestos'

const ROL_ADMIN = ['jose', 'arianna', 'director', 'admin', 'mary', 'leysdem', 'almacen']

// Grupos del flujo de repuestos (segmentado por etapa)
const GRUPO_KEYS = [
  'solicitud_creada', 'cotizacion_enviada', 'cotizacion_recibida', 'sin_stock', 'cotizacion_aprobada',
  'factura_recibida', 'pagada', 'por_recibir',
  'completadas', 'eliminadas', 'compra_plaza',
] as const
type GrupoKey = typeof GRUPO_KEYS[number]

// Cada grupo agrupa uno o mas estados internos
const GRUPO_ESTADOS: Record<GrupoKey, string[]> = {
  solicitud_creada:    ['solicitado', 'verificado'],
  cotizacion_enviada:  ['cotizacion_enviada'],
  cotizacion_recibida: ['cotizacion_recibida'],
  sin_stock:           ['sin_stock'],
  cotizacion_aprobada: ['cotizacion_aprobada'],
  factura_recibida:    ['factura_recibida'],
  pagada:              ['pago_enviado'],
  por_recibir:         ['enviado_almacen', 'guia_recibida'],
  completadas:         ['completado'],
  eliminadas:          ['cancelado', 'rechazado_verificacion'],
  compra_plaza:        ['comprado_plaza'],
}

// Grupos "activos" (en proceso) usan la grilla completa con seguimiento
const GRUPOS_ACTIVOS: GrupoKey[] = [
  'solicitud_creada', 'cotizacion_enviada', 'cotizacion_recibida', 'sin_stock', 'cotizacion_aprobada',
  'factura_recibida', 'pagada', 'por_recibir',
]

const GRUPOS: Array<{
  key: GrupoKey
  label: string
  icon: any
  color: string
  bg: string
  descripcion: string
}> = [
  { key: 'solicitud_creada',    label: 'Solicitud creada',     icon: FilePlus,     color: 'text-slate-700',  bg: 'bg-slate-100',  descripcion: 'Creada por almacén (SCR)' },
  { key: 'cotizacion_enviada',  label: 'Cotización enviada',   icon: Send,         color: 'text-yellow-700', bg: 'bg-yellow-100', descripcion: 'Enviada a VM' },
  { key: 'cotizacion_recibida', label: 'Cotización recibida',  icon: Inbox,        color: 'text-orange-700', bg: 'bg-orange-100', descripcion: 'Vehimotors respondió' },
  { key: 'sin_stock',           label: 'Sin stock',            icon: XCircle,      color: 'text-red-700',    bg: 'bg-red-100',    descripcion: 'Vehimotors no tiene · comprar en plaza' },
  { key: 'cotizacion_aprobada', label: 'Cotización aprobada',  icon: FileCheck,    color: 'text-blue-700',   bg: 'bg-blue-100',   descripcion: 'Aprobada por Rojas' },
  { key: 'factura_recibida',    label: 'Factura recibida',     icon: Receipt,      color: 'text-cyan-700',   bg: 'bg-cyan-100',   descripcion: 'Con factura' },
  { key: 'pagada',              label: 'Pagada',               icon: DollarSign,   color: 'text-emerald-700',bg: 'bg-emerald-100',descripcion: 'Pago enviado' },
  { key: 'por_recibir',         label: 'Por recibir',          icon: Truck,        color: 'text-indigo-700', bg: 'bg-indigo-100', descripcion: 'En camino al taller' },
  { key: 'completadas',         label: 'Completadas',          icon: CheckCircle2, color: 'text-green-700',  bg: 'bg-green-100',  descripcion: 'Ciclo cerrado' },
  { key: 'eliminadas',          label: 'Eliminadas',           icon: XCircle,      color: 'text-gray-600',   bg: 'bg-gray-100',   descripcion: 'Canceladas o rechazadas' },
  { key: 'compra_plaza',        label: 'Compra en plaza',      icon: ShoppingBag,  color: 'text-purple-700', bg: 'bg-purple-100', descripcion: 'Compradas localmente' },
]

const COMPLETAS_LIMIT = 12

export default async function RepuestosPage({
  searchParams,
}: {
  searchParams: Promise<{ grupo?: string; todas?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rol = (user.app_metadata?.rol as string) ?? ''
  const puedeEliminar = ROL_ADMIN.includes(rol)
  const isAdmin = ROL_ADMIN.includes(rol)

  const { grupo, todas } = await searchParams
  const grupoActivo: GrupoKey = (GRUPO_KEYS as readonly string[]).includes(grupo ?? '')
    ? (grupo as GrupoKey)
    : 'solicitud_creada'
  const mostrarTodas = todas === '1'

  // Contadores por grupo (se pagina para no cortar el conteo en 1000 filas)
  const conteos = await fetchAllRows<{ estado: string }>((from, to) => supabase
    .from('solicitudes_repuestos')
    .select('estado')
    .range(from, to))

  const conteoPorGrupo: Record<GrupoKey, number> = {
    solicitud_creada: 0,
    cotizacion_enviada: 0,
    cotizacion_recibida: 0,
    sin_stock: 0,
    cotizacion_aprobada: 0,
    factura_recibida: 0,
    pagada: 0,
    por_recibir: 0,
    completadas: 0,
    eliminadas: 0,
    compra_plaza: 0,
  }
  for (const s of conteos ?? []) {
    for (const g of GRUPO_KEYS) {
      if (GRUPO_ESTADOS[g].includes(s.estado)) {
        conteoPorGrupo[g] += 1
        break
      }
    }
  }

  // Query del grupo activo
  const estadosActivos = GRUPO_ESTADOS[grupoActivo]
  let query = supabase
    .from('solicitudes_repuestos')
    .select('*, repuestos_items(id), clientes(id, nombre)', { count: 'exact' })
    .in('estado', estadosActivos)
    .order('created_at', { ascending: false })

  const gruposConLimite: GrupoKey[] = ['completadas', 'eliminadas', 'compra_plaza']
  if (gruposConLimite.includes(grupoActivo) && !mostrarTodas) {
    query = query.limit(COMPLETAS_LIMIT)
  }

  const { data: solicitudesData, count: totalGrupo } = await query
  const solicitudes = solicitudesData ?? []
  const hayMas = gruposConLimite.includes(grupoActivo)
    && !mostrarTodas
    && (totalGrupo ?? 0) > COMPLETAS_LIMIT

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center">
            <Package size={20} className="text-oriental-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Repuestos</h1>
            {(() => {
              const totalActivas = GRUPOS_ACTIVOS.reduce((s, k) => s + conteoPorGrupo[k], 0)
              return (
                <p className="text-oriental-gray text-sm">
                  Solicitudes a VM · {totalActivas} activa{totalActivas !== 1 ? 's' : ''}
                </p>
              )
            })()}
          </div>
        </div>
        <Link href="/repuestos/nuevo" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nueva solicitud
        </Link>
      </div>

      {/* Tabs por grupo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-6">
        {GRUPOS.map(g => {
          const active = grupoActivo === g.key
          const count = conteoPorGrupo[g.key]
          const Icon = g.icon
          return (
            <Link
              key={g.key}
              href={`/repuestos?grupo=${g.key}`}
              className={`p-3 rounded-xl border-2 transition-all ${
                active
                  ? 'border-oriental-red bg-oriental-red/5'
                  : 'border-gray-100 hover:border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-7 h-7 rounded-lg ${g.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={14} className={g.color} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[11px] font-bold uppercase tracking-wide truncate ${active ? 'text-oriental-black' : 'text-oriental-gray'}`}>
                    {g.label}
                  </p>
                </div>
                <span className={`text-xs font-black ${active ? 'text-oriental-red' : 'text-oriental-black'}`}>
                  {count}
                </span>
              </div>
              <p className="text-[10px] text-oriental-gray truncate">{g.descripcion}</p>
            </Link>
          )
        })}
      </div>

      {/* Contenido del grupo activo */}
      {solicitudes.length === 0 ? (
        <div className="card p-12 text-center">
          <Package size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-oriental-gray font-medium">Sin solicitudes en este grupo</p>
          <p className="text-sm text-gray-400 mt-1">
            {grupoActivo === 'compra_plaza'
              ? 'Cuando Vehimotors responda que no hay stock, podrás mover la solicitud a Compra en plaza desde su detalle.'
              : 'Aquí aparecerán las solicitudes que caigan en este estatus.'}
          </p>
        </div>
      ) : GRUPOS_ACTIVOS.includes(grupoActivo) ? (
        <RepuestosActivasGrid solicitudes={solicitudes as any} puedeEliminar={puedeEliminar} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {solicitudes.map(s => {
              const itemCount = (s.repuestos_items ?? []).length
              const badgeCfg =
                s.estado === 'completado'
                  ? { label: 'Completado', bg: 'bg-green-100 text-green-700' }
                  : s.estado === 'comprado_plaza'
                  ? { label: 'Compra en plaza', bg: 'bg-purple-100 text-purple-700' }
                  : s.estado === 'rechazado_verificacion'
                  ? { label: 'Rechazado', bg: 'bg-red-100 text-red-700' }
                  : { label: 'Cancelado', bg: 'bg-gray-100 text-gray-700' }
              return (
                <div key={s.id} className="relative card hover:shadow-md transition-shadow">
                  {puedeEliminar && <RepuestosCardDeleteBtn solicitudId={s.id} numero={s.numero ?? s.numero_scr} />}
                  <Link href={`/repuestos/${s.id}`} className="block p-5">
                    <div className="flex items-start justify-between mb-2 pr-6">
                      <span className="font-mono text-xs font-bold text-oriental-gray bg-gray-100 px-2 py-0.5 rounded">
                        {s.numero ?? s.numero_scr}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeCfg.bg}`}>
                        {badgeCfg.label}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-oriental-black mt-2">
                      {itemCount} repuesto{itemCount !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-oriental-gray mt-0.5">
                      {new Date(s.created_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    {s.estado === 'comprado_plaza' && (
                      <div className="mt-2 pt-2 border-t border-gray-100 space-y-0.5">
                        {s.proveedor_plaza && (
                          <p className="text-[11px] text-oriental-gray">
                            <span className="text-oriental-black font-semibold">Proveedor:</span> {s.proveedor_plaza}
                          </p>
                        )}
                        {s.monto_plaza != null && (() => {
                          const esVes = s.moneda_plaza === 'VES'
                          const fmt = (n: number) => Number(n).toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(Number(n))*100)%100===0?0:2, maximumFractionDigits: 2 })
                          const equiv = esVes && s.tasa_plaza ? Number(s.monto_plaza) / Number(s.tasa_plaza) : null
                          return (
                            <p className="text-[11px] text-oriental-gray">
                              <span className="text-oriental-black font-semibold">Monto:</span>{' '}
                              {esVes ? `Bs. ${fmt(s.monto_plaza)}` : `USD ${fmt(s.monto_plaza)}`}
                              {equiv != null && <span className="text-gray-400"> · ≈ ${fmt(equiv)}</span>}
                            </p>
                          )
                        })()}
                      </div>
                    )}
                  </Link>
                </div>
              )
            })}
          </div>

          {hayMas && (
            <div className="mt-4 text-center">
              <Link
                href={`/repuestos?grupo=${grupoActivo}&todas=1`}
                className="text-sm text-oriental-red font-semibold hover:underline">
                Ver todas ({totalGrupo})
              </Link>
            </div>
          )}
          {mostrarTodas && (totalGrupo ?? 0) > COMPLETAS_LIMIT && (
            <div className="mt-4 text-center">
              <Link
                href={`/repuestos?grupo=${grupoActivo}`}
                className="text-sm text-oriental-gray font-semibold hover:underline">
                Ver menos
              </Link>
            </div>
          )}
        </>
      )}

      <CatalogoRepuestos isAdmin={isAdmin} />
    </div>
  )
}
