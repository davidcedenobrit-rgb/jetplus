export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { enviarNotificacionPagoCliente } from '@/lib/email-portal'

const METODOS_VALIDOS = [
  'Efectivo USD', 'Efectivo VES', 'Transferencia bancaria',
  'Zelle', 'USDT VE', 'Binance', 'Pago Móvil',
  'Transferencia bancaria a Vehimotor', 'Otro',
]

export async function POST(req: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user || user.app_metadata?.rol !== 'cliente') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = await createAdminClient()

  const { data: cuenta } = await supabase
    .from('cliente_cuentas')
    .select('cliente_id, activo')
    .eq('user_id', user.id)
    .single()

  if (!cuenta?.activo) {
    return NextResponse.json({ error: 'Cuenta no encontrada o inactiva' }, { status: 403 })
  }

  const { data: cliente } = await supabase
    .from('clientes')
    .select('id, nombre, cedula_rif, telefono, whatsapp')
    .eq('id', cuenta.cliente_id)
    .single()
  if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

  const body = await req.json()
  const {
    cuotaId,
    vehiculoId,
    monto,
    moneda,
    metodoPago,
    referencia,
    bancoOrigen,
    bancoDestino,
    fechaPago,
    comprobanteUrl,
    observaciones,
    tasaCambio,
    concepto,
  } = body

  // Validaciones
  if (typeof monto !== 'number' || monto <= 0) {
    return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
  }
  if (!['USD', 'USDT', 'VES'].includes(moneda)) {
    return NextResponse.json({ error: 'Moneda inválida' }, { status: 400 })
  }
  if (!metodoPago || !METODOS_VALIDOS.includes(metodoPago)) {
    return NextResponse.json({ error: 'Método de pago inválido' }, { status: 400 })
  }
  if (!fechaPago) {
    return NextResponse.json({ error: 'Fecha del pago requerida' }, { status: 400 })
  }
  if (!comprobanteUrl?.trim()) {
    return NextResponse.json({ error: 'Comprobante obligatorio' }, { status: 400 })
  }

  // Validar cuota (si aplica) — debe pertenecer a un crédito del cliente
  let cuotaInfo: { credito_id: string; vehiculo_id: string | null; numero_cuota: number; placa: string | null } | null = null
  if (cuotaId) {
    const { data: cuotaRow } = await supabase
      .from('cuotas')
      .select('id, numero_cuota, credito_id, creditos!inner(cliente_id, vehiculo_id, placa)')
      .eq('id', cuotaId)
      .single()
    const cred = (cuotaRow as any)?.creditos
    if (!cuotaRow || !cred || cred.cliente_id !== cliente.id) {
      return NextResponse.json({ error: 'Cuota inválida o no pertenece al cliente' }, { status: 400 })
    }
    cuotaInfo = {
      credito_id: cuotaRow.credito_id,
      vehiculo_id: cred.vehiculo_id,
      numero_cuota: cuotaRow.numero_cuota,
      placa: cred.placa,
    }
  }

  // Validar vehiculo (si aplica y no viene por cuota) — debe pertenecer al cliente
  let vehiculoInfo: { id: string; placa: string | null } | null = null
  if (!cuotaInfo && vehiculoId) {
    const { data: veh } = await supabase
      .from('vehiculos')
      .select('id, placa')
      .eq('id', vehiculoId)
      .eq('cliente_id', cliente.id)
      .maybeSingle()
    if (!veh) return NextResponse.json({ error: 'Vehículo inválido o no pertenece al cliente' }, { status: 400 })
    vehiculoInfo = veh
  }

  // Generar número de recibo (trigger existente)
  const conceptoFinal = concepto?.trim() || (cuotaInfo ? 'Cuota de vehículo' : 'Abono a crédito')
  const placaFinal = cuotaInfo?.placa ?? vehiculoInfo?.placa ?? null
  const vehiculoFinal = cuotaInfo?.vehiculo_id ?? vehiculoInfo?.id ?? null

  const { data: ingreso, error: insertErr } = await supabase
    .from('ingresos')
    .insert([{
      cliente_id: cliente.id,
      vehiculo_id: vehiculoFinal,
      placa: placaFinal,
      concepto: conceptoFinal,
      monto,
      moneda,
      metodo_pago: metodoPago,
      referencia: referencia?.trim() || null,
      banco_emisor: bancoOrigen?.trim() || null,
      banco_receptor: bancoDestino?.trim() || null,
      fecha_pago: fechaPago,
      fecha_registro: new Date().toISOString(),
      tasa_cambio: tasaCambio ? Number(tasaCambio) : null,
      monto_bs: moneda === 'VES' ? monto : (tasaCambio ? monto * Number(tasaCambio) : null),
      estado: 'pendiente_aprobacion',
      origen: 'portal_cliente',
      observaciones: observaciones?.trim() || null,
      comprobante_url: comprobanteUrl,
      registrado_por_email: user.email ?? null,
    }])
    .select('id, numero_recibo')
    .single()

  if (insertErr || !ingreso) {
    console.error('[portal/registrar-pago] insert error:', insertErr)
    return NextResponse.json({ error: insertErr?.message ?? 'Error al registrar el pago' }, { status: 500 })
  }

  // Vincular con cuota específica si aplica
  if (cuotaInfo) {
    try {
      await supabase.from('cuota_ingresos').insert([{
        cuota_id: cuotaId,
        ingreso_id: ingreso.id,
        monto_aplicado: monto,
      }])
    } catch (e) {
      console.error('[portal/registrar-pago] cuota_ingresos error:', e)
    }
  }

  // Vehículo label para el correo
  let vehiculoLabel: string | null = null
  if (vehiculoFinal) {
    const { data: veh } = await supabase
      .from('vehiculos')
      .select('marca, modelo')
      .eq('id', vehiculoFinal)
      .maybeSingle()
    if (veh) vehiculoLabel = `${veh.marca} ${veh.modelo}`
  }

  // Notificación al staff (no bloqueante)
  try {
    await enviarNotificacionPagoCliente({
      ingresoId: ingreso.id,
      numeroRecibo: ingreso.numero_recibo,
      clienteNombre: cliente.nombre,
      clienteCiRif: cliente.cedula_rif,
      clienteTelefono: cliente.telefono ?? cliente.whatsapp,
      vehiculoLabel,
      placa: placaFinal,
      cuotaLabel: cuotaInfo ? `Cuota N.° ${cuotaInfo.numero_cuota}` : null,
      concepto: conceptoFinal,
      monto,
      moneda,
      metodoPago,
      referencia: referencia?.trim() || null,
      bancoOrigen: bancoOrigen?.trim() || null,
      bancoDestino: bancoDestino?.trim() || null,
      fechaPago,
      comprobanteUrl,
      observaciones: observaciones?.trim() || null,
    })
  } catch (emailErr) {
    console.error('[portal/registrar-pago] notificacion error:', emailErr)
  }

  return NextResponse.json({
    ok: true,
    ingresoId: ingreso.id,
    numeroRecibo: ingreso.numero_recibo,
  }, { status: 201 })
}
