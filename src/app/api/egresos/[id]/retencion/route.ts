export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { Resend } from 'resend'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ComprobanteRetencionPDF } from '@/lib/comprobante-retencion-pdf'
import { buildComprobanteData } from '@/lib/comprobante-retencion-data'
import { periodoDeFecha, siguienteComprobante } from '@/lib/retencion-iva'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

async function auth(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return null
  return user
}

// PATCH → editar la fecha de emisión del comprobante. Si cambia el período,
// se reasigna la numeración (AAAAMM + secuencial) al nuevo período.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  const { id } = await params
  const { fechaEmision } = await req.json().catch(() => ({}))
  if (!fechaEmision || !/^\d{4}-\d{2}-\d{2}$/.test(fechaEmision)) {
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
  }

  const admin = await createAdminClient()
  const { data: e } = await admin.from('egresos').select('id, ret_iva_aplica, ret_iva_periodo, ret_iva_comprobante').eq('id', id).maybeSingle()
  if (!e || !e.ret_iva_aplica) return NextResponse.json({ error: 'El egreso no tiene retención de IVA' }, { status: 400 })

  const nuevoPeriodo = periodoDeFecha(fechaEmision)
  const update: Record<string, unknown> = { ret_iva_fecha_emision: fechaEmision, updated_at: new Date().toISOString() }
  if (nuevoPeriodo !== e.ret_iva_periodo) {
    update.ret_iva_periodo = nuevoPeriodo
    update.ret_iva_comprobante = await siguienteComprobante(admin, nuevoPeriodo)
  }
  const { data, error } = await admin.from('egresos').update(update).eq('id', id).select('ret_iva_comprobante, ret_iva_fecha_emision, ret_iva_periodo').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, ...data })
}

// POST → enviar el comprobante de retención por correo al proveedor.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const admin = await createAdminClient()
  const { data: e } = await admin.from('egresos').select('*').eq('id', id).maybeSingle()
  if (!e || !e.ret_iva_aplica || !e.ret_iva_comprobante) {
    return NextResponse.json({ error: 'Este egreso no tiene retención de IVA generada.' }, { status: 400 })
  }

  // Correo destino: el que envían o el del proveedor.
  let correo: string | null = (typeof body.correo === 'string' && body.correo.trim()) ? body.correo.trim().toLowerCase() : null
  if (!correo && e.proveedor_id) {
    const { data: prov } = await admin.from('proveedores').select('correo').eq('id', e.proveedor_id).maybeSingle()
    correo = prov?.correo ?? null
  }
  if (!correo || !/\S+@\S+\.\S+/.test(correo)) {
    return NextResponse.json({ error: 'El proveedor no tiene un correo válido. Indícalo manualmente.' }, { status: 400 })
  }

  const data = await buildComprobanteData(admin, e)
  const pdfBuffer = await renderToBuffer(React.createElement(ComprobanteRetencionPDF, { data }) as any)

  const resend = new Resend(process.env.RESEND_API_KEY!)
  const asunto = `Comprobante de retención de IVA N° ${data.numeroComprobante} — ${data.agenteNombre}`
  const html = `
    <div style="font-family:sans-serif;font-size:14px;color:#111">
      <p>Estimados <b>${data.sujetoNombre}</b>,</p>
      <p>Adjunto encontrarán el comprobante de retención del Impuesto al Valor Agregado N° <b>${data.numeroComprobante}</b>,
      correspondiente a la factura N° ${data.numeroFactura}, emitido por ${data.agenteNombre} (RIF ${data.agenteRif}).</p>
      <p>IVA retenido: <b>${data.moneda} ${Number(data.ivaRetenido).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</b>.</p>
      <p style="color:#6b7280;font-size:12px">Documento generado por el sistema administrativo de ${data.agenteNombre}.</p>
    </div>`

  // Remitente en el dominio verificado en Resend (mismo que usan las proformas).
  const result = await resend.emails.send({
    from: 'La Oriental Automotors <administracion@laoriental.co>',
    replyTo: 'administracion@laoriental.co',
    to: [correo],
    subject: asunto,
    html,
    attachments: [{ filename: `retencion-iva-${data.numeroComprobante}.pdf`, content: Buffer.from(pdfBuffer) }],
  })
  if ((result as any).error) {
    return NextResponse.json({ error: `No se pudo enviar: ${JSON.stringify((result as any).error)}` }, { status: 500 })
  }

  await admin.from('egresos').update({ ret_iva_email_enviado_at: new Date().toISOString() }).eq('id', id)
  return NextResponse.json({ ok: true, correo })
}
