import { Resend } from 'resend'

function getResend() { return new Resend(process.env.RESEND_API_KEY!) }

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrodemando.laoriental.co'

// ── Vehimotors (proveedor externo) ──────────────────────────────────
const TO_VEHIMOTORS = [
  process.env.CORREO_VEHIMOTORS_1 ?? 'aaparicio@saicve.com',
  process.env.CORREO_VEHIMOTORS_2 ?? 'repuestos@saicve.com',
  process.env.CORREO_VEHIMOTORS_3 ?? 'fdiaz@saicve.com',
]

// ── La Oriental (equipo interno) ─────────────────────────────────────
const CORREO_ROJAS   = process.env.CORREO_ROJAS   ?? 'rojasjgx@gmail.com'
const CORREO_MARY    = process.env.CORREO_MARY    ?? 'laorientalautomotorsc@gmail.com'
const CORREO_OPS     = process.env.CORREO_OPS     ?? 'repuestos.laoriental.mun@gmail.com'

// Reciben cuando llega guía, confirmación de pago o recepción
const EQUIPO_INTERNO = [CORREO_MARY, CORREO_ROJAS, CORREO_OPS]

const FROM = 'repuestos@laoriental.co'

export interface Item { descripcion: string; referencia?: string | null; cantidad: number }

