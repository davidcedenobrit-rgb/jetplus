export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { enviarRecordatorioPermiso } from '@/lib/email-corporativo'

/* eslint-disable @typescript-eslint/no-explicit-any */

// Recordatorio de pago de permisos gubernamentales: 7 y 3 días antes de la
// fecha de pago, avisa por correo a Rojas, Mary y Leysdem. Se ejecuta 1 vez al
// día (Vercel cron) o manualmente con ?secret=<CRON_SECRET>.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  const authHeader = req.headers.get('authorization')
  const isVercelCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`
  const isManualCall = process.env.CRON_SECRET && secret === process.env.CRON_SECRET
  if (!isVercelCron && !isManualCall) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Modo prueba: ?to=correo → envía a ese correo, sin marcar los avisos como
  // enviados y sin filtrar por avisos previos (repetible, no molesta a nadie).
  const testTo = url.searchParams.get('to')?.trim() || null
  const esTest = !!(testTo && /\S+@\S+\.\S+/.test(testTo))

  const supabase = await createAdminClient()
  const { data: permisos, error } = await supabase
    .from('archivos')
    .select('id, nombre, url, fecha_pago, alerta_pago_7d_at, alerta_pago_3d_at')
    .eq('es_empresa', true)
    .eq('tipo_documento', 'permiso_gubernamental')
    .not('fecha_pago', 'is', null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const enviados: any[] = []

  for (const p of permisos ?? []) {
    const f = new Date(String(p.fecha_pago) + 'T00:00:00')
    const dias = Math.round((f.getTime() - hoy.getTime()) / 86400000)
    if (dias < 0) continue // ya venció: no re-notificar (evita spam)

    // Modo prueba: envía cualquier permiso dentro de 7 días al correo de prueba,
    // sin tocar los flags de aviso.
    if (esTest) {
      if (dias <= 7) {
        const r = await enviarRecordatorioPermiso({ nombre: p.nombre ?? 'Permiso', fechaPago: String(p.fecha_pago), dias, url: p.url, to: [testTo!] })
        if (r.ok) enviados.push({ id: p.id, dias, tipo: 'prueba', to: testTo })
      }
      continue
    }

    // Ventana de 3 días: enviar el aviso "3 días" (una sola vez).
    if (dias <= 3 && !p.alerta_pago_3d_at) {
      const r = await enviarRecordatorioPermiso({ nombre: p.nombre ?? 'Permiso', fechaPago: String(p.fecha_pago), dias, url: p.url })
      if (r.ok) {
        await supabase.from('archivos').update({ alerta_pago_3d_at: new Date().toISOString() }).eq('id', p.id)
        enviados.push({ id: p.id, dias, tipo: '3d' })
      }
    // Ventana de 7 días: enviar el aviso "7 días" (una sola vez).
    } else if (dias <= 7 && !p.alerta_pago_7d_at) {
      const r = await enviarRecordatorioPermiso({ nombre: p.nombre ?? 'Permiso', fechaPago: String(p.fecha_pago), dias, url: p.url })
      if (r.ok) {
        await supabase.from('archivos').update({ alerta_pago_7d_at: new Date().toISOString() }).eq('id', p.id)
        enviados.push({ id: p.id, dias, tipo: '7d' })
      }
    }
  }

  return NextResponse.json({ ok: true, revisados: permisos?.length ?? 0, enviados, ejecutado_en: new Date().toISOString() })
}
