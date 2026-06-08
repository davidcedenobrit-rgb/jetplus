import { Resend } from 'resend'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { ReciboPDF } from './recibo-pdf'

function getResend() { return new Resend(process.env.RESEND_API_KEY!) }

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrodemando.laoriental.co'
const FROM = 'La Oriental Automotors <repuestos@laoriental.co>'
const FROM_ADMIN = 'La Oriental Automotors <administracion@laoriental.co>'

// Destinatarios de prueba (en producción se cambiarán a vehimotors)
const TO_VEHIMOTORS = [
  process.env.CORREO_VEHIMOTORS_INGRESOS_1 ?? 'rojasjgx@gmail.com',
  process.env.CORREO_VEHIMOTORS_INGRESOS_2 ?? 'davidcedenobrit@gmail.com',
]

function headerHTML() {
  const logoUrl = `${APP_URL}/logo-la-oriental-blanco.png`
  return `<div style="background:#C41E3A;padding:20px 32px;border-radius:12px 12px 0 0">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle"><img src="${logoUrl}" alt="La Oriental Automotors" style="height:48px;width:auto;display:block" /></td>
      <td style="padding-left:14px;vertical-align:middle">
        <p style="margin:0;color:#fff;font-weight:800;font-size:16px;font-family:sans-serif">LA ORIENTAL AUTOMOTORS</p>
        <p style="margin:0;color:rgba(255,255,255,0.75);font-size:11px;font-family:sans-serif">MG &amp; Maxus · Maturín, Venezuela</p>
      </td></tr></table></div>`
}

function footerHTML() {
  return `<div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:18px 32px;border-radius:0 0 12px 12px;text-align:center">
    <p style="margin:0;color:#9ca3af;font-size:11px;font-family:sans-serif">La Oriental Automotors · MG &amp; Maxus · Maturín, Venezuela</p></div>`
}

function wrap(body: string) {
  return `<div style="background:#fff;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">${headerHTML()}<div style="padding:32px">${body}</div>${footerHTML()}</div>`
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;font-family:sans-serif;font-size:12px;color:#6b7280;font-weight:600;width:40%;vertical-align:top">${label}</td>
    <td style="padding:8px 0;font-family:sans-serif;font-size:13px;color:#111;font-weight:700;vertical-align:top">${value}</td>
  </tr>`
}

export interface ReportarVehimotorsOpts {
  ingresoId: string
  token: string
  numeroRecibo: string
  clienteNombre: string
  clienteCedula?: string | null
  clienteTelefono?: string | null
  placa?: string | null
  concepto: string
  monto: number
  moneda: string
  metodoPago: string
  referencia?: string | null
  banco?: string | null
  comprobantesUrls?: string[]
}

export async function enviarReporteVehimotors(opts: ReportarVehimotorsOpts) {
  const {
    ingresoId, token, numeroRecibo,
    clienteNombre, clienteCedula, clienteTelefono,
    placa, concepto, monto, moneda, metodoPago,
    referencia, banco, comprobantesUrls = [],
  } = opts

  const resend = getResend()

  const montoFmt = new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(monto)
  const monedaLabel = moneda === 'VES' ? 'Bs.' : moneda

  const confirmarUrl = `${APP_URL}/api/ingresos/confirmar-vehimotors?id=${ingresoId}&token=${token}`


  const comprobantesBtn = comprobantesUrls.length > 0
    ? comprobantesUrls.map((url, i) =>
        `<a href="${url}" target="_blank" style="display:inline-block;padding:14px 28px;background:#d97706;color:#fff;font-family:sans-serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;margin:6px">
          📎 Ver comprobante${comprobantesUrls.length > 1 ? ` ${i + 1}` : ''}
        </a>`).join('')
    : ''

  const body = `
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#C41E3A;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Reporte de Pago</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 6px">Recibo ${numeroRecibo}</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#6b7280;margin:0 0 28px">La Oriental Automotors reporta el siguiente pago recibido.</p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;margin-bottom:24px">
      <p style="font-family:sans-serif;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 14px">Datos del cliente</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${row('Nombre', clienteNombre)}
        ${clienteCedula ? row('Cédula / RIF', clienteCedula) : ''}
        ${clienteTelefono ? row('Teléfono', clienteTelefono) : ''}
        ${placa ? row('Placa vehículo', placa) : ''}
      </table>
    </div>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;margin-bottom:24px">
      <p style="font-family:sans-serif;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 14px">Detalle del pago</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${row('Concepto', concepto)}
        ${row('Monto', `<span style="font-size:18px;color:#C41E3A">${monedaLabel} ${montoFmt}</span>`)}
        ${row('Moneda', moneda)}
        ${row('Método de pago', metodoPago)}
        ${referencia ? row('Referencia', referencia) : ''}
        ${banco ? row('Banco', banco) : ''}
        ${row('N° Recibo', numeroRecibo)}
      </table>
    </div>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;text-align:center;margin-top:24px">
      <p style="font-family:sans-serif;font-size:14px;color:#166534;margin:0 0 16px;font-weight:600">¿Han recibido este pago correctamente?</p>
      <div style="display:flex;justify-content:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
        <a href="${confirmarUrl}" style="display:inline-block;padding:14px 28px;background:#16a34a;color:#fff;font-family:sans-serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;margin:4px">
          ✓ Confirmar recibido
        </a>
        ${comprobantesBtn}
      </div>
      <p style="font-family:sans-serif;font-size:11px;color:#6b7280;margin:10px 0 0">Al confirmar, registran la recepción del pago en sus sistemas.</p>
    </div>
  `

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: TO_VEHIMOTORS,
    subject: `Reporte de pago — ${numeroRecibo} · ${clienteNombre}`,
    html: wrap(body),
  })
  console.log('[email-ingresos] Resend response:', JSON.stringify({ data, error }))
  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`)
}

