export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const EVENTOS_VALIDOS = [
  'cotizacion_rapida', 'cotizacion_formal_click', 'ac500_whatsapp',
  'ac500_interesado', 'ac500_cotizacion_click',
  'ficha_tecnica_click',
  'concesionario_virtual_click', 'enviar_concesionario_click',
  'ac500_concesionario_virtual_click', 'ac500_enviar_concesionario_click',
]
// De dónde viene el clic: link de vendedores (/ventas), de aliados (/aliados)
// o de redes sociales (/redes) — clave para el "mapa de calor" de /redes.
const ORIGENES_VALIDOS = ['ventas', 'aliados', 'redes']

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { evento, marca, modelo, metadata, origen } = body

    if (!EVENTOS_VALIDOS.includes(evento)) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const supabase = await createAdminClient()
    await supabase.from('eventos_link_ventas').insert([{
      evento,
      marca: marca ?? null,
      modelo: modelo ?? null,
      metadata: metadata ?? null,
      origen: ORIGENES_VALIDOS.includes(origen) ? origen : null,
    }])

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
