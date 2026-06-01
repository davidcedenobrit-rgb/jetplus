import { Resend } from 'resend'

function getResend() { return new Resend(process.env.RESEND_API_KEY!) }

const APP_URL           = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrodemando.laoriental.co'
const CORREO_ARIANNA    = process.env.CORREO_ARIANNA    ?? 'arianna@laoriental.co'
const CORREO_VEHIMOTORS = process.env.CORREO_VEHIMOTORS ?? 'vehimotors@laoriental.co'
const CORREO_DIRECTOR   = process.env.CORREO_DIRECTOR   ?? 'jose@laoriental.co'
const CORREO_MARY       = process.env.CORREO_MARY       ?? 'mary@laoriental.co'
const FROM = 'sistema@laoriental.co'

export interface Item { descripcion: string; referencia?: string | null; cantidad: number }

function headerHTML() {
  return `<div style="background:#C41E3A;padding:24px 32px;border-radius:12px 12px 0 0">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><div style="background:rgba(255,255,255,0.15);width:44px;height:44px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center">
        <span style="color:#fff;font-weight:900;font-size:16px;font-family:sans-serif">LO</span></div></td>
      <td style="padding-left:14px;vertical-align:middle">
        <p style="margin:0;color:#fff;font-weight:800;font-size:16px;font-family:sans-serif">LA ORIENTAL AUTOMOTORS</p>
        <p style="margin:0;color:rgba(255,255,255,0.75);font-size:11px;font-family:sans-serif">MG & Maxus · Maturín, Venezuela</p>
      </td></tr></table></div>`
}

function footerHTML() {
  return `<div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:18px 32px;border-radius:0 0 12px 12px;text-align:center">
    <p style="margin:0;color:#9ca3af;font-size:11px;font-family:sans-serif">La Oriental Automotors · MG & Maxus · Maturín, Venezuela</p></div>`
}

