export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getConcesionarioIdentity } from '@/lib/concesionario'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']
const FROM = 'La Oriental Automotors <cotizaciones@laoriental.co>'

/* eslint-disable @typescript-eslint/no-explicit-any */
async function rolDe(supabase: any, user: any): Promise<string> {
  const rolMeta = (user?.app_metadata?.rol as string) ?? ''
  if (rolMeta) return rolMeta
  const { data } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  return data?.rol ?? ''
}

const esc = (s: any) => String(s ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Envía a Vehimotors la solicitud de crédito con el encabezado del concesionario
// que eligió Rojas, los datos del cliente y los documentos del expediente adjuntos.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES.includes(await rolDe(supabase, user))) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const correo = String(body.correo ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return NextResponse.json({ error: 'Escribe un correo válido de Vehimotors' }, { status: 400 })
  }

  const admin = await createAdminClient()
  const { data: caso } = await admin.from('bn_casos').select('*').eq('id', id).single()
  if (!caso) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 })

  const conces = await getConcesionarioIdentity(admin, caso.concesionario_id ?? null)
  const expediente: { url: string; nombre: string | null }[] = Array.isArray(caso.expediente) ? caso.expediente : []

  const fila = (k: string, v: any) => `<tr>
    <td style="padding:6px 0;font-family:sans-serif;font-size:12px;color:#6b7280;font-weight:600;width:40%;border-bottom:1px solid #f3f4f6">${esc(k)}</td>
    <td style="padding:6px 0;font-family:sans-serif;font-size:13px;color:#111;font-weight:700;border-bottom:1px solid #f3f4f6">${esc(v || '—')}</td>
  </tr>`

  const docsHtml = expediente.length
    ? `<p style="font-family:sans-serif;font-size:12px;font-weight:700;color:#374151;margin:18px 0 6px">Documentos del expediente (${expediente.length})</p>
       <ul style="margin:0;padding-left:18px">${expediente.map(d => `<li style="font-family:sans-serif;font-size:12px;color:#1d4ed8"><a href="${esc(d.url)}" style="color:#1d4ed8">${esc(d.nombre || 'Documento')}</a></li>`).join('')}</ul>`
    : '<p style="font-family:sans-serif;font-size:12px;color:#9ca3af">Sin documentos adjuntos.</p>'

  const html = `<div style="background:#f3f4f6;padding:24px 16px">
    <div style="background:#fff;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="background:#C41E3A;padding:20px 28px">
        <p style="margin:0;color:#fff;font-weight:800;font-size:15px;font-family:sans-serif">${esc(conces.nombre)}</p>
        <p style="margin:2px 0 0;color:rgba(255,255,255,0.8);font-size:11px;font-family:sans-serif">${esc(conces.rif ?? '')} · Solicitud de crédito Banca Nacional</p>
      </div>
      <div style="padding:28px">
        <p style="font-family:sans-serif;font-size:14px;color:#111;margin:0 0 4px"><b>Solicitud de financiamiento bancario</b></p>
        <p style="font-family:sans-serif;font-size:13px;color:#6b7280;margin:0 0 18px">Adjuntamos los datos del cliente y su expediente para gestión ante el banco.</p>

        <p style="font-family:sans-serif;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px">Cliente</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${fila('Nombre', caso.cliente_nombre)}
          ${fila('C.I. / RIF', caso.cliente_ci_rif)}
          ${fila('Teléfono', caso.cliente_telefono)}
          ${fila('Correo', caso.cliente_correo)}
          ${fila('Dirección', caso.cliente_direccion)}
          ${fila('Ciudad / Estado', caso.cliente_ciudad_estado)}
        </table>

        <p style="font-family:sans-serif;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin:18px 0 8px">Vehículo</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${fila('Modelo', `${caso.marca ?? ''} ${caso.modelo ?? ''}`)}
          ${fila('Precio base', `$${Number(caso.precio_base || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)}
        </table>

        ${docsHtml}
      </div>
    </div>
  </div>`

  // Adjuntar los documentos del expediente (Resend los descarga por URL).
  const attachments = expediente
    .filter(d => d.url)
    .map((d, i) => ({ filename: d.nombre || `documento-${i + 1}`, path: d.url }))

  try {
    const resend = new Resend(process.env.RESEND_API_KEY!)
    const result: any = await resend.emails.send({
      from: FROM,
      to: [correo],
      subject: `Solicitud de crédito — ${caso.cliente_nombre} — ${caso.marca ?? ''} ${caso.modelo ?? ''}`.trim(),
      html,
      attachments: attachments.length ? attachments : undefined,
    })
    if (result?.error) {
      return NextResponse.json({ error: result.error.message ?? 'No se pudo enviar el correo' }, { status: 500 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Error al enviar' }, { status: 500 })
  }

  await admin.from('bn_casos').update({
    vehimotors_email: correo, enviado_vm_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq('id', id)

  return NextResponse.json({ ok: true })
}
