import { Resend } from 'resend'

function getResend() { return new Resend(process.env.RESEND_API_KEY!) }

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrodemando.laoriental.co'
const FROM = 'La Oriental Automotors <corporativo@laoriental.co>'

// Destinatarios de la notificación cuando un empleado completa su cuestionario
const CORREO_ROJAS = process.env.CORREO_ROJAS ?? 'rojasjgx@gmail.com'
const CORREO_MARY = process.env.CORREO_MARY ?? 'marymarquez@gmail.com'
const CORREO_LEYSDEM = process.env.CORREO_LEYSDEM ?? 'leysdm@gmail.com'
const CORREO_CORPORATIVO = 'laorientalautomotorsc@gmail.com'

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
    <p style="margin:0;color:#9ca3af;font-size:11px;font-family:sans-serif">La Oriental Automotors · Corporativo · Maturín, Venezuela</p>
  </div>`
}

function wrap(body: string) {
  return `<div style="background:#f3f4f6;padding:24px 16px">
    <div style="background:#fff;max-width:560px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      ${headerHTML()}
      <div style="padding:32px">${body}</div>
      ${footerHTML()}
    </div>
  </div>`
}

interface CuestionarioCompletadoOpts {
  empleadoId: string
  nombre: string
  cargo: string | null
  departamento: string | null
  completadoEn: string
}

// Notifica a Rojas + correo corporativo cuando un empleado completa su cuestionario
export async function enviarNotificacionCuestionarioCompletado(opts: CuestionarioCompletadoOpts) {
  const { empleadoId, nombre, cargo, departamento, completadoEn } = opts
  const resend = getResend()
  const link = `${APP_URL}/corporativo/${empleadoId}`

  const fechaFmt = (() => {
    try { return new Date(completadoEn).toLocaleString('es-VE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
    catch { return completadoEn }
  })()

  const body = `
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#C41E3A;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Descripción de cargo recibida</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 6px">${nombre}</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#6b7280;margin:0 0 24px">
      completó su cuestionario de descripción de cargo.
    </p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:18px 22px;margin-bottom:24px">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-family:sans-serif;font-size:13px;color:#374151">
        <tr><td style="padding:4px 0;color:#9ca3af">Empleado</td><td style="padding:4px 0;text-align:right;font-weight:700;color:#111">${nombre}</td></tr>
        ${cargo ? `<tr><td style="padding:4px 0;color:#9ca3af">Cargo</td><td style="padding:4px 0;text-align:right;font-weight:700;color:#111">${cargo}</td></tr>` : ''}
        ${departamento ? `<tr><td style="padding:4px 0;color:#9ca3af">Área</td><td style="padding:4px 0;text-align:right;color:#111">${departamento}</td></tr>` : ''}
        <tr><td style="padding:4px 0;color:#9ca3af">Completado</td><td style="padding:4px 0;text-align:right;color:#111">${fechaFmt}</td></tr>
      </table>
    </div>

    <div style="text-align:center">
      <a href="${link}" style="display:inline-block;background:#C41E3A;color:#fff;font-family:sans-serif;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:10px">Ver descripción de cargo</a>
    </div>
  `

  try {
    await resend.emails.send({
      from: FROM,
      to: [CORREO_ROJAS, CORREO_CORPORATIVO],
      subject: `Descripción de cargo completada — ${nombre}`,
      html: wrap(body),
    })
    return { ok: true }
  } catch (err) {
    console.error('[email-corporativo] error notificando cuestionario:', err)
    return { ok: false, error: String(err) }
  }
}

// Recordatorio de pago/renovación de un permiso gubernamental (7 y 3 días antes).
// Va a Rojas, Mary y Leysdem.
export async function enviarRecordatorioPermiso(opts: { nombre: string; fechaPago: string; dias: number; url?: string | null; to?: string[] }) {
  const { nombre, fechaPago, dias, url } = opts
  const destinatarios = (opts.to && opts.to.length) ? opts.to : [CORREO_ROJAS, CORREO_MARY, CORREO_LEYSDEM]
  const resend = getResend()
  const fechaFmt = (() => {
    try { return new Date(fechaPago + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' }) }
    catch { return fechaPago }
  })()
  const cuando = dias <= 0 ? 'vence hoy' : `vence en ${dias} día${dias === 1 ? '' : 's'}`

  const body = `
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#C41E3A;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Recordatorio de pago</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 6px">Permiso gubernamental por pagar</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#6b7280;margin:0 0 24px">
      El permiso <b style="color:#111">${nombre}</b> ${cuando} (${fechaFmt}). Por favor gestionar el pago a tiempo.
    </p>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:18px 22px;margin-bottom:24px">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-family:sans-serif;font-size:13px;color:#374151">
        <tr><td style="padding:4px 0;color:#9ca3af">Documento</td><td style="padding:4px 0;text-align:right;font-weight:700;color:#111">${nombre}</td></tr>
        <tr><td style="padding:4px 0;color:#9ca3af">Fecha de pago</td><td style="padding:4px 0;text-align:right;font-weight:700;color:#92400e">${fechaFmt}</td></tr>
        <tr><td style="padding:4px 0;color:#9ca3af">Faltan</td><td style="padding:4px 0;text-align:right;font-weight:700;color:#111">${dias <= 0 ? 'Vence hoy' : `${dias} día${dias === 1 ? '' : 's'}`}</td></tr>
      </table>
    </div>
    <div style="text-align:center">
      <a href="${url || `${APP_URL}/documentos-empresa`}" style="display:inline-block;background:#C41E3A;color:#fff;font-family:sans-serif;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:10px">Ver documento</a>
    </div>
  `

  try {
    await resend.emails.send({
      from: FROM,
      to: destinatarios,
      subject: `⏰ Permiso por pagar en ${dias <= 0 ? '0' : dias} día(s) — ${nombre}`,
      html: wrap(body),
    })
    return { ok: true }
  } catch (err) {
    console.error('[email-corporativo] error recordatorio permiso:', err)
    return { ok: false, error: String(err) }
  }
}
