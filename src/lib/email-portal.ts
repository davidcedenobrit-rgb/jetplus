import { Resend } from 'resend'
import { registrarEnvioEmail, extraerResendId } from './email-tracking'

function getResend() { return new Resend(process.env.RESEND_API_KEY!) }

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://jetplus.vercel.app'
const FROM = 'JETPLUS <portal@navigroup.co>'

function fmtFecha(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch { return iso }
}

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
    <p style="font-family:sans-serif;font-size:15px;color:#374151;margin:0 0 22px;line-height:1.5">Le invitamos a activar su cuenta en el <b>Portal del Cliente</b> de JETPLUS. Desde ahí podrá consultar sus vehículos, cuotas, próximos servicios y más.</p>

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

  const asunto = 'Su acceso al Portal del Cliente — JETPLUS'
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

// ─── Notificación al staff cuando un cliente reporta un pago ───────────────────

const DESTINATARIOS_STAFF_PAGO = [
  process.env.CORREO_ROJAS ?? 'davidcedenobrit@gmail.com',
  process.env.CORREO_MARY ?? 'davidcedenobrit@gmail.com',
  process.env.CORREO_LEYSDEM ?? 'davidcedenobrit@gmail.com',
]

interface EnviarNotificacionPagoOpts {
  ingresoId: string
  numeroRecibo: string
  clienteNombre: string
  clienteCiRif: string
  clienteTelefono?: string | null
  vehiculoLabel?: string | null
  placa?: string | null
  cuotaLabel?: string | null
  concepto: string
  monto: number
  moneda: string
  metodoPago: string
  referencia?: string | null
  bancoOrigen?: string | null
  bancoDestino?: string | null
  fechaPago: string
  comprobanteUrl: string
  observaciones?: string | null
}

function fmtMonto(n: number) {
  return n.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(n)*100)%100===0?0:2, maximumFractionDigits: 2 })
}

