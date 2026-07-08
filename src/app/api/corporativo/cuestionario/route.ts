export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { enviarNotificacionCuestionarioCompletado } from '@/lib/email-corporativo'

// Endpoint PÚBLICO (sin login): el empleado envía su cuestionario usando su token.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const {
    token,
    nombre, cedula, telefono, correo, fechaIngreso,
    cargo, departamento, reportaA,
    responsabilidades, funciones, tareasDiarias,
    competencias, herramientas, observaciones,
  } = body ?? {}

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Enlace no válido' }, { status: 400 })
  }
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

  const { data: empleado } = await admin
    .from('empleados')
    .select('id, estado, vence_at')
    .eq('token', token)
    .maybeSingle()

  if (!empleado) {
    return NextResponse.json({ error: 'Enlace no válido o vencido' }, { status: 404 })
  }
  if (empleado.estado === 'completado') {
    return NextResponse.json({ error: 'Este cuestionario ya fue completado' }, { status: 409 })
  }
  // El plazo de 72h no bloquea el envío, pero se registra para control.

  const completadoAt = new Date().toISOString()

  const { error } = await admin
    .from('empleados')
    .update({
      nombre: nombre.trim(),
      cedula: cedula?.trim() || null,
      telefono: telefono?.trim() || null,
      correo: correo?.trim() || null,
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
      estado: 'completado',
      completado_at: completadoAt,
      updated_at: completadoAt,
    })
    .eq('id', empleado.id)

  if (error) {
    console.error('[corporativo/cuestionario] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Notificar (no bloqueante)
  try {
    await enviarNotificacionCuestionarioCompletado({
      empleadoId: empleado.id,
      nombre: nombre.trim(),
      cargo: cargo.trim(),
      departamento: departamento?.trim() || null,
      completadoEn: completadoAt,
    })
  } catch (e) {
    console.error('[corporativo/cuestionario] notificacion error:', e)
  }

  return NextResponse.json({ ok: true })
}
