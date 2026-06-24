export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const ROLES_PERMITIDOS = ['mary', 'leysdem', 'jose', 'admin', 'director']
const CORREO_ROJAS = 'jose@laoriental.co'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const rol = (user.app_metadata?.rol as string) ?? 'editor'
  if (!ROLES_PERMITIDOS.includes(rol)) {
    return NextResponse.json({ error: 'Sin permisos para solicitar anulación' }, { status: 403 })
  }

  const { ingresoId, motivo, observaciones } = await req.json()
  if (!ingresoId || !motivo?.trim()) {
    return NextResponse.json({ error: 'ingresoId y motivo son requeridos' }, { status: 400 })
  }

  // Fetch ingreso con datos del cliente
  const { data: ingreso } = await supabase
    .from('ingresos')
    .select('*, clientes(nombre)')
    .eq('id', ingresoId)
    .single()

  if (!ingreso) return NextResponse.json({ error: 'Ingreso no encontrado' }, { status: 404 })

  if (ingreso.estado === 'anulado') {
    return NextResponse.json({ error: 'El ingreso ya está anulado' }, { status: 400 })
  }
  if (ingreso.estado === 'pendiente_anulacion') {
    return NextResponse.json({ error: 'Ya existe una solicitud de anulación pendiente' }, { status: 400 })
  }

  // Marcar como pendiente_anulacion
  const { error: updateError } = await supabase
    .from('ingresos')
    .update({
      estado: 'pendiente_anulacion',
      anulacion_solicitada_por: user.user_metadata?.nombre ?? user.email ?? rol,
      anulacion_solicitada_at: new Date().toISOString(),
      anulacion_motivo: motivo.trim(),
      anulacion_observaciones: observaciones?.trim() ?? null,
      anulacion_estado_previo: ingreso.estado,
    })
    .eq('id', ingresoId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Notificar a Rojas por correo
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrodemando.laoriental.co'
    const cliente = (ingreso as any).clientes
    const solicitante = user.user_metadata?.nombre ?? user.email ?? rol

    await resend.emails.send({
      from: 'Centro de Mando <administracion@laoriental.co>',
      to: [CORREO_ROJAS],
      subject: `⚠️ Solicitud de anulación — ${ingreso.numero_recibo}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <h2 style="color:#1a1a1a">Solicitud de anulación de ingreso</h2>
          <p><strong>${solicitante}</strong> ha solicitado la anulación del siguiente ingreso:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:6px 0;color:#666">N° Recibo</td><td style="font-weight:bold">${ingreso.numero_recibo}</td></tr>
            <tr><td style="padding:6px 0;color:#666">Cliente</td><td>${cliente?.nombre ?? '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#666">Concepto</td><td>${ingreso.concepto}</td></tr>
            <tr><td style="padding:6px 0;color:#666">Monto</td><td>${ingreso.moneda} ${Number(ingreso.monto).toFixed(2)}</td></tr>
            <tr><td style="padding:6px 0;color:#666">Motivo</td><td style="color:#c0392b">${motivo}</td></tr>
            ${observaciones ? `<tr><td style="padding:6px 0;color:#666">Observaciones</td><td>${observaciones}</td></tr>` : ''}
          </table>
          <a href="${APP_URL}/anulaciones" style="display:inline-block;background:#1a1a1a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold">
            Revisar anulaciones
          </a>
          <p style="color:#999;font-size:12px;margin-top:24px">La Oriental Automotors · Centro de Mando</p>
        </div>
      `,
    })
  } catch {
    // Email error is non-fatal
  }

  return NextResponse.json({ ok: true })
}
