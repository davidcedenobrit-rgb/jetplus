export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const EVENTOS_VALIDOS = ['cotizacion_rapida', 'cotizacion_formal_click', 'ac500_whatsapp']

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { evento, marca, modelo, metadata } = body

    if (!EVENTOS_VALIDOS.includes(evento)) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const supabase = await createAdminClient()
    await supabase.from('eventos_link_ventas').insert([{
      evento,
      marca: marca ?? null,
      modelo: modelo ?? null,
      metadata: metadata ?? null,
    }])

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
