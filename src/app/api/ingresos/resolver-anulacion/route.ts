export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const ROLES_DIRECTOR = ['jose', 'admin', 'director']

function getAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const rol = (user.app_metadata?.rol as string) ?? 'editor'
  if (!ROLES_DIRECTOR.includes(rol)) {
    return NextResponse.json({ error: 'Solo el director puede resolver anulaciones' }, { status: 403 })
  }

  const { ingresoId, decision, motivoRechazo } = await req.json()
  // decision: 'aprobar' | 'rechazar'
  if (!ingresoId || !['aprobar', 'rechazar'].includes(decision)) {
    return NextResponse.json({ error: 'ingresoId y decision (aprobar|rechazar) son requeridos' }, { status: 400 })
  }

  const admin = getAdmin()

  const { data: ingreso } = await admin
    .from('ingresos')
    .select('*')
    .eq('id', ingresoId)
    .single()

  if (!ingreso) return NextResponse.json({ error: 'Ingreso no encontrado' }, { status: 404 })
  if (ingreso.estado !== 'pendiente_anulacion') {
    return NextResponse.json({ error: 'El ingreso no está en estado pendiente_anulacion' }, { status: 400 })
  }

  const resolverPor = user.user_metadata?.nombre ?? user.email ?? rol

  if (decision === 'aprobar') {
    // 1. Revertir cuota_ingresos: eliminar los registros y recalcular saldo del crédito
    const { data: cuotaIngresos } = await admin
      .from('cuota_ingresos')
      .select('cuota_id, monto_aplicado')
      .eq('ingreso_id', ingresoId)

    if (cuotaIngresos && cuotaIngresos.length > 0) {
      // Eliminar los cuota_ingresos asociados
      await admin.from('cuota_ingresos').delete().eq('ingreso_id', ingresoId)

      // Para cada cuota afectada, recalcular su estado
      for (const ci of cuotaIngresos) {
        const { data: cuota } = await admin
          .from('cuotas')
          .select('monto, credito_id')
          .eq('id', ci.cuota_id)
          .single()

        if (!cuota) continue

        // Sumar todos los pagos restantes para esta cuota
        const { data: otrosPagos } = await admin
          .from('cuota_ingresos')
          .select('monto_aplicado')
          .eq('cuota_id', ci.cuota_id)

        const totalPagado = (otrosPagos ?? []).reduce((s: number, p: any) => s + Number(p.monto_aplicado), 0)
        const hoy = new Date().toISOString().split('T')[0]
        const nuevaFechaVenc = await admin.from('cuotas').select('fecha_vencimiento').eq('id', ci.cuota_id).single()
        const vencida = nuevaFechaVenc.data && nuevaFechaVenc.data.fecha_vencimiento < hoy

        const nuevoEstado = totalPagado <= 0
          ? (vencida ? 'vencida' : 'pendiente')
          : totalPagado >= Number(cuota.monto) ? 'pagada' : 'parcial'

        await admin.from('cuotas').update({ estado: nuevoEstado }).eq('id', ci.cuota_id)

        // Recalcular saldo del crédito
        const { data: todasCuotas } = await admin
          .from('cuotas')
          .select('id, monto')
          .eq('credito_id', cuota.credito_id)
          .neq('estado', 'pagada')

        if (todasCuotas) {
          const saldoPendiente = todasCuotas.reduce((s: number, c: any) => s + Number(c.monto), 0)
          await admin.from('creditos').update({ saldo: saldoPendiente }).eq('id', cuota.credito_id)
        }
      }
    }

    // 2. Marcar ingreso como anulado
    await admin.from('ingresos').update({
      estado: 'anulado',
      anulacion_resuelta_por: resolverPor,
      anulacion_resuelta_at: new Date().toISOString(),
    }).eq('id', ingresoId)

  } else {
    // Rechazar: restaurar estado previo
    const estadoPrevio = ingreso.anulacion_estado_previo ?? 'aprobado'
    await admin.from('ingresos').update({
      estado: estadoPrevio,
      anulacion_resuelta_por: resolverPor,
      anulacion_resuelta_at: new Date().toISOString(),
      anulacion_rechazada_motivo: motivoRechazo?.trim() ?? null,
    }).eq('id', ingresoId)
  }

  return NextResponse.json({ ok: true, decision })
}
