export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director']

export async function POST(
  _req: Request,
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

  const admin = await createAdminClient()

  // Leer showroom actual
  const { data: showroom, error: srErr } = await admin
    .from('vehiculos_showroom')
    .select('id, estado, cliente_id, vehiculo_id, marca, modelo, placa')
    .eq('id', showroomId)
    .single()

  if (srErr || !showroom) {
    return NextResponse.json({ error: 'Vehículo showroom no encontrado' }, { status: 404 })
  }

  if (showroom.estado !== 'vendido') {
    return NextResponse.json({ error: 'El vehículo no está marcado como vendido' }, { status: 400 })
  }

  const vehiculoIdVenta = showroom.vehiculo_id

  // 1. Liberar el showroom
  const { error: updErr } = await admin
    .from('vehiculos_showroom')
    .update({
      estado: 'en_agencia',
      cliente_id: null,
      vehiculo_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', showroomId)

  if (updErr) {
    return NextResponse.json({ error: `No se pudo liberar el showroom: ${updErr.message}` }, { status: 500 })
  }

  // 2. Borrar el registro de venta (tabla vehiculos)
  let vehiculoBorrado = false
  if (vehiculoIdVenta) {
    const { error: delErr } = await admin.from('vehiculos').delete().eq('id', vehiculoIdVenta)
    if (delErr) {
      // No revertir el showroom — deja constancia y sigue
      console.error('[showroom/desvincular-venta] delete vehiculo error:', delErr)
      return NextResponse.json(
        { error: `Showroom liberado, pero no se pudo borrar el registro de venta: ${delErr.message}. Verifica cotizaciones, créditos o ingresos vinculados.` },
        { status: 500 }
      )
    }
    vehiculoBorrado = true
  }

  // 3. Log
  await admin.from('showroom_historial').insert({
    showroom_vehiculo_id: showroomId,
    estado_anterior: 'vendido',
    estado_nuevo: 'en_agencia',
    usuario_email: user.email ?? null,
    notas: vehiculoBorrado
      ? 'Venta desvinculada. Registro de venta y datos del cliente eliminados.'
      : 'Venta desvinculada. Cliente removido del showroom.',
  })

  return NextResponse.json({ ok: true, vehiculoBorrado })
}
