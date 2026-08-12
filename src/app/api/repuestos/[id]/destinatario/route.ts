export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES_PERMITIDOS = ['jose', 'admin', 'director', 'mary', 'leysdem', 'arianna']

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: usuarioData } = await auth.from('usuarios').select('rol').eq('id', user.id).single()
  const rol = usuarioData?.rol
  if (!rol || !ROLES_PERMITIDOS.includes(rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { destino, clienteId, clienteExterno } = body

  if (!['cliente', 'oriental', 'externo'].includes(destino)) {
    return NextResponse.json({ error: 'Destino inválido' }, { status: 400 })
  }
  if (destino === 'cliente' && !clienteId) {
    return NextResponse.json({ error: 'clienteId requerido' }, { status: 400 })
  }
  if (destino === 'externo' && !clienteExterno?.trim()) {
    return NextResponse.json({ error: 'Nombre del cliente requerido' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  const update: Record<string, unknown> = {
    cliente_id: destino === 'cliente' ? clienteId : null,
    para_la_oriental: destino === 'oriental',
    cliente_externo: destino === 'externo' ? clienteExterno.trim() : null,
  }

  // Leer estado actual para reusarlo en la bitácora (estado_nuevo es NOT NULL)
  const { data: solicitudActual } = await supabase
    .from('solicitudes_repuestos')
    .select('estado')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('solicitudes_repuestos')
    .update(update)
    .eq('id', id)

  if (error) {
    console.error('[repuestos/destinatario] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Bitácora (no cambia el estado)
  if (solicitudActual?.estado) {
    const notaDestino =
      destino === 'oriental' ? 'Destinatario actualizado: Jetplus' :
      destino === 'externo' ? `Destinatario actualizado a cliente externo: ${clienteExterno.trim()}` :
      `Destinatario actualizado a cliente ${clienteId}`
    await supabase.from('repuestos_historial').insert({
      solicitud_id: id,
      estado_nuevo: solicitudActual.estado,
      usuario_email: user.email ?? null,
      notas: notaDestino,
    })
  }

  return NextResponse.json({ ok: true })
}
