export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const authClient = await createClient()
  const { data: { user: authUser } } = await authClient.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const resendEmailId = searchParams.get('resend_email_id')
  const entidadTipo = searchParams.get('entidad_tipo')
  const entidadId = searchParams.get('entidad_id')

  if (!resendEmailId && !(entidadTipo && entidadId)) {
    return NextResponse.json({ error: 'Se requiere resend_email_id o (entidad_tipo + entidad_id)' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  let query = supabase
    .from('email_eventos')
    .select('id, resend_email_id, entidad_tipo, entidad_id, evento, destinatarios, asunto, metadata, event_timestamp, created_at')
    .order('event_timestamp', { ascending: true })
    .limit(100)

  if (resendEmailId) query = query.eq('resend_email_id', resendEmailId)
  if (entidadTipo && entidadId) {
    query = query.eq('entidad_tipo', entidadTipo).eq('entidad_id', entidadId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ eventos: data ?? [] })
}
