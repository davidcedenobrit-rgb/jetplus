export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { AnexoADocument } from '@/lib/anexo-a-pdf'
import { getConcesionarioIdentity } from '@/lib/concesionario'
import { buildAnexoData } from '@/lib/precompra-anexo'
import { resolverPrecompraProformaDB } from '@/lib/cotizacion-federada'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']
const num = (x: unknown) => { const n = Number(x); return Number.isFinite(n) ? n : 0 }
const fmt = (n: number) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Correo a Vehimotors (Marilyn) para solicitar contrato del Anexo A.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const destinatarios: string[] = String(b.correoDestino ?? '')
    .split(/[,;\s]+/).map((s: string) => s.trim()).filter((s: string) => /\S+@\S+\.\S+/.test(s))
  if (!destinatarios.length) return NextResponse.json({ error: 'Indica un correo de destino válido' }, { status: 400 })
  const cc: string[] = String(b.cc ?? '').split(/[,;\s]+/).map((s: string) => s.trim()).filter((s: string) => /\S+@\S+\.\S+/.test(s))

  const resuelta = await resolverPrecompraProformaDB(id)
  if (!resuelta) return NextResponse.json({ error: 'Proforma no encontrada' }, { status: 404 })
  const { db: supabase, proforma: pf } = resuelta

  const conces = await getConcesionarioIdentity(supabase, pf.concesionario_id ?? 'la-oriental')
  const data = buildAnexoData(pf, conces, 'vehimotors')

  // PDF del Anexo A (Vehimotors)
  const pdfBuffer = await renderToBuffer(
    React.createElement(AnexoADocument, { data }) as React.ReactElement<Record<string, unknown>>
  )
  const attachments: { filename: string; content: Buffer }[] = [
    { filename: `Anexo-A-${(pf.cliente_nombre || 'cliente').split(' ')[0]}.pdf`, content: Buffer.from(pdfBuffer) },
  ]
  // Adjuntar documentos del cliente (cédula, RIF, comprobante de reserva, etc.)
  for (const d of (Array.isArray(pf.documentos) ? pf.documentos : [])) {
    try {
      const res = await fetch(d.url)
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer())
        if (buf.length <= 8 * 1024 * 1024) attachments.push({ filename: `${d.tipo}-${d.nombre || 'doc'}`.replace(/[^\w.\-]+/g, '_'), content: buf })
      }
    } catch { /* documento inaccesible, se omite */ }
  }

  const cronograma = (data.cuotas || []).map(c => `<li>${c.label}: $${fmt(c.monto)}</li>`).join('')
  const asunto = `CICLO #${pf.ciclo ?? '—'} PLAN ASEGURATE CON 500/ ${(pf.cliente_nombre || '').toUpperCase()} - MODELO DEL VEHÍCULO ${pf.modelo || ''}`
  const html = `
    <div style="font-family:sans-serif;font-size:14px;color:#111827;line-height:1.5">
      <p>Buenas tardes,</p>
      <p>En función de nota anexa ya conversada y aprobada, se requiere su apoyo para solicitar contrato del siguiente <b>ANEXO A</b>.</p>
      <p><b>Cliente:</b> ${pf.cliente_nombre}<br/>
         <b>Cédula:</b> ${pf.cliente_cedula ?? '—'} &nbsp; <b>RIF:</b> ${pf.cliente_rif ?? '—'}<br/>
         <b>Unidad:</b> ${pf.modelo ?? ''} &nbsp; <b>Color(es):</b> ${pf.colores ?? '—'}<br/>
         <b>Ciclo:</b> #${pf.ciclo ?? '—'}</p>
      <p><b>Cronograma:</b></p>
      <ul>
        <li>Reserva: $${fmt(num(data.reserva))}</li>
        ${cronograma}
        <li>Cuota final (IVA, IGTF y matriculación): $${fmt(num(data.gastosAsociados))}</li>
      </ul>
      <p><b>Total a pagar:</b> $${fmt(num(data.totalPagar))}</p>
      <p>Se adjunta el Anexo A y los documentos del cliente (incluye comprobante de reserva).</p>
      <p>Saludos.</p>
    </div>`

  try {
    const resend = new Resend(process.env.RESEND_API_KEY!)
    const { error } = await resend.emails.send({
      from: `${conces.nombre} <cotizaciones@laoriental.co>`,
      to: destinatarios,
      cc: cc.length ? cc : undefined,
      subject: asunto,
      html,
      attachments,
    })
    if (error) throw new Error(JSON.stringify(error))
  } catch (e) {
    console.error('[precompra/enviar] resend:', e)
    return NextResponse.json({ error: 'No se pudo enviar el correo' }, { status: 500 })
  }

  await supabase.from('precompra_proformas').update({
    correo_destino: destinatarios.join(', '), enviado_a: destinatarios.join(', '),
    enviado_at: new Date().toISOString(), estado: 'enviada', updated_at: new Date().toISOString(),
  }).eq('id', id)

  return NextResponse.json({ ok: true, enviadoA: destinatarios })
}
