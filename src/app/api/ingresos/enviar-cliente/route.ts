export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enviarReciboCliente } from '@/lib/email-ingresos'

const ROL_PERMITIDO = ['jose', 'admin', 'director', 'mary', 'leysdem']

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const rol = (user.user_metadata?.rol as string) ?? ''
  if (!ROL_PERMITIDO.includes(rol)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  let body: { ingresoId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const { ingresoId } = body
  if (!ingresoId) return NextResponse.json({ error: 'ingresoId requerido' }, { status: 400 })

  const { data: ingreso } = await supabase
    .from('ingresos')
    .select('*, clientes(nombre, correo)')
    .eq('id', ingresoId)
    .single()

  if (!ingreso) return NextResponse.json({ error: 'Ingreso no encontrado' }, { status: 404 })

  const cliente = (ingreso as any).clientes
  if (!cliente?.correo) {
    return NextResponse.json({ error: 'El cliente no tiene correo registrado' }, { status: 400 })
  }

  try {
    await enviarReciboCliente({
      clienteNombre: cliente.nombre,
      clienteCorreo: cliente.correo,
      numeroRecibo: ingreso.numero_recibo,
      concepto: ingreso.concepto,
      monto: Number(ingreso.monto),
      moneda: ingreso.moneda,
      metodoPago: ingreso.metodo_pago,
      referencia: ingreso.referencia ?? null,
      fechaPago: ingreso.fecha_pago,
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[enviar-cliente]', e)
    return NextResponse.json({ error: e.message ?? 'Error al enviar correo' }, { status: 500 })
  }
}
