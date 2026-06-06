export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrodemando.laoriental.co'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const token = searchParams.get('token')

  if (!id || !token) {
    return new NextResponse(pageHTML('Enlace inválido', 'El enlace de confirmación no es válido o está incompleto.', false), {
      status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const { data: ingreso } = await supabase
    .from('ingresos')
    .select('id, numero_recibo, estado, token_vehimotors, confirmado_vehimotors_at, monto, moneda, concepto')
    .eq('id', id)
    .eq('token_vehimotors', token)
    .single()

  if (!ingreso) {
    return new NextResponse(pageHTML('Enlace no válido', 'No encontramos este recibo. El enlace puede haber expirado.', false), {
      status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // Ya confirmado previamente
  if (ingreso.confirmado_vehimotors_at) {
    return new NextResponse(
      pageHTML('Ya confirmado', `El recibo <strong>${ingreso.numero_recibo}</strong> ya fue confirmado anteriormente.`, true),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }

  // Confirmar
  await supabase
    .from('ingresos')
    .update({ confirmado_vehimotors_at: new Date().toISOString() })
    .eq('id', id)

  const monto = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(Number(ingreso.monto))
  const monedaLabel = ingreso.moneda === 'VES' ? 'Bs.' : ingreso.moneda

  return new NextResponse(
    pageHTML(
      '¡Recibido confirmado!',
      `Han confirmado correctamente la recepción del pago <strong>${ingreso.numero_recibo}</strong> por <strong>${monedaLabel} ${monto}</strong> — ${ingreso.concepto}.`,
      true
    ),
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

function pageHTML(titulo: string, mensaje: string, ok: boolean) {
  const logoUrl = `${APP_URL}/logo-la-oriental-blanco.png`
  const color = ok ? '#16a34a' : '#C41E3A'
  const icon = ok
    ? `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
    : `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo} — La Oriental</title></head>
<body style="margin:0;padding:40px 16px;background:#f9fafb;font-family:sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center">
  <div style="background:#fff;max-width:480px;width:100%;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07)">
    <div style="background:#C41E3A;padding:24px 32px;text-align:center">
      <img src="${logoUrl}" alt="La Oriental" style="height:44px;width:auto;display:inline-block" />
    </div>
    <div style="padding:40px 32px;text-align:center">
      <div style="margin-bottom:20px">${icon}</div>
      <h1 style="font-size:22px;font-weight:800;color:#111;margin:0 0 12px">${titulo}</h1>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 28px">${mensaje}</p>
      <p style="font-size:12px;color:#9ca3af;margin:0">La Oriental Automotors · MG &amp; Maxus · Maturín, Venezuela</p>
    </div>
  </div>
</body></html>`
}
