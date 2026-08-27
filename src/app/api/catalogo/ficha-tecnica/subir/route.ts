export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MIME_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp'])

// Sube UNA página de ficha técnica al bucket público `fichas-tecnicas`.
// Exige sesión de staff — cargar fichas es una acción administrativa, no
// pública, aunque el PDF final que las muestra sí lo sea.
export async function POST(req: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (rol === 'cliente') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const formData = await req.formData()
    const vehiculoId = formData.get('vehiculoId') as string | null
    const file = formData.get('file') as File | null

    if (!vehiculoId || !file || file.size === 0) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'La imagen supera el límite de 10 MB' }, { status: 400 })
    }
    if (!MIME_PERMITIDOS.has(file.type)) {
      return NextResponse.json({ error: 'Solo se permiten imágenes JPG, PNG o WEBP' }, { status: 400 })
    }

    const admin = await createAdminClient()
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `${vehiculoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: upErr } = await admin.storage
      .from('fichas-tecnicas')
      .upload(path, buffer, { contentType: file.type, upsert: false })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    const { data: urlData } = admin.storage.from('fichas-tecnicas').getPublicUrl(path)
    return NextResponse.json({ ok: true, url: urlData.publicUrl })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
