export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarComprobantePago } from '@/lib/email-repuestos'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { solicitudId, comprobanteUrl } = await req.json()
    if (!solicitudId || !comprobanteUrl) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

    const { data: solicitud } = await supabase
      .from('solicitudes_repuestos')
      .select('*, repuestos_items(*)')
      .eq('id', solicitudId)
      .single()

    if (!solicitud) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })

    const items = (solicitud.repuestos_items ?? []).map((i: any) => ({
      descripcion: i.descripcion,
      referencia: i.referencia,
      cantidad: i.cantidad,
    }))

    await enviarComprobantePago({
      numero: solicitud.numero,
      comprobanteUrl,
      items,
    })

    await supabase.from('solicitudes_repuestos').update({
      estado: 'pago_enviado',
      updated_at: new Date().toISOString(),
    }).eq('id', solicitudId)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
