export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarEmailAlmacen } from '@/lib/email-repuestos'
import { randomUUID } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { solicitudId, correosAlmacen, numeroCotizacion, userEmail } = await req.json()

    if (!solicitudId || !correosAlmacen?.length || !numeroCotizacion) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }

    const { data: sol } = await supabase
      .from('solicitudes_repuestos')
      .select('id, numero')
      .eq('id', solicitudId).single()

    if (!sol) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const tokenAlmacen = randomUUID()
    const correosStr   = correosAlmacen.join(',')

    await supabase.from('solicitudes_repuestos').update({
      estado: 'enviado_almacen',
      correos_almacen: correosStr,
      numero_cotizacion_vehimotors: numeroCotizacion,
      token_almacen: tokenAlmacen,
      updated_at: new Date().toISOString(),
    }).eq('id', solicitudId)

    await supabase.from('repuestos_historial').insert({
      solicitud_id: solicitudId,
      estado_nuevo: 'enviado_almacen',
      usuario_email: userEmail,
      notas: `Enviado a almacén: ${correosStr} | Cotización: ${numeroCotizacion}`,
    })

    await enviarEmailAlmacen({
      numero: sol.numero,
      solicitudId,
      tokenAlmacen,
      numeroCotizacion,
      correosAlmacen,
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
