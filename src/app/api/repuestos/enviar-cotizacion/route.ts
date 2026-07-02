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
    const { solicitudId, reenviar, userEmail } = await req.json()
    if (!solicitudId) return NextResponse.json({ error: 'solicitudId requerido' }, { status: 400 })

    const { data: solicitud } = await supabase
      .from('solicitudes_repuestos')
      .select('*, repuestos_items(*)')
      .eq('id', solicitudId)
      .single()

    if (!solicitud) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })

    // Guard: solo permitir enviar/reenviar si el estado es 'verificado' o 'cotizacion_enviada'.
    // Si Vehimotors ya respondio (cotizacion_recibida en adelante) rechazar para no
    // sobrescribir el flujo del director con un reenvio stale.
    const ESTADOS_PERMITIDOS = ['verificado', 'cotizacion_enviada']
    if (!ESTADOS_PERMITIDOS.includes(solicitud.estado)) {
      return NextResponse.json({
        error: `La solicitud ya está en estado "${solicitud.estado}" — no se puede volver a enviar. Recarga la página para ver el estado actualizado.`,
        estadoActual: solicitud.estado,
      }, { status: 409 })
    }

    const items = (solicitud.repuestos_items ?? []).map((i: any) => ({
      descripcion: i.descripcion,
      referencia: i.referencia,
      cantidad: i.cantidad,
    }))

    try {
      await enviarSolicitudCotizacion({
        solicitudId: solicitud.id,
        numero: solicitud.numero,
        token: solicitud.token_respuesta,
        items,
        notasAdicionales: solicitud.notas_almacenista ?? undefined,
      })
    } catch (emailErr: any) {
      console.error('[repuestos/enviar-cotizacion] error envio:', emailErr)
      return NextResponse.json({
        error: `No se pudo enviar el correo a Vehimotors: ${emailErr?.message ?? 'error desconocido'}`
      }, { status: 502 })
    }

    // UPDATE condicional: si Vehimotors respondió justo despues de la validacion y
    // antes de este write, no sobrescribimos su respuesta.
    await supabase.from('solicitudes_repuestos').update({
      estado: 'cotizacion_enviada',
      correo_enviado_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', solicitudId).in('estado', ESTADOS_PERMITIDOS)

    await supabase.from('repuestos_historial').insert({
      solicitud_id: solicitudId,
      estado_nuevo: 'cotizacion_enviada',
      usuario_email: userEmail ?? null,
      notas: reenviar ? 'Email reenviado a Vehimotors' : 'Email enviado a Vehimotors',
    })

    revalidatePath('/repuestos')
    revalidatePath(`/repuestos/${solicitudId}`)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
