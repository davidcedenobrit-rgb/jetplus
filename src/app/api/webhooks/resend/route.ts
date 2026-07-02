export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'

const EVENT_MAP: Record<string, string> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delivery_delayed',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.failed': 'failed',
}

// Verifica la firma Svix (formato usado por Resend)
function verificarFirma(bodyRaw: string, svixId: string, svixTimestamp: string, svixSignatureHeader: string, secret: string): boolean {
  try {
    const secretKey = secret.startsWith('whsec_') ? secret.slice(6) : secret
    const secretBytes = Buffer.from(secretKey, 'base64')
    const toSign = `${svixId}.${svixTimestamp}.${bodyRaw}`
    const hmac = crypto.createHmac('sha256', secretBytes)
    hmac.update(toSign)
    const expected = hmac.digest('base64')
    const firmas = svixSignatureHeader.split(' ').map(s => s.split(',')[1]).filter(Boolean)
    return firmas.some(f => {
      try {
        return crypto.timingSafeEqual(Buffer.from(f, 'base64'), Buffer.from(expected, 'base64'))
      } catch {
        return false
      }
    })
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  const bodyRaw = await req.text()

  // Verificación de firma (obligatoria si RESEND_WEBHOOK_SECRET está configurado)
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (secret) {
    const svixId = req.headers.get('svix-id') ?? ''
    const svixTimestamp = req.headers.get('svix-timestamp') ?? ''
    const svixSignature = req.headers.get('svix-signature') ?? ''
    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: 'Faltan headers Svix' }, { status: 400 })
    }
    if (!verificarFirma(bodyRaw, svixId, svixTimestamp, svixSignature, secret)) {
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
    }
    // Anti-replay: rechazar eventos con más de 5 min de antigüedad
    const timestampSec = Number(svixTimestamp)
    if (timestampSec && Math.abs(Date.now() / 1000 - timestampSec) > 300) {
      return NextResponse.json({ error: 'Timestamp fuera de ventana' }, { status: 401 })
    }
  }

  let payload: any
  try { payload = JSON.parse(bodyRaw) } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const tipoEvento = String(payload?.type ?? '')
  const eventoMapeado = EVENT_MAP[tipoEvento]
  if (!eventoMapeado) {
    // Evento desconocido — devolvemos 200 para que Resend no reintente
    return NextResponse.json({ ok: true, ignored: tipoEvento })
  }

  const data = payload?.data ?? {}
  const resendEmailId = String(data.email_id ?? data.id ?? '')
  if (!resendEmailId) {
    return NextResponse.json({ ok: true, warning: 'sin email_id' })
  }

  const supabase = await createAdminClient()

  // Buscar el evento 'sent' original para asociar la entidad
  const { data: eventoOriginal } = await supabase
    .from('email_eventos')
    .select('entidad_tipo, entidad_id, destinatarios, asunto')
    .eq('resend_email_id', resendEmailId)
    .eq('evento', 'sent')
    .limit(1)
    .maybeSingle()

  const eventTimestampIso = payload?.created_at
    ? new Date(payload.created_at).toISOString()
    : new Date().toISOString()

  // Guardar evento
  await supabase.from('email_eventos').insert([{
    resend_email_id: resendEmailId,
    entidad_tipo: eventoOriginal?.entidad_tipo ?? 'otro',
    entidad_id: eventoOriginal?.entidad_id ?? null,
    evento: eventoMapeado,
    destinatarios: data.to ?? eventoOriginal?.destinatarios ?? null,
    asunto: data.subject ?? eventoOriginal?.asunto ?? null,
    metadata: {
      tipo_original: tipoEvento,
      bounce: data.bounce ?? undefined,
      click: data.click ?? undefined,
      complaint: data.complaint ?? undefined,
    },
    event_timestamp: eventTimestampIso,
  }])

  // Actualizar el estado del último evento en la tabla de la entidad
  const TABLA_POR_ENTIDAD: Record<string, string> = {
    cotizacion: 'cotizaciones',
    proforma: 'proformas',
    solicitud_repuesto: 'solicitudes_repuestos',
    reporte_vehimotors: 'reportes_vehimotors',
  }

  const tabla = eventoOriginal?.entidad_tipo ? TABLA_POR_ENTIDAD[eventoOriginal.entidad_tipo] : null
  if (tabla) {
    // Solo actualizar si el evento es de mayor prioridad que el actual
    // Orden simple: complained > bounced > opened > delivered > delivery_delayed > sent
    await supabase.from(tabla).update({
      email_ultimo_estado: eventoMapeado,
      email_ultimo_evento_at: eventTimestampIso,
    }).eq('resend_email_id', resendEmailId)
  }

  return NextResponse.json({ ok: true, evento: eventoMapeado })
}

// Vercel health check
export async function GET() {
  return NextResponse.json({ ok: true, service: 'resend-webhook' })
}
