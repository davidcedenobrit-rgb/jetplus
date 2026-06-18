export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createAdminClient()
  const [{ data: promo }, { data: vehiculos }] = await Promise.all([
    supabase.from('promociones_especiales').select('*').limit(1).single(),
    supabase.from('promocion_vehiculos').select('*').order('orden').order('created_at'),
  ])
  return NextResponse.json({ promo, vehiculos: vehiculos ?? [] })
}

export async function POST(req: Request) {
  const supabase = await createAdminClient()
  const body = await req.json()
  const { activa, titulo, subtitulo } = body

  // Upsert the single promo record
  const { data: existing } = await supabase.from('promociones_especiales').select('id').limit(1).single()

  if (existing) {
    const { error } = await supabase.from('promociones_especiales').update({
      ...(activa !== undefined && { activa }),
      ...(titulo !== undefined && { titulo }),
      ...(subtitulo !== undefined && { subtitulo }),
      updated_at: new Date().toISOString(),
    }).eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase.from('promociones_especiales').insert({ activa: activa ?? false, titulo: titulo ?? 'Promociones Especiales', subtitulo })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
