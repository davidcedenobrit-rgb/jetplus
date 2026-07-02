export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { serviceRoleClient } from '@/lib/supabase/service-role'

export async function POST(req: Request) {
  const body = await req.json()
  const { token, correo, password } = body

  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
  if (!correo?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
    return NextResponse.json({ error: 'Correo inválido' }, { status: 400 })
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  }

  // Cliente admin puro (sin cookies) para operaciones que requieren service_role
  const supabase = serviceRoleClient()

  const { data: invitacion } = await supabase
    .from('invitaciones_cliente')
    .select('*, clientes(id, nombre, cedula_rif, correo, telefono, whatsapp)')
    .eq('token', token)
    .maybeSingle()

  if (!invitacion) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
  if (invitacion.estado === 'aceptada') {
    return NextResponse.json({ error: 'Esta invitación ya fue aceptada' }, { status: 409 })
  }
  if (invitacion.estado === 'revocada' || invitacion.estado === 'expirada') {
    return NextResponse.json({ error: 'Esta invitación ya no es válida' }, { status: 410 })
  }
  if (new Date(invitacion.expira_at).getTime() < Date.now()) {
    await supabase.from('invitaciones_cliente').update({ estado: 'expirada' }).eq('id', invitacion.id)
    return NextResponse.json({ error: 'La invitación expiró' }, { status: 410 })
  }

  const { data: cuentaExistente } = await supabase
    .from('cliente_cuentas')
    .select('id')
    .eq('cliente_id', invitacion.cliente_id)
    .maybeSingle()

  if (cuentaExistente) {
    return NextResponse.json({ error: 'Este cliente ya tiene una cuenta activa' }, { status: 409 })
  }

  // Crear usuario en Supabase Auth (con app_metadata.rol='cliente')
  const { data: authRes, error: authErr } = await supabase.auth.admin.createUser({
    email: correo.trim().toLowerCase(),
    password,
    email_confirm: true,
    app_metadata: { rol: 'cliente' },
    user_metadata: {
      cliente_id: invitacion.cliente_id,
      nombre: (invitacion as any).clientes?.nombre ?? null,
    },
  })

  if (authErr || !authRes?.user) {
    console.error('[aceptar] auth error:', authErr)
    return NextResponse.json({
      error: authErr?.message ?? 'No se pudo crear la cuenta',
    }, { status: 500 })
  }

  const { error: cuentaErr } = await supabase.from('cliente_cuentas').insert([{
    user_id: authRes.user.id,
    cliente_id: invitacion.cliente_id,
    activo: true,
    ultimo_acceso_at: new Date().toISOString(),
  }])

  if (cuentaErr) {
    console.error('[aceptar] cuenta error:', cuentaErr)
    await supabase.auth.admin.deleteUser(authRes.user.id).catch(() => null)
    return NextResponse.json({ error: 'No se pudo vincular la cuenta al cliente' }, { status: 500 })
  }

  await supabase.from('invitaciones_cliente').update({
    estado: 'aceptada',
    aceptada_at: new Date().toISOString(),
  }).eq('id', invitacion.id)

  return NextResponse.json({
    ok: true,
    correo: correo.trim().toLowerCase(),
    clienteNombre: (invitacion as any).clientes?.nombre ?? null,
  }, { status: 201 })
}

// GET público: valida el token y devuelve datos básicos del cliente (nombre) para pre-llenar
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

  const supabase = serviceRoleClient()
  const { data: invitacion } = await supabase
    .from('invitaciones_cliente')
    .select('estado, expira_at, clientes(nombre, correo)')
    .eq('token', token)
    .maybeSingle()

  if (!invitacion) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
  if (invitacion.estado === 'aceptada') {
    return NextResponse.json({ error: 'Esta invitación ya fue aceptada' }, { status: 409 })
  }
  if (invitacion.estado === 'revocada') {
    return NextResponse.json({ error: 'Invitación revocada' }, { status: 410 })
  }
  if (new Date(invitacion.expira_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'La invitación expiró' }, { status: 410 })
  }

  return NextResponse.json({
    ok: true,
    clienteNombre: (invitacion as any).clientes?.nombre ?? null,
    correoSugerido: (invitacion as any).clientes?.correo ?? null,
  })
}
