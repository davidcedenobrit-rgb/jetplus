export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES_PERMITIDOS = ['jose', 'director', 'admin', 'arianna']

async function verificarPermiso() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return { user: null, rol: null, permitido: false }
  const { data: usuarioData } = await auth.from('usuarios').select('rol').eq('id', user.id).single()
  const rol = usuarioData?.rol ?? null
  return { user, rol, permitido: rol ? ROLES_PERMITIDOS.includes(rol) : false }
}

export async function POST(req: Request) {
  const { user, permitido } = await verificarPermiso()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!permitido) return NextResponse.json({ error: 'Solo Rojas o Arianna pueden registrar servicios' }, { status: 403 })

  const body = await req.json()
  const {
    vehiculoId, fechaServicio, km, concepto,
    numeroExterno, comprobanteUrl, observaciones,
  } = body

  if (!vehiculoId) return NextResponse.json({ error: 'vehiculoId requerido' }, { status: 400 })
  if (!fechaServicio) return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 })
  if (typeof km !== 'number' || km < 0) return NextResponse.json({ error: 'Kilometraje inválido' }, { status: 400 })
  if (!concepto?.trim()) return NextResponse.json({ error: 'Concepto requerido' }, { status: 400 })

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('servicios_vehiculo')
    .insert([{
      vehiculo_id: vehiculoId,
      fecha_servicio: fechaServicio,
      km: Math.round(km),
      concepto: concepto.trim(),
      numero_externo: numeroExterno?.trim() || null,
      comprobante_url: comprobanteUrl || null,
      observaciones: observaciones?.trim() || null,
      registrado_por: user.id,
      registrado_por_email: user.email ?? null,
    }])
    .select('id, numero')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, servicio: data }, { status: 201 })
}

export async function GET(req: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const vehiculoId = searchParams.get('vehiculo_id')
  if (!vehiculoId) return NextResponse.json({ error: 'vehiculo_id requerido' }, { status: 400 })

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('servicios_vehiculo')
    .select('*')
    .eq('vehiculo_id', vehiculoId)
    .order('fecha_servicio', { ascending: false })
    .order('km', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ servicios: data ?? [] })
}
