export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

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
      .select('id')
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
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[cotizaciones/responder] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
