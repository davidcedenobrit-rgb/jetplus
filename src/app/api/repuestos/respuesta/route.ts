export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notificarRespuestaVehimotors } from '@/lib/email-repuestos'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrodemando.laoriental.co'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MIME_PERMITIDOS = new Set([
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
         .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function validarArchivo(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) return 'El archivo supera el límite de 10 MB'
  if (!MIME_PERMITIDOS.has(file.type)) return 'Tipo de archivo no permitido'
  return null
}

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

  // Para "no_hay": mostrar form primero, actualizar DB solo al enviar
  if (tipo === 'no_hay') {
    return new NextResponse(paginaNoHay(solicitud.numero, id, token), { headers: { 'Content-Type': 'text/html' } })
  }

  // Para hay_todo / parcial: registrar respuesta y mostrar form de cotización
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

  const items = (solicitud.repuestos_items ?? []) as {
    id: string; descripcion: string; referencia: string | null; cantidad: number
  }[]

  return new NextResponse(
    paginaCotizacion(solicitud.numero, id, token, tipo, items),
    { headers: { 'Content-Type': 'text/html' } }
  )
}

export async function POST(req: NextRequest) {
  try {
    const formData  = await req.formData()
    const id        = formData.get('id') as string
    const token     = formData.get('token') as string
    const tipoForm  = formData.get('tipo_form') as string

    if (!id || !token) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

    const { data: solicitud } = await supabase
      .from('solicitudes_repuestos')
      .select('id, numero, token_respuesta')
      .eq('id', id).eq('token_respuesta', token).single()

    if (!solicitud) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    // ── Caso "no_hay": registrar respuesta + guardar observaciones ────
    if (tipoForm === 'no_hay') {
      const obs  = formData.get('observaciones') as string | null
      const file = formData.get('cotizacion_importacion') as File | null
      let cotImpUrl: string | null = null
      if (file && file.size > 0) {
        const errFile = validarArchivo(file)
        if (errFile) return NextResponse.json({ error: errFile }, { status: 400 })
        const bytes  = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const path   = `repuestos/${id}/cot-importacion-${Date.now()}.${file.name.split('.').pop()}`
        const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, buffer, { contentType: file.type, upsert: false })
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(path)
          cotImpUrl = urlData.publicUrl
        }
      }
      await supabase.from('solicitudes_repuestos').update({
        estado: 'cotizacion_recibida',
        respuesta_vehimotors: 'no_hay',
        cotizacion_importacion_url: cotImpUrl,
        cotizacion_importacion_obs: obs || null,
        updated_at: new Date().toISOString(),
      }).eq('id', id)
      await supabase.from('repuestos_historial').insert({
        solicitud_id: id, estado_nuevo: 'cotizacion_recibida',
        usuario_email: 'vehimotors@externo',
        notas: `Vehimotors respondió: no_hay${obs ? ' · ' + obs : ''}`,
      })
      await notificarRespuestaVehimotors({ numero: solicitud.numero, tipo: 'no_hay', solicitudId: id })
      return new NextResponse(paginaGracias(solicitud.numero, null), { headers: { 'Content-Type': 'text/html' } })
    }

    // ── Caso "hay_todo" / "parcial": guardar cotización + items ──────
    const obs     = formData.get('observaciones') as string | null
    const file    = formData.get('cotizacion') as File | null
    const itemIds = formData.getAll('item_id') as string[]

    for (const itemId of itemIds) {
      const disponible  = formData.get(`disp_${itemId}`) === 'on'
      const cantDisp    = disponible ? parseInt((formData.get(`cantidad_disp_${itemId}`) as string) || '0', 10) : null
      const tiempoImp   = !disponible ? ((formData.get(`tiempo_imp_${itemId}`) as string) || null) : null
      const cotImpFile  = !disponible ? (formData.get(`cot_imp_${itemId}`) as File | null) : null

      let cotImpItemUrl: string | null = null
      if (cotImpFile && cotImpFile.size > 0) {
        const errFile = validarArchivo(cotImpFile)
        if (errFile) return NextResponse.json({ error: errFile }, { status: 400 })
        const bytes  = await cotImpFile.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const path   = `repuestos/${id}/cot-imp-item-${itemId}-${Date.now()}.${cotImpFile.name.split('.').pop()}`
        const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, buffer, { contentType: cotImpFile.type, upsert: false })
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(path)
          cotImpItemUrl = urlData.publicUrl
        }
      }

      await supabase.from('repuestos_items').update({
        disponible,
        cantidad_disponible: cantDisp,
        tiempo_importacion: tiempoImp,
        cotizacion_importacion_url: cotImpItemUrl,
      }).eq('id', itemId)
    }

    let cotizacionUrl: string | null = null
    if (file && file.size > 0) {
      const errFile = validarArchivo(file)
      if (errFile) return NextResponse.json({ error: errFile }, { status: 400 })
      const bytes  = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const path   = `repuestos/${id}/cotizacion-${Date.now()}.${file.name.split('.').pop()}`
      const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, buffer, { contentType: file.type, upsert: false })
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
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
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
  .card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;max-width:560px;width:100%;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
  .hdr{background:#C41E3A;padding:20px 28px;display:flex;align-items:center;gap:12px}
  .hname{color:#fff;font-weight:800;font-size:15px;margin:0}
  .hsub{color:rgba(255,255,255,0.75);font-size:11px;margin:0}
  .body{padding:28px}
  .emoji{font-size:44px;margin-bottom:10px}
  h2{font-size:19px;font-weight:800;color:#111;margin:0 0 6px}
  p{font-size:14px;color:#6b7280;margin:0 0 16px;line-height:1.6}
  .badge{display:inline-block;padding:5px 14px;border-radius:99px;font-size:12px;font-weight:700;margin-bottom:14px}
  label.lbl{display:block;font-size:11px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px}
  textarea,input[type=text],input[type=number]{width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:10px;padding:10px 14px;font-family:'Inter',sans-serif;font-size:14px;color:#111;outline:none;margin-bottom:14px}
  textarea{min-height:80px;resize:vertical}
  input[type=file]{width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:10px;padding:8px 14px;background:#f9fafb;cursor:pointer;font-family:'Inter',sans-serif;font-size:13px;margin-bottom:14px}
  .btn{display:block;width:100%;padding:13px;background:#C41E3A;color:#fff;font-family:'Inter',sans-serif;font-size:14px;font-weight:700;border:none;border-radius:10px;cursor:pointer;text-align:center;margin-top:4px}
  .btn:hover{background:#a31228}
  .ftr{background:#f9fafb;border-top:1px solid #f3f4f6;padding:12px;text-align:center;font-size:11px;color:#9ca3af}
  .item-card{border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:10px}
  .item-hdr{display:flex;align-items:center;gap:10px;padding:12px 14px;background:#f9fafb}
  .item-hdr input[type=checkbox]{width:18px;height:18px;accent-color:#16a34a;cursor:pointer;flex-shrink:0}
  .item-name{flex:1;font-size:14px;color:#111;font-weight:600}
  .item-ref{color:#9ca3af;font-size:12px;font-family:monospace;margin-left:6px;font-weight:400}
  .item-qty{font-size:13px;font-weight:700;color:#6b7280}
  .item-body{padding:12px 14px;border-top:1px solid #f3f4f6}
  .avail-section{display:flex;align-items:center;gap:10px}
  .avail-section label.lbl{margin:0;white-space:nowrap}
  .imp-section label.lbl{margin-top:4px}
  .sec-title{font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.06em;margin:0 0 12px}
  .divider{border:none;border-top:1px solid #f3f4f6;margin:16px 0}
</style></head><body>
<div class="card">
  <div class="hdr"><img src="${APP_URL}/logo-la-oriental-blanco.png" alt="La Oriental" style="height:40px;width:auto"/><div style="padding-left:12px"><p class="hname">LA ORIENTAL AUTOMOTORS</p><p class="hsub">MG & Maxus · Maturín, Venezuela</p></div></div>
  <div class="body">${cuerpo}</div>
  <div class="ftr">La Oriental Automotors · MG & Maxus · Maturín, Venezuela</div>
</div></body></html>`
}

function paginaCotizacion(
  numero: string, id: string, token: string, tipo: 'hay_todo' | 'parcial',
  items: { id: string; descripcion: string; referencia: string | null; cantidad: number }[]
) {
  const esParcial = tipo === 'parcial'

  const itemsHtml = esParcial && items.length > 0
    ? `<p class="sec-title">Indique disponibilidad por repuesto:</p>
       ${items.map(it => `
         <div class="item-card">
           <div class="item-hdr">
             <input type="hidden" name="item_id" value="${it.id}"/>
             <input type="checkbox" name="disp_${it.id}" id="chk-${it.id}" checked
               onchange="toggleItem('${it.id}', this.checked)"/>
             <span class="item-name">${escapeHtml(it.descripcion)}${it.referencia ? `<span class="item-ref">${escapeHtml(it.referencia)}</span>` : ''}</span>
             <span class="item-qty">×${it.cantidad}</span>
           </div>
           <div class="item-body">
             <div class="avail-section" id="avail-${it.id}">
               <label class="lbl" for="cant-${it.id}">Cant. disponible:</label>
               <input type="number" id="cant-${it.id}" name="cantidad_disp_${it.id}"
                 value="${it.cantidad}" min="1" max="${it.cantidad}" style="width:80px;margin:0"/>
             </div>
             <div class="imp-section" id="imp-${it.id}" style="display:none">
               <label class="lbl">Tiempo de importación (opcional)</label>
               <input type="text" name="tiempo_imp_${it.id}" placeholder="Ej: 15 días hábiles"/>
               <label class="lbl">Cotización de importación (opcional)</label>
               <input type="file" name="cot_imp_${it.id}" accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls"/>
             </div>
           </div>
         </div>`).join('')}
       <script>
         function toggleItem(id, available) {
           document.getElementById('avail-'+id).style.display = available ? '' : 'none';
           document.getElementById('imp-'+id).style.display   = available ? 'none' : '';
         }
       </script>`
    : ''

  const cuerpo = `
    <div class="emoji">${esParcial ? '⚠️' : '✅'}</div>
    <div class="badge" style="background:${esParcial ? '#d9770620' : '#16a34a20'};color:${esParcial ? '#d97706' : '#16a34a'}">${esParcial ? 'Disponibilidad parcial' : 'Hay todo disponible'} — ${numero}</div>
    <h2>Gracias por su respuesta</h2>
    <p>${esParcial
      ? 'Indique cuáles repuestos están disponibles y la cantidad. Para los no disponibles, puede indicar tiempo de importación y adjuntar cotización.'
      : 'Por favor adjunte la cotización con los precios para proceder con la aprobación.'
    }</p>
    <form method="POST" enctype="multipart/form-data" action="/api/repuestos/respuesta">
      <input type="hidden" name="id" value="${id}"/>
      <input type="hidden" name="token" value="${token}"/>
      <input type="hidden" name="tipo_form" value="cotizacion"/>
      ${itemsHtml}
      ${itemsHtml ? '<hr class="divider"/>' : ''}
      ${esParcial ? `<label class="lbl">Observaciones adicionales (opcional)</label>
      <textarea name="observaciones" placeholder="Ej: El sensor de oxígeno llega en 3 días hábiles..."></textarea>` : ''}
      <label class="lbl">Cotización con precios${esParcial ? ' de los disponibles' : ''} <span style="color:#C41E3A">*</span></label>
      <input type="file" name="cotizacion" accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls" required/>
      <button type="submit" class="btn">📤 Enviar cotización</button>
    </form>`
  return shell('Enviar cotización', esParcial ? '#d97706' : '#16a34a', cuerpo)
}

function paginaNoHay(numero: string, id: string, token: string) {
  const cuerpo = `
    <div class="emoji">❌</div>
    <div class="badge" style="background:#fee2e2;color:#dc2626">Sin disponibilidad — ${numero}</div>
    <h2>Confirmar respuesta</h2>
    <p>Agregue observaciones si lo desea (tiempos de importación, alternativas, etc.) y haga clic en <strong>Enviar respuesta</strong> para confirmar.</p>
    <form method="POST" enctype="multipart/form-data" action="/api/repuestos/respuesta">
      <input type="hidden" name="id" value="${id}"/>
      <input type="hidden" name="token" value="${token}"/>
      <input type="hidden" name="tipo_form" value="no_hay"/>
      <label class="lbl">Observaciones (opcional)</label>
      <textarea name="observaciones" placeholder="Ej: Podemos conseguirlos por importación en 30 días hábiles..."></textarea>
      <label class="lbl">Cotización de importación (opcional)</label>
      <input type="file" name="cotizacion_importacion" accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls"/>
      <button type="submit" class="btn" style="background:#dc2626">📤 Enviar respuesta</button>
    </form>`
  return shell('Sin disponibilidad', '#dc2626', cuerpo)
}

function paginaGracias(numero: string, cotizacionUrl: string | null) {
  const cuerpo = `<div class="emoji">🎉</div>
    <div class="badge" style="background:#dcfce7;color:#16a34a">Información enviada — ${numero}</div>
    <h2>¡Listo! Información recibida</h2>
    <p>El equipo de La Oriental revisará la información y le notificaremos a la brevedad.</p>
    ${cotizacionUrl ? `<p style="font-size:12px;color:#9ca3af">Archivo adjunto correctamente.</p>` : ''}`
  return shell('Información enviada', '#16a34a', cuerpo)
}

function paginaYaRespondida(numero: string) {
  const cuerpo = `<div class="emoji">✅</div>
    <div class="badge" style="background:#f3f4f6;color:#6b7280">Ya respondido — ${numero}</div>
    <h2>Esta solicitud ya fue respondida</h2>
    <p>Gracias. La solicitud ${numero} ya fue procesada anteriormente.</p>`
  return shell('Ya respondido', '#6b7280', cuerpo)
}
