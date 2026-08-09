export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolverPrecompraProformaDB } from '@/lib/cotizacion-federada'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']
const BUCKET = 'comprobantes'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const dataUrl = String(b.dataUrl ?? '')
  const m = dataUrl.match(/^data:image\/(png|jpeg);base64,(.+)$/)
  if (!m) return NextResponse.json({ error: 'Firma inválida' }, { status: 400 })
  const bytes = Buffer.from(m[2], 'base64')
  if (bytes.length > 2 * 1024 * 1024) return NextResponse.json({ error: 'Firma muy grande' }, { status: 400 })

  const resuelta = await resolverPrecompraProformaDB(id)
  if (!resuelta) return NextResponse.json({ error: 'Proforma no encontrada' }, { status: 404 })
  const supabase = resuelta.db

  const path = `precompra/${id}/firma-${crypto.randomUUID()}.png`
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: 'image/png', upsert: true })
  if (upErr) return NextResponse.json({ error: 'No se pudo guardar la firma' }, { status: 500 })
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)

  await supabase.from('precompra_proformas').update({
    firma_cliente: pub.publicUrl, firma_cliente_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq('id', id)

  return NextResponse.json({ ok: true, url: pub.publicUrl })
}
