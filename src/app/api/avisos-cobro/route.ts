import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { enviarAvisoCobro } from '@/lib/email-cobros'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function POST(req: Request) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    const {
      clienteId, nombre, correo, cuotasVencidas, montoVencido,
      diasMaxVencido, placa, notas, tipoEnvio, registradoPor,
    } = body

    if (!clienteId || !tipoEnvio || !registradoPor) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Registrar en bitácora
    const { error: logError } = await supabase.from('bitacora_cobro').insert({
      cliente_id: clienteId,
      registrado_por: registradoPor,
      tipo_envio: tipoEnvio,
      notas: notas || null,
      monto_vencido: montoVencido ?? 0,
      cuotas_vencidas: cuotasVencidas ?? 0,
    })
    if (logError) console.error('[avisos-cobro] log error:', logError)

    // Enviar email si corresponde
    if ((tipoEnvio === 'email' || tipoEnvio === 'ambos') && correo) {
      await enviarAvisoCobro({ correo, nombre, cuotasVencidas, montoVencido, diasMaxVencido, placa, notas })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const clienteId = searchParams.get('clienteId')
  if (!clienteId) return NextResponse.json({ error: 'clienteId requerido' }, { status: 400 })

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('bitacora_cobro')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: 'Error al consultar' }, { status: 500 })
  return NextResponse.json({ data })
}
