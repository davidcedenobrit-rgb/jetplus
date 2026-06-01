import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notificarRespuestaVehimotors, enviarConfirmacionCotizacion } from '@/lib/email-repuestos'

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

  if (!id || !token || !tipo) {
    return new NextResponse('Enlace inválido', { status: 400 })
  }

  // Verificar token y solicitud
  const { data: solicitud } = await supabase
    .from('solicitudes_repuestos')
    .select('*, repuestos_items(*)')
    .eq('id', id)
    .eq('token_respuesta', token)
    .single()

  if (!solicitud) {
    return new NextResponse('Solicitud no encontrada o enlace expirado', { status: 404 })
  }

  if (solicitud.estado !== 'cotizacion_enviada') {
    // Ya fue respondido — mostrar página de confirmación
    const html = paginaConfirmacion(solicitud.numero, tipo, true)
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } })
  }

  // Actualizar estado
  await supabase
    .from('solicitudes_repuestos')
    .update({
      estado: 'cotizacion_recibida',
      respuesta_vehimotors: tipo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  // Registrar en historial
  await supabase.from('repuestos_historial').insert({
    solicitud_id: id,
    estado_nuevo: 'cotizacion_recibida',
    usuario_email: 'vehimotors@externo',
    notas: `Vehimotors respondió: ${tipo}`,
  })

  // Notificar a Arianna y Director
  await notificarRespuestaVehimotors({ numero: solicitud.numero, tipo, solicitudId: id })

  // Si hay disponibilidad, enviar email confirmando y pidiendo cotización formal
  if (tipo === 'hay_todo' || tipo === 'parcial') {
    const items = (solicitud.repuestos_items ?? []).map((i: any) => ({
      descripcion: i.descripcion,
      referencia: i.referencia,
      cantidad: i.cantidad,
    }))
    await enviarConfirmacionCotizacion({ numero: solicitud.numero, respuesta: tipo, items })
  }

  // Redirigir a página de confirmación
  const html = paginaConfirmacion(solicitud.numero, tipo, false)
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } })
}

function paginaConfirmacion(numero: string, tipo: string, yaRespondido: boolean) {
  const config = {
    hay_todo: { emoji: '✅', titulo: 'Hay todo disponible', color: '#16a34a', bg: '#f0fdf4', msg: 'Gracias por confirmar. Le enviaremos los detalles del pedido a la brevedad.' },
    no_hay:   { emoji: '❌', titulo: 'Sin disponibilidad', color: '#dc2626', bg: '#fef2f2', msg: 'Gracias por informarnos. Buscaremos alternativas.' },
    parcial:  { emoji: '⚠️', titulo: 'Disponibilidad parcial', color: '#d97706', bg: '#fffbeb', msg: 'Gracias por confirmar. Le contactaremos para coordinar los repuestos disponibles.' },
  }[tipo] ?? { emoji: '✅', titulo: 'Respuesta registrada', color: '#16a34a', bg: '#f0fdf4', msg: '' }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Respuesta registrada · La Oriental Automotors</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    body { margin:0; background:#f9fafb; font-family:'Inter',sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .card { background:#fff; border:1px solid #e5e7eb; border-radius:16px; max-width:480px; width:90%; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
    .header { background:#C41E3A; padding:20px 28px; display:flex; align-items:center; gap:12px; }
    .logo { width:40px; height:40px; border-radius:9px; background:rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center; }
    .logo span { color:#fff; font-weight:900; font-size:14px; }
    .hname { color:#fff; font-weight:800; font-size:15px; margin:0; }
    .hsub  { color:rgba(255,255,255,0.75); font-size:11px; margin:0; }
    .body  { padding:36px 28px; text-align:center; }
    .emoji { font-size:56px; margin-bottom:16px; }
    .titulo { font-size:22px; font-weight:800; color:#111; margin:0 0 10px; }
    .msg    { font-size:14px; color:#6b7280; margin:0 0 24px; line-height:1.6; }
    .badge  { display:inline-block; padding:8px 20px; border-radius:99px; font-size:13px; font-weight:700; margin-bottom:8px; }
    .footer { background:#f9fafb; border-top:1px solid #f3f4f6; padding:16px; text-align:center; }
    .footer p { margin:0; font-size:11px; color:#9ca3af; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo"><span>LO</span></div>
      <div>
        <p class="hname">LA ORIENTAL AUTOMOTORS</p>
        <p class="hsub">MG & Maxus · Maturín, Venezuela</p>
      </div>
    </div>
    <div class="body">
      <div class="emoji">${config.emoji}</div>
      <h2 class="titulo">${config.titulo}</h2>
      <div class="badge" style="background:${config.bg};color:${config.color}">Solicitud ${numero}</div>
      <p class="msg">${yaRespondido ? 'Esta solicitud ya fue respondida anteriormente.' : config.msg}</p>
    </div>
    <div class="footer">
      <p>La Oriental Automotors · MG & Maxus · Maturín, Venezuela</p>
    </div>
  </div>
</body>
</html>`
}
