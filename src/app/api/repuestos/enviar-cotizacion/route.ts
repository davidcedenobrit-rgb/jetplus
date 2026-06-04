export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarSolicitudCotizacion } from '@/lib/email-repuestos'
import { revalidatePath } from 'next/cache'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { solicitudId } = await req.json()
    if (!solicitudId) return NextResponse.json({ error: 'solicitudId requerido' }, { status: 400 })

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

    await enviarSolicitudCotizacion({
      solicitudId: solicitud.id,
      numero: solicitud.numero,
      token: solicitud.token_respuesta,
      items,
      notasAdicionales: solicitud.notas_almacenista ?? undefined,
    })

    await supabase.from('solicitudes_repuestos').update({
      estado: 'cotizacion_enviada',
      correo_enviado_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', solicitudId)

    revalidatePath('/repuestos')
    revalidatePath(`/repuestos/${solicitudId}`)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
