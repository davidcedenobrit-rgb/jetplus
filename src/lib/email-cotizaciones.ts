import { Resend } from 'resend'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { CotizacionPDF, type CotizacionPDFData, type AC500ScheduleData } from './cotizacion-pdf'
import { registrarEnvioEmail, extraerResendId } from './email-tracking'

function getResend() { return new Resend(process.env.RESEND_API_KEY!) }

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrodemando.laoriental.co'
const FROM = 'La Oriental Automotors <cotizaciones@laoriental.co>'
const ROJAS = 'rojasjgx@gmail.com'

function fmt(n: number | null | undefined) {
  if (n == null) return '0,00'
  return n.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(n)*100)%100===0?0:2, maximumFractionDigits: 2 })
}

function logoUrl() {
  return `${APP_URL}/logo-la-oriental-blanco.png`
}

function headerHTML(empresa: string, conLogo: boolean) {
  const logo = conLogo
    ? `<td style="vertical-align:middle"><img src="${logoUrl()}" alt="${empresa}" style="height:44px;width:auto;display:block" /></td>`
    : ''
  return `<div style="background:#C41E3A;padding:20px 32px;border-radius:12px 12px 0 0">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      ${logo}
      <td style="${conLogo ? 'padding-left:14px;' : ''}vertical-align:middle">
        <p style="margin:0;color:#fff;font-weight:800;font-size:15px;font-family:sans-serif">${empresa}</p>
        <p style="margin:0;color:rgba(255,255,255,0.7);font-size:11px;font-family:sans-serif">MG &amp; MAXUS</p>
      </td>
    </tr></table>
  </div>`
}

function footerHTML(empresa: string) {
  return `<div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;border-radius:0 0 12px 12px;text-align:center">
    <p style="margin:0;color:#9ca3af;font-size:11px;font-family:sans-serif">${empresa} · MG &amp; MAXUS</p>
  </div>`
}

