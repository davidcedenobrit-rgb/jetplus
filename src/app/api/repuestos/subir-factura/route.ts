export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notificarFacturaRecibida } from '@/lib/email-repuestos'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id    = searchParams.get('id')
  const token = searchParams.get('token')
  if (!id || !token) return new NextResponse('Enlace inválido', { status: 400 })

  const { data: sol } = await supabase
    .from('solicitudes_repuestos')
    .select('id, numero, token_factura, estado, factura_url')
    .eq('id', id).eq('token_factura', token).single()

  if (!sol) return new NextResponse('No encontrado', { status: 404 })
  if (sol.factura_url) return new NextResponse(paginaYaSubida(sol.numero), { headers: { 'Content-Type': 'text/html' } })

  return new NextResponse(paginaSubirFactura(sol.numero, id, token), { headers: { 'Content-Type': 'text/html' } })
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const id    = formData.get('id') as string
    const token = formData.get('token') as string
    const file  = formData.get('factura') as File | null

    if (!id || !token || !file || file.size === 0)
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })

    const { data: sol } = await supabase
      .from('solicitudes_repuestos')
      .select('id, numero, token_factura')
      .eq('id', id).eq('token_factura', token).single()

    if (!sol) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const path   = `repuestos/${id}/factura-${Date.now()}.${file.name.split('.').pop()}`

    const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, buffer, {
      contentType: file.type, upsert: false,
    })
    if (upErr) throw new Error(upErr.message)

    const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(path)

    await supabase.from('solicitudes_repuestos').update({
      estado: 'factura_recibida',
      factura_url: urlData.publicUrl,
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    await supabase.from('repuestos_historial').insert({
      solicitud_id: id, estado_nuevo: 'factura_recibida',
      usuario_email: 'vehimotors@externo',
      notas: 'Factura cargada por Vehimotors',
    })

    await notificarFacturaRecibida({ numero: sol.numero, solicitudId: id, facturaUrl: urlData.publicUrl })

    return new NextResponse(paginaGracias(sol.numero), { headers: { 'Content-Type': 'text/html' } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function shell(cuerpo: string) {
  return `<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Factura · La Oriental Automotors</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<style>
  body{margin:0;background:#f9fafb;font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px}
  .card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;max-width:480px;width:100%;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
  .hdr{background:#C41E3A;padding:20px 28px;display:flex;align-items:center;gap:12px}
  .logo{width:40px;height:40px;border-radius:9px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center}
  .logo span{color:#fff;font-weight:900;font-size:14px}
  .hname{color:#fff;font-weight:800;font-size:15px;margin:0}.hsub{color:rgba(255,255,255,0.75);font-size:11px;margin:0}
  .body{padding:32px 28px}
  .emoji{font-size:48px;margin-bottom:12px}
  h2{font-size:20px;font-weight:800;color:#111;margin:0 0 8px}
  p{font-size:14px;color:#6b7280;margin:0 0 20px;line-height:1.6}
  label{display:block;font-size:11px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
  input[type=file]{width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:10px;padding:8px 14px;font-family:'Inter',sans-serif;font-size:14px;color:#111;background:#f9fafb;cursor:pointer;margin-bottom:16px}
  .btn{display:block;width:100%;padding:14px;background:#7c3aed;color:#fff;font-family:'Inter',sans-serif;font-size:14px;font-weight:700;border:none;border-radius:10px;cursor:pointer;text-align:center}
  .btn:hover{background:#6d28d9}
  .ftr{background:#f9fafb;border-top:1px solid #f3f4f6;padding:14px;text-align:center;font-size:11px;color:#9ca3af}
</style></head><body>
<div class="card">
  <div class="hdr"><div class="logo"><span>LO</span></div><div><p class="hname">LA ORIENTAL AUTOMOTORS</p><p class="hsub">MG & Maxus · Maturín, Venezuela</p></div></div>
  <div class="body">${cuerpo}</div>
  <div class="ftr">La Oriental Automotors · MG & Maxus · Maturín, Venezuela</div>
</div></body></html>`
}

function paginaSubirFactura(numero: string, id: string, token: string) {
  return shell(`
    <div class="emoji">📄</div>
    <h2>Anexar factura — ${numero}</h2>
    <p>La cotización fue aprobada. Por favor adjunte la factura formal para proceder con el pago.</p>
    <form method="POST" enctype="multipart/form-data" action="/api/repuestos/subir-factura">
      <input type="hidden" name="id" value="${id}"/>
      <input type="hidden" name="token" value="${token}"/>
      <label>Factura (PDF o imagen)</label>
      <input type="file" name="factura" accept=".pdf,.jpg,.jpeg,.png,.webp" required/>
      <button type="submit" class="btn">📤 Enviar factura</button>
    </form>`)
}

function paginaGracias(numero: string) {
  return shell(`
    <div class="emoji">✅</div>
    <h2>Factura recibida</h2>
    <p>Hemos recibido la factura de la solicitud <strong>${numero}</strong>. Le notificaremos cuando el pago sea procesado.</p>`)
}

function paginaYaSubida(numero: string) {
  return shell(`
    <div class="emoji">✅</div>
    <h2>Factura ya cargada</h2>
    <p>La factura de la solicitud <strong>${numero}</strong> ya fue recibida anteriormente. Gracias.</p>`)
}
