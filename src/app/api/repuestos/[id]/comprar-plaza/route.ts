export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem', 'arianna']

function generarNumeroEgreso() {
  const year = new Date().getFullYear()
  const buf = new Uint8Array(3)
  crypto.getRandomValues(buf)
  const seq = String((buf[0] << 16 | buf[1] << 8 | buf[2]) % 1_000_000).padStart(6, '0')
  return `LOA-EGR-${year}-${seq}`
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: usuario } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  const rol = usuario?.rol ?? ''
  if (!ROLES.includes(rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id: solicitudId } = await params
  const body = await req.json().catch(() => ({}))
  const {
    proveedor,
    proveedorId,
    monto,
    moneda,
    tasa,
    fechaCompra,
    metodoPago,
    referencia,
    bancoOrigen,
    notas,
    itemIds,
  } = body ?? {}
  const provId = typeof proveedorId === 'string' && proveedorId.trim() ? proveedorId.trim() : null
  const itemIdsSel: string[] = Array.isArray(itemIds) ? itemIds.filter((x: any) => typeof x === 'string') : []

  if (!proveedor || typeof proveedor !== 'string' || !proveedor.trim()) {
    return NextResponse.json({ error: 'Proveedor requerido' }, { status: 400 })
  }
  const montoNum = Number(monto)
  if (!Number.isFinite(montoNum) || montoNum <= 0) {
    return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
  }
  // Moneda de la compra: USD por defecto. En bolívares se exige la tasa del día
  // (Bs/$) para poder convertir a dólares en los reportes.
  const monedaPlaza = moneda === 'VES' ? 'VES' : 'USD'
  const tasaNum = Number(tasa)
  if (monedaPlaza === 'VES' && !(tasaNum > 0)) {
    return NextResponse.json({ error: 'Para pagos en Bs ingresa la tasa del día (Bs/$)' }, { status: 400 })
  }
  const tasaPlaza = monedaPlaza === 'VES' ? tasaNum : null
  const fechaValida = typeof fechaCompra === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaCompra)
    ? fechaCompra
    : new Date().toISOString().slice(0, 10)

  const admin = await createAdminClient()

  const { data: solicitud, error: solErr } = await admin
    .from('solicitudes_repuestos')
    .select('id, numero, numero_scr, estado, cliente_id, para_la_oriental, cliente_externo')
    .eq('id', solicitudId)
    .single()

  if (solErr || !solicitud) {
    return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  }
  if (['completado', 'comprado_plaza', 'cancelado'].includes(solicitud.estado)) {
    return NextResponse.json(
      { error: 'La solicitud ya está cerrada, no puede comprarse en plaza' },
      { status: 400 }
    )
  }

  const numeroRef = solicitud.numero ?? solicitud.numero_scr ?? solicitudId

  // Crear egreso vinculado
  const conceptoEg = `Compra de repuestos en plaza — ${numeroRef}`
  const numeroEgreso = generarNumeroEgreso()

  const { data: egreso, error: egErr } = await admin
    .from('egresos')
    .insert({
      numero_egreso: numeroEgreso,
      categoria: 'cr_plaza',
      concepto: conceptoEg,
      descripcion: notas ?? null,
      monto: montoNum,
      moneda: monedaPlaza,
      tasa_cambio: tasaPlaza,
      metodo_pago: metodoPago ?? null,
      banco_origen: bancoOrigen ?? null,
      beneficiario: proveedor.trim(),
      proveedor_id: provId,
      referencia: referencia ?? null,
      fecha_egreso: fechaValida,
      area_responsable: 'Repuestos',
      centro_costo_id: 'repuestos',
      tipo_movimiento: 'gasto',
      cliente_id: solicitud.cliente_id ?? null,
      registrado_por: user.id,
      estado: 'registrado',
    })
    .select('id')
    .single()

  if (egErr || !egreso) {
    console.error('[repuestos/comprar-plaza] egreso error:', egErr)
    return NextResponse.json(
      { error: `No se pudo crear el egreso: ${egErr?.message ?? 'error desconocido'}` },
      { status: 500 }
    )
  }

  // Actualizar solicitud
  const { error: upErr } = await admin
    .from('solicitudes_repuestos')
    .update({
      estado: 'comprado_plaza',
      proveedor_plaza: proveedor.trim(),
      proveedor_id: provId,
      monto_plaza: montoNum,
      moneda_plaza: monedaPlaza,
      tasa_plaza: tasaPlaza,
      fecha_compra_plaza: fechaValida,
      notas_plaza: notas ?? null,
      egreso_plaza_id: egreso.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', solicitudId)

  if (upErr) {
    console.error('[repuestos/comprar-plaza] update solicitud error:', upErr)
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  // Marcar los ítems que se compran en plaza (los que Vehimotors no tiene)
  if (itemIdsSel.length > 0) {
    await admin
      .from('repuestos_items')
      .update({ comprar_plaza: true })
      .in('id', itemIdsSel)
      .eq('solicitud_id', solicitudId)
  }

  await admin.from('repuestos_historial').insert({
    solicitud_id: solicitudId,
    estado_nuevo: 'comprado_plaza',
    usuario_email: user.email ?? null,
    notas: `Compra en plaza a ${proveedor.trim()} por ${monedaPlaza === 'VES' ? `Bs. ${montoNum.toFixed(2)} (tasa ${tasaNum})` : `USD ${montoNum.toFixed(2)}`}. Egreso: ${numeroEgreso}.`,
  })

  return NextResponse.json({ ok: true, egresoId: egreso.id, numeroEgreso })
}