function headerHTML() {
  const logoUrl = `${APP_URL}/logo-la-oriental-blanco.png`
  return `<div style="background:#C41E3A;padding:20px 32px;border-radius:12px 12px 0 0">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle"><img src="${logoUrl}" alt="La Oriental Automotors" style="height:48px;width:auto;display:block" /></td>
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
      <th style="padding:10px 14px;text-align:center;font-family:sans-serif;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em">Código</th>
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

  return getResend().emails.send({ from: FROM, to: TO_VEHIMOTORS, cc: [CORREO_ROJAS], subject: `Solicitud de cotización ${numero} — La Oriental Automotors`, html: wrap(body) })
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

  return getResend().emails.send({ from: FROM, to: [CORREO_OPS], cc: [CORREO_ROJAS], subject: `${t.emoji} Vehimotors respondió — Solicitud ${numero}`, html: wrap(body) })
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

  return getResend().emails.send({ from: FROM, to: TO_VEHIMOTORS, cc: [CORREO_ROJAS], subject: `✅ Cotización aprobada ${numero} — La Oriental Automotors`, html: wrap(body) })
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

  return getResend().emails.send({ from: FROM, to: [CORREO_MARY, CORREO_ROJAS], subject: `📄 Factura recibida — Solicitud ${numero}`, html: wrap(body) })
}

// ── 6. Reporte de recepción a Vehimotors (Arianna) ────────────────
export async function enviarReporteRecepcion(opts: {
  numero: string; solicitudId: string
  tieneNovedad: boolean; notas?: string | null; fotoUrl?: string | null
}) {
  const { numero, solicitudId, tieneNovedad, notas, fotoUrl } = opts

  const body = tieneNovedad ? `
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#d97706;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Reporte de Recepción</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 16px">⚠️ Novedad en pedido — ${numero}</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#374151;margin:0 0 16px">Se reporta una novedad en la recepción del pedido <strong>${numero}</strong>. Por favor tomar nota y coordinar solución.</p>
    ${notas ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px;margin-bottom:20px">
      <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#92400e;margin:0 0 6px">Detalles de la novedad:</p>
      <p style="font-family:sans-serif;font-size:14px;color:#78350f;margin:0">${notas}</p>
    </div>` : ''}
    ${fotoUrl ? `<div style="text-align:center;margin-bottom:20px"><a href="${fotoUrl}" style="${btnStyle('#d97706')}">📷 Ver foto adjunta</a></div>` : ''}
    <div style="text-align:center"><a href="${APP_URL}/repuestos/${solicitudId}" style="${btnStyle('#C41E3A')}">Ver en Centro de Mando →</a></div>`
  : `
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#16a34a;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Reporte de Recepción</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 16px">✅ Pedido recibido sin novedad — ${numero}</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#374151;margin:0 0 24px">El pedido <strong>${numero}</strong> fue recibido en nuestro taller en perfectas condiciones. Sin novedades. Gracias.</p>
    <div style="text-align:center"><a href="${APP_URL}/repuestos/${solicitudId}" style="${btnStyle('#C41E3A')}">Ver en Centro de Mando →</a></div>`

  const asunto = tieneNovedad
    ? `⚠️ Novedad en pedido ${numero} — La Oriental Automotors`
    : `✅ Pedido ${numero} recibido sin novedad — La Oriental Automotors`

  return getResend().emails.send({ from: FROM, to: TO_VEHIMOTORS, cc: [CORREO_ROJAS], subject: asunto, html: wrap(body) })
}
export async function enviarConfirmacionPago(opts: {
  numero: string; solicitudId: string; tokenPago: string
  comprobanteUrl: string; items: Item[]; retencionUrl?: string | null
}) {
  const { numero, solicitudId, tokenPago, comprobanteUrl, items, retencionUrl } = opts
  const urlConfirmar = `${APP_URL}/api/repuestos/confirmar-pago?id=${solicitudId}&token=${tokenPago}&accion=confirmar`
  const urlGuia      = `${APP_URL}/api/repuestos/confirmar-pago?id=${solicitudId}&token=${tokenPago}&accion=guia`

  const body = `
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#16a34a;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Comprobante de Pago</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 16px">💰 Pago realizado — ${numero}</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#374151;margin:0 0 20px">Adjuntamos comprobante de pago para los siguientes repuestos. Por favor confirme recepción y envíe la guía de despacho.</p>
    ${itemsTable(items)}
    <div style="text-align:center;margin-bottom:16px">
      <a href="${comprobanteUrl}" style="${btnStyle('#16a34a')}">📄 Ver comprobante</a>
      ${retencionUrl ? `<a href="${retencionUrl}" style="${btnStyle('#7c3aed')}">📋 Ver retenciones</a>` : ''}
    </div>
    <p style="font-family:sans-serif;font-size:15px;font-weight:700;color:#111;margin:16px 0;text-align:center">¿Qué desea hacer?</p>
    <div style="text-align:center;margin-bottom:16px">
      <a href="${urlConfirmar}" style="${btnStyle('#16a34a')}">✅ Confirmar recibido</a>
      <a href="${urlGuia}"      style="${btnStyle('#2563eb')}">📦 Cargar guía de despacho</a>
    </div>`

  return getResend().emails.send({ from: FROM, to: TO_VEHIMOTORS, cc: [CORREO_ROJAS], subject: `💰 Pago realizado — Repuestos ${numero}`, html: wrap(body) })
}

// ── 8. Email a almacén para cargar guía ──────────────────────────
export async function enviarEmailAlmacen(opts: {
  numero: string; solicitudId: string; tokenAlmacen: string
  numeroCotizacion: string; correosAlmacen: string[]
}) {
  const { numero, solicitudId, tokenAlmacen, numeroCotizacion, correosAlmacen } = opts
  const urlAlmacen = `${APP_URL}/api/repuestos/almacen?id=${solicitudId}&token=${tokenAlmacen}`

  const body = `
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#2563eb;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Envío de Repuestos</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 16px">📦 Pedido listo para despacho — ${numero}</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#374151;margin:0 0 16px">Se ha procesado el pago del pedido <strong>${numero}</strong>. Por favor registre los datos de envío una vez despachado.</p>
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px;margin-bottom:24px">
      <p style="font-family:sans-serif;font-size:12px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px">Número de cotización</p>
      <p style="font-family:monospace;font-size:20px;font-weight:900;color:#0c4a6e;margin:0">${numeroCotizacion}</p>
    </div>
    <p style="font-family:sans-serif;font-size:15px;font-weight:700;color:#111;margin:0 0 16px;text-align:center">Al despachar, registre los datos de envío:</p>
    <div style="text-align:center;margin-bottom:16px">
      <a href="${urlAlmacen}" style="${btnStyle('#2563eb')}">📦 Registrar datos de envío</a>
    </div>
    <p style="font-family:sans-serif;font-size:12px;color:#9ca3af;text-align:center">Al hacer clic podrá cargar la empresa de envío, número de guía y comprobante.</p>`

  return getResend().emails.send({
    from: FROM,
    to: correosAlmacen,
    cc: [CORREO_ROJAS],
    subject: `📦 Pedido ${numero} — Registrar datos de envío`,
    html: wrap(body),
  })
}

// ── Notificación interna: guía registrada por almacén / Vehimotors ──
export async function notificarGuiaRegistrada(opts: { numero: string; solicitudId: string; numeroGuia?: string | null; empresaEnvio?: string | null }) {
  const { numero, solicitudId, numeroGuia, empresaEnvio } = opts
  const body = `
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#0369a1;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Guía Registrada</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 16px">🚚 Guía de despacho recibida — ${numero}</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#374151;margin:0 0 20px">Se registró la guía de despacho para el pedido <strong>${numero}</strong>.</p>
    ${(numeroGuia || empresaEnvio) ? `<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px;margin-bottom:20px">
      ${empresaEnvio ? `<p style="font-family:sans-serif;font-size:12px;font-weight:700;color:#0369a1;text-transform:uppercase;margin:0 0 2px">Empresa de envío</p><p style="font-family:sans-serif;font-size:15px;font-weight:700;color:#0c4a6e;margin:0 0 10px">${empresaEnvio}</p>` : ''}
      ${numeroGuia ? `<p style="font-family:sans-serif;font-size:12px;font-weight:700;color:#0369a1;text-transform:uppercase;margin:0 0 2px">Número de guía</p><p style="font-family:monospace;font-size:18px;font-weight:900;color:#0c4a6e;margin:0">${numeroGuia}</p>` : ''}
    </div>` : ''}
    <div style="text-align:center"><a href="${APP_URL}/repuestos/${solicitudId}" style="${btnStyle('#C41E3A')}">Ver en Centro de Mando →</a></div>`

  return getResend().emails.send({ from: FROM, to: EQUIPO_INTERNO, subject: `🚚 Guía registrada — Solicitud ${numero}`, html: wrap(body) })
}

// ── Notificación interna: pago confirmado por Vehimotors ─────────────
export async function notificarPagoConfirmado(opts: { numero: string; solicitudId: string }) {
  const { numero, solicitudId } = opts
  const body = `
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#16a34a;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Pago Confirmado</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 16px">✅ Vehimotors confirmó el pago — ${numero}</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#374151;margin:0 0 24px">Vehimotors confirmó la recepción del pago para la solicitud <strong>${numero}</strong>.</p>
    <div style="text-align:center"><a href="${APP_URL}/repuestos/${solicitudId}" style="${btnStyle('#C41E3A')}">Ver en Centro de Mando →</a></div>`

  return getResend().emails.send({ from: FROM, to: EQUIPO_INTERNO, subject: `✅ Pago confirmado por Vehimotors — ${numero}`, html: wrap(body) })
}

// ── Prueba: envía todos los templates al listado de correos indicado ──
export async function enviarCorreosPrueba(testTo: string[]) {
  const resend = getResend()
  const numero    = 'SORE-2026-PRUEBA'
  const fakeId    = 'test-solicitud-id'
  const fakeFileUrl = `${APP_URL}/logo-la-oriental-blanco.png`
  const items: Item[] = [
    { descripcion: 'Filtro de aceite MG ZS 1.5T',          referencia: 'LQJ100U8250A', cantidad: 2 },
    { descripcion: 'Pastillas freno delanteras Maxus T60',  referencia: 'MCB-T60-D22',  cantidad: 1 },
    { descripcion: 'Correa de distribución ZS EV',          referencia: 'LQB130001000', cantidad: 1 },
  ]
  const results: Array<{ subject: string; ok: boolean; error?: string }> = []

  async function send(subject: string, html: string) {
    try {
      await resend.emails.send({ from: FROM, to: testTo, subject, html })
      results.push({ subject, ok: true })
    } catch (e) {
      results.push({ subject, ok: false, error: String(e) })
    }
  }

  await send(`[PRUEBA 1/9] Solicitud de cotización ${numero}`, wrap(`
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#C41E3A;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Solicitud de Cotización</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 6px">Repuestos — ${numero}</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#6b7280;margin:0 0 24px">Por favor indíquenos disponibilidad y precios para los siguientes repuestos:</p>
    ${itemsTable(items)}
    <p style="font-family:sans-serif;font-size:15px;font-weight:700;color:#111;margin:0 0 16px;text-align:center">¿Tienen disponibilidad?</p>
    <div style="text-align:center;margin-bottom:24px">
      <a href="#" style="${btnStyle('#16a34a')}">✅ Sí, hay todo</a>
      <a href="#" style="${btnStyle('#d97706')}">⚠️ No hay todos</a>
      <a href="#" style="${btnStyle('#dc2626')}">❌ No hay</a>
    </div>
    <p style="font-family:sans-serif;font-size:12px;color:#9ca3af;text-align:center"><em>[Destino real: Vehimotors × 3 + CC Rojas]</em></p>`))

  await send(`[PRUEBA 2a/9] ✅ Vehimotors respondió — hay todo — ${numero}`, wrap(`
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#16a34a;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Respuesta de Vehimotors</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 16px">✅ Hay todo disponible</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#374151;margin:0 0 24px">Vehimotors respondió a la solicitud <strong>${numero}</strong>. Revisa la cotización en el Centro de Mando y apruébala para continuar.</p>
    <div style="text-align:center"><a href="${APP_URL}/repuestos/${fakeId}" style="${btnStyle('#C41E3A')}">Ver en Centro de Mando →</a></div>
    <p style="font-family:sans-serif;font-size:12px;color:#9ca3af;text-align:center;margin-top:16px"><em>[Destino real: Ops + CC Rojas]</em></p>`))

  await send(`[PRUEBA 2b/9] ❌ Vehimotors respondió — sin stock — ${numero}`, wrap(`
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#dc2626;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Respuesta de Vehimotors</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 16px">❌ Sin disponibilidad</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#374151;margin:0 0 24px">Vehimotors respondió a la solicitud <strong>${numero}</strong>. Sin disponibilidad de los repuestos solicitados.</p>
    <div style="text-align:center"><a href="${APP_URL}/repuestos/${fakeId}" style="${btnStyle('#C41E3A')}">Ver en Centro de Mando →</a></div>
    <p style="font-family:sans-serif;font-size:12px;color:#9ca3af;text-align:center;margin-top:16px"><em>[Destino real: Ops + CC Rojas]</em></p>`))

  await send(`[PRUEBA 2c/9] ⚠️ Vehimotors respondió — parcial — ${numero}`, wrap(`
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#d97706;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Respuesta de Vehimotors</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 16px">⚠️ Disponibilidad parcial</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#374151;margin:0 0 24px">Vehimotors respondió a la solicitud <strong>${numero}</strong>. Solo algunos repuestos están disponibles.</p>
    <div style="text-align:center"><a href="${APP_URL}/repuestos/${fakeId}" style="${btnStyle('#C41E3A')}">Ver en Centro de Mando →</a></div>
    <p style="font-family:sans-serif;font-size:12px;color:#9ca3af;text-align:center;margin-top:16px"><em>[Destino real: Ops + CC Rojas]</em></p>`))

  await send(`[PRUEBA 3/9] ✅ Cotización aprobada ${numero}`, wrap(`
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#16a34a;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Cotización Aprobada</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 16px">✅ Cotización ${numero} — Aprobada</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#374151;margin:0 0 20px">Hemos aprobado su cotización para los siguientes repuestos. Por favor proceda a emitir la factura formal:</p>
    ${itemsTable(items)}
    <div style="text-align:center;margin-bottom:16px"><a href="#" style="${btnStyle('#C41E3A')}">📄 Anexar factura</a></div>
    <p style="font-family:sans-serif;font-size:12px;color:#9ca3af;text-align:center"><em>[Destino real: Vehimotors × 3 + CC Rojas]</em></p>`))

  await send(`[PRUEBA 4/9] 📄 Factura recibida — ${numero}`, wrap(`
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#7c3aed;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Factura Recibida</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 16px">📄 Nueva factura — ${numero}</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#374151;margin:0 0 24px">Vehimotors ha adjuntado la factura para la solicitud <strong>${numero}</strong>. Revísala y procede con el pago.</p>
    <div style="text-align:center;gap:12px;display:flex;justify-content:center;flex-wrap:wrap">
      <a href="${fakeFileUrl}" style="${btnStyle('#7c3aed')}">Ver factura</a>
      <a href="${APP_URL}/repuestos/${fakeId}" style="${btnStyle('#C41E3A')}">Centro de Mando →</a>
    </div>
    <p style="font-family:sans-serif;font-size:12px;color:#9ca3af;text-align:center;margin-top:16px"><em>[Destino real: Mary + Rojas]</em></p>`))

  await send(`[PRUEBA 5/9] 💰 Pago realizado — ${numero}`, wrap(`
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#16a34a;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Comprobante de Pago</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 16px">💰 Pago realizado — ${numero}</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#374151;margin:0 0 20px">Adjuntamos comprobante de pago para los siguientes repuestos. Por favor confirme recepción y envíe la guía de despacho.</p>
    ${itemsTable(items)}
    <div style="text-align:center;margin-bottom:16px">
      <a href="${fakeFileUrl}" style="${btnStyle('#16a34a')}">📄 Ver comprobante</a>
    </div>
    <div style="text-align:center;margin-bottom:16px">
      <a href="#" style="${btnStyle('#16a34a')}">✅ Confirmar recibido</a>
      <a href="#" style="${btnStyle('#2563eb')}">📦 Cargar guía de despacho</a>
    </div>
    <p style="font-family:sans-serif;font-size:12px;color:#9ca3af;text-align:center"><em>[Destino real: Vehimotors × 3 + CC Rojas]</em></p>`))

  await send(`[PRUEBA 6/9] 🚚 Guía registrada — ${numero}`, wrap(`
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#0369a1;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Guía Registrada</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 16px">🚚 Guía de despacho recibida — ${numero}</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#374151;margin:0 0 20px">Se registró la guía de despacho para el pedido <strong>${numero}</strong>.</p>
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px;margin-bottom:20px">
      <p style="font-family:sans-serif;font-size:12px;font-weight:700;color:#0369a1;text-transform:uppercase;margin:0 0 2px">Empresa de envío</p>
      <p style="font-family:sans-serif;font-size:15px;font-weight:700;color:#0c4a6e;margin:0 0 10px">MRW Maturín</p>
      <p style="font-family:sans-serif;font-size:12px;font-weight:700;color:#0369a1;text-transform:uppercase;margin:0 0 2px">Número de guía</p>
      <p style="font-family:monospace;font-size:18px;font-weight:900;color:#0c4a6e;margin:0">00123456789</p>
    </div>
    <div style="text-align:center"><a href="${APP_URL}/repuestos/${fakeId}" style="${btnStyle('#C41E3A')}">Ver en Centro de Mando →</a></div>
    <p style="font-family:sans-serif;font-size:12px;color:#9ca3af;text-align:center;margin-top:16px"><em>[Destino real: Mary + Rojas + repuestos.laoriental.mun]</em></p>`))

  await send(`[PRUEBA 7/9] ✅ Pago confirmado por Vehimotors — ${numero}`, wrap(`
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#16a34a;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Pago Confirmado</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 16px">✅ Vehimotors confirmó el pago — ${numero}</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#374151;margin:0 0 24px">Vehimotors confirmó la recepción del pago para la solicitud <strong>${numero}</strong>.</p>
    <div style="text-align:center"><a href="${APP_URL}/repuestos/${fakeId}" style="${btnStyle('#C41E3A')}">Ver en Centro de Mando →</a></div>
    <p style="font-family:sans-serif;font-size:12px;color:#9ca3af;text-align:center;margin-top:16px"><em>[Destino real: Mary + Rojas + repuestos.laoriental.mun]</em></p>`))

  await send(`[PRUEBA 8/9] 📦 Email a almacén — ${numero}`, wrap(`
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#2563eb;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Envío de Repuestos</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 16px">📦 Pedido listo para despacho — ${numero}</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#374151;margin:0 0 16px">Se ha procesado el pago del pedido <strong>${numero}</strong>. Por favor registre los datos de envío una vez despachado.</p>
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px;margin-bottom:24px">
      <p style="font-family:sans-serif;font-size:12px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px">Número de cotización</p>
      <p style="font-family:monospace;font-size:20px;font-weight:900;color:#0c4a6e;margin:0">COT-2026-0042</p>
    </div>
    <div style="text-align:center;margin-bottom:16px"><a href="#" style="${btnStyle('#2563eb')}">📦 Registrar datos de envío</a></div>
    <p style="font-family:sans-serif;font-size:12px;color:#9ca3af;text-align:center"><em>[Destino real: almacén Vehimotors + CC Rojas]</em></p>`))

  await send(`[PRUEBA 9a/9] ✅ Pedido recibido sin novedad — ${numero}`, wrap(`
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#16a34a;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Reporte de Recepción</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 16px">✅ Pedido recibido sin novedad — ${numero}</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#374151;margin:0 0 24px">El pedido <strong>${numero}</strong> fue recibido en nuestro taller en perfectas condiciones. Sin novedades. Gracias.</p>
    <div style="text-align:center"><a href="${APP_URL}/repuestos/${fakeId}" style="${btnStyle('#C41E3A')}">Ver en Centro de Mando →</a></div>
    <p style="font-family:sans-serif;font-size:12px;color:#9ca3af;text-align:center;margin-top:16px"><em>[Destino real: Vehimotors × 3 + CC Rojas]</em></p>`))

  await send(`[PRUEBA 9b/9] ⚠️ Novedad en pedido — ${numero}`, wrap(`
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#d97706;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Reporte de Recepción</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 16px">⚠️ Novedad en pedido — ${numero}</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#374151;margin:0 0 16px">Se reporta una novedad en la recepción del pedido <strong>${numero}</strong>. Por favor tomar nota y coordinar solución.</p>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px;margin-bottom:20px">
      <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#92400e;margin:0 0 6px">Detalles de la novedad:</p>
      <p style="font-family:sans-serif;font-size:14px;color:#78350f;margin:0">Faltaron 2 filtros de aceite en el paquete. El resto del pedido llegó completo y en buen estado.</p>
    </div>
    <div style="text-align:center"><a href="${APP_URL}/repuestos/${fakeId}" style="${btnStyle('#C41E3A')}">Ver en Centro de Mando →</a></div>
    <p style="font-family:sans-serif;font-size:12px;color:#9ca3af;text-align:center;margin-top:16px"><em>[Destino real: Vehimotors × 3 + CC Rojas]</em></p>`))

  return results
}
