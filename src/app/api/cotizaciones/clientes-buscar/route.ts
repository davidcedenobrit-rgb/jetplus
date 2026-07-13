export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director']

// Busca clientes ya existentes (cotizaciones previas + tabla de clientes)
// para autocompletar los datos al generar una cotización.
export async function GET(req: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = user.app_metadata?.rol as string
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const url = new URL(req.url)
  // Se limpian los caracteres que rompen el filtro .or() de PostgREST
  const q = (url.searchParams.get('q') ?? '').replace(/[,()%*]/g, ' ').trim()
  if (q.length < 2) return NextResponse.json([])

  const supabase = await createAdminClient()
  const like = `%${q}%`

  const [{ data: cotRows }, { data: cliRows }] = await Promise.all([
    supabase
      .from('cotizaciones')
      .select('cliente_nombre, cliente_ci_rif, cliente_correo, cliente_telefono, cliente_direccion, cliente_ciudad_estado, cliente_codigo_postal, created_at')
      .or(`cliente_nombre.ilike.${like},cliente_ci_rif.ilike.${like},cliente_correo.ilike.${like},cliente_telefono.ilike.${like}`)
      .order('created_at', { ascending: false })
      .limit(60),
    supabase
      .from('clientes')
      .select('nombre, cedula_rif, correo, telefono, direccion, ciudad')
      .or(`nombre.ilike.${like},cedula_rif.ilike.${like},correo.ilike.${like},telefono.ilike.${like}`)
      .limit(20),
  ])

  const map = new Map<string, Record<string, unknown>>()

  // Primero cotizaciones (ordenadas de más reciente a más antigua → datos más frescos)
  for (const c of cotRows ?? []) {
    const key = String(c.cliente_ci_rif || c.cliente_correo || '').toLowerCase().trim()
    if (!key || map.has(key)) continue
    map.set(key, {
      nombre: c.cliente_nombre ?? '',
      ci_rif: c.cliente_ci_rif ?? '',
      correo: c.cliente_correo ?? '',
      telefono: c.cliente_telefono ?? '',
      direccion: c.cliente_direccion ?? '',
      ciudad_estado: c.cliente_ciudad_estado ?? '',
      codigo_postal: c.cliente_codigo_postal ?? '',
      fuente: 'cotizacion',
    })
  }

  // Luego clientes registrados que no aparecieron en cotizaciones
  for (const c of cliRows ?? []) {
    const key = String(c.cedula_rif || c.correo || '').toLowerCase().trim()
    if (!key || map.has(key)) continue
    map.set(key, {
      nombre: c.nombre ?? '',
      ci_rif: c.cedula_rif ?? '',
      correo: c.correo ?? '',
      telefono: c.telefono ?? '',
      direccion: c.direccion ?? '',
      ciudad_estado: c.ciudad ?? '',
      codigo_postal: '',
      fuente: 'cliente',
    })
  }

  return NextResponse.json(Array.from(map.values()).slice(0, 12))
}
