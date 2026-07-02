export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { enviarNotificacionRespuestaCliente } from '@/lib/email-cotizaciones'

const ESTADOS_VALIDOS = ['aceptada', 'rechazada', 'pospuesta']

export async function POST(req: Request) {
  try {
    const { token, estado, motivo } = await req.json()

    if (!token || !estado || !ESTADOS_VALIDOS.includes(estado)) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    if (estado === 'rechazada' && !motivo?.trim()) {
      return NextResponse.json({ error: 'Indica el motivo' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { data: cot } = await supabase
      .from('cotizaciones')
      .select('id, numero, cliente_nombre, cliente_correo, cliente_telefono, vendedora_nombre, marca, modelo, total_inicial, cuota_mensual, estado')
      .eq('token_respuesta', token)
      .single()

    if (!cot) return NextResponse.json({ error: 'Enlace no válido' }, { status: 404 })

    const { error } = await supabase
      .from('cotizaciones')
      .update({
        estado,
        motivo_rechazo: estado === 'rechazada' ? motivo.trim() : null,
      })
      .eq('id', cot.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Notificación al staff (no bloqueante). Se envía solo si el estado cambio.
    if (cot.estado !== estado) {
      try {
        await enviarNotificacionRespuestaCliente({
          numero: cot.numero,
          cotizacionId: cot.id,
          estado: estado as 'aceptada' | 'rechazada' | 'pospuesta',
          motivo: estado === 'rechazada' ? motivo.trim() : null,
          clienteNombre: cot.cliente_nombre,
          clienteCorreo: cot.cliente_correo,
          clienteTelefono: cot.cliente_telefono,
          vendedoraNombre: cot.vendedora_nombre,
          marca: cot.marca,
          modelo: cot.modelo,
          totalInicial: Number(cot.total_inicial),
          cuotaMensual: cot.cuota_mensual != null ? Number(cot.cuota_mensual) : null,
        })
      } catch (emailErr) {
        console.error('[cotizaciones/responder] notificacion staff error:', emailErr)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[cotizaciones/responder] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
