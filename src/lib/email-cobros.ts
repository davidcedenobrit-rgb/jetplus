import { Resend } from 'resend'

function getResend() { return new Resend(process.env.RESEND_API_KEY!) }

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrodemando.laoriental.co'
const FROM = 'La Oriental Automotors <cobranzas@laoriental.co>'

function fmt(n: number) {
  return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function logoUrl() {
  return `${APP_URL}/logo-la-oriental-blanco.png`
}

function header() {
  return `<div style="background:#C41E3A;padding:20px 32px;border-radius:12px 12px 0 0">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle"><img src="${logoUrl()}" alt="La Oriental" style="height:44px;width:auto;display:block" /></td>
      <td style="padding-left:14px;vertical-align:middle">
        <p style="margin:0;color:#fff;font-weight:800;font-size:15px;font-family:sans-serif">LA ORIENTAL AUTOMOTORS</p>
        <p style="margin:0;color:rgba(255,255,255,0.7);font-size:11px;font-family:sans-serif">MG &amp; MAXUS · Maturín, Venezuela</p>
      </td>
    </tr></table>
  </div>`
}

export async function enviarAvisoCobro({
  correo, nombre, cuotasVencidas, montoVencido, diasMaxVencido, placa, notas,
}: {
  correo: string
  nombre: string
  cuotasVencidas: number
  montoVencido: number
  diasMaxVencido: number
  placa: string
  notas?: string
}) {
  const resend = getResend()
  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
<tr><td>${header()}</td></tr>
<tr><td style="padding:28px 32px">

  <p style="margin:0 0 6px;font-size:17px;font-weight:700;color:#111">Aviso de cobranza</p>
  <p style="margin:0 0 20px;font-size:13px;color:#6b7280">Estimado/a <strong>${nombre}</strong>,</p>

  <p style="margin:0 0 20px;font-size:13px;color:#374151;line-height:1.6">
    Le informamos que registramos <strong>${cuotasVencidas} cuota${cuotasVencidas !== 1 ? 's' : ''} vencida${cuotasVencidas !== 1 ? 's' : ''}</strong>
    con un monto total de <strong style="color:#C41E3A">$${fmt(montoVencido)}</strong>
    correspondiente al vehículo con placa <strong>${placa}</strong>,
    con <strong>${diasMaxVencido} días</strong> de vencimiento.
  </p>

  <div style="background:#fff1f2;border:1px solid #fecaca;border-radius:10px;padding:16px 20px;margin-bottom:20px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-size:12px;color:#6b7280">Cuotas vencidas</td>
        <td align="right" style="font-size:15px;font-weight:800;color:#C41E3A">${cuotasVencidas}</td>
      </tr>
      <tr><td colspan="2" style="height:8px"></td></tr>
      <tr>
        <td style="font-size:12px;color:#6b7280">Monto vencido</td>
        <td align="right" style="font-size:15px;font-weight:800;color:#C41E3A">$${fmt(montoVencido)}</td>
      </tr>
      <tr><td colspan="2" style="height:8px"></td></tr>
      <tr>
        <td style="font-size:12px;color:#6b7280">Días vencido</td>
        <td align="right" style="font-size:13px;font-weight:700;color:#374151">${diasMaxVencido} días</td>
      </tr>
    </table>
  </div>

  <p style="margin:0 0 20px;font-size:13px;color:#374151;line-height:1.6">
    Le solicitamos regularizar su situación a la brevedad. Puede comunicarse con nosotros
    al <strong>0414-9989010</strong> o visitar nuestras oficinas en
    Av. Ugarte Alirio Pelyo, Centro Profesional David, Maturín.
  </p>

  ${notas ? `<div style="background:#f9fafb;border-left:3px solid #C41E3A;padding:12px 16px;margin-bottom:20px;border-radius:0 8px 8px 0">
    <p style="margin:0;font-size:12px;color:#374151"><strong>Nota:</strong> ${notas}</p>
  </div>` : ''}

  <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;border-top:1px solid #f3f4f6;padding-top:16px">
    LA ORIENTAL AUTOMOTORS, C.A. · RIF J-505692143<br>
    Este es un mensaje automático, por favor no responder directamente a este correo.
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`

  await resend.emails.send({
    from: FROM,
    to: correo,
    subject: `Aviso de cobranza — ${cuotasVencidas} cuota${cuotasVencidas !== 1 ? 's' : ''} vencida${cuotasVencidas !== 1 ? 's' : ''} · $${fmt(montoVencido)}`,
    html,
  })
}
