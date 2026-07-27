export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { enviarRecordatorioCumpleanos } from '@/lib/email-corporativo'

/* eslint-disable @typescript-eslint/no-explicit-any */

// Recordatorio de cumpleaños: avisa por correo a Rojas, Mary y Leysdem 5 y 3
// días antes del cumpleaños de cada empleado. Además mantiene el evento en el
// calendario para la próxima ocurrencia. Se ejecuta 1 vez al día (Vercel cron)
// o manualmente con ?secret=<CRON_SECRET>  ·  modo prueba con ?to=correo.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  const authHeader = req.headers.get('authorization')
  const isVercelCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`
  const isManualCall = process.env.CRON_SECRET && secret === process.env.CRON_SECRET
  if (!isVercelCron && !isManualCall) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const testTo = url.searchParams.get('to')?.trim() || null
  const esTest = !!(testTo && /\S+@\S+\.\S+/.test(testTo))

  const supabase = await createAdminClient()
  const { data: cumples, error } = await supabase
    .from('cumpleanos_empleados')
    .select('id, nombres, apellidos, dia, mes, alerta_5d_anio, alerta_3d_anio, activo')
    .eq('activo', true)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fecha de hoy en zona Venezuela
  const hoyStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' }) // YYYY-MM-DD
  const hoy = new Date(hoyStr + 'T00:00:00')
  const anioActual = hoy.getFullYear()
  const enviados: any[] = []

  for (const c of cumples ?? []) {
    // Próxima ocurrencia del cumpleaños (este año o el próximo si ya pasó).
    let anio = anioActual
    let fecha = new Date(anio, c.mes - 1, c.dia)
    fecha.setHours(0, 0, 0, 0)
    if (fecha < hoy) { anio = anioActual + 1; fecha = new Date(anio, c.mes - 1, c.dia); fecha.setHours(0, 0, 0, 0) }
    const fechaISO = `${anio}-${String(c.mes).padStart(2, '0')}-${String(c.dia).padStart(2, '0')}`
    const dias = Math.round((fecha.getTime() - hoy.getTime()) / 86400000)
    const nombre = `${cap(c.nombres)} ${cap(c.apellidos)}`

    // Asegura el evento en el calendario para esta ocurrencia (idempotente).
    const marcador = `cumple:${c.id}`
    const { data: existe } = await supabase
      .from('eventos_calendario')
      .select('id')
      .eq('notas', marcador)
      .eq('fecha', fechaISO)
      .maybeSingle()
    if (!existe) {
      await supabase.from('eventos_calendario').insert({
        titulo: `🎂 Cumpleaños — ${nombre}`,
        descripcion: `Cumpleaños de ${nombre}`,
        fecha: fechaISO, tipo: 'Cumpleaños', estado: 'programado', notas: marcador,
      })
    }

    // Modo prueba: envía los que caen dentro de 5 días al correo indicado.
    if (esTest) {
      if (dias <= 5) {
        const r = await enviarRecordatorioCumpleanos({ nombre, fecha: fechaISO, dias, to: [testTo!] })
        if (r.ok) enviados.push({ id: c.id, dias, tipo: 'prueba', to: testTo })
      }
      continue
    }

    // Aviso 5 días antes (una vez por año).
    if (dias === 5 && c.alerta_5d_anio !== anio) {
      const r = await enviarRecordatorioCumpleanos({ nombre, fecha: fechaISO, dias })
      if (r.ok) { await supabase.from('cumpleanos_empleados').update({ alerta_5d_anio: anio }).eq('id', c.id); enviados.push({ id: c.id, dias, tipo: '5d' }) }
    }
    // Aviso 3 días antes (una vez por año).
    if (dias === 3 && c.alerta_3d_anio !== anio) {
      const r = await enviarRecordatorioCumpleanos({ nombre, fecha: fechaISO, dias })
      if (r.ok) { await supabase.from('cumpleanos_empleados').update({ alerta_3d_anio: anio }).eq('id', c.id); enviados.push({ id: c.id, dias, tipo: '3d' }) }
    }
  }

  return NextResponse.json({ ok: true, revisados: cumples?.length ?? 0, enviados, ejecutado_en: new Date().toISOString() })
}

function cap(s: string) {
  return s.toLowerCase().replace(/\b\p{L}/gu, m => m.toUpperCase())
}
