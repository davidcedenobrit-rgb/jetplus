export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director']

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: usuario } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  const rol = usuario?.rol ?? ''
  if (!ROLES.includes(rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id: showroomId } = await params
  const body = await req.json().catch(() => ({}))
  const { tipo, destinatario, notas } = body ?? {}

  const admin = await createAdminClient()

  const { data: sr } = await admin
    .from('vehiculos_showroom')
    .select('id, estado, marca, modelo, version, anio, color, placa, vin, serial_motor, proforma_vehimotors')
    .eq('id', showroomId)
    .single()
  if (!sr) return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 })
  if (sr.estado === 'vendido') return NextResponse.json({ error: 'El vehículo ya está vendido' }, { status: 400 })

  const update: Record<string, any> = {
    estado: 'vendido',
    updated_at: new Date().toISOString(),
  }
  let notaHist = ''

  if (tipo === 'transferido') {
    const nombre = String(destinatario ?? '').trim()
    if (!nombre) return NextResponse.json({ error: 'Escribe a quién se transfirió' }, { status: 400 })
    update.transferido_a = nombre
    update.transferido_at = new Date().toISOString()
    notaHist = `Salida por transferencia a: ${nombre}${notas ? ' — ' + notas : ''}`
  } else {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  }

  const { error: upErr } = await admin
    .from('vehiculos_showroom')
    .update(update)
    .eq('id', showroomId)
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  await admin.from('showroom_historial').insert({
    showroom_vehiculo_id: showroomId,
    estado_anterior: sr.estado,
    estado_nuevo: 'vendido',
    usuario_email: user.email ?? null,
    notas: notaHist,
  })

  return NextResponse.json({ ok: true })
}
