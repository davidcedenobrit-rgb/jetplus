export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { enviarNotificacionDescuento } from '@/lib/email-cotizaciones'

export async function POST(req: NextRequest) {
  try {
    const { token, motivo } = await req.json()
    if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

    const supabase = await createAdminClient()
    const { data: cot } = await supabase
      .from('cotizaciones')
      .select('id, numero, marca, modelo, cliente_nombre, cliente_correo, total_inicial, cuota_mensual, modalidad, descuento_solicitado')
      .eq('token_respuesta', token)
      .single()

    if (!cot) return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })

    const { error } = await supabase
      .from('cotizaciones')
      .update({
        descuento_solicitado: true,
        motivo_descuento: motivo?.trim() || null,
      })
      .eq('id', cot.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await enviarNotificacionDescuento({
      numero: cot.numero,
      clienteNombre: cot.cliente_nombre,
      clienteCorreo: cot.cliente_correo,
      marca: cot.marca,
      modelo: cot.modelo,
      totalInicial: Number(cot.total_inicial),
      cuotaMensual: cot.cuota_mensual ? Number(cot.cuota_mensual) : null,
      motivo: motivo?.trim() || null,
      cotizacionId: cot.id,
    }).catch(e => console.error('[solicitar-descuento] email error:', e))

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
