export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { enviarInvitacionPortal } from '@/lib/email-portal'

const ROLES_PERMITIDOS = ['jose', 'admin', 'mary', 'leysdem']
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://jetplus.vercel.app'

export async function POST(req: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: usuarioData } = await auth.from('usuarios').select('rol').eq('id', user.id).single()
  if (!usuarioData?.rol || !ROLES_PERMITIDOS.includes(usuarioData.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await req.json()
  const { clienteId, canal, destinatario } = body

  if (!clienteId) return NextResponse.json({ error: 'clienteId requerido' }, { status: 400 })
  if (!['correo', 'whatsapp', 'link'].includes(canal)) {
    return NextResponse.json({ error: 'Canal inválido' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  const { data: cliente } = await supabase
    .from('clientes')
    .select('id, nombre, cedula_rif, correo, telefono, whatsapp')
    .eq('id', clienteId)
    .single()

  if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

  const { data: cuentaExistente } = await supabase
    .from('cliente_cuentas')
    .select('id, activo')
    .eq('cliente_id', clienteId)
    .maybeSingle()

  if (cuentaExistente?.activo) {
    return NextResponse.json({
      error: 'Este cliente ya tiene una cuenta activa en el portal',
    }, { status: 409 })
  }

  let destinatarioFinal = destinatario?.trim() || null
  if (!destinatarioFinal) {
    if (canal === 'correo') destinatarioFinal = cliente.correo
    else if (canal === 'whatsapp') destinatarioFinal = cliente.whatsapp || cliente.telefono
  }
  if (!destinatarioFinal) {
    return NextResponse.json({
      error: canal === 'correo' ? 'El cliente no tiene correo registrado' : 'El cliente no tiene teléfono registrado',
    }, { status: 400 })
  }
  if (canal === 'correo' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatarioFinal)) {
    return NextResponse.json({ error: 'Correo inválido' }, { status: 400 })
  }

  const token = crypto.randomBytes(32).toString('base64url')
  const linkPortal = `${APP_URL}/portal/registro?token=${token}`

  const { data: invitacion, error: insertErr } = await supabase
    .from('invitaciones_cliente')
    .insert([{
      cliente_id: clienteId,
      token,
      canal,
      destinatario: destinatarioFinal,
      estado: 'pendiente',
      invitado_por: user.id,
      invitado_por_email: user.email ?? null,
    }])
    .select('id, token, expira_at')
    .single()

  if (insertErr || !invitacion) {
    console.error('[invitar] insert error:', insertErr)
    return NextResponse.json({ error: 'Error al crear la invitación' }, { status: 500 })
  }

  let correoEnviado = false
  let correoError: string | null = null

  if (canal === 'correo') {
    try {
      await enviarInvitacionPortal({
        invitacionId: invitacion.id,
        clienteNombre: cliente.nombre,
        destinatario: destinatarioFinal,
        linkPortal,
        expiraEn: invitacion.expira_at,
      })
      await supabase.from('invitaciones_cliente').update({
        estado: 'enviada',
        correo_enviado_at: new Date().toISOString(),
      }).eq('id', invitacion.id)
      correoEnviado = true
    } catch (e: any) {
      console.error('[invitar] error correo:', e)
      correoError = e?.message ?? 'Error al enviar el correo'
    }
  } else {
    await supabase.from('invitaciones_cliente').update({ estado: 'enviada' }).eq('id', invitacion.id)
  }

  // Link/mensaje WhatsApp
  const whatsappMsg = encodeURIComponent(
    `Hola ${cliente.nombre}, aquí está su acceso al Portal del Cliente de JETPLUS:\n\n${linkPortal}\n\nEste enlace expira en 30 días.`
  )
  const whatsappUrl = `https://wa.me/${(destinatarioFinal || '').replace(/\D/g, '')}?text=${whatsappMsg}`

  return NextResponse.json({
    ok: true,
    invitacionId: invitacion.id,
    linkPortal,
    whatsappUrl: canal === 'whatsapp' ? whatsappUrl : null,
    correoEnviado,
    correoError,
    expiraAt: invitacion.expira_at,
  }, { status: 201 })
}
