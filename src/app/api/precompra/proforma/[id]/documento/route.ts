export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']
const BUCKET = 'comprobantes'
const MAX = 10 * 1024 * 1024 // 10 MB

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file') as File | null
  const tipo = String(form?.get('tipo') ?? 'documento').trim() || 'documento'
  if (!file) return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 })
  if (file.size > MAX) return NextResponse.json({ error: 'El archivo supera 10 MB' }, { status: 400 })

  const supabase = await createAdminClient()
  const { data: pf } = await supabase.from('precompra_proformas').select('id, cliente_id, documentos').eq('id', id).maybeSingle()
  if (!pf) return NextResponse.json({ error: 'Proforma no encontrada' }, { status: 404 })

  const safeName = (file.name || 'archivo').replace(/[^\w.\-]+/g, '_').slice(-60)
  const path = `precompra/${id}/${crypto.randomUUID()}-${safeName}`
  const bytes = Buffer.from(await file.arrayBuffer())
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type || 'application/octet-stream', upsert: false,
  })
  if (upErr) {
    console.error('[precompra/documento] upload:', upErr)
    return NextResponse.json({ error: 'No se pudo subir el archivo' }, { status: 500 })
  }
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const doc = { tipo, path, url: pub.publicUrl, nombre: file.name || safeName, subido_at: new Date().toISOString() }

  const docs = Array.isArray(pf.documentos) ? pf.documentos : []
  docs.push(doc)
  await supabase.from('precompra_proformas').update({ documentos: docs, updated_at: new Date().toISOString() }).eq('id', id)

  // Espejo en el perfil del cliente (si está vinculado).
  if (pf.cliente_id) {
    const { data: cli } = await supabase.from('clientes').select('documentos').eq('id', pf.cliente_id).maybeSingle()
    const cdocs = Array.isArray(cli?.documentos) ? cli!.documentos : []
    cdocs.push({ ...doc, origen: 'precompra_ac500', proforma_id: id })
    await supabase.from('clientes').update({ documentos: cdocs }).eq('id', pf.cliente_id)
  }

  return NextResponse.json({ ok: true, documento: doc })
}