// ─── Recibo al cliente ────────────────────────────────────────────────────────

export interface EnviarReciboClienteOpts {
  clienteNombre: string
  clienteCorreo: string
  clienteCedula?: string | null
  clienteTelefono?: string | null
  clienteCorreoDisplay?: string | null
  clienteCiudad?: string | null
  numeroRecibo: string
  concepto: string
  monto: number
  moneda: string
  tasaCambio?: number | null
  metodoPago: string
  referencia?: string | null
  bancoEmisor?: string | null
  bancoReceptor?: string | null
  fechaPago: string
  fechaAprobacion?: string | null
  observaciones?: string | null
  vehiculoMarca?: string | null
  vehiculoModelo?: string | null
  vehiculoVersion?: string | null
  vehiculoAnio?: number | null
  placa?: string | null
  cuotasAplicadas?: Array<{
    numeroCuota: number
    planNombre: string
    fechaVencimiento?: string | null
    montoTotal: number
    montoAplicado: number
  }>
  ecTotalFinanciado?: number
  ecTotalSaldo?: number
  ecPct?: number
  ecPagadas?: number
  ecPendientes?: number
  ecVencidas?: number
  creditosDesglose?: Array<{
    planNombre: string
    saldo: number
    totalCuotas: number
    cuotasPagadas: number
  }>
}

export async function enviarReciboCliente(opts: EnviarReciboClienteOpts) {
  const {
    clienteNombre, clienteCorreo, clienteCedula, clienteTelefono, clienteCiudad,
    numeroRecibo, concepto, monto, moneda, tasaCambio, metodoPago, referencia,
    bancoEmisor, bancoReceptor, fechaPago, fechaAprobacion, observaciones,
    vehiculoMarca, vehiculoModelo, vehiculoVersion, vehiculoAnio, placa,
    cuotasAplicadas, ecTotalFinanciado, ecTotalSaldo, ecPct, ecPagadas, ecPendientes, ecVencidas, creditosDesglose,
  } = opts
  const resend = getResend()

  const montoFmt = new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(monto)
  const monedaLabel = moneda === 'VES' ? 'Bs.' : moneda

  const fechaFmt = (() => {
    try {
      return new Date(fechaPago + 'T12:00:00').toLocaleDateString('es-VE', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    } catch { return fechaPago }
  })()

  // Generar PDF
  const pdfBuffer = await renderToBuffer(
    React.createElement(ReciboPDF, {
      data: {
        numeroRecibo, fechaPago, concepto, monto, moneda, tasaCambio,
        metodoPago, referencia, bancoEmisor, bancoReceptor, observaciones, fechaAprobacion,
        cuotasAplicadas, ecTotalFinanciado, ecTotalSaldo, ecPct, ecPagadas, ecPendientes, ecVencidas, creditosDesglose,
        clienteNombre, clienteCedula, clienteTelefono, clienteCorreo,
        clienteCiudad, vehiculoMarca, vehiculoModelo, vehiculoVersion,
        vehiculoAnio, placa,
      },
    }) as any
  )

  const body = `
    <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#C41E3A;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Confirmación de Pago</p>
    <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 6px">Estimado/a ${clienteNombre}</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#6b7280;margin:0 0 28px">Le confirmamos que hemos recibido su pago. Encontrará el recibo adjunto en PDF.</p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;margin-bottom:24px">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${row('N° Recibo', `<span style="font-family:monospace;font-weight:800;color:#C41E3A">${numeroRecibo}</span>`)}
        ${row('Concepto', concepto)}
        ${row('Monto recibido', `<span style="font-size:18px;font-weight:800;color:#111">${monedaLabel} ${montoFmt}</span>`)}
        ${row('Método de pago', metodoPago)}
        ${referencia ? row('N° Referencia', referencia) : ''}
        ${row('Fecha', fechaFmt)}
      </table>
    </div>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px 24px;text-align:center">
      <p style="font-family:sans-serif;font-size:15px;color:#166534;margin:0 0 6px;font-weight:700">✓ Pago recibido correctamente</p>
      <p style="font-family:sans-serif;font-size:13px;color:#6b7280;margin:0">Gracias por su preferencia. La Oriental Automotors siempre a su servicio.</p>
    </div>
  `

  const { data, error } = await resend.emails.send({
    from: FROM_ADMIN,
    to: [clienteCorreo],
    subject: `Recibo ${numeroRecibo} — Confirmación de pago · La Oriental Automotors`,
    html: wrap(body),
    attachments: [{
      filename: `${numeroRecibo}.pdf`,
      content: pdfBuffer,
    }],
  })
  console.log('[email-ingresos] enviarReciboCliente:', JSON.stringify({ data, error }))
  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`)
}
