import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Shield, User, Package, Car, CreditCard, CheckCircle2, Clock } from 'lucide-react'

const SOLO_JOSE = ['director', 'admin']

type EventoAuditoria = {
  id: string
  modulo: string
  usuario: string
  accion: string
  detalle: string
  entidad: string
  fecha: string
}

const moduloConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  SORE:        { label: 'SORE',        color: 'text-blue-700',   bg: 'bg-blue-100',   icon: Package },
  Showroom:    { label: 'Showroom',    color: 'text-purple-700', bg: 'bg-purple-100', icon: Car },
  Ingresos:    { label: 'Ingresos',    color: 'text-green-700',  bg: 'bg-green-100',  icon: CreditCard },
  Aprobación:  { label: 'Aprobación',  color: 'text-orange-700', bg: 'bg-orange-100', icon: CheckCircle2 },
}

function timeAgo(fecha: string) {
  const now = new Date()
  const d = new Date(fecha)
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default async function AuditoriaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rol = (user.user_metadata?.rol as string) ?? ''
  if (!SOLO_JOSE.includes(rol)) redirect('/dashboard')

  const admin = await createAdminClient()

  // Mapa UUID → email de usuarios
  const { data: authUsers } = await admin.auth.admin.listUsers()
  const userMap: Record<string, string> = {}
  for (const u of authUsers?.users ?? []) {
    userMap[u.id] = u.email ?? u.id
  }

  const eventos: EventoAuditoria[] = []

  // ── SORE: repuestos_historial ──────────────────────────────────────
  const { data: soreEvents } = await admin
    .from('repuestos_historial')
    .select('id, solicitud_id, estado_nuevo, usuario_email, notas, created_at, solicitudes_repuestos(numero)')
    .order('created_at', { ascending: false })
    .limit(200)

  const estadoLabel: Record<string, string> = {
    solicitado: 'Creó solicitud',
    verificado: 'Verificó solicitud',
    cotizacion_enviada: 'Envió cotización a Vehimotors',
    cotizacion_recibida: 'Recibió cotización de Vehimotors',
    cotizacion_aprobada: 'Aprobó cotización',
    factura_recibida: 'Recibió factura',
    pago_enviado: 'Envió pago a Vehimotors',
    enviado_almacen: 'Notificó a almacén',
    guia_recibida: 'Registró guía de despacho',
    completado: 'Completó solicitud',
    sin_stock: 'Marcó sin stock',
    cancelado: 'Canceló solicitud',
    rechazado_verificacion: 'Rechazó solicitud',
  }

  for (const e of soreEvents ?? []) {
    const sol = (e as any).solicitudes_repuestos
    eventos.push({
      id: e.id,
      modulo: 'SORE',
      usuario: e.usuario_email ?? 'Sistema',
      accion: estadoLabel[e.estado_nuevo] ?? e.estado_nuevo,
      detalle: e.notas ?? '',
      entidad: sol?.numero ?? e.solicitud_id,
      fecha: e.created_at ?? '',
    })
  }

  // ── Showroom: showroom_historial ───────────────────────────────────
  const { data: showEvents } = await admin
    .from('showroom_historial')
    .select('id, showroom_vehiculo_id, estado_anterior, estado_nuevo, usuario_email, notas, created_at, showroom_vehiculos(placa, marca, modelo)')
    .order('created_at', { ascending: false })
    .limit(200)

  for (const e of showEvents ?? []) {
    const v = (e as any).showroom_vehiculos
    const desde = e.estado_anterior ? `${e.estado_anterior} → ` : ''
    eventos.push({
      id: e.id,
      modulo: 'Showroom',
      usuario: e.usuario_email ?? 'Sistema',
      accion: `Cambió estado: ${desde}${e.estado_nuevo}`,
      detalle: e.notas ?? '',
      entidad: v ? `${v.marca} ${v.modelo} · ${v.placa}` : e.showroom_vehiculo_id,
      fecha: e.created_at ?? '',
    })
  }

  // ── Ingresos registrados ───────────────────────────────────────────
  const { data: ingresosData } = await admin
    .from('ingresos')
    .select('id, numero_recibo, concepto, monto, moneda, estado, registrado_por, aprobado_por, fecha_registro, fecha_aprobacion, placa, clientes(nombre)')
    .order('fecha_registro', { ascending: false })
    .limit(200)

  for (const i of ingresosData ?? []) {
    const cliente = (i as any).clientes?.nombre ?? ''
    const montoStr = `${i.moneda} ${Number(i.monto).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
    eventos.push({
      id: `ing-${i.id}`,
      modulo: 'Ingresos',
      usuario: userMap[i.registrado_por ?? ''] ?? i.registrado_por ?? 'Sistema',
      accion: `Registró pago — ${i.concepto}`,
      detalle: `${montoStr}${cliente ? ` · ${cliente}` : ''}${i.placa ? ` · ${i.placa}` : ''} · Recibo: ${i.numero_recibo ?? '—'}`,
      entidad: i.numero_recibo ?? i.id,
      fecha: i.fecha_registro ?? '',
    })

    if (i.aprobado_por && i.fecha_aprobacion) {
      eventos.push({
        id: `apr-${i.id}`,
        modulo: 'Aprobación',
        usuario: userMap[i.aprobado_por] ?? i.aprobado_por,
        accion: `Aprobó ingreso — ${i.concepto}`,
        detalle: `${montoStr}${cliente ? ` · ${cliente}` : ''} · Recibo: ${i.numero_recibo ?? '—'}`,
        entidad: i.numero_recibo ?? i.id,
        fecha: i.fecha_aprobacion,
      })
    }
  }

  // Ordenar todo por fecha desc
  eventos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  const top = eventos.slice(0, 300)

  const totalPorModulo = {
    SORE: top.filter(e => e.modulo === 'SORE').length,
    Showroom: top.filter(e => e.modulo === 'Showroom').length,
    Ingresos: top.filter(e => e.modulo === 'Ingresos').length,
    Aprobación: top.filter(e => e.modulo === 'Aprobación').length,
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center">
          <Shield size={20} className="text-oriental-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Registros de Auditoría</h1>
          <p className="text-oriental-gray text-sm">Actividad de todos los usuarios — últimos 300 eventos</p>
        </div>
      </div>

      {/* Resumen por módulo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(totalPorModulo).map(([mod, count]) => {
          const cfg = moduloConfig[mod]
          const Icon = cfg.icon
          return (
            <div key={mod} className="card p-4 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                <Icon size={16} className={cfg.color} />
              </div>
              <div>
                <p className="text-[11px] text-oriental-gray font-medium">{cfg.label}</p>
                <p className="text-lg font-extrabold text-oriental-black">{count}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Feed */}
      <div className="card divide-y divide-gray-100">
        {top.length === 0 && (
          <div className="p-12 text-center text-oriental-gray">No hay eventos registrados aún.</div>
        )}
        {top.map(ev => {
          const cfg = moduloConfig[ev.modulo] ?? { label: ev.modulo, color: 'text-gray-700', bg: 'bg-gray-100', icon: Clock }
          return (
            <div key={ev.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap ${cfg.bg} ${cfg.color}`}>
                {cfg.label}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-oriental-black">{ev.accion}</p>
                {ev.detalle && <p className="text-xs text-oriental-gray mt-0.5 truncate">{ev.detalle}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <User size={11} className="text-gray-400" />
                  <span className="text-[11px] text-oriental-gray">{ev.usuario}</span>
                  {ev.entidad && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="text-[11px] font-mono text-oriental-gray">{ev.entidad}</span>
                    </>
                  )}
                </div>
              </div>
              <span className="text-[11px] text-gray-400 whitespace-nowrap mt-0.5">{timeAgo(ev.fecha)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
