import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AuditoriaClient, { type EventoAuditoria } from './AuditoriaClient'

export const dynamic = 'force-dynamic'

const SOLO_JOSE = ['director', 'admin']

function money(moneda: string, monto: number): string {
  return `${moneda} ${Number(monto).toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(Number(monto)) * 100) % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`
}

export default async function AuditoriaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!SOLO_JOSE.includes(rol)) redirect('/dashboard')

  const admin = await createAdminClient()

  // Mapa UUID → email de usuarios
  const { data: authUsers } = await admin.auth.admin.listUsers()
  const userMap: Record<string, string> = {}
  for (const u of authUsers?.users ?? []) userMap[u.id] = u.email ?? u.id
  const nombre = (id?: string | null) => (id ? userMap[id] ?? id : 'Sistema')

  const eventos: EventoAuditoria[] = []

  // ── SORE: repuestos_historial ──
  const { data: soreEvents } = await admin
    .from('repuestos_historial')
    .select('id, solicitud_id, estado_nuevo, usuario_email, notas, created_at, solicitudes_repuestos(numero)')
    .order('created_at', { ascending: false }).limit(300)
  const estadoLabel: Record<string, string> = {
    solicitado: 'Creó solicitud', verificado: 'Verificó solicitud', cotizacion_enviada: 'Envió cotización a Vehimotors',
    cotizacion_recibida: 'Recibió cotización de Vehimotors', cotizacion_aprobada: 'Aprobó cotización', factura_recibida: 'Recibió factura',
    pago_enviado: 'Envió pago a Vehimotors', enviado_almacen: 'Notificó a almacén', guia_recibida: 'Registró guía de despacho',
    completado: 'Completó solicitud', sin_stock: 'Marcó sin stock', cancelado: 'Canceló solicitud', rechazado_verificacion: 'Rechazó solicitud',
  }
  for (const e of soreEvents ?? []) {
    const sol = (e as any).solicitudes_repuestos
    eventos.push({ id: e.id, modulo: 'SORE', usuario: e.usuario_email ?? 'Sistema', accion: estadoLabel[e.estado_nuevo] ?? e.estado_nuevo, detalle: e.notas ?? '', entidad: sol?.numero ?? e.solicitud_id, fecha: e.created_at ?? '' })
  }

  // ── Showroom: showroom_historial ──
  const { data: showEvents } = await admin
    .from('showroom_historial')
    .select('id, showroom_vehiculo_id, estado_anterior, estado_nuevo, usuario_email, notas, created_at, showroom_vehiculos(placa, marca, modelo)')
    .order('created_at', { ascending: false }).limit(300)
  for (const e of showEvents ?? []) {
    const v = (e as any).showroom_vehiculos
    const desde = e.estado_anterior ? `${e.estado_anterior} → ` : ''
    eventos.push({ id: e.id, modulo: 'Showroom', usuario: e.usuario_email ?? 'Sistema', accion: `Cambió estado: ${desde}${e.estado_nuevo}`, detalle: e.notas ?? '', entidad: v ? `${v.marca} ${v.modelo} · ${v.placa}` : e.showroom_vehiculo_id, fecha: e.created_at ?? '' })
  }

  // ── Ingresos: registró / aprobó / anulación ──
  const { data: ingresosData } = await admin
    .from('ingresos')
    .select('id, numero_recibo, concepto, monto, moneda, estado, registrado_por, aprobado_por, fecha_registro, fecha_aprobacion, placa, clientes(nombre), anulacion_solicitada_por, anulacion_solicitada_at, anulacion_motivo, anulacion_resuelta_por, anulacion_resuelta_at, anulacion_rechazada_motivo')
    .order('fecha_registro', { ascending: false }).limit(400)
  for (const i of ingresosData ?? []) {
    const cliente = (i as any).clientes?.nombre ?? ''
    const m = money(i.moneda, i.monto)
    const ref = `Recibo: ${i.numero_recibo ?? '—'}`
    eventos.push({ id: `ing-${i.id}`, modulo: 'Ingresos', usuario: nombre(i.registrado_por), accion: `Registró pago — ${i.concepto}`, detalle: `${m}${cliente ? ` · ${cliente}` : ''}${i.placa ? ` · ${i.placa}` : ''} · ${ref}`, entidad: i.numero_recibo ?? i.id, fecha: i.fecha_registro ?? '' })
    if (i.aprobado_por && i.fecha_aprobacion) eventos.push({ id: `apr-${i.id}`, modulo: 'Aprobación', usuario: nombre(i.aprobado_por), accion: `Aprobó ingreso — ${i.concepto}`, detalle: `${m}${cliente ? ` · ${cliente}` : ''} · ${ref}`, entidad: i.numero_recibo ?? i.id, fecha: i.fecha_aprobacion })
    if (i.anulacion_solicitada_por && i.anulacion_solicitada_at) eventos.push({ id: `anu-sol-${i.id}`, modulo: 'Anulación', usuario: nombre(i.anulacion_solicitada_por), accion: `Solicitó anulación — ${i.concepto}`, detalle: `${m} · ${i.anulacion_motivo ?? ''} · ${ref}`, entidad: i.numero_recibo ?? i.id, fecha: i.anulacion_solicitada_at })
    if (i.anulacion_resuelta_por && i.anulacion_resuelta_at) eventos.push({ id: `anu-res-${i.id}`, modulo: 'Anulación', usuario: nombre(i.anulacion_resuelta_por), accion: `${i.anulacion_rechazada_motivo ? 'Rechazó' : 'Aprobó'} anulación — ${i.concepto}`, detalle: `${m} · ${i.anulacion_rechazada_motivo ?? 'anulado'} · ${ref}`, entidad: i.numero_recibo ?? i.id, fecha: i.anulacion_resuelta_at })
  }

  // ── Egresos: registró / aprobó ──
  const { data: egresosData } = await admin
    .from('egresos')
    .select('id, numero_egreso, categoria, concepto, monto, moneda, estado, beneficiario, registrado_por, aprobado_por, fecha_registro, fecha_aprobacion')
    .order('fecha_registro', { ascending: false }).limit(400)
  for (const e of egresosData ?? []) {
    const m = money(e.moneda, e.monto)
    const ref = `Egreso: ${e.numero_egreso ?? '—'}`
    const benef = e.beneficiario ? ` · ${e.beneficiario}` : ''
    eventos.push({ id: `egr-${e.id}`, modulo: 'Egresos', usuario: nombre(e.registrado_por), accion: `Registró egreso — ${e.concepto}`, detalle: `${m}${benef} · ${ref}`, entidad: e.numero_egreso ?? e.id, fecha: e.fecha_registro ?? '' })
    if (e.aprobado_por && e.fecha_aprobacion) eventos.push({ id: `egr-apr-${e.id}`, modulo: 'Aprobación', usuario: nombre(e.aprobado_por), accion: `Aprobó egreso — ${e.concepto}`, detalle: `${m}${benef} · ${ref}`, entidad: e.numero_egreso ?? e.id, fecha: e.fecha_aprobacion })
  }

  eventos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

  return <AuditoriaClient eventos={eventos.slice(0, 800)} />
}
