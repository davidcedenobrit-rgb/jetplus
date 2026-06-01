export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notificarRespuestaVehimotors } from '@/lib/email-repuestos'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrodemando.laoriental.co'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id    = searchParams.get('id')
  const token = searchParams.get('token')
  const tipo  = searchParams.get('tipo') as 'hay_todo' | 'no_hay' | 'parcial' | null

  if (!id || !token || !tipo) return new NextResponse('Enlace inválido', { status: 400 })

  const { data: solicitud } = await supabase
    .from('solicitudes_repuestos')
    .select('*, repuestos_items(*)')
    .eq('id', id).eq('token_respuesta', token).single()

  if (!solicitud) return new NextResponse('No encontrado', { status: 404 })

  if (solicitud.estado !== 'cotizacion_enviada') {
    return new NextResponse(paginaYaRespondida(solicitud.numero), { headers: { 'Content-Type': 'text/html' } })
  }

  // Actualizar estado
  await supabase.from('solicitudes_repuestos').update({
    estado: 'cotizacion_recibida',
    respuesta_vehimotors: tipo,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  await supabase.from('repuestos_historial').insert({
    solicitud_id: id, estado_nuevo: 'cotizacion_recibida',
    usuario_email: 'vehimotors@externo',
    notas: `Vehimotors respondió: ${tipo}`,
  })

  await notificarRespuestaVehimotors({ numero: solicitud.numero, tipo, solicitudId: id })

  // Si no hay → página simple
  if (tipo === 'no_hay') {
    return new NextResponse(paginaSimple(solicitud.numero, 'no_hay'), { headers: { 'Content-Type': 'text/html' } })
  }

  // Si hay todo o parcial → página con formulario de cotización
  return new NextResponse(
    paginaCotizacion(solicitud.numero, id, token, tipo),
    { headers: { 'Content-Type': 'text/html' } }
  )
}

// POST: recibir cotización (observaciones + archivo)
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const id    = formData.get('id') as string
    const token = formData.get('token') as string
    const obs   = formData.get('observaciones') as string | null
    const file  = formData.get('cotizacion') as File | null

    if (!id || !token) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

    const { data: solicitud } = await supabase
      .from('solicitudes_repuestos')
      .select('id, numero, token_respuesta')
      .eq('id', id).eq('token_respuesta', token).single()

    if (!solicitud) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    let cotizacionUrl: string | null = null

    if (file && file.size > 0) {
      const bytes  = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const path   = `repuestos/${id}/cotizacion-${Date.now()}.${file.name.split('.').pop()}`

      const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, buffer, {
        contentType: file.type, upsert: false,
      })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(path)
        cotizacionUrl = urlData.publicUrl
      }
    }

    await supabase.from('solicitudes_repuestos').update({
      cotizacion_observaciones: obs || null,
      cotizacion_url: cotizacionUrl,
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    return new NextResponse(paginaGracias(solicitud.numero, cotizacionUrl), { headers: { 'Content-Type': 'text/html' } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ── HTML pages ──────────────────────────────────────────────────────

function shell(titulo: string, color: string, cuerpo: string) {
  return `<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${titulo} · La Oriental Automotors</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<style>
  body{margin:0;background:#f9fafb;font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px}
  .card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;max-width:520px;width:100%;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
  .hdr{background:#C41E3A;padding:20px 28px;display:flex;align-items:center;gap:12px}
  .logo{width:40px;height:40px;border-radius:9px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center}
  .logo span{color:#fff;font-weight:900;font-size:14px}
  .hname{color:#fff;font-weight:800;font-size:15px;margin:0}
  .hsub{color:rgba(255,255,255,0.75);font-size:11px;margin:0}
  .body{padding:32px 28px}
  .emoji{font-size:48px;margin-bottom:12px}
  h2{font-size:20px;font-weight:800;color:#111;margin:0 0 8px}
  p{font-size:14px;color:#6b7280;margin:0 0 20px;line-height:1.6}
  .badge{display:inline-block;padding:6px 16px;border-radius:99px;font-size:12px;font-weight:700;background:${color}20;color:${color};margin-bottom:16px}
  label{display:block;font-size:11px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
  textarea,input[type=file]{width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:10px;padding:10px 14px;font-family:'Inter',sans-serif;font-size:14px;color:#111;outline:none;margin-bottom:16px}
  textarea{min-height:90px;resize:vertical}
  input[type=file]{padding:8px 14px;background:#f9fafb;cursor:pointer}
  .btn{display:block;width:100%;padding:14px;background:#C41E3A;color:#fff;font-family:'Inter',sans-serif;font-size:14px;font-weight:700;border:none;border-radius:10px;cursor:pointer;text-align:center}
  .btn:hover{background:#a31228}
  .ftr{background:#f9fafb;border-top:1px solid #f3f4f6;padding:14px;text-align:center;font-size:11px;color:#9ca3af}
</style></head><body>
<div class="card">
  <div class="hdr"><div class="logo"><span>LO</span></div><div><p class="hname">LA ORIENTAL AUTOMOTORS</p><p class="hsub">MG & Maxus · Maturín, Venezuela</p></div></div>
  <div class="body">${cuerpo}</div>
  <div class="ftr">La Oriental Automotors · MG & Maxus · Maturín, Venezuela</div>
</div></body></html>`
}

function paginaCotizacion(numero: string, id: string, token: string, tipo: 'hay_todo' | 'parcial') {
  const esParcial = tipo === 'parcial'
  const cuerpo = `
    <div class="emoji">${esParcial ? '⚠️' : '✅'}</div>
    <div class="badge">${esParcial ? 'Disponibilidad parcial' : 'Hay todo disponible'} — ${numero}</div>
    <h2>Gracias por su respuesta</h2>
    <p>${esParcial
      ? 'Indique qué repuestos están disponibles y adjunte la cotización con precios.'
      : 'Por favor adjunte su cotización con los precios para proceder con la aprobación.'
    }</p>
    <form method="POST" enctype="multipart/form-data" action="/api/repuestos/respuesta">
      <input type="hidden" name="id" value="${id}"/>
      <input type="hidden" name="token" value="${token}"/>
      ${esParcial ? `<label>Observaciones (indique qué hay disponible)</label>
      <textarea name="observaciones" placeholder="Ej: Tenemos filtros de aceite y pastillas, no hay sensor de oxígeno..."></textarea>` : ''}
      <label>Adjuntar cotización (PDF, imagen, Excel)</label>
      <input type="file" name="cotizacion" accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls"/>
      <button type="submit" class="btn">📤 Enviar cotización</button>
    </form>`
  return shell('Enviar cotización', esParcial ? '#d97706' : '#16a34a', cuerpo)
}

function paginaSimple(numero: string, tipo: string) {
  const cuerpo = `<div class="emoji">❌</div>
    <div class="badge" style="background:#fee2e2;color:#dc2626">Sin disponibilidad — ${numero}</div>
    <h2>Respuesta registrada</h2>
    <p>Gracias por informarnos. La Oriental Automotors ha sido notificada y buscará alternativas.</p>`
  return shell('Sin disponibilidad', '#dc2626', cuerpo)
}

function paginaGracias(numero: string, cotizacionUrl: string | null) {
  const cuerpo = `<div class="emoji">🎉</div>
    <div class="badge">Cotización enviada — ${numero}</div>
    <h2>¡Listo! Cotización recibida</h2>
    <p>Hemos recibido su cotización. El equipo de La Oriental la revisará y le notificaremos la aprobación a la brevedad.</p>
    ${cotizacionUrl ? `<p style="font-size:12px;color:#9ca3af">Archivo adjunto correctamente.</p>` : ''}`
  return shell('Cotización enviada', '#16a34a', cuerpo)
}

function paginaYaRespondida(numero: string) {
  const cuerpo = `<div class="emoji">✅</div>
    <div class="badge">Ya respondido — ${numero}</div>
    <h2>Esta solicitud ya fue respondida</h2>
    <p>Gracias. La solicitud ${numero} ya fue procesada anteriormente.</p>`
  return shell('Ya respondido', '#6b7280', cuerpo)
}
