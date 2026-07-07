export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director', 'carla', 'mary', 'leysdem']

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: usuario } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  const rol = usuario?.rol ?? ''
  if (!ROLES.includes(rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { ingresoIds, destino, responsable, fecha, hora, notas } = body ?? {}

  if (!Array.isArray(ingresoIds) || ingresoIds.length === 0) {
    return NextResponse.json({ error: 'Seleccioná al menos un ingreso' }, { status: 400 })
  }
  if (!['oriental', 'vehimotors'].includes(destino)) {
    return NextResponse.json({ error: 'Destino inválido' }, { status: 400 })
  }
  if (!responsable || typeof responsable !== 'string' || !responsable.trim()) {
    return NextResponse.json({ error: 'Escoge quién lleva el efectivo' }, { status: 400 })
  }

  const admin = await createAdminClient()

  // Traer ingresos para validar
  const { data: ingresos } = await admin
    .from('ingresos')
    .select('id, estado')
    .in('id', ingresoIds)

  if (!ingresos || ingresos.length === 0) {
    return NextResponse.json({ error: 'Ingresos no encontrados' }, { status: 404 })
  }

  const noValidos = ingresos.filter(i => !['aprobado', 'enviado_carla', 'entregado_carla'].includes(i.estado))
  if (noValidos.length > 0) {
    return NextResponse.json({
      error: `${noValidos.length} ingreso(s) no pueden enviarse a depósito por su estado actual`,
    }, { status: 400 })
  }

  const fechaHora = fecha && hora
    ? new Date(`${fecha}T${hora}:00`).toISOString()
    : new Date().toISOString()

  const { error: upErr } = await admin
    .from('ingresos')
    .update({
      estado: 'enviado_deposito',
      enviado_deposito_responsable: responsable.trim() + (notas ? ` — ${notas}` : ''),
      deposito_banco: destino === 'oriental' ? 'La Oriental' : 'Vehimotors',
      enviado_carla_at: fechaHora,
      updated_at: new Date().toISOString(),
    })
    .in('id', ingresoIds)

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, count: ingresoIds.length })
}