export async function enviarNotificacionPagoCliente(opts: EnviarNotificacionPagoOpts) {
  const resend = getResend()
  const linkIngreso = `${APP_URL}/ingresos/${opts.ingresoId}`
  const monedaLabel = opts.moneda === 'VES' ? 'Bs.' : opts.moneda

  const body = `
    <p style="font-family:sans-serif;font-size:12px;font-weight:700;color:#C41E3A;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px">🔔 Pago reportado desde el Portal del Cliente</p>
    <h1 style="font-family:sans-serif;font-size:20px;font-weight:800;color:#111;margin:0 0 6px">${opts.clienteNombre}</h1>
    <p style="font-family:sans-serif;font-size:13px;color:#6b7280;margin:0 0 22px">
      Un cliente reportó un pago. Verifica los datos y aprueba o rechaza desde el Centro de Mando.
    </p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin-bottom:18px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:6px 0;font-family:sans-serif;font-size:12px;color:#6b7280;font-weight:600;width:42%">N° Recibo</td><td style="padding:6px 0;font-family:sans-serif;font-size:13px;color:#111;font-weight:700"><span style="font-family:monospace;color:#C41E3A">${opts.numeroRecibo}</span></td></tr>
        <tr><td style="padding:6px 0;font-family:sans-serif;font-size:12px;color:#6b7280;font-weight:600">Cliente</td><td style="padding:6px 0;font-family:sans-serif;font-size:13px;color:#111;font-weight:700">${opts.clienteNombre}</td></tr>
        <tr><td style="padding:6px 0;font-family:sans-serif;font-size:12px;color:#6b7280;font-weight:600">C.I. / RIF</td><td style="padding:6px 0;font-family:sans-serif;font-size:13px;color:#111;font-weight:700">${opts.clienteCiRif}</td></tr>
        ${opts.clienteTelefono ? `<tr><td style="padding:6px 0;font-family:sans-serif;font-size:12px;color:#6b7280;font-weight:600">Teléfono</td><td style="padding:6px 0;font-family:sans-serif;font-size:13px;color:#111;font-weight:700">${opts.clienteTelefono}</td></tr>` : ''}
        ${opts.vehiculoLabel ? `<tr><td style="padding:6px 0;font-family:sans-serif;font-size:12px;color:#6b7280;font-weight:600">Vehículo</td><td style="padding:6px 0;font-family:sans-serif;font-size:13px;color:#111;font-weight:700">${opts.vehiculoLabel}${opts.placa ? ` · ${opts.placa}` : ''}</td></tr>` : ''}
        ${opts.cuotaLabel ? `<tr><td style="padding:6px 0;font-family:sans-serif;font-size:12px;color:#6b7280;font-weight:600">Aplicar a</td><td style="padding:6px 0;font-family:sans-serif;font-size:13px;color:#111;font-weight:700">${opts.cuotaLabel}</td></tr>` : ''}
        <tr><td style="padding:6px 0;font-family:sans-serif;font-size:12px;color:#6b7280;font-weight:600">Concepto</td><td style="padding:6px 0;font-family:sans-serif;font-size:13px;color:#111;font-weight:700">${opts.concepto}</td></tr>
        <tr><td style="padding:8px 0;font-family:sans-serif;font-size:12px;color:#6b7280;font-weight:600">Monto</td><td style="padding:8px 0;font-family:sans-serif;font-size:16px;color:#111;font-weight:800">${monedaLabel} ${fmtMonto(opts.monto)}</td></tr>
        <tr><td style="padding:6px 0;font-family:sans-serif;font-size:12px;color:#6b7280;font-weight:600">Método</td><td style="padding:6px 0;font-family:sans-serif;font-size:13px;color:#111;font-weight:700">${opts.metodoPago}</td></tr>
        ${opts.bancoOrigen ? `<tr><td style="padding:6px 0;font-family:sans-serif;font-size:12px;color:#6b7280;font-weight:600">Banco origen</td><td style="padding:6px 0;font-family:sans-serif;font-size:13px;color:#111;font-weight:700">${opts.bancoOrigen}</td></tr>` : ''}
        ${opts.bancoDestino ? `<tr><td style="padding:6px 0;font-family:sans-serif;font-size:12px;color:#6b7280;font-weight:600">Banco destino</td><td style="padding:6px 0;font-family:sans-serif;font-size:13px;color:#111;font-weight:700">${opts.bancoDestino}</td></tr>` : ''}
        ${opts.referencia ? `<tr><td style="padding:6px 0;font-family:sans-serif;font-size:12px;color:#6b7280;font-weight:600">Referencia</td><td style="padding:6px 0;font-family:sans-serif;font-size:13px;color:#111;font-weight:700"><span style="font-family:monospace">${opts.referencia}</span></td></tr>` : ''}
        <tr><td style="padding:6px 0;font-family:sans-serif;font-size:12px;color:#6b7280;font-weight:600">Fecha del pago</td><td style="padding:6px 0;font-family:sans-serif;font-size:13px;color:#111;font-weight:700">${fmtFecha(opts.fechaPago)}</td></tr>
      </table>
    </div>

    ${opts.observaciones ? `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 16px;margin-bottom:18px">
      <p style="font-family:sans-serif;font-size:11px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px">Observaciones del cliente</p>
      <p style="font-family:sans-serif;font-size:13px;color:#1e3a8a;margin:0;font-style:italic">"${opts.observaciones}"</p>
    </div>
    ` : ''}

    <div style="text-align:center;margin:22px 0">
      <a href="${opts.comprobanteUrl}" target="_blank"
        style="display:inline-block;padding:12px 22px;background:#f3f4f6;color:#111;font-family:sans-serif;font-size:13px;font-weight:800;text-decoration:none;border-radius:10px;border:1px solid #d1d5db;margin-right:8px">
        📎 Ver comprobante
      </a>
      <a href="${linkIngreso}"
        style="display:inline-block;padding:12px 26px;background:#C41E3A;color:#fff;font-family:sans-serif;font-size:13px;font-weight:800;text-decoration:none;border-radius:10px">
        Verificar en Centro de Mando →
      </a>
    </div>

    <p style="font-family:sans-serif;font-size:11px;color:#9ca3af;margin:16px 0 0;text-align:center">
      El pago está en estado <b>Pendiente de aprobación</b> hasta que uno de ustedes lo verifique.
    </p>
  `

  const asunto = `🔔 ${opts.clienteNombre} reportó un pago de ${monedaLabel} ${fmtMonto(opts.monto)} (${opts.numeroRecibo})`

  const result = await resend.emails.send({
    from: FROM,
    to: DESTINATARIOS_STAFF_PAGO,
    subject: asunto,
    html: wrap(body),
  })

  if ((result as any).error) {
    throw new Error(`Resend error notificacion pago: ${(result as any).error.message ?? (result as any).error.name ?? 'desconocido'}`)
  }

  const resendId = extraerResendId(result)
  if (resendId) {
    await registrarEnvioEmail({
      resendEmailId: resendId,
      entidadTipo: 'ingreso',
      entidadId: opts.ingresoId,
      destinatarios: DESTINATARIOS_STAFF_PAGO,
      asunto,
      metadata: { tipo: 'notificacion_pago_portal', numeroRecibo: opts.numeroRecibo, monto: opts.monto },
    })
  }

  return result
}
