import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { enviarAvisoCobro } from '@/lib/email-cobros'

export async function POST(req: Request) {
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
    console.error('[avisos-cobro] error:', e)
    return NextResponse.json({ error: e.message ?? 'Error interno' }, { status: 500 })
  }
}

export async function GET(req: Request) {
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
