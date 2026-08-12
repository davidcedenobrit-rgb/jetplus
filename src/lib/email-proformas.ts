import { Resend } from 'resend'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createAdminClient } from '@/lib/supabase/server'
import { ProformaPDF, type ProformaPDFData, type CuotaCronogramaItem } from './proforma-pdf'
import { registrarEnvioEmail, extraerResendId } from './email-tracking'

function getResend() { return new Resend(process.env.RESEND_API_KEY!) }

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://jetplus.vercel.app'
const FROM = 'JETPLUS <administracion@navigroup.co>'

function getLogoBase64(): string {
  try {
    const buf = readFileSync(join(process.cwd(), 'public', 'logo-jetplus.png'))
    return `data:image/png;base64,${buf.toString('base64')}`
  } catch {
    return 'https://assets.cdn.filesafe.space/XZDJ4aSOAL1crWRCXyY6/media/698367bc1dfc0253b24abd7a.png'
  }
}

function getSelloBase64(): string | undefined {
  try {
    const buf = readFileSync(join(process.cwd(), 'public', 'sello-jetplus.jpeg'))
    return `data:image/jpeg;base64,${buf.toString('base64')}`
  } catch {
    return undefined
  }
}

function fmt(n: number | null | undefined) {
  if (n == null) return '0,00'
  return n.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(n)*100)%100===0?0:2, maximumFractionDigits: 2 })
}

function logoUrl() {
  return `${APP_URL}/logo-jetplus-blanco.png`
}

