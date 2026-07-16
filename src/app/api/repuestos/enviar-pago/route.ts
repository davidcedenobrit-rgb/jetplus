export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { enviarConfirmacionPago } from '@/lib/email-repuestos'
import { revalidatePath } from 'next/cache'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Mary es quien carga el pago a Vehimotors (dirección de respaldo)
const ROL_PAGO = ['mary', 'director', 'admin']

export async function POST(req: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const rol = (user.app_metadata?.rol as string) ?? ''
    if (!ROL_PAGO.includes(rol)) return NextResponse.json({ error: 'Solo Mary puede cargar el pago' }, { status: 403 })

    const { solicitudId, comprobanteUrl, numeroCotizacion, monto, correoAdicional } = await req.json()
    if (!solicitudId || !comprobanteUrl) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    const correoExtra = typeof correoAdicional === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correoAdicional.trim())
      ? correoAdicional.trim()
      : null
    const montoNum = Number(monto)
    if (!(montoNum > 0)) return NextResponse.json({ error: 'Monto pagado inválido' }, { status: 400 })
    // La factura de Vehimotors es en USD; se fija USD para no perder el monto en reportes.
    const monedaPago = 'USD'

    const { data: sol } = await supabase
      .from('solicitudes_repuestos')
      .select('*, repuestos_items(*), numero_cotizacion_vehimotors')
      .eq('id', solicitudId).single()

    if (!sol) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const items = (sol.repuestos_items ?? []).map((i: any) => ({
      descripcion: i.descripcion, referencia: i.referencia, cantidad: i.cantidad,
    }))

    const cotiz = sol.numero_cotizacion_vehimotors ?? numeroCotizacion ?? null

    await enviarConfirmacionPago({
      numero: sol.numero, solicitudId, tokenPago: sol.token_pago,
      comprobanteUrl, items, retencionUrl: sol.retencion_url ?? null,
      numeroCotizacion: cotiz, correoAdicional: correoExtra,
    })

    // Auto-egreso: registrar el pago a Vehimotors como egreso (no duplica si ya existe)
    let egresoId: string | null = sol.egreso_pago_id ?? null
    if (!egresoId) {
      const year = new Date().getFullYear()
      const buf = new Uint32Array(1)
      crypto.getRandomValues(buf)
      const seq = String(buf[0] % 1_000_000).padStart(6, '0')
      const numero_egreso = `LOA-EGR-${year}-${seq}`

      const { data: egreso } = await supabase.from('egresos').insert({
        numero_egreso,
        categoria:        'repuestos',
        concepto:         `Pago repuestos Vehimotors — ${sol.numero}`,
        descripcion:      cotiz ? `Cotización Vehimotors ${cotiz}` : null,
        monto:            montoNum,
        moneda:           monedaPago,
        beneficiario:     'Vehimotors',
        numero_sa:        cotiz,
        centro_costo_id:  'repuestos',
        area_responsable: 'Repuestos',
        tipo_movimiento:  'gasto',
        fecha_egreso:     new Date().toISOString().split('T')[0],
        estado:           'pendiente_aprobacion',
        registrado_por:   user.id,
      }).select('id').single()
      egresoId = egreso?.id ?? null
    }

    await supabase.from('solicitudes_repuestos').update({
      estado: 'pago_enviado', updated_at: new Date().toISOString(),
      monto_pago: montoNum, moneda_pago: monedaPago,
      ...(egresoId ? { egreso_pago_id: egresoId } : {}),
    }).eq('id', solicitudId)

    revalidatePath('/repuestos')
    revalidatePath(`/repuestos/${solicitudId}`)
    revalidatePath('/egresos')
    return NextResponse.json({ ok: true, egresoId })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
