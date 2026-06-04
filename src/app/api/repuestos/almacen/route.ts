export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notificarGuiaRegistrada } from '@/lib/email-repuestos'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrodemando.laoriental.co'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MIME_PERMITIDOS = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
         .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id    = searchParams.get('id')
  const token = searchParams.get('token')

  if (!id || !token) return new NextResponse('Enlace inválido', { status: 400 })

  const { data: sol } = await supabase
    .from('solicitudes_repuestos')
    .select('id, numero, token_almacen, estado, numero_cotizacion_vehimotors')
    .eq('id', id).eq('token_almacen', token).single()

  if (!sol) return new NextResponse('No encontrado', { status: 404 })

  if (sol.estado === 'guia_recibida' || sol.estado === 'completado') {
    return new NextResponse(paginaYaRegistrado(sol.numero), { headers: { 'Content-Type': 'text/html' } })
  }

  return new NextResponse(
    paginaFormulario(sol.numero, id, token, sol.numero_cotizacion_vehimotors ?? ''),
    { headers: { 'Content-Type': 'text/html' } }
  )
}

export async function POST(req: NextRequest) {
  try {
    const formData      = await req.formData()
    const id            = formData.get('id') as string
    const token         = formData.get('token') as string
    const empresaEnvio  = formData.get('empresa_envio') as string
    const numeroGuia    = formData.get('numero_guia') as string
    const fileGuia      = formData.get('guia_archivo') as File | null
    const fileComp      = formData.get('comprobante') as File | null

    const { data: sol } = await supabase
      .from('solicitudes_repuestos')
      .select('id, numero, token_almacen')
      .eq('id', id).eq('token_almacen', token).single()

    if (!sol) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    let guiaUrl: string | null = null
    if (fileGuia && fileGuia.size > 0) {
      if (fileGuia.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'El archivo supera el límite de 10 MB' }, { status: 400 })
      if (!MIME_PERMITIDOS.has(fileGuia.type)) return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 })
      const bytes  = await fileGuia.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const path   = `repuestos/${id}/guia-almacen-${Date.now()}.${fileGuia.name.split('.').pop()}`
      const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, buffer, { contentType: fileGuia.type, upsert: false })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(path)
        guiaUrl = urlData.publicUrl
      }
    }

    let compUrl: string | null = null
    if (fileComp && fileComp.size > 0) {
      if (fileComp.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'El archivo supera el límite de 10 MB' }, { status: 400 })
      if (!MIME_PERMITIDOS.has(fileComp.type)) return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 })
      const bytes  = await fileComp.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const path   = `repuestos/${id}/comprobante-almacen-${Date.now()}.${fileComp.name.split('.').pop()}`
      const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, buffer, { contentType: fileComp.type, upsert: false })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(path)
        compUrl = urlData.publicUrl
      }
    }

    await supabase.from('solicitudes_repuestos').update({
      estado: 'guia_recibida',
      numero_guia: numeroGuia || null,
      empresa_envio: empresaEnvio || null,
      guia_url: guiaUrl,
      comprobante_almacen_url: compUrl,
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    await supabase.from('repuestos_historial').insert({
      solicitud_id: id,
      estado_nuevo: 'guia_recibida',
      usuario_email: 'almacen@externo',
      notas: `Datos de envío registrados por almacén${numeroGuia ? ': guía ' + numeroGuia : ''}${empresaEnvio ? ' · ' + empresaEnvio : ''}`,
    })

    await notificarGuiaRegistrada({ numero: sol.numero, solicitudId: id, numeroGuia: numeroGuia || null, empresaEnvio: empresaEnvio || null })

    return new NextResponse(paginaGracias(sol.numero), { headers: { 'Content-Type': 'text/html' } })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ── HTML ─────────────────────────────────────────────────────────

function shell(cuerpo: string) {
  return `<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>La Oriental Automotors — Almacén</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<style>
  body{margin:0;background:#f9fafb;font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px}
  .card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;max-width:500px;width:100%;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
  .hdr{background:#2563eb;padding:20px 28px;display:flex;align-items:center;gap:12px}
  .hname{color:#fff;font-weight:800;font-size:15px;margin:0}.hsub{color:rgba(255,255,255,0.75);font-size:11px;margin:0}
  .body{padding:28px}
  .emoji{font-size:44px;margin-bottom:10px}
  h2{font-size:19px;font-weight:800;color:#111;margin:0 0 6px}
  p{font-size:14px;color:#6b7280;margin:0 0 16px;line-height:1.6}
  .num-cot{background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 18px;margin-bottom:20px}
  .num-cot .lbl{font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:.06em;margin:0 0 4px}
  .num-cot .val{font-family:monospace;font-size:22px;font-weight:900;color:#1e3a8a;margin:0}
  label.lbl{display:block;font-size:11px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px}
  input[type=text]{width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:10px;padding:10px 14px;font-family:'Inter',sans-serif;font-size:14px;color:#111;outline:none;margin-bottom:14px}
  input[type=file]{width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:10px;padding:8px 14px;background:#f9fafb;cursor:pointer;font-family:'Inter',sans-serif;font-size:13px;margin-bottom:14px}
  .btn{display:block;width:100%;padding:13px;background:#2563eb;color:#fff;font-family:'Inter',sans-serif;font-size:14px;font-weight:700;border:none;border-radius:10px;cursor:pointer;text-align:center}
  .btn:hover{background:#1d4ed8}
  .ftr{background:#f9fafb;border-top:1px solid #f3f4f6;padding:12px;text-align:center;font-size:11px;color:#9ca3af}
</style></head><body>
<div class="card">
  <div class="hdr"><img src="${APP_URL}/logo-la-oriental-blanco.png" alt="La Oriental" style="height:40px;width:auto"/><div style="padding-left:12px"><p class="hname">LA ORIENTAL AUTOMOTORS</p><p class="hsub">MG & Maxus · Maturín, Venezuela</p></div></div>
  <div class="body">${cuerpo}</div>
  <div class="ftr">La Oriental Automotors · MG & Maxus · Maturín, Venezuela</div>
</div></body></html>`
}

function paginaFormulario(numero: string, id: string, token: string, numeroCotizacion: string) {
  return shell(`
    <div class="emoji">📦</div>
    <h2>Registrar envío — ${numero}</h2>
    <p>Complete los datos una vez despachado el pedido.</p>
    ${numeroCotizacion ? `<div class="num-cot"><p class="lbl">Número de cotización</p><p class="val">${escapeHtml(numeroCotizacion)}</p></div>` : ''}
    <form method="POST" enctype="multipart/form-data" action="/api/repuestos/almacen">
      <input type="hidden" name="id" value="${id}"/>
      <input type="hidden" name="token" value="${token}"/>
      <label class="lbl">Empresa de envío *</label>
      <input type="text" name="empresa_envio" placeholder="Ej: MRW, Zoom, Tealca…" required/>
      <label class="lbl">Número de guía *</label>
      <input type="text" name="numero_guia" placeholder="Ej: 00123456789" required/>
      <label class="lbl">Documento de guía (opcional)</label>
      <input type="file" name="guia_archivo" accept=".pdf,.jpg,.jpeg,.png,.webp"/>
      <label class="lbl">Comprobante (opcional)</label>
      <input type="file" name="comprobante" accept=".pdf,.jpg,.jpeg,.png,.webp"/>
      <button type="submit" class="btn">📤 Registrar envío</button>
    </form>`)
}

function paginaGracias(numero: string) {
  return shell(`
    <div class="emoji">✅</div>
    <h2>¡Datos registrados!</h2>
    <p>Los datos de envío del pedido <strong>${numero}</strong> han sido registrados. La Oriental Automotors ha sido notificada.</p>`)
}

function paginaYaRegistrado(numero: string) {
  return shell(`
    <div class="emoji">✅</div>
    <h2>Ya fue registrado</h2>
    <p>Los datos de envío del pedido <strong>${numero}</strong> ya fueron registrados anteriormente. Gracias.</p>`)
}