function wrap(body: string, empresa = 'LA ORIENTAL AUTOMOTORS', conLogo = true) {
  return `<div style="background:#f3f4f6;padding:24px 16px">
    <div style="background:#fff;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      ${headerHTML(empresa, conLogo)}
      <div style="padding:32px">${body}</div>
      ${footerHTML(empresa)}
    </div>
  </div>`
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:7px 0;font-family:sans-serif;font-size:12px;color:#6b7280;font-weight:600;width:42%;vertical-align:top;border-bottom:1px solid #f3f4f6">${label}</td>
    <td style="padding:7px 0;font-family:sans-serif;font-size:13px;color:#111;font-weight:700;vertical-align:top;border-bottom:1px solid #f3f4f6">${value}</td>
  </tr>`
}

export async function enviarCotizacionCliente(data: CotizacionPDFData, tokenRespuesta: string, cotizacionId?: string) {
  const resend = getResend()

  const pdfBuffer = await renderToBuffer(
    React.createElement(CotizacionPDF, { data }) as React.ReactElement<any>
  )

  const isAC500 = data.plan === 'ac500'
  const es24 = data.modalidad === 'credito_24'
  const modalidadLabel = isAC500
    ? `Plan Asegúrate $500 — ${data.ac500Schedule?.meses} meses`
    : es24 ? 'Crédito 24 meses' : 'Contado'
  const responderUrl = `${APP_URL}/responder/${tokenRespuesta}`

  // AC500 schedule table for email
  const ac500ScheduleHTML = isAC500 && data.ac500Schedule ? `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px 18px;margin-bottom:18px">
      <p style="font-family:sans-serif;font-size:11px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 10px">
        Cronograma de pagos — ${data.ac500Schedule.meses} meses
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr style="border-bottom:1px solid #bfdbfe">
          <td style="padding:6px 0;font-family:sans-serif;font-size:12px;color:#1e3a5f;font-weight:800;border-bottom:1px solid #bfdbfe">Cuota 0 — RESERVA</td>
          <td style="padding:6px 0;font-family:sans-serif;font-size:13px;color:#1e3a5f;font-weight:800;text-align:right;border-bottom:1px solid #bfdbfe">$${fmt(data.ac500Schedule.reserva)}</td>
        </tr>
        ${data.ac500Schedule.cuotas.map(c => `
        <tr>
          <td style="padding:5px 0;font-family:sans-serif;font-size:12px;color:#6b7280;border-bottom:1px solid #dbeafe">${c.label}</td>
          <td style="padding:5px 0;font-family:sans-serif;font-size:12px;color:#1e40af;font-weight:700;text-align:right;border-bottom:1px solid #dbeafe">$${fmt(c.monto)}</td>
        </tr>`).join('')}
        <tr>
          <td style="padding:8px 0 0;font-family:sans-serif;font-size:13px;color:#1e3a5f;font-weight:800">TOTAL A PAGAR</td>
          <td style="padding:8px 0 0;font-family:sans-serif;font-size:15px;color:#1e3a5f;font-weight:800;text-align:right">$${fmt(data.ac500Schedule.total)}</td>
        </tr>
      </table>
    </div>
  ` : ''

  const body = `
    <p style="font-family:sans-serif;font-size:12px;font-weight:700;color:#C41E3A;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px">${isAC500 ? 'Plan Asegúrate $500' : 'Cotización de vehículo'}</p>
    <h1 style="font-family:sans-serif;font-size:20px;font-weight:800;color:#111;margin:0 0 4px">Estimado/a ${data.clienteNombre}</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#6b7280;margin:0 0 24px">Adjunto encontrará su ${isAC500 ? 'plan de reserva' : 'cotización formal'}. Tiene una validez de 2 días.</p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin-bottom:18px">
      <p style="font-family:sans-serif;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px">Resumen de cotización</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${row('N° Cotización', `<span style="font-family:monospace;color:#C41E3A;font-size:14px">${data.numero}</span>`)}
        ${row('Vehículo', `${data.marca} ${data.modelo}`)}
        ${row('Modalidad', modalidadLabel)}
        ${isAC500
          ? row('Reserva (Cuota 0)', `<span style="font-size:16px;color:#1e3a5f;font-weight:800">$${fmt(data.ac500Schedule?.reserva)}</span>`)
          : es24
          ? row('Inicial a pagar', `<span style="font-size:16px;color:#92400e">$${fmt(data.totalInicial)}</span>`)
          : row('Total a pagar', `<span style="font-size:16px;color:#111">$${fmt(data.totalInicial)}</span>`)
        }
        ${es24 && data.cuotaMensual ? row('Cuota mensual (24m)', `<span style="font-size:15px;color:#92400e">$${fmt(data.cuotaMensual)}</span>`) : ''}
        ${isAC500 ? row('Total del plan', `<span style="font-size:15px;color:#1e3a5f;font-weight:800">$${fmt(data.costoTotal)}</span>`) : ''}
        ${row('Válida hasta', data.vencimiento)}
      </table>
    </div>

    ${ac500ScheduleHTML}

    <div style="background:#f0fdf4;border:1px solid rgba(34,197,94,0.25);border-radius:12px;padding:20px 22px;margin-bottom:12px">
      <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#15803d;margin:0 0 14px">¿Qué deseas hacer con esta cotización?</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-bottom:10px">
            <a href="${responderUrl}?r=aceptar"
              style="display:block;background:#16a34a;color:#fff;padding:13px 16px;border-radius:10px;text-decoration:none;font-family:sans-serif;font-size:14px;font-weight:800;text-align:center">
              ✅ Sí, acepto esta cotización
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:10px">
            <a href="${responderUrl}?r=posponer"
              style="display:block;background:#fff;color:#374151;padding:12px 16px;border-radius:10px;text-decoration:none;font-family:sans-serif;font-size:14px;font-weight:700;text-align:center;border:2px solid #d1d5db">
              ⏸ Por ahora no compraré
            </a>
          </td>
        </tr>
        <tr>
          <td>
            <a href="${responderUrl}?r=rechazar"
              style="display:block;background:#fff;color:#dc2626;padding:12px 16px;border-radius:10px;text-decoration:none;font-family:sans-serif;font-size:14px;font-weight:700;text-align:center;border:2px solid #fecaca">
              ❌ No me interesa / Rechazar
            </a>
          </td>
        </tr>
      </table>
    </div>

    <div style="background:#fffbeb;border:1px solid rgba(234,179,8,0.3);border-radius:10px;padding:14px 18px;margin-bottom:20px">
      <p style="font-family:sans-serif;font-size:12px;color:#92400e;margin:0">
        💬 ¿Preguntas? Contáctanos directamente por
        <a href="https://wa.me/584149989010" style="color:#92400e;font-weight:700">WhatsApp</a>
        o responde este correo.
      </p>
    </div>

    <p style="font-family:sans-serif;font-size:12px;color:#9ca3af;margin:0">* Precios referenciales sujetos a disponibilidad. Consulte con su asesor para confirmar.</p>
  `

  const empresa = data.empresaNombre ?? 'LA ORIENTAL AUTOMOTORS'
  const esLaOriental = empresa.toUpperCase().includes('ORIENTAL')
  const fromDinamico = `${empresa} <cotizaciones@laoriental.co>`
  const asunto = `Cotización ${data.numero} — ${data.marca} ${data.modelo} · ${empresa}`
  const resendResult = await resend.emails.send({
    from: fromDinamico,
    to: [data.clienteCorreo],
    subject: asunto,
    html: wrap(body, empresa, esLaOriental),
    attachments: [{
      filename: `${data.numero}.pdf`,
      content: Buffer.from(pdfBuffer),
    }],
  })

  if ((resendResult as any).error) throw new Error(`Resend error (cliente): ${JSON.stringify((resendResult as any).error)}`)

  const resendId = extraerResendId(resendResult)
  if (resendId) {
    await registrarEnvioEmail({
      resendEmailId: resendId,
      entidadTipo: 'cotizacion',
      entidadId: cotizacionId ?? null,
      destinatarios: [data.clienteCorreo],
      asunto,
      metadata: { numero: data.numero, marca: data.marca, modelo: data.modelo },
    })
  }
}

export async function enviarNotificacionRojas(opts: {
  numero: string
  vendedoraNombre: string
  clienteNombre: string
  clienteCorreo: string
  clienteCiRif: string
  marca: string
  modelo: string
  modalidad: 'contado' | 'credito_24'
  plan?: 'vehimotors' | 'banco_100' | 'ac500'
  totalInicial: number
  cuotaMensual: number | null
  costoTotal: number
  fecha: string
  ac500Schedule?: AC500ScheduleData
}) {
  const resend = getResend()
  const isAC500 = opts.plan === 'ac500'
  const es24 = opts.modalidad === 'credito_24'
  const modalidadLabel = isAC500
    ? `Asegúrate $500 — ${opts.ac500Schedule?.meses ?? ''}m`
    : es24 ? 'Crédito 24 meses' : 'Contado'

  const body = `
    <p style="font-family:sans-serif;font-size:12px;font-weight:700;color:#C41E3A;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px">Nueva cotización generada</p>
    <h1 style="font-family:sans-serif;font-size:18px;font-weight:800;color:#111;margin:0 0 4px">${opts.vendedoraNombre} generó una cotización</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#6b7280;margin:0 0 24px">Se ha enviado la cotización al correo del cliente.</p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin-bottom:18px">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${row('N° Cotización', `<span style="font-family:monospace;color:#C41E3A">${opts.numero}</span>`)}
        ${row('Vendedora', opts.vendedoraNombre)}
        ${row('Cliente', opts.clienteNombre)}
        ${row('C.I./RIF', opts.clienteCiRif)}
        ${row('Correo cliente', opts.clienteCorreo)}
        ${row('Vehículo', `${opts.marca} ${opts.modelo}`)}
        ${row('Modalidad', modalidadLabel)}
        ${isAC500
          ? row('Reserva (Cuota 0)', `<strong style="font-size:15px;color:#1e3a5f">$${fmt(opts.ac500Schedule?.reserva)}</strong>`)
          : es24
          ? row('Inicial a pagar', `<strong style="font-size:15px;color:#92400e">$${fmt(opts.totalInicial)}</strong>`)
          : row('Total a pagar', `<strong style="font-size:15px">$${fmt(opts.totalInicial)}</strong>`)
        }
        ${es24 && opts.cuotaMensual ? row('Cuota mensual (24m)', `<strong style="font-size:15px;color:#92400e">$${fmt(opts.cuotaMensual)}</strong>`) : ''}
        ${isAC500 ? row('Total del plan', `<strong style="font-size:15px;color:#1e3a5f">$${fmt(opts.costoTotal)}</strong>`) : ''}
        ${row('Fecha', opts.fecha)}
      </table>
    </div>

    <a href="${APP_URL}/link-ventas"
      style="display:inline-block;background:#111;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-family:sans-serif;font-size:13px;font-weight:700">
      Ver en Centro de Mando →
    </a>
  `

  const { error } = await resend.emails.send({
    from: FROM,
    to: [ROJAS],
    subject: `[${opts.vendedoraNombre}] Cotización ${opts.numero} — ${opts.clienteNombre} · ${opts.marca} ${opts.modelo}`,
    html: wrap(body),
  })

  if (error) throw new Error(`Resend error (rojas): ${JSON.stringify(error)}`)
}

export async function enviarNotificacionDescuento(opts: {
  numero: string
  clienteNombre: string
  clienteCorreo: string
  marca: string
  modelo: string
  totalInicial: number
  cuotaMensual: number | null
  motivo: string | null
  cotizacionId: string
}) {
  const resend = getResend()

  const body = `
    <p style="font-family:sans-serif;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px">💬 Solicitud de revisión de precio</p>
    <h1 style="font-family:sans-serif;font-size:18px;font-weight:800;color:#111;margin:0 0 4px">Un cliente pidió revisión del precio</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#6b7280;margin:0 0 24px">El cliente ha solicitado una revisión del precio antes de tomar una decisión.</p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin-bottom:18px">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${row('N° Cotización', `<span style="font-family:monospace;color:#C41E3A">${opts.numero}</span>`)}
        ${row('Cliente', opts.clienteNombre)}
        ${row('Correo', opts.clienteCorreo)}
        ${row('Vehículo', `${opts.marca} ${opts.modelo}`)}
        ${row('Total inicial', `<strong style="font-size:15px;color:#92400e">$${fmt(opts.totalInicial)}</strong>`)}
        ${opts.cuotaMensual ? row('Cuota mensual', `<strong>$${fmt(opts.cuotaMensual)}</strong>`) : ''}
      </table>
    </div>

    ${opts.motivo ? `
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:18px">
      <p style="font-family:sans-serif;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6px">Mensaje del cliente</p>
      <p style="font-family:sans-serif;font-size:14px;color:#111;margin:0;font-style:italic">"${opts.motivo}"</p>
    </div>
    ` : ''}

    <a href="${APP_URL}/link-ventas"
      style="display:inline-block;background:#92400e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-family:sans-serif;font-size:14px;font-weight:700">
      Editar y reenviar cotización →
    </a>
  `

  const { error } = await resend.emails.send({
    from: FROM,
    to: [ROJAS],
    subject: `💬 ${opts.clienteNombre} solicita revisión de precio — ${opts.numero} · ${opts.marca} ${opts.modelo}`,
    html: wrap(body),
  })

  if (error) throw new Error(`Resend error (descuento): ${JSON.stringify(error)}`)
}

export async function enviarNotificacionRespuestaCliente(opts: {
  numero: string
  cotizacionId: string
  estado: 'aceptada' | 'rechazada' | 'pospuesta'
  motivo?: string | null
  clienteNombre: string
  clienteCorreo: string
  clienteTelefono?: string | null
  vendedoraNombre?: string | null
  marca: string
  modelo: string
  totalInicial: number
  cuotaMensual: number | null
}) {
  const resend = getResend()

  const CFG = {
    aceptada:  { emoji: '✅', label: 'ACEPTÓ la cotización', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
    rechazada: { emoji: '❌', label: 'RECHAZÓ la cotización', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
    pospuesta: { emoji: '⏸',  label: 'pospuso la decisión', color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff' },
  } as const
  const cfg = CFG[opts.estado]

  const body = `
    <p style="font-family:sans-serif;font-size:12px;font-weight:700;color:${cfg.color};text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px">${cfg.emoji} Respuesta recibida</p>
    <h1 style="font-family:sans-serif;font-size:20px;font-weight:800;color:#111;margin:0 0 4px">${opts.clienteNombre} ${cfg.label}</h1>
    <p style="font-family:sans-serif;font-size:13px;color:#6b7280;margin:0 0 22px">La respuesta acaba de registrarse en el Centro de Mando.</p>

    <div style="background:${cfg.bg};border:1px solid ${cfg.border};border-radius:10px;padding:18px 20px;margin-bottom:18px">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${row('N° Cotización', `<span style="font-family:monospace;color:#C41E3A">${opts.numero}</span>`)}
        ${row('Cliente', opts.clienteNombre)}
        ${row('Correo', opts.clienteCorreo)}
        ${opts.clienteTelefono ? row('Teléfono', opts.clienteTelefono) : ''}
        ${row('Vehículo', `${opts.marca} ${opts.modelo}`)}
        ${row('Total inicial', `<strong style="font-size:15px;color:${cfg.color}">$${fmt(opts.totalInicial)}</strong>`)}
        ${opts.cuotaMensual ? row('Cuota mensual', `<strong>$${fmt(opts.cuotaMensual)}</strong>`) : ''}
        ${opts.vendedoraNombre ? row('Vendedora', opts.vendedoraNombre) : ''}
      </table>
    </div>

    ${opts.motivo ? `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;margin-bottom:18px">
      <p style="font-family:sans-serif;font-size:11px;font-weight:700;color:#b91c1c;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6px">Motivo indicado por el cliente</p>
      <p style="font-family:sans-serif;font-size:14px;color:#111;margin:0;font-style:italic">"${opts.motivo}"</p>
    </div>
    ` : ''}

    <a href="${APP_URL}/link-ventas"
      style="display:inline-block;background:${cfg.color};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-family:sans-serif;font-size:14px;font-weight:700">
      Abrir cotización en el Centro de Mando →
    </a>
  `

  const subject =
    opts.estado === 'aceptada'  ? `✅ ${opts.clienteNombre} aceptó la cotización ${opts.numero}` :
    opts.estado === 'rechazada' ? `❌ ${opts.clienteNombre} rechazó la cotización ${opts.numero}` :
                                  `⏸ ${opts.clienteNombre} pospuso la cotización ${opts.numero}`

  const { error } = await resend.emails.send({
    from: FROM,
    to: [ROJAS],
    subject,
    html: wrap(body),
  })

  if (error) throw new Error(`Resend error (respuesta): ${JSON.stringify(error)}`)
}
