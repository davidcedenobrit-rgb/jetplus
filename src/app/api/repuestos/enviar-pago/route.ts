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

    // La notificación de pago SOLO envía el correo/comprobante. NO crea egreso:
    // el egreso real es la compra a Avanza Motors que se registra manualmente con
    // su retención de IVA (fuente de verdad para el SENIAT). Crear aquí un segundo
    // egreso duplicaba el gasto (misma N° SA: compra en Bs con retención + este
    // pago en USD). Ver caso Rojas 2026-08.
    await supabase.from('solicitudes_repuestos').update({
      estado: 'pago_enviado', updated_at: new Date().toISOString(),
      monto_pago: montoNum, moneda_pago: monedaPago,
    }).eq('id', solicitudId)

    revalidatePath('/repuestos')
    revalidatePath(`/repuestos/${solicitudId}`)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