function itemsTable(items: Item[]) {
  const rows = items.map(it => `<tr>
    <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-family:sans-serif;font-size:14px;color:#111">${it.descripcion}</td>
    <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-family:monospace;font-size:13px;color:#6b7280;text-align:center">${it.referencia ?? '—'}</td>
    <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-family:sans-serif;font-size:14px;color:#111;text-align:center;font-weight:700">${it.cantidad}</td>
  </tr>`).join('')
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:20px 0">
    <thead><tr style="background:#f9fafb">
      <th style="padding:10px 14px;text-align:left;font-family:sans-serif;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em">Repuesto</th>
      <th style="padding:10px 14px;text-align:center;font-family:sans-serif;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em">Referencia</th>
      <th style="padding:10px 14px;text-align:center;font-family:sans-serif;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em">Cant.</th>
    </tr></thead><tbody>${rows}</tbody></table>`
}

function btnStyle(bg: string, color = '#fff') {
  return `display:inline-block;padding:14px 28px;background:${bg};color:${color};font-family:sans-serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;margin:6px`
}

function wrap(body: string) {
  return `<div style="background:#fff;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">${headerHTML()}<div style="padding:32px">${body}</div>${footerHTML()}</div>`
}

// ── 1. Solicitud de cotización a Vehimotors ───────────────────────
export async function enviarSolicitudCotizacion(opts: {
  solicitudId: string; numero: string; token: string; items: Item[]; notasAdicionales?: string
}) {
  const { solicitudId, numero, token, items, notasAdicionales } = opts
  const urlHay     = `${APP_URL}/api/repuestos/respuesta?id=${solicitudId}&token=${token}&tipo=hay_todo`
  const urlNoHay   = `${APP_URL}/api/repuestos/respuesta?id=${solicitudId}&token=${token}&tipo=no_hay`
  const urlParcial = `${APP_URL}/api/repuestos/respuesta?id=${solicitudId}&token=${token}&tipo=parcial`

  const body = `
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#C41E3A;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Solicitud de Cotización</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 6px">Repuestos — ${numero}</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#6b7280;margin:0 0 24px">Por favor indíquenos disponibilidad y precios para los siguientes repuestos:</p>
    ${itemsTable(items)}
    ${notasAdicionales ? `<p style="font-family:sans-serif;font-size:14px;color:#374151;margin:0 0 24px;padding:14px;background:#f9fafb;border-radius:8px"><strong>Notas:</strong> ${notasAdicionales}</p>` : ''}
    <p style="font-family:sans-serif;font-size:15px;font-weight:700;color:#111;margin:0 0 16px;text-align:center">¿Tienen disponibilidad?</p>
    <div style="text-align:center;margin-bottom:24px">
      <a href="${urlHay}"     style="${btnStyle('#16a34a')}">✅ Sí, hay todo</a>
      <a href="${urlParcial}" style="${btnStyle('#d97706')}">⚠️ No hay todos</a>
      <a href="${urlNoHay}"   style="${btnStyle('#dc2626')}">❌ No hay</a>
    </div>
    <p style="font-family:sans-serif;font-size:12px;color:#9ca3af;text-align:center">Al hacer clic, podrán agregar observaciones y adjuntar su cotización.</p>`

  return getResend().emails.send({ from: FROM, to: [CORREO_VEHIMOTORS], cc: [CORREO_DIRECTOR], subject: `Solicitud de cotización ${numero} — La Oriental Automotors`, html: wrap(body) })
}

// ── 2. Notificación interna cuando Vehimotors responde ─────────────
export async function notificarRespuestaVehimotors(opts: {
  numero: string; tipo: 'hay_todo' | 'no_hay' | 'parcial'; solicitudId: string
}) {
  const { numero, tipo, solicitudId } = opts
  const textos = {
    hay_todo: { emoji: '✅', label: 'Hay todo disponible',   color: '#16a34a' },
    no_hay:   { emoji: '❌', label: 'Sin disponibilidad',    color: '#dc2626' },
    parcial:  { emoji: '⚠️', label: 'Disponibilidad parcial', color: '#d97706' },
  }
  const t = textos[tipo]
  const body = `
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:${t.color};letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Respuesta de Vehimotors</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 16px">${t.emoji} ${t.label}</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#374151;margin:0 0 24px">Vehimotors respondió a la solicitud <strong>${numero}</strong>. Revisa la cotización adjunta en el Centro de Mando y apruébala para continuar.</p>
    <div style="text-align:center"><a href="${APP_URL}/repuestos/${solicitudId}" style="${btnStyle('#C41E3A')}">Ver en Centro de Mando →</a></div>`

  return getResend().emails.send({ from: FROM, to: [CORREO_ARIANNA], cc: [CORREO_DIRECTOR], subject: `${t.emoji} Vehimotors respondió — Solicitud ${numero}`, html: wrap(body) })
}

// ── 3. Cotización aprobada → Vehimotors con botón Anexar factura ───
export async function enviarAprobacionCotizacion(opts: {
  numero: string; solicitudId: string; tokenFactura: string; items: Item[]
}) {
  const { numero, solicitudId, tokenFactura, items } = opts
  const urlFactura = `${APP_URL}/api/repuestos/subir-factura?id=${solicitudId}&token=${tokenFactura}`

  const body = `
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#16a34a;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Cotización Aprobada</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 16px">✅ Cotización ${numero} — Aprobada</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#374151;margin:0 0 20px">Hemos aprobado su cotización para los siguientes repuestos. Por favor proceda a emitir la factura formal:</p>
    ${itemsTable(items)}
    <p style="font-family:sans-serif;font-size:15px;font-weight:700;color:#111;margin:16px 0;text-align:center">Adjunte la factura a continuación:</p>
    <div style="text-align:center;margin-bottom:16px">
      <a href="${urlFactura}" style="${btnStyle('#C41E3A')}">📄 Anexar factura</a>
    </div>
    <p style="font-family:sans-serif;font-size:12px;color:#9ca3af;text-align:center">Al hacer clic podrá cargar la factura directamente en nuestro sistema.</p>`

  return getResend().emails.send({ from: FROM, to: [CORREO_VEHIMOTORS], cc: [CORREO_DIRECTOR], subject: `✅ Cotización aprobada ${numero} — La Oriental Automotors`, html: wrap(body) })
}

// ── 4. Notificación interna: factura recibida ──────────────────────
export async function notificarFacturaRecibida(opts: { numero: string; solicitudId: string; facturaUrl: string }) {
  const { numero, solicitudId, facturaUrl } = opts
  const body = `
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#7c3aed;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Factura Recibida</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 16px">📄 Nueva factura — ${numero}</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#374151;margin:0 0 24px">Vehimotors ha adjuntado la factura para la solicitud <strong>${numero}</strong>. Revísala y procede con el pago.</p>
    <div style="text-align:center;gap:12px;display:flex;justify-content:center;flex-wrap:wrap">
      <a href="${facturaUrl}" style="${btnStyle('#7c3aed')}">Ver factura</a>
      <a href="${APP_URL}/repuestos/${solicitudId}" style="${btnStyle('#C41E3A')}">Centro de Mando →</a>
    </div>`

  return getResend().emails.send({ from: FROM, to: [CORREO_DIRECTOR, CORREO_MARY ?? CORREO_DIRECTOR], cc: [CORREO_ARIANNA], subject: `📄 Factura recibida — Solicitud ${numero}`, html: wrap(body) })
}

// ── 5. Pago enviado a Vehimotors con botones Confirmar + Guía ─────
export async function enviarConfirmacionPago(opts: {
  numero: string; solicitudId: string; tokenPago: string
  comprobanteUrl: string; items: Item[]
}) {
  const { numero, solicitudId, tokenPago, comprobanteUrl, items } = opts
  const urlConfirmar = `${APP_URL}/api/repuestos/confirmar-pago?id=${solicitudId}&token=${tokenPago}&accion=confirmar`
  const urlGuia      = `${APP_URL}/api/repuestos/confirmar-pago?id=${solicitudId}&token=${tokenPago}&accion=guia`

  const body = `
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#16a34a;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Comprobante de Pago</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 16px">💰 Pago realizado — ${numero}</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#374151;margin:0 0 20px">Adjuntamos comprobante de pago para los siguientes repuestos. Por favor confirme recepción y envíe la guía de despacho.</p>
    ${itemsTable(items)}
    <div style="text-align:center;margin-bottom:16px">
      <a href="${comprobanteUrl}" style="${btnStyle('#16a34a')}">📄 Ver comprobante</a>
    </div>
    <p style="font-family:sans-serif;font-size:15px;font-weight:700;color:#111;margin:16px 0;text-align:center">¿Qué desea hacer?</p>
    <div style="text-align:center;margin-bottom:16px">
      <a href="${urlConfirmar}" style="${btnStyle('#16a34a')}">✅ Confirmar recibido</a>
      <a href="${urlGuia}"      style="${btnStyle('#2563eb')}">📦 Cargar guía de despacho</a>
    </div>`

  return getResend().emails.send({ from: FROM, to: [CORREO_VEHIMOTORS], cc: [CORREO_DIRECTOR], subject: `💰 Pago realizado — Repuestos ${numero}`, html: wrap(body) })
}
