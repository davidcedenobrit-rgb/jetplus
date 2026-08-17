export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem', 'carla']
const clip = (s: unknown, n: number) => String(s ?? '').trim().slice(0, n)

// POST público: el cliente deja sus datos desde el link de ventas (/ventas).
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const nombre = clip(b.nombre, 120)
  const telefono = clip(b.telefono, 40)
  if (nombre.length < 2 || telefono.length < 6) {
    return NextResponse.json({ error: 'Nombre y teléfono son obligatorios' }, { status: 400 })
  }
  const origen = clip(b.origen, 40) || 'ventas_web'
  const origenCaptacion = clip(b.origenCaptacion, 60) || null
  // El vendedor debe indicar dónde captó al cliente (concesionario, Sambil,
  // fuera de concesionario u otro). No aplica al lead público de redes
  // sociales (ahí el propio cliente deja sus datos).
  if (origen === 'vendedor_lead' && !origenCaptacion) {
    return NextResponse.json({ error: 'Indica dónde captaste al cliente' }, { status: 400 })
  }

  const supabase = await createAdminClient()
  const { error } = await supabase.from('leads_captacion').insert({
    nombre,
    telefono,
    correo: clip(b.correo, 120) || null,
    marca: clip(b.marca, 60) || null,
    modelo: clip(b.modelo, 120) || null,
    presupuesto: clip(b.presupuesto, 60) || null,
    modalidad: clip(b.modalidad, 30) || null,
    vendedor: clip(b.vendedor, 80) || null,
    evento: clip(b.evento, 80) || null,
    concesionario_id: clip(b.concesionario, 60) || null,
    origen,
    origen_captacion: origenCaptacion,
  })
  if (error) return NextResponse.json({ error: 'No se pudo registrar' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// GET (staff): bandeja de clientes captados.
export async function GET() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('leads_captacion')
    .select('id, nombre, telefono, correo, marca, modelo, presupuesto, modalidad, vendedor, evento, origen_captacion, atendido, created_at')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
