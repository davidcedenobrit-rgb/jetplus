import { Resend } from 'resend'
import { registrarEnvioEmail, extraerResendId } from './email-tracking'

function getResend() { return new Resend(process.env.RESEND_API_KEY!) }

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrodemando.laoriental.co'
const FROM = 'La Oriental Automotors <portal@laoriental.co>'

function fmtFecha(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch { return iso }
}

function headerHTML() {
  const logoUrl = `${APP_URL}/logo-la-oriental-blanco.png`
  return `<div style="background:#C41E3A;padding:20px 32px;border-radius:12px 12px 0 0">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle"><img src="${logoUrl}" alt="La Oriental" style="height:44px;width:auto;display:block" /></td>
      <td style="padding-left:14px;vertical-align:middle">
        <p style="margin:0;color:#fff;font-weight:800;font-size:15px;font-family:sans-serif">LA ORIENTAL AUTOMOTORS</p>
        <p style="margin:0;color:rgba(255,255,255,0.7);font-size:11px;font-family:sans-serif">MG &amp; MAXUS · Maturín, Venezuela</p>
      </td>
    </tr></table>
  </div>`
}

function footerHTML() {
  return `<div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;border-radius:0 0 12px 12px;text-align:center">
    <p style="margin:0;color:#9ca3af;font-size:11px;font-family:sans-serif">La Oriental Automotors · MG &amp; MAXUS · Maturín, Venezuela</p>
  </div>`
}

function wrap(body: string) {
  return `<div style="background:#f3f4f6;padding:24px 16px">
    <div style="background:#fff;max-width:520px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      ${headerHTML()}
      <div style="padding:32px">${body}</div>
      ${footerHTML()}
    </div>
  </div>`
}

interface EnviarInvitacionOpts {
  invitacionId: string
  clienteNombre: string
  destinatario: string
  linkPortal: string
  expiraEn: string
}

export async function enviarInvitacionPortal(opts: EnviarInvitacionOpts) {
  const { invitacionId, clienteNombre, destinatario, linkPortal, expiraEn } = opts

  const body = `
    <p style="font-family:sans-serif;font-size:12px;font-weight:700;color:#C41E3A;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px">Portal del Cliente</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 6px">Bienvenido/a, ${clienteNombre.split(' ')[0]}</h1>
    <p style="font-family:sans-serif;font-size:15px;color:#374151;margin:0 0 22px;line-height:1.5">Le invitamos a activar su cuenta en el <b>Portal del Cliente</b> de La Oriental Automotors. Desde ahí podrá consultar sus vehículos, cuotas, próximos servicios y más.</p>

    <div style="text-align:center;margin:24px 0">
      <a href="${linkPortal}" style="display:inline-block;padding:14px 32px;background:#C41E3A;color:#fff;font-family:sans-serif;font-size:14px;font-weight:800;text-decoration:none;border-radius:10px">
        Activar mi cuenta
      </a>
    </div>

    <p style="font-family:sans-serif;font-size:12px;color:#6b7280;margin:0 0 8px;text-align:center">
      O copie este enlace en su navegador:
    </p>
    <p style="font-family:monospace;font-size:11px;color:#6b7280;background:#f9fafb;padding:10px 12px;border-radius:6px;word-break:break-all;text-align:center;margin:0 0 22px">
      ${linkPortal}
    </p>

    <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:12px 14px;margin-bottom:18px">
      <p style="font-family:sans-serif;font-size:12px;color:#92400e;margin:0;line-height:1.5">
        <b>Este enlace expira el ${fmtFecha(expiraEn)}.</b> Si no lo activa antes de esa fecha, tendrá que solicitar una nueva invitación.
      </p>
    </div>

    <p style="font-family:sans-serif;font-size:12px;color:#9ca3af;margin:24px 0 0;line-height:1.5">
      Si no reconoce este correo, puede ignorarlo. Su cuenta no se activará sin su acción.
    </p>
  `

  const asunto = 'Su acceso al Portal del Cliente — La Oriental Automotors'
  const result = await getResend().emails.send({
    from: FROM,
    to: [destinatario],
    subject: asunto,
    html: wrap(body),
  })

  if ((result as any).error) {
    throw new Error(`Resend error: ${(result as any).error.message ?? (result as any).error.name ?? 'desconocido'}`)
  }

  const resendId = extraerResendId(result)
  if (resendId) {
    await registrarEnvioEmail({
      resendEmailId: resendId,
      entidadTipo: 'otro',
      entidadId: invitacionId,
      destinatarios: [destinatario],
      asunto,
      metadata: { tipo: 'invitacion_portal', clienteNombre },
    })
  }

  return result
}
