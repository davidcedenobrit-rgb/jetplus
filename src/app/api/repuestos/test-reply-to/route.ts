export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const TEST_SECRET = process.env.TEST_EMAIL_SECRET ?? 'prueba-sore-2026'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrodemando.laoriental.co'

const CORREO_ROJAS = process.env.CORREO_ROJAS ?? 'rojasjgx@gmail.com'
const CORREO_MARY  = process.env.CORREO_MARY  ?? 'laorientalautomotorsc@gmail.com'
const CORREO_OPS   = process.env.CORREO_OPS   ?? 'repuestos.laoriental.mun@gmail.com'

const EQUIPO_INTERNO = [CORREO_MARY, CORREO_ROJAS, CORREO_OPS]
const FROM = 'Repuestos La Oriental <repuestos@laoriental.co>'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('s')
  if (secret !== TEST_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const to = req.nextUrl.searchParams.get('to')
  if (!to || !to.includes('@')) {
    return NextResponse.json({ error: 'Falta parámetro "to" con un correo válido' }, { status: 400 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY!)
  const numero = `SORE-PRUEBA-${Date.now().toString().slice(-4)}`

  const logoUrl = `${APP_URL}/logo-la-oriental-blanco.png`

  const html = `<div style="background:#fff;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;font-family:sans-serif">
    <div style="background:#C41E3A;padding:20px 32px">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle"><img src="${logoUrl}" alt="La Oriental Automotors" style="height:48px;width:auto;display:block" /></td>
        <td style="padding-left:14px;vertical-align:middle">
          <p style="margin:0;color:#fff;font-weight:800;font-size:16px">LA ORIENTAL AUTOMOTORS</p>
          <p style="margin:0;color:rgba(255,255,255,0.75);font-size:11px">MG &amp; Maxus · Maturín, Venezuela</p>
        </td></tr></table>
    </div>
    <div style="padding:32px">
      <p style="font-size:13px;font-weight:700;color:#C41E3A;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">🧪 Correo de prueba</p>
      <h1 style="font-size:22px;font-weight:800;color:#111;margin:0 0 12px">Verificación de respuestas — ${numero}</h1>
      <p style="font-size:14px;color:#374151;margin:0 0 18px">
        Este es un correo de prueba. <strong>Por favor, dale clic a "Responder"</strong> en tu cliente de correo y verifica lo siguiente:
      </p>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:18px">
        <p style="font-size:13px;font-weight:700;color:#166534;margin:0 0 8px">✅ Lo correcto que deberías ver:</p>
        <p style="font-size:14px;color:#14532d;margin:0 0 4px">El campo <strong>"Para:"</strong> de tu respuesta debe contener:</p>
        <ul style="font-size:13px;color:#14532d;margin:6px 0 0 18px;padding:0">
          <li>${CORREO_MARY}</li>
          <li>${CORREO_ROJAS}</li>
          <li>${CORREO_OPS}</li>
        </ul>
      </div>

      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;margin-bottom:18px">
        <p style="font-size:13px;font-weight:700;color:#991b1b;margin:0 0 6px">❌ Lo incorrecto (lo que estaba pasando antes):</p>
        <p style="font-size:14px;color:#7f1d1d;margin:0">Si la respuesta va a <code>repuestos@laoriental.co</code> (centro de mando), el Reply-To no se aplicó correctamente.</p>
      </div>

      <p style="font-size:13px;color:#6b7280;margin:18px 0 0">
        Datos técnicos del correo:<br>
        <strong>From:</strong> ${FROM}<br>
        <strong>Reply-To:</strong> ${EQUIPO_INTERNO.join(', ')}
      </p>
    </div>
    <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:18px 32px;text-align:center">
      <p style="margin:0;color:#9ca3af;font-size:11px">La Oriental Automotors · Correo de prueba — ${new Date().toLocaleString('es-VE')}</p>
    </div>
  </div>`

  try {
    const result = await resend.emails.send({
      from: FROM,
      to,
      replyTo: EQUIPO_INTERNO,
      subject: `🧪 Prueba Reply-To — Solicitud ${numero} — La Oriental Automotors`,
      html,
    })

    return NextResponse.json({
      ok: true,
      mensaje: 'Correo de prueba enviado',
      destinatario: to,
      from: FROM,
      replyTo: EQUIPO_INTERNO,
      instrucciones: 'Abre el correo en tu Gmail/Outlook y dale "Responder". El campo "Para:" debe llenarse con los correos del equipo interno, NO con repuestos@laoriental.co.',
      resend_id: (result as any)?.data?.id ?? null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 })
  }
}
