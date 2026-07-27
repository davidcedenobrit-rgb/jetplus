export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { enviarRecordatorioCumpleanos } from '@/lib/email-corporativo'

/* eslint-disable @typescript-eslint/no-explicit-any */

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

// Prueba de correo de cumpleaños: envía un aviso de muestra al correo indicado
// (por defecto Rojas). Requiere estar logueado como dirección. Usa el próximo
// cumpleaños real para que se vea igual al de producción.
//   /api/cron/cumpleanos/test            → envía a rojasjgx@gmail.com
//   /api/cron/cumpleanos/test?to=correo  → envía a ese correo
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const url = new URL(req.url)
  const to = url.searchParams.get('to')?.trim() || 'rojasjgx@gmail.com'
  if (!/\S+@\S+\.\S+/.test(to)) return NextResponse.json({ error: 'Correo inválido' }, { status: 400 })

  const admin = await createAdminClient()
  const { data: cumples } = await admin
    .from('cumpleanos_empleados')
    .select('nombres, apellidos, dia, mes')
    .eq('activo', true)

  // Elige el próximo cumpleaños real (o uno de muestra si no hay datos).
  const hoyStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' })
  const hoy = new Date(hoyStr + 'T00:00:00')
  const anio = hoy.getFullYear()
  let mejor: { nombre: string; fechaISO: string; dias: number } | null = null
  for (const c of cumples ?? []) {
    let f = new Date(anio, c.mes - 1, c.dia); f.setHours(0, 0, 0, 0)
    if (f < hoy) f = new Date(anio + 1, c.mes - 1, c.dia)
    const dias = Math.round((f.getTime() - hoy.getTime()) / 86400000)
    const fechaISO = `${f.getFullYear()}-${String(c.mes).padStart(2, '0')}-${String(c.dia).padStart(2, '0')}`
    const nombre = `${cap(c.nombres)} ${cap(c.apellidos)}`
    if (!mejor || dias < mejor.dias) mejor = { nombre, fechaISO, dias }
  }
  const muestra = mejor ?? { nombre: 'Jose Gregorio Rojas', fechaISO: `${anio}-09-02`, dias: 5 }

  const r = await enviarRecordatorioCumpleanos({ nombre: muestra.nombre, fecha: muestra.fechaISO, dias: muestra.dias, to: [to] })
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error, to }, { status: 500 })
  return NextResponse.json({ ok: true, enviado_a: to, cumpleanos_de_muestra: muestra })
}

function cap(s: string) {
  return s.toLowerCase().replace(/\b\p{L}/gu, m => m.toUpperCase())
}
