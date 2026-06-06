export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarReporteVehimotors } from '@/lib/email-ingresos'
import { createClient as createServerClient } from '@/lib/supabase/server'

const ROL_PERMITIDO = ['jose', 'admin', 'director', 'mary', 'leysdem']

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    // Verificar sesión y rol
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const rol = (user.user_metadata?.rol as string) ?? ''
    if (!ROL_PERMITIDO.includes(rol)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

    const { ingresoId } = await req.json()
    if (!ingresoId) return NextResponse.json({ error: 'ingresoId requerido' }, { status: 400 })

    // Obtener ingreso con datos del cliente y comprobantes
    const { data: ingreso } = await supabaseAdmin
      .from('ingresos')
      .select('*, clientes(nombre, cedula_rif, telefono)')
      .eq('id', ingresoId)
      .single()

    if (!ingreso) return NextResponse.json({ error: 'Ingreso no encontrado' }, { status: 404 })

    // Obtener comprobantes adjuntos
    const { data: archivos } = await supabaseAdmin
      .from('archivos')
      .select('url')
      .eq('ingreso_id', ingresoId)

    const comprobantesUrls = (archivos ?? []).map((a: any) => a.url).filter(Boolean)

    // Generar token único
    const token = crypto.randomUUID().replace(/-/g, '')

    // Actualizar ingreso
    const { error: updateError } = await supabaseAdmin
      .from('ingresos')
      .update({
        estado: 'reportado_vehimotors',
        vehimotors_at: new Date().toISOString(),
        token_vehimotors: token,
      })
      .eq('id', ingresoId)

    if (updateError) throw new Error(updateError.message)

    // Enviar email
    await enviarReporteVehimotors({
      ingresoId,
      token,
      numeroRecibo: ingreso.numero_recibo ?? '—',
      clienteNombre: ingreso.clientes?.nombre ?? ingreso.nombre_cliente ?? '—',
      clienteCedula: ingreso.clientes?.cedula_rif,
      clienteTelefono: ingreso.clientes?.telefono,
      placa: ingreso.placa,
      concepto: ingreso.concepto ?? '—',
      monto: Number(ingreso.monto),
      moneda: ingreso.moneda ?? 'USD',
      metodoPago: ingreso.metodo_pago ?? '—',
      referencia: ingreso.referencia,
      banco: ingreso.banco_receptor ?? ingreso.banco_emisor,
      comprobantesUrls,
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[reportar-vehimotors]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
