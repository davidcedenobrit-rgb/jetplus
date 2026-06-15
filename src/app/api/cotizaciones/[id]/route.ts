export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { estado, motivo_rechazo } = body

    if (!['aceptada', 'rechazada', 'sin_respuesta', 'pospuesta'].includes(estado)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }
    if (estado === 'rechazada' && !motivo_rechazo?.trim()) {
      return NextResponse.json({ error: 'Se requiere motivo de rechazo' }, { status: 400 })
    }

    const supabase = await createAdminClient()
    const { error } = await supabase
      .from('cotizaciones')
      .update({
        estado,
        motivo_rechazo: estado === 'rechazada' ? motivo_rechazo.trim() : null,
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[cotizaciones/patch] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('cotizaciones')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(data)
}
