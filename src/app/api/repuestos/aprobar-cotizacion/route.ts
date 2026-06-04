export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarAprobacionCotizacion } from '@/lib/email-repuestos'
import { revalidatePath } from 'next/cache'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { solicitudId, userEmail } = await req.json()
    if (!solicitudId) return NextResponse.json({ error: 'solicitudId requerido' }, { status: 400 })

    const { data: sol } = await supabase
      .from('solicitudes_repuestos')
      .select('*, repuestos_items(*)')
      .eq('id', solicitudId).single()

    if (!sol) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    await supabase.from('solicitudes_repuestos').update({
      estado: 'cotizacion_aprobada',
      cotizacion_aprobada_at: new Date().toISOString(),
      cotizacion_aprobada_por: userEmail,
      updated_at: new Date().toISOString(),
    }).eq('id', solicitudId)

    await supabase.from('repuestos_historial').insert({
      solicitud_id: solicitudId, estado_nuevo: 'cotizacion_aprobada',
      usuario_email: userEmail, notas: 'Cotización aprobada — email enviado a Vehimotors',
    })

    const items = (sol.repuestos_items ?? []).map((i: any) => ({
      descripcion: i.descripcion, referencia: i.referencia, cantidad: i.cantidad,
    }))

    await enviarAprobacionCotizacion({
      numero: sol.numero, solicitudId, tokenFactura: sol.token_factura, items,
    })

    revalidatePath('/repuestos')
    revalidatePath(`/repuestos/${solicitudId}`)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
