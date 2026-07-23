export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director']

/* eslint-disable @typescript-eslint/no-explicit-any */
// Asigna un carro del showroom a un cliente con crédito AC500 (u otro):
// copia los datos reales del carro (placa, VIN, motor, color, año) al vehículo
// del cliente y marca el showroom como vendido, vinculándolo a esa venta.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { data: usuario } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  const rol = usuario?.rol ?? (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id: showroomId } = await params
  const body = await req.json().catch(() => ({}))
  const vehiculoId = body?.vehiculoId
  if (!vehiculoId) return NextResponse.json({ error: 'Falta el vehículo del cliente' }, { status: 400 })

  const admin = await createAdminClient()

  const { data: sr } = await admin
    .from('vehiculos_showroom')
    .select('id, estado, marca, modelo, version, anio, color, placa, vin, serial_motor')
    .eq('id', showroomId)
    .single()
  if (!sr) return NextResponse.json({ error: 'Vehículo del showroom no encontrado' }, { status: 404 })
  if (sr.estado === 'vendido') return NextResponse.json({ error: 'Este vehículo del showroom ya está vendido/asignado' }, { status: 400 })

  const { data: veh } = await admin
    .from('vehiculos')
    .select('id, cliente_id, placa')
    .eq('id', vehiculoId)
    .single()
  if (!veh) return NextResponse.json({ error: 'Vehículo del cliente no encontrado' }, { status: 404 })
  if (veh.placa) return NextResponse.json({ error: 'Ese vehículo del cliente ya tiene placa/carro asignado' }, { status: 400 })

  // Copiar los datos reales del carro físico al vehículo del cliente.
  const updVeh: Record<string, any> = { updated_at: new Date().toISOString() }
  if (sr.placa) updVeh.placa = sr.placa
  if (sr.vin) updVeh.vin = sr.vin
  if (sr.serial_motor) updVeh.serial_motor = sr.serial_motor
  if (sr.color) updVeh.color = sr.color
  if (sr.anio) updVeh.anio = sr.anio
  if (sr.version) updVeh.version = sr.version
  const { error: upVehErr } = await admin.from('vehiculos').update(updVeh).eq('id', vehiculoId)
  if (upVehErr) return NextResponse.json({ error: `No se pudo actualizar el vehículo del cliente: ${upVehErr.message}` }, { status: 500 })

  // Marcar el showroom como vendido y vincularlo a la venta.
  const { error: upSrErr } = await admin.from('vehiculos_showroom').update({
    estado: 'vendido',
    vehiculo_id: vehiculoId,
    cliente_id: veh.cliente_id ?? null,
    updated_at: new Date().toISOString(),
  }).eq('id', showroomId)
  if (upSrErr) return NextResponse.json({ error: `No se pudo marcar el showroom como vendido: ${upSrErr.message}` }, { status: 500 })

  await admin.from('showroom_historial').insert({
    showroom_vehiculo_id: showroomId,
    estado_anterior: sr.estado,
    estado_nuevo: 'vendido',
    usuario_email: user.email ?? null,
    notas: `Asignado a cliente (crédito AC500). Placa ${sr.placa ?? '—'} vinculada al vehículo de la venta.`,
  })

  return NextResponse.json({ ok: true, placa: sr.placa ?? null })
}
