export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { enviarNotificacionCuestionarioCompletado } from '@/lib/email-corporativo'

// Endpoint PÚBLICO de auto-registro: cualquier trabajador con el enlace base
// llena su descripción de cargo y se crea/actualiza automáticamente en la nómina.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const {
    nombre, cedula, telefono, correo, correoEmpresa, fechaIngreso,
    cargo, departamento, reportaA,
    responsabilidades, funciones, tareasDiarias,
    competencias, herramientas, observaciones,
  } = body ?? {}

  if (!nombre?.trim()) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  }
  if (!cargo?.trim()) {
    return NextResponse.json({ error: 'El cargo es obligatorio' }, { status: 400 })
  }
  if (!responsabilidades?.trim()) {
    return NextResponse.json({ error: 'Las responsabilidades son obligatorias' }, { status: 400 })
  }

  const admin = await createAdminClient()
  const ahora = new Date().toISOString()

  const datos = {
    nombre: nombre.trim(),
    cedula: cedula?.trim() || null,
    telefono: telefono?.trim() || null,
    correo: correo?.trim() || null,
    correo_empresa: correoEmpresa?.trim() || null,
    fecha_ingreso: fechaIngreso || null,
    cargo: cargo.trim(),
    departamento: departamento?.trim() || null,
    reporta_a: reportaA?.trim() || null,
    responsabilidades: responsabilidades.trim(),
    funciones: funciones?.trim() || null,
    tareas_diarias: tareasDiarias?.trim() || null,
    competencias: competencias?.trim() || null,
    herramientas: herramientas?.trim() || null,
    observaciones: observaciones?.trim() || null,
    estado: 'completado' as const,
    completado_at: ahora,
    updated_at: ahora,
  }

  // Evitar duplicados: si ya existe un empleado con esa cédula, se actualiza.
  let empleadoId: string | null = null
  const cedulaLimpia = cedula?.trim()
  if (cedulaLimpia) {
    const { data: existente } = await admin
      .from('empleados')
      .select('id')
      .eq('cedula', cedulaLimpia)
      .maybeSingle()
    if (existente) empleadoId = existente.id
  }

  if (empleadoId) {
    const { error } = await admin.from('empleados').update(datos).eq('id', empleadoId)
    if (error) {
      console.error('[corporativo/registro-publico] update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else {
    const { data: creado, error } = await admin
      .from('empleados')
      .insert({
        ...datos,
        token: randomBytes(24).toString('hex'),
        invitado_at: ahora,
        activo: true,
      })
      .select('id')
      .single()
    if (error || !creado) {
      console.error('[corporativo/registro-publico] insert error:', error)
      return NextResponse.json({ error: error?.message ?? 'Error al registrar' }, { status: 500 })
    }
    empleadoId = creado.id
  }

  // Notificar (no bloqueante)
  try {
    await enviarNotificacionCuestionarioCompletado({
      empleadoId: empleadoId!,
      nombre: nombre.trim(),
      cargo: cargo.trim(),
      departamento: departamento?.trim() || null,
      completadoEn: ahora,
    })
  } catch (e) {
    console.error('[corporativo/registro-publico] notificacion error:', e)
  }

  return NextResponse.json({ ok: true })
}
