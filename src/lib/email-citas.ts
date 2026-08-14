import { Resend } from 'resend'
import { registrarEnvioEmail, extraerResendId } from './email-tracking'

function getResend() { return new Resend(process.env.RESEND_API_KEY!) }

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://jetplus.vercel.app'
const FROM = 'JETPLUS <citas@navigroup.co>'

function headerHTML() {
  const logoUrl = `${APP_URL}/logo-jetplus-blanco.png`
  return `<div style="background:#C41E3A;padding:20px 32px;border-radius:12px 12px 0 0">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle"><img src="${logoUrl}" alt="JETPLUS" style="height:44px;width:auto;display:block" /></td>
      <td style="padding-left:14px;vertical-align:middle">
        <p style="margin:0;color:#fff;font-weight:800;font-size:15px;font-family:sans-serif">JETPLUS</p>
        <p style="margin:0;color:rgba(255,255,255,0.7);font-size:11px;font-family:sans-serif">MG &amp; MAXUS · Porlamar, Venezuela</p>
      </td>
    </tr></table>
  </div>`
}

function footerHTML() {
  return `<div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;border-radius:0 0 12px 12px;text-align:center">
    <p style="margin:0;color:#9ca3af;font-size:11px;font-family:sans-serif">JETPLUS · MG &amp; MAXUS · Porlamar, Venezuela</p>
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

function fmtFechaLarga(fechaISO: string) {
  try {
    const [y, m, d] = fechaISO.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('es-VE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  } catch { return fechaISO }
}

function fmtHora12(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h >= 12 ? 'p.m.' : 'a.m.'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

interface EnviarConfirmacionCitaOpts {
  citaId: string
  destinatario: string
  clienteNombre: string
  fecha: string
  horaInicio: string
  horaFin: string
  vehiculoLabel?: string | null
  placa?: string | null
  motivo?: string | null
}

export async function enviarConfirmacionCita(opts: EnviarConfirmacionCitaOpts) {
  const { citaId, destinatario, clienteNombre, fecha, horaInicio, horaFin, vehiculoLabel, placa, motivo } = opts

  const body = `
    <p style="font-family:sans-serif;font-size:12px;font-weight:700;color:#C41E3A;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px">Cita de taller confirmada</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 6px">Hola, ${clienteNombre.split(' ')[0]}</h1>
    <p style="font-family:sans-serif;font-size:15px;color:#374151;margin:0 0 22px;line-height:1.5">Tu cita en el taller de JETPLUS quedó confirmada. Aquí el resumen:</p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin-bottom:18px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:6px 0;font-family:sans-serif;font-size:12px;color:#6b7280;font-weight:600;width:38%">Fecha</td><td style="padding:6px 0;font-family:sans-serif;font-size:13px;color:#111;font-weight:700;text-transform:capitalize">${fmtFechaLarga(fecha)}</td></tr>
        <tr><td style="padding:6px 0;font-family:sans-serif;font-size:12px;color:#6b7280;font-weight:600">Hora</td><td style="padding:6px 0;font-family:sans-serif;font-size:13px;color:#111;font-weight:700">${fmtHora12(horaInicio)} – ${fmtHora12(horaFin)}</td></tr>
        ${vehiculoLabel ? `<tr><td style="padding:6px 0;font-family:sans-serif;font-size:12px;color:#6b7280;font-weight:600">Vehículo</td><td style="padding:6px 0;font-family:sans-serif;font-size:13px;color:#111;font-weight:700">${vehiculoLabel}${placa ? ` · ${placa}` : ''}</td></tr>` : ''}
        ${motivo ? `<tr><td style="padding:6px 0;font-family:sans-serif;font-size:12px;color:#6b7280;font-weight:600">Motivo</td><td style="padding:6px 0;font-family:sans-serif;font-size:13px;color:#111;font-weight:700">${motivo}</td></tr>` : ''}
      </table>
    </div>

    <p style="font-family:sans-serif;font-size:12px;color:#6b7280;margin:0 0 4px;line-height:1.5">
      Te esperamos en nuestro taller. Si necesitas reprogramar o cancelar, escríbenos por WhatsApp con la mayor anticipación posible.
    </p>
  `

  const asunto = `Cita confirmada — ${fmtFechaLarga(fecha)} ${fmtHora12(horaInicio)} · JETPLUS`
  const result = await getResend().emails.send({ from: FROM, to: [destinatario], subject: asunto, html: wrap(body) })

  if ((result as any).error) {
    throw new Error(`Resend error cita: ${(result as any).error.message ?? (result as any).error.name ?? 'desconocido'}`)
  }

  const resendId = extraerResendId(result)
  if (resendId) {
    await registrarEnvioEmail({
      resendEmailId: resendId,
      entidadTipo: 'otro',
      entidadId: citaId,
      destinatarios: [destinatario],
      asunto,
      metadata: { tipo: 'confirmacion_cita_taller', fecha, horaInicio },
    })
  }

  return result
}
