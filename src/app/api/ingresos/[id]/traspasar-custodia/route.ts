export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director', 'carla', 'mary', 'leysdem']

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

  const { id: ingresoId } = await params
  const body = await req.json().catch(() => ({}))
  const { nuevoCustodioId, notas } = body ?? {}

  if (!nuevoCustodioId) {
    return NextResponse.json({ error: 'Escoge el nuevo custodio' }, { status: 400 })
  }

  const admin = await createAdminClient()

  const { data: ingreso } = await admin
    .from('ingresos')
    .select('id, custodio_id, canal_destino, monto')
    .eq('id', ingresoId)
    .single()

  if (!ingreso) return NextResponse.json({ error: 'Ingreso no encontrado' }, { status: 404 })
  if (!ingreso.custodio_id) {
    return NextResponse.json({ error: 'Este ingreso no tiene custodio asignado' }, { status: 400 })
  }
  if (ingreso.custodio_id === nuevoCustodioId) {
    return NextResponse.json({ error: 'El custodio nuevo es el mismo que el actual' }, { status: 400 })
  }

  // Validar que el custodio nuevo existe y es rol valido
  const { data: nuevoCust } = await admin
    .from('usuarios')
    .select('id, rol')
    .eq('id', nuevoCustodioId)
    .single()
  if (!nuevoCust || !['jose', 'carla', 'mary', 'leysdem'].includes(nuevoCust.rol)) {
    return NextResponse.json({ error: 'Custodio inválido' }, { status: 400 })
  }

  const ahora = new Date().toISOString()

  // Actualizar ingreso
  const { error: upErr } = await admin
    .from('ingresos')
    .update({
      custodio_id: nuevoCustodioId,
      custodio_desde: ahora,
      updated_at: ahora,
    })
    .eq('id', ingresoId)

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  // Bitacora
  await admin.from('custodia_traspasos').insert({
    ingreso_id: ingresoId,
    custodio_anterior: ingreso.custodio_id,
    custodio_nuevo: nuevoCustodioId,
    entregado_por: user.id,
    notas: notas ?? null,
  })

  return NextResponse.json({ ok: true })
}
