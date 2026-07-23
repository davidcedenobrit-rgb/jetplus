export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

/* eslint-disable @typescript-eslint/no-explicit-any */
async function rolDe(supabase: any, user: any): Promise<string> {
  const rolMeta = (user?.app_metadata?.rol as string) ?? ''
  if (rolMeta) return rolMeta
  const { data } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  return data?.rol ?? ''
}

// Listar casos de la bandeja Banca Nacional.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES.includes(await rolDe(supabase, user))) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const admin = await createAdminClient()
  const casos = await fetchAllRows<any>((from, to) => admin
    .from('bn_casos')
    .select('*')
    .order('created_at', { ascending: false })
    .range(from, to))
  return NextResponse.json(casos)
}

// Crear un caso (expediente enviado a Vehimotors).
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES.includes(await rolDe(supabase, user))) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  if (!b.clienteNombre?.trim() || !b.clienteCiRif?.trim()) {
    return NextResponse.json({ error: 'Nombre y C.I./RIF del cliente son obligatorios' }, { status: 400 })
  }
  if (!b.vehiculoId) return NextResponse.json({ error: 'Falta el vehículo' }, { status: 400 })

  const admin = await createAdminClient()

  // Vincular con un cliente ya registrado si el C.I./RIF coincide (nuevo o existente).
  const ciNorm = b.clienteCiRif.trim().toUpperCase()
  const { data: clienteExistente } = await admin
    .from('clientes').select('id').ilike('cedula_rif', ciNorm).limit(1).maybeSingle()

  const expediente = Array.isArray(b.expediente)
    ? b.expediente.filter((f: any) => f?.url).map((f: any) => ({ url: f.url, nombre: f.nombre ?? null }))
    : null

  const { data, error } = await admin.from('bn_casos').insert([{
    creado_por: user.id,
    concesionario_id: b.concesionarioId ?? 'la-oriental',
    cliente_id: clienteExistente?.id ?? null,
    expediente: expediente && expediente.length ? expediente : null,
    cliente_nombre: b.clienteNombre.trim(),
    cliente_ci_rif: b.clienteCiRif.trim(),
    cliente_correo: b.clienteCorreo?.trim() || null,
    cliente_telefono: b.clienteTelefono?.trim() || null,
    cliente_direccion: b.clienteDireccion?.trim() || null,
    cliente_ciudad_estado: b.clienteCiudadEstado?.trim() || null,
    cliente_codigo_postal: b.clienteCodigoPostal?.trim() || null,
    vehiculo_id: b.vehiculoId,
    marca: b.marca ?? null,
    modelo: b.modelo ?? null,
    precio_base: Number(b.precioBase) || 0,
    placa_monto: Number(b.placaMonto) || 400,
    banco: b.banco?.trim() || null,
    notas: b.notas?.trim() || null,
    estado: 'pendiente_vm',
  }]).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, caso: data })
}
