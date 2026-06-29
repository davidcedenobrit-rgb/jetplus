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
  if (error) throw new Error(`Resend error: ${error.name ?? 'unknown'}`);
}

// ─── Reporte CONSOLIDADO de pagos a Vehimotors (formato tabla) ────────────────

export interface ReporteLoteItem {
  fechaPago: string                     // YYYY-MM-DD
  proforma: string | null
  placa: string | null
  vehiculoLabel: string | null          // "MG ZS · AB123CD" — opcional
  clienteNombre: string                 // nombre del CLIENTE REPORTADO (no necesariamente quien pagó)
  cedulaRif: string | null
  concepto: string
  consesionario: string                 // 'LA ORIENTAL' usualmente
  montoUSD: number                      // ya convertido a USD
  bancoVehimotors: string | null        // banco/método (ZELLE, BANCAMIGA, USDT…)
  referencia: string | null
  numeroRecibo: string                  // referencia interna nuestra
  observaciones?: string | null
}

function fmtFechaCorta(iso: string) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export async function enviarReporteLoteVehimotors(opts: {
  items: ReporteLoteItem[]
  resumenTexto?: string
}) {
  const { items, resumenTexto } = opts
  if (items.length === 0) return

  const resend = getResend()
  const totalUSD = items.reduce((s, it) => s + Number(it.montoUSD ?? 0), 0)
  const fmtN = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const filas = items.map((it, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f9fafb'}">
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-family:sans-serif;font-size:11px;color:#374151">${fmtFechaCorta(it.fechaPago)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-family:'Courier New',monospace;font-size:11px;color:#111;font-weight:700">${it.proforma ?? '—'}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-family:'Courier New',monospace;font-size:11px;color:#111;font-weight:700">${it.placa ?? '—'}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-family:sans-serif;font-size:11px;color:#374151">${it.vehiculoLabel ?? '—'}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-family:sans-serif;font-size:11px;color:#111;font-weight:600">${it.clienteNombre}${it.cedulaRif ? `<br><span style="color:#9ca3af;font-size:10px">${it.cedulaRif}</span>` : ''}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-family:sans-serif;font-size:11px;color:#374151">${it.concepto}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-family:sans-serif;font-size:11px;color:#374151">${it.consesionario}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:sans-serif;font-size:12px;color:#16a34a;font-weight:800">$${fmtN(it.montoUSD)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-family:sans-serif;font-size:11px;color:#374151">${it.bancoVehimotors ?? '—'}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-family:'Courier New',monospace;font-size:10px;color:#6b7280">${it.referencia ?? '—'}</td>
    </tr>
  `).join('')

  const observacionesBlock = items.some(it => it.observaciones)
    ? `<div style="margin-top:14px;padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px">
         <p style="font-family:sans-serif;font-size:11px;font-weight:700;color:#92400e;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em">Observaciones</p>
         ${items.filter(it => it.observaciones).map(it =>
           `<p style="font-family:sans-serif;font-size:11px;color:#78350f;margin:3px 0">• <strong>${it.numeroRecibo}:</strong> ${it.observaciones}</p>`
         ).join('')}
       </div>`
    : ''

  const titulo = items.length === 1
    ? `Reporte de pago — ${items[0].clienteNombre}`
    : `Reporte consolidado de ${items.length} pagos`

  const fechaHoy = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })

  const html = `<div style="background:#fff;max-width:900px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;font-family:sans-serif">
    ${headerHTML()}
    <div style="padding:28px">
      <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#C41E3A;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px">Reporte de pagos a Vehimotors</p>
      <h1 style="font-family:sans-serif;font-size:22px;font-weight:800;color:#111;margin:0 0 6px">${titulo}</h1>
      <p style="font-family:sans-serif;font-size:13px;color:#6b7280;margin:0 0 4px">Fecha del reporte: ${fechaHoy}</p>
      ${resumenTexto ? `<p style="font-family:sans-serif;font-size:13px;color:#374151;margin:8px 0 0">${resumenTexto}</p>` : ''}

      <div style="margin-top:24px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
          <thead>
            <tr style="background:#111">
              <th style="padding:9px 10px;text-align:left;font-family:sans-serif;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.05em">Fecha</th>
              <th style="padding:9px 10px;text-align:left;font-family:sans-serif;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.05em">Proforma</th>
              <th style="padding:9px 10px;text-align:left;font-family:sans-serif;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.05em">Placa</th>
              <th style="padding:9px 10px;text-align:left;font-family:sans-serif;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.05em">Vehículo</th>
              <th style="padding:9px 10px;text-align:left;font-family:sans-serif;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.05em">Cliente</th>
              <th style="padding:9px 10px;text-align:left;font-family:sans-serif;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.05em">Concepto</th>
              <th style="padding:9px 10px;text-align:left;font-family:sans-serif;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.05em">Concesionario</th>
              <th style="padding:9px 10px;text-align:right;font-family:sans-serif;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.05em">Depósito $</th>
              <th style="padding:9px 10px;text-align:left;font-family:sans-serif;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.05em">Banco</th>
              <th style="padding:9px 10px;text-align:left;font-family:sans-serif;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.05em">Referencia</th>
            </tr>
          </thead>
          <tbody>
            ${filas}
            <tr style="background:#111">
              <td colspan="7" style="padding:12px 10px;font-family:sans-serif;font-size:12px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.05em">TOTAL ${items.length} pago${items.length > 1 ? 's' : ''}</td>
              <td style="padding:12px 10px;text-align:right;font-family:sans-serif;font-size:14px;font-weight:800;color:#22c55e">$${fmtN(totalUSD)}</td>
              <td colspan="2" style="padding:12px 10px"></td>
            </tr>
          </tbody>
        </table>
      </div>

      ${observacionesBlock}

      <p style="font-family:sans-serif;font-size:12px;color:#6b7280;margin:24px 0 0;line-height:1.5">
        Reporte generado automáticamente por el Centro de Mando de La Oriental Automotors.<br>
        Para cualquier consulta o discrepancia, responder a este correo.
      </p>
    </div>
    ${footerHTML()}
  </div>`

  const asunto = items.length === 1
    ? `Reporte de pago a VM — ${items[0].clienteNombre} · $${fmtN(totalUSD)}`
    : `Reporte consolidado VM — ${items.length} pagos · $${fmtN(totalUSD)}`

  const { error } = await resend.emails.send({
    from: FROM,
    to: TO_VEHIMOTORS,
    subject: asunto,
    html,
  })
  if (error) throw new Error(`Resend error: ${error.name ?? 'unknown'}`)
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
  if (error) throw new Error(`Resend error: ${error.name ?? 'unknown'}`);
}
