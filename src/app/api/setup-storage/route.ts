import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const SETUP_TOKEN = 'laoriental2026'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('token') !== SETUP_TOKEN) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Env vars faltantes' }, { status: 500 })
  }

  const supabase = createClient(url, key)

  const { data: existing } = await supabase.storage.getBucket('comprobantes')

  if (existing) {
    return NextResponse.json({ message: 'Bucket "comprobantes" ya existe', bucket: existing })
  }

  const { data, error } = await supabase.storage.createBucket('comprobantes', {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'],
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Bucket creado exitosamente', bucket: data })
}
