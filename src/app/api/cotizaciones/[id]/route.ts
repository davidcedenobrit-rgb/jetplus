export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    // Editar montos de la cotización (precio, gastos, cuota, modalidad/plan)
    if (body.accion === 'editar_montos') {
      const { precio_base, gastos_monto, cuota_mensual, modalidad, plan } = body

      if (typeof precio_base !== 'number' || precio_base <= 0)
        return NextResponse.json({ error: 'Precio base inválido' }, { status: 400 })
      if (typeof gastos_monto !== 'number' || gastos_monto < 0)
        return NextResponse.json({ error: 'Gastos inválidos' }, { status: 400 })
      if (!['contado', 'credito_24'].includes(modalidad))
        return NextResponse.json({ error: 'Modalidad inválida' }, { status: 400 })
      if (!['vehimotors', 'banco_100'].includes(plan))
        return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })

      const iva_monto = precio_base * 0.16
      let total_inicial: number
      let financiamiento_monto: number | null = null
      let cuota_mensual_final: number | null = null
      let costo_total: number

      if (modalidad === 'contado') {
        total_inicial = precio_base + iva_monto + gastos_monto
        costo_total = total_inicial
      } else if (plan === 'banco_100') {
        const totalVeh = precio_base + iva_monto
        total_inicial = totalVeh * 0.30 + gastos_monto
        financiamiento_monto = totalVeh * 0.70
        cuota_mensual_final = typeof cuota_mensual === 'number' ? cuota_mensual : null
        costo_total = total_inicial + (cuota_mensual_final ?? 0) * 24
      } else {
        total_inicial = precio_base * 0.4 + iva_monto + gastos_monto
        financiamiento_monto = precio_base * 0.6
        cuota_mensual_final = typeof cuota_mensual === 'number' ? cuota_mensual : null
        costo_total = total_inicial + (cuota_mensual_final ?? 0) * 24
      }

      const supabase = await createAdminClient()
      const { error } = await supabase
        .from('cotizaciones')
        .update({
          precio_base, iva_monto, gastos_monto, modalidad, plan,
          total_inicial, financiamiento_monto,
          cuota_mensual: cuota_mensual_final, costo_total,
        })
        .eq('id', id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      return NextResponse.json({
        ok: true,
        data: { precio_base, iva_monto, gastos_monto, modalidad, plan, total_inicial, financiamiento_monto, cuota_mensual: cuota_mensual_final, costo_total }
      })
    }

    // Cambiar estado
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
