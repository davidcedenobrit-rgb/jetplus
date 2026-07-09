export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { serviceRoleClient } from '@/lib/supabase/service-role'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem', 'carla']

// Crear un empleado en la nómina + generar token y plazo de 72h para el cuestionario
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: usuario } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  const rol = usuario?.rol ?? ''
  if (!ROLES.includes(rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { nombre, cedula, telefono, correo, cargo, departamento, reportaA, fechaIngreso } = body ?? {}

  if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  }

  const admin = serviceRoleClient()
  const token = randomBytes(24).toString('hex')
  const ahora = new Date()
  const vence = new Date(ahora.getTime() + 72 * 60 * 60 * 1000)

  const { data: empleado, error } = await admin
    .from('empleados')
    .insert({
      nombre: nombre.trim(),
      cedula: cedula?.trim() || null,
      telefono: telefono?.trim() || null,
      correo: correo?.trim() || null,
      cargo: cargo?.trim() || null,
      departamento: departamento?.trim() || null,
      reporta_a: reportaA?.trim() || null,
      fecha_ingreso: fechaIngreso || null,
      estado: 'pendiente',
      token,
      invitado_at: ahora.toISOString(),
      vence_at: vence.toISOString(),
    })
    .select('id, token')
    .single()

  if (error || !empleado) {
    console.error('[corporativo/empleados] error:', error)
    return NextResponse.json({ error: error?.message ?? 'Error al crear empleado' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    id: empleado.id,
    token: empleado.token,
    venceAt: vence.toISOString(),
  })
}