function headerHTML() {
  return `<div style="background:#C41E3A;padding:20px 32px;border-radius:12px 12px 0 0">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle"><img src="${logoUrl()}" alt="JETPLUS" style="height:44px;width:auto;display:block" /></td>
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
    <div style="background:#fff;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      ${headerHTML()}
      <div style="padding:32px">${body}</div>
      ${footerHTML()}
    </div>
  </div>`
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:7px 0;font-family:sans-serif;font-size:12px;color:#6b7280;font-weight:600;width:52%;vertical-align:top;border-bottom:1px solid #f3f4f6">${label}</td>
    <td style="padding:7px 0;font-family:sans-serif;font-size:13px;color:#111;font-weight:700;vertical-align:top;border-bottom:1px solid #f3f4f6;text-align:right">${value}</td>
  </tr>`
}

export interface EnviarProformaOpts {
  proformaId: string
  numero: string
  fecha: string
  correoDestino: string
  clienteNombre: string
  marca: string
  modelo: string
  placa: string | null
  precioVehiculo: number
  inicialPagada: number
  saldoFinanciado: number
  cuotaMensual: number
  numeroCuotas: number
  planLabel: string
  condicionesPersonalizadas?: string | null
  // Proforma previa a la venta (sin entrega aún): cambia el texto del correo.
  preVenta?: boolean
}

async function fetchPdfBuffer(proformaId: string): Promise<Buffer> {
  const supabase = await createAdminClient()
  const { data: pro } = await supabase
    .from('proformas')
    .select('*')
    .eq('id', proformaId)
    .single()

  if (!pro) throw new Error('Proforma no encontrada')

  const cliente: any = pro.cliente_snapshot ?? {}
  const vehiculo: any = pro.vehiculo_snapshot ?? {}
  const credito: any = pro.credito_snapshot ?? {}
  const cronograma: CuotaCronogramaItem[] = (pro.cronograma_snapshot ?? []) as CuotaCronogramaItem[]

  const planLabelMap: Record<string, string> = {
    inicial_la_oriental: 'Jetplus',
    financiamiento_vehimotors: 'Financiamiento Vehimotors',
    cuota_especial: 'Cuota Especial Vehimotors',
    asegurate_500: 'Asegúrate $500',
    credito_40_60: '40/60 Vehimotors',
  }

  const pdfData: ProformaPDFData = {
    logoSrc: getLogoBase64(),
    selloSrc: getSelloBase64(),
    numero: pro.numero,
    fecha: new Date(pro.fecha_emision + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    clienteNombre: cliente.nombre ?? '',
    clienteCiRif: cliente.cedula_rif ?? '',
    clienteDireccion: cliente.direccion ?? null,
    clienteCorreo: cliente.correo ?? null,
    clienteTelefono: cliente.telefono ?? null,
    marca: vehiculo.marca ?? '',
    modelo: vehiculo.modelo ?? '',
    placa: vehiculo.placa ?? null,
    anio: vehiculo.anio ?? null,
    color: vehiculo.color ?? null,
    precioBase: Number(vehiculo.precio_base ?? 0),
    totalVehiculo: Number(pro.precio_vehiculo ?? 0),
    inicialPagada: Number(pro.monto_inicial ?? 0),
    saldoFinanciado: Number(pro.monto_financiado ?? 0),
    cuotaMensual: cronograma.length > 0 ? Number(cronograma[0].monto) : 0,
    numeroCuotas: Number(pro.num_cuotas ?? cronograma.length),
    planTipo: credito.plan_tipo ?? '',
    planLabel: planLabelMap[credito.plan_tipo] ?? 'Crédito',
    condicionesPersonalizadas: pro.condiciones_personalizadas ?? null,
    bnVehimotors: pro.bn_vehimotors ?? null,
    cronograma,
    acuerdoInicial: credito.acuerdo_inicial ? {
      monto_acordado: Number(credito.acuerdo_inicial.monto_acordado ?? 0),
      monto_pagado: Number(credito.acuerdo_inicial.monto_pagado ?? 0),
      saldo_por_pagar: Number(credito.acuerdo_inicial.saldo_por_pagar ?? 0),
      fecha_limite: credito.acuerdo_inicial.fecha_limite ?? null,
      observaciones: credito.acuerdo_inicial.observaciones ?? null,
    } : null,
  }

  const buffer = await renderToBuffer(
    React.createElement(ProformaPDF, { data: pdfData }) as React.ReactElement<any>
  )
  return Buffer.from(buffer)
}

export async function enviarProformaCliente(opts: EnviarProformaOpts) {
  const {
    proformaId, numero, fecha, correoDestino,
    clienteNombre, marca, modelo, placa,
    precioVehiculo, inicialPagada, saldoFinanciado,
    cuotaMensual, numeroCuotas, planLabel, condicionesPersonalizadas, preVenta,
  } = opts

  const resend = getResend()
  const pdfBuffer = await fetchPdfBuffer(proformaId)

  const tieneFinanciamiento = numeroCuotas > 0 && cuotaMensual > 0

  const kicker = preVenta ? 'Proforma — condiciones aceptadas' : 'Proforma de compra financiada'
  const intro = preVenta
    ? `Adjunto encontrará su <b>Proforma N°&nbsp;${numero}</b> con las condiciones de compra de su vehículo, según lo aceptado. Detalla la modalidad de pago acordada.`
    : `Adjunto encontrará su <b>Proforma N°&nbsp;${numero}</b> del vehículo entregado bajo compromiso de pago financiado. Este documento formaliza el acuerdo de crédito y detalla el cronograma completo de cuotas.`

  const avisoBox = preVenta
    ? `<div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:10px;padding:14px 18px;margin-bottom:18px">
      <p style="font-family:sans-serif;font-size:12px;color:#1e40af;margin:0;line-height:1.6">
        <b>ⓘ Nota:</b> Los montos indicados están sujetos a la disponibilidad de la unidad y a la tasa de cambio vigente a la fecha de la operación.
      </p>
    </div>`
    : `<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:10px;padding:14px 18px;margin-bottom:18px">
      <p style="font-family:sans-serif;font-size:12px;color:#92400e;margin:0;line-height:1.6">
        <b>⚠ Aviso importante:</b> Este vehículo <b>no ha sido pagado en su totalidad</b>. Su cumplimiento con las cuotas del cronograma es requisito para conservar la propiedad del bien.
      </p>
    </div>`

  // En la proforma de aceptación (pre-venta) no se muestra el saldo financiado.
  const filaInicial = tieneFinanciamiento
    ? `${row('Inicial', `$${fmt(inicialPagada)}`)}
        ${preVenta ? '' : row('Saldo financiado', `$${fmt(saldoFinanciado)}`)}
        ${row('Cuotas mensuales', `${numeroCuotas} × $${fmt(cuotaMensual)}`)}`
    : ''

  const cierre = preVenta
    ? (tieneFinanciamiento
        ? 'Las cuotas deberán pagarse entre el <b>1° y el 5° día</b> de cada mes. Estamos a su orden para concretar la operación.'
        : 'Estamos a su orden para concretar la operación.')
    : 'Por favor conserve este documento para cualquier trámite futuro. Le recordamos que las cuotas deben pagarse entre el <b>1° y el 5° día</b> de cada mes.'

  const body = `
    <p style="font-family:sans-serif;font-size:12px;font-weight:700;color:#C41E3A;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px">${kicker}</p>
    <h1 style="font-family:sans-serif;font-size:20px;font-weight:800;color:#111;margin:0 0 4px">Estimado/a ${clienteNombre}</h1>
    <p style="font-family:sans-serif;font-size:14px;color:#6b7280;margin:0 0 22px">${intro}</p>

    ${avisoBox}

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin-bottom:18px">
      <p style="font-family:sans-serif;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px">Resumen de la proforma</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${row('Número de proforma', numero)}
        ${row('Fecha de emisión', fecha)}
        ${row('Vehículo', `${marca} ${modelo}${placa ? ` · ${placa}` : ''}`)}
        ${row('Modalidad', condicionesPersonalizadas ? 'Condiciones personalizadas' : planLabel)}
        ${row('Precio del vehículo', `$${fmt(precioVehiculo)}`)}
        ${filaInicial}
      </table>
    </div>

    ${condicionesPersonalizadas ? `<div style="background:#eef2ff;border:1px solid #6366f1;border-radius:10px;padding:14px 18px;margin-bottom:18px">
      <p style="font-family:sans-serif;font-size:11px;font-weight:700;color:#3730a3;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6px">Condiciones de pago acordadas</p>
      <p style="font-family:sans-serif;font-size:13px;color:#312e81;margin:0;line-height:1.6;white-space:pre-wrap">${condicionesPersonalizadas.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
    </div>` : ''}

    <p style="font-family:sans-serif;font-size:13px;color:#374151;margin:0 0 8px;line-height:1.6">
      ${cierre}
    </p>

    <p style="font-family:sans-serif;font-size:12px;color:#9ca3af;margin:24px 0 0;line-height:1.5">
      Cualquier duda, contáctenos al <b>0424-8705174</b> o responda a este correo.
    </p>
  `

  const html = wrap(body)

  const asunto = `Proforma ${numero} — JETPLUS`
  const result = await resend.emails.send({
    from: FROM,
    to: [correoDestino],
    subject: asunto,
    html,
    attachments: [
      { filename: `${numero}.pdf`, content: pdfBuffer },
    ],
  })

  if ((result as any).error) {
    throw new Error(`Error enviando proforma: ${(result as any).error.message ?? 'desconocido'}`)
  }

  const resendId = extraerResendId(result)
  if (resendId) {
    await registrarEnvioEmail({
      resendEmailId: resendId,
      entidadTipo: 'proforma',
      entidadId: proformaId,
      destinatarios: [correoDestino],
      asunto,
      metadata: { numero, marca, modelo, placa },
    })
  }

  return result
}
