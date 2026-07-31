export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

// Libera la unidad del showroom reservada por una proforma (vuelve a 'en_agencia').
// No hace nada si la unidad ya fue vendida.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const supabase = await createAdminClient()
  const { data: pf } = await supabase.from('proformas').select('id, showroom_id').eq('id', id).maybeSingle()
  if (!pf) return NextResponse.json({ error: 'Proforma no encontrada' }, { status: 404 })
  if (!pf.showroom_id) return NextResponse.json({ error: 'Esta proforma no tiene unidad reservada' }, { status: 400 })

  const { data: u } = await supabase.from('vehiculos_showroom').select('id, estado').eq('id', pf.showroom_id).maybeSingle()
  if (u && u.estado === 'vendido') {
    return NextResponse.json({ error: 'La unidad ya fue vendida, no se puede liberar' }, { status: 409 })
  }

  if (u) {
    await supabase.from('vehiculos_showroom').update({
      estado: 'en_agencia',
      reservado_por: null,
      cliente_id: null,
      reserva_notas: null,
      reserva_vence: null,
      updated_at: new Date().toISOString(),
    }).eq('id', pf.showroom_id).eq('estado', 'reservado')
  }

  await supabase.from('proformas').update({ showroom_id: null }).eq('id', id)
  return NextResponse.json({ ok: true })
}
