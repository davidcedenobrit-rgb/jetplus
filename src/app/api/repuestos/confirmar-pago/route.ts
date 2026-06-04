export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrodemando.laoriental.co'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id     = searchParams.get('id')
  const token  = searchParams.get('token')
  const accion = searchParams.get('accion') as 'confirmar' | 'guia' | null

  if (!id || !token || !accion) return new NextResponse('Enlace inválido', { status: 400 })

  const { data: sol } = await supabase
    .from('solicitudes_repuestos')
    .select('id, numero, token_pago, estado')
    .eq('id', id).eq('token_pago', token).single()

  if (!sol) return new NextResponse('No encontrado', { status: 404 })

  if (accion === 'confirmar') {
    await supabase.from('solicitudes_repuestos').update({
      pago_confirmado_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    await supabase.from('repuestos_historial').insert({
      solicitud_id: id, estado_nuevo: sol.estado,
      usuario_email: 'vehimotors@externo', notas: 'Pago confirmado por Vehimotors',
    })

    return new NextResponse(paginaConfirmado(sol.numero), { headers: { 'Content-Type': 'text/html' } })
  }

  // accion === 'guia' → mostrar formulario
  return new NextResponse(paginaGuia(sol.numero, id, token), { headers: { 'Content-Type': 'text/html' } })
}

export async function POST(req: NextRequest) {
  try {
    const formData   = await req.formData()
    const id         = formData.get('id') as string
    const token      = formData.get('token') as string
    const numeroGuia = formData.get('numero_guia') as string
    const empresaEnvio = formData.get('empresa_envio') as string | null
    const fileGuia   = formData.get('guia_archivo') as File | null

    const { data: sol } = await supabase
      .from('solicitudes_repuestos')
      .select('id, numero, token_pago')
      .eq('id', id).eq('token_pago', token).single()

    if (!sol) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    let guiaUrl: string | null = null
    if (fileGuia && fileGuia.size > 0) {
      const bytes  = await fileGuia.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const path   = `repuestos/${id}/guia-${Date.now()}.${fileGuia.name.split('.').pop()}`
      const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, buffer, {
        contentType: fileGuia.type, upsert: false,
      })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(path)
        guiaUrl = urlData.publicUrl
      }
    }

    await supabase.from('solicitudes_repuestos').update({
      estado: 'guia_recibida',
      numero_guia: numeroGuia || null,
      guia_url: guiaUrl,
      empresa_envio: empresaEnvio || null,
      pago_confirmado_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    await supabase.from('repuestos_historial').insert({
      solicitud_id: id, estado_nuevo: 'guia_recibida',
      usuario_email: 'vehimotors@externo',
      notas: `Guía cargada por Vehimotors${numeroGuia ? ': ' + numeroGuia : ''}${empresaEnvio ? ' · ' + empresaEnvio : ''}`,
    })

    revalidatePath('/repuestos')
    revalidatePath(`/repuestos/${id}`)
    return new NextResponse(paginaGuiaGracias(sol.numero), { headers: { 'Content-Type': 'text/html' } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function shell(cuerpo: string) {
  return `<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>La Oriental Automotors</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<style>
  body{margin:0;background:#f9fafb;font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px}
  .card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;max-width:480px;width:100%;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
  .hdr{background:#C41E3A;padding:20px 28px;display:flex;align-items:center;gap:12px}
  .hname{color:#fff;font-weight:800;font-size:15px;margin:0}.hsub{color:rgba(255,255,255,0.75);font-size:11px;margin:0}
  .body{padding:32px 28px}
  .emoji{font-size:48px;margin-bottom:12px}
  h2{font-size:20px;font-weight:800;color:#111;margin:0 0 8px}
  p{font-size:14px;color:#6b7280;margin:0 0 20px;line-height:1.6}
  label{display:block;font-size:11px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
  input{width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:10px;padding:10px 14px;font-family:'Inter',sans-serif;font-size:14px;color:#111;outline:none;margin-bottom:16px}
  input[type=file]{padding:8px 14px;background:#f9fafb;cursor:pointer}
  .btn{display:block;width:100%;padding:14px;background:#2563eb;color:#fff;font-family:'Inter',sans-serif;font-size:14px;font-weight:700;border:none;border-radius:10px;cursor:pointer;text-align:center}
  .ftr{background:#f9fafb;border-top:1px solid #f3f4f6;padding:14px;text-align:center;font-size:11px;color:#9ca3af}
</style></head><body>
<div class="card">
  <div class="hdr"><img src="${APP_URL}/logo-la-oriental-blanco.png" alt="La Oriental" style="height:40px;width:auto"/><div style="padding-left:12px"><p class="hname">LA ORIENTAL AUTOMOTORS</p><p class="hsub">MG & Maxus · Maturín, Venezuela</p></div></div>
  <div class="body">${cuerpo}</div>
  <div class="ftr">La Oriental Automotors · MG & Maxus · Maturín, Venezuela</div>
</div></body></html>`
}

function paginaConfirmado(numero: string) {
  return shell(`<div class="emoji">✅</div><h2>Pago confirmado</h2>
    <p>Hemos registrado la confirmación de recepción del pago para la solicitud <strong>${numero}</strong>. Gracias.</p>`)
}

function paginaGuia(numero: string, id: string, token: string) {
  return shell(`<div class="emoji">📦</div><h2>Cargar guía de despacho — ${numero}</h2>
    <p>Por favor complete los datos de envío y adjunte el documento si lo tiene disponible.</p>
    <form method="POST" enctype="multipart/form-data" action="/api/repuestos/confirmar-pago">
      <input type="hidden" name="id" value="${id}"/>
      <input type="hidden" name="token" value="${token}"/>
      <label>Empresa de envío *</label>
      <input type="text" name="empresa_envio" placeholder="Ej: MRW, Zoom, Tealca…" required/>
      <label>Número de guía *</label>
      <input type="text" name="numero_guia" placeholder="Ej: 00123456789" required/>
      <label>Documento de guía (opcional)</label>
      <input type="file" name="guia_archivo" accept=".pdf,.jpg,.jpeg,.png,.webp"/>
      <button type="submit" class="btn">📤 Enviar guía</button>
    </form>`)
}

function paginaGuiaGracias(numero: string) {
  return shell(`<div class="emoji">🚚</div><h2>Guía registrada</h2>
    <p>Hemos recibido la guía de despacho para la solicitud <strong>${numero}</strong>. La Oriental Automotors ha sido notificada. Gracias.</p>`)
}
