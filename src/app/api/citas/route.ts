export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { SLOTS_HORA, horaFin, esDiaHabil } from '@/lib/citas-taller'
import { enviarConfirmacionCita } from '@/lib/email-citas'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']
const clip = (s: unknown, n: number) => String(s ?? '').trim().slice(0, n)

// POST público: el cliente agenda su cita desde /citas. Sin sesión.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const nombre = clip(b.nombre, 120)
  const telefono = clip(b.telefono, 40)
  const correo = clip(b.correo, 160)
  const fecha = clip(b.fecha, 10)
  const horaInicio = clip(b.horaInicio, 5)
  const marca = clip(b.marca, 60)
  const modelo = clip(b.modelo, 80)
  const placa = clip(b.placa, 20)
  const motivo = clip(b.motivo, 300)

  if (nombre.length < 2 || telefono.length < 6) {
    return NextResponse.json({ error: 'Nombre y teléfono son obligatorios' }, { status: 400 })
  }
  if (!/^\S+@\S+\.\S+$/.test(correo)) {
    return NextResponse.json({ error: 'Correo inválido (lo necesitamos para tu confirmación)' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !esDiaHabil(fecha)) {
    return NextResponse.json({ error: 'El taller solo atiende de lunes a viernes' }, { status: 400 })
  }
  if (!(SLOTS_HORA as readonly string[]).includes(horaInicio)) {
    return NextResponse.json({ error: 'Horario inválido' }, { status: 400 })
  }
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' })
  if (fecha < hoy) {
    return NextResponse.json({ error: 'Esa fecha ya pasó' }, { status: 400 })
  }

  const hFin = horaFin(horaInicio)
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('citas_taller')
    .insert({
      cliente_nombre: nombre, cliente_telefono: telefono, cliente_correo: correo,
      vehiculo_marca: marca || null, vehiculo_modelo: modelo || null, vehiculo_placa: placa || null,
      motivo: motivo || null, fecha, hora_inicio: horaInicio, hora_fin: hFin,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ese horario se acaba de ocupar, elige otro.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'No se pudo registrar la cita' }, { status: 500 })
  }

  try {
    await enviarConfirmacionCita({
      citaId: data.id,
      destinatario: correo,
      clienteNombre: nombre,
      fecha, horaInicio, horaFin: hFin,
      vehiculoLabel: [marca, modelo].filter(Boolean).join(' ') || null,
      placa: placa || null,
      motivo: motivo || null,
    })
  } catch (e) {
    console.error('[citas] error enviando confirmacion:', e)
  }

  return NextResponse.json({ ok: true, id: data.id, horaFin: hFin })
}

// GET (staff): listado de citas agendadas para el panel interno.
export async function GET() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('citas_taller')
    .select('id, cliente_nombre, cliente_telefono, cliente_correo, vehiculo_marca, vehiculo_modelo, vehiculo_placa, motivo, fecha, hora_inicio, hora_fin, estado, created_at')
    .order('fecha', { ascending: true })
    .order('hora_inicio', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
