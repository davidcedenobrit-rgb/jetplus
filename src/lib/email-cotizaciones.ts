import { Resend } from 'resend'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { CotizacionPDF, type CotizacionPDFData } from './cotizacion-pdf'

function getResend() { return new Resend(process.env.RESEND_API_KEY!) }

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrodemando.laoriental.co'
const FROM = 'La Oriental Automotors <cotizaciones@laoriental.co>'
const ROJAS = 'rojasjgx@gmail.com'

function fmt(n: number | null | undefined) {
  if (n == null) return '0,00'
  return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function logoUrl() {
  return `${APP_URL}/logo-la-oriental-blanco.png`
}

function headerHTML() {
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

function footerHTML() {
  return `<div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;border-radius:0 0 12px 12px;text-align:center">
    <p style="margin:0;color:#9ca3af;font-size:11px;font-family:sans-serif">La Oriental Automotors · MG &amp; MAXUS · Maturín, Venezuela</p>
  </div>`
}

function wrap(body: string) {
  return `<div style="background:#f3f4f6;padding:24px 16px">
    <div style="background:#fff;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      ${headerHTML()}
      <div style="padding:32px">${body}</div>
      ${footerHTML()}
    </div>
  </div>`
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:7px 0;font-family:sans-serif;font-size:12px;color:#6b7280;font-weight:600;width:42%;vertical-align:top;border-bottom:1px solid #f3f4f6">${label}</td>
    <td style="padding:7px 0;font-family:sans-serif;font-size:13px;color:#111;font-weight:700;vertical-align:top;border-bottom:1px solid #f3f4f6">${value}</td>
  </tr>`
}

export async function enviarCotizacionCliente(data: CotizacionPDFData, tokenRespuesta: string) {
  const resend = getResend()

  const pdfBuffer = await renderToBuffer(
    React.createElement(CotizacionPDF, { data }) as React.ReactElement<any>
  )

  const es24 = data.modalidad === 'credito_24'
  const modalidadLabel = es24 ? 'Crédito 24 meses' : 'Contado'
  const responderUrl = `${APP_URL}/responder/${tokenRespuesta}`

  const body = `
    <p style="font-family:sans-serif;font-size:12px;font-weight:700;color:#C41E3A;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px">Cotización de vehículo</p>
    <h1 style="font-family:sans-serif;font-size:20px;font-weight:800;color:#111;margin:0 0 4px">Estimado/a ${data.clienteNombre}</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#6b7280;margin:0 0 24px">Adjunto encontrará su cotización formal. Tiene una validez de 2 días.</p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin-bottom:18px">
      <p style="font-family:sans-serif;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px">Resumen de cotización</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${row('N° Cotización', `<span style="font-family:monospace;color:#C41E3A;font-size:14px">${data.numero}</span>`)}
        ${row('Vehículo', `${data.marca} ${data.modelo}`)}
        ${row('Modalidad', modalidadLabel)}
        ${es24
          ? row('Inicial a pagar', `<span style="font-size:16px;color:#92400e">$${fmt(data.totalInicial)}</span>`)
          : row('Total a pagar', `<span style="font-size:16px;color:#111">$${fmt(data.totalInicial)}</span>`)
        }
        ${es24 && data.cuotaMensual ? row('Cuota mensual (24m)', `<span style="font-size:15px;color:#92400e">$${fmt(data.cuotaMensual)}</span>`) : ''}
        ${row('Válida hasta', data.vencimiento)}
      </table>
    </div>

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

  const { error } = await resend.emails.send({
    from: FROM,
    to: [data.clienteCorreo],
    subject: `Cotización ${data.numero} — ${data.marca} ${data.modelo} · La Oriental Automotors`,
    html: wrap(body),
    attachments: [{
      filename: `${data.numero}.pdf`,
      content: Buffer.from(pdfBuffer),
    }],
  })

  if (error) throw new Error(`Resend error (cliente): ${JSON.stringify(error)}`)
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
  totalInicial: number
  cuotaMensual: number | null
  costoTotal: number
  fecha: string
}) {
  const resend = getResend()
  const es24 = opts.modalidad === 'credito_24'

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
        ${row('Modalidad', es24 ? 'Crédito 24 meses' : 'Contado')}
        ${es24
          ? row('Inicial a pagar', `<strong style="font-size:15px;color:#92400e">$${fmt(opts.totalInicial)}</strong>`)
          : row('Total a pagar', `<strong style="font-size:15px">$${fmt(opts.totalInicial)}</strong>`)
        }
        ${es24 && opts.cuotaMensual ? row('Cuota mensual (24m)', `<strong style="font-size:15px;color:#92400e">$${fmt(opts.cuotaMensual)}</strong>`) : ''}
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
