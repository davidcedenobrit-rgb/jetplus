export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TEST_SECRET = process.env.TEST_EMAIL_SECRET ?? 'prueba-sore-2026'

// IDs fijos del caso Rocarli
const CLIENTE_ROCARLI = 'a620553a-91b7-4c4e-bc32-1e3fdbc9c61c'
const CREDITO_S06598 = '00997cc1-8514-4a73-93ce-f43dbcad6dec'
const CREDITO_S06599 = 'c42b1a76-e97c-49ad-86f8-e293bedf46ce'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('s')
  if (secret !== TEST_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Cargar cuotas #1 de ambos créditos
  const { data: cuotas, error: errCuotas } = await supabase
    .from('cuotas')
    .select('id, credito_id, monto, monto_pagado, estado, fecha_vencimiento')
    .in('credito_id', [CREDITO_S06598, CREDITO_S06599])
    .eq('numero_cuota', 1)

  if (errCuotas || !cuotas || cuotas.length !== 2) {
    return NextResponse.json({
      error: 'No se encontraron las 2 cuotas #1 de Rocarli',
      detail: errCuotas?.message,
      encontradas: cuotas?.length ?? 0,
    }, { status: 500 })
  }

  // Verificar que las cuotas tengan el monto esperado ($5,814 cada una)
  const montoEsperado = 5814
  for (const c of cuotas) {
    if (Math.abs(Number(c.monto) - montoEsperado) > 0.01) {
      return NextResponse.json({
        error: `La cuota ${c.id} tiene monto ${c.monto}, se esperaba ${montoEsperado}`,
      }, { status: 500 })
    }
  }

  // Chequear que aún no estén totalmente pagadas
  const yaPagadas = cuotas.filter(c => Number(c.monto_pagado ?? 0) >= Number(c.monto) - 0.01)
  if (yaPagadas.length > 0) {
    return NextResponse.json({
      error: 'Alguna de las cuotas #1 ya está totalmente pagada. Reset primero.',
      cuotasPagadas: yaPagadas.map(c => c.id),
    }, { status: 400 })
  }

  const montoTotal = 11628
  const fechaHoy = new Date().toISOString().split('T')[0]

  // Buscar un usuario para "registrado_por"
  const { data: adminUsers, error: errUsers } = await supabase
    .from('usuarios')
    .select('id, correo, rol')
    .limit(20)

  let registradoPor: string | null = adminUsers?.[0]?.id ?? null

  // Fallback: ID conocido de admin@gmail.com si la query falla
  if (!registradoPor) {
    registradoPor = '093b709c-58cb-41a4-bd1a-4ed1f3938d8d'
  }

  if (!registradoPor) {
    return NextResponse.json({
      error: 'No se encontró un usuario admin/director para asignar como registrado_por',
      queryError: errUsers?.message ?? 'sin error',
      usersEncontrados: adminUsers?.length ?? 0,
      users: adminUsers,
    }, { status: 500 })
  }

  // 2. Insertar ingreso — el trigger trg_numero_recibo genera el numero_recibo automáticamente
  const { data: ingreso, error: errIng } = await supabase
    .from('ingresos')
    .insert({
      cliente_id: CLIENTE_ROCARLI,
      vehiculo_id: null,
      placa: null,
      concepto: '🧪 PRUEBA — Cuota de vehículo (2 carros)',
      monto: montoTotal,
      moneda: 'USD',
      metodo_pago: 'Efectivo USD',
      fecha_pago: fechaHoy,
      estado: 'aprobado',
      registrado_por: registradoPor,
      aprobado_por: registradoPor,
      fecha_aprobacion: new Date().toISOString(),
      observaciones: 'Ingreso de prueba generado automáticamente. Cubre cuota #1 de ambos créditos.',
    })
    .select('id, numero_recibo')
    .single()

  if (errIng || !ingreso) {
    return NextResponse.json({
      error: 'Error creando ingreso',
      detail: errIng?.message,
    }, { status: 500 })
  }

  // 4. Aplicar $5,814 a cada cuota
  const cuotaIngresos = cuotas.map(c => ({
    cuota_id: c.id,
    ingreso_id: ingreso.id,
    monto_aplicado: 5814,
  }))
  const { error: errCI } = await supabase.from('cuota_ingresos').insert(cuotaIngresos)
  if (errCI) {
    // Rollback: eliminar ingreso
    await supabase.from('ingresos').delete().eq('id', ingreso.id)
    return NextResponse.json({
      error: 'Error asociando cuotas',
      detail: errCI.message,
    }, { status: 500 })
  }

  // 5. Actualizar cada cuota como pagada
  for (const c of cuotas) {
    await supabase.from('cuotas').update({
      monto_pagado: 5814,
      estado: 'pagada',
      fecha_pago: fechaHoy + 'T00:00:00',
    }).eq('id', c.id)
  }

  // 6. Recalcular saldo de ambos créditos
  for (const credId of [CREDITO_S06598, CREDITO_S06599]) {
    const { data: cuotasCred } = await supabase
      .from('cuotas')
      .select('monto, monto_pagado, estado')
      .eq('credito_id', credId)
      .neq('estado', 'pagada')
    const saldo = (cuotasCred ?? []).reduce(
      (s, x) => s + Math.max(0, Number(x.monto) - Number(x.monto_pagado ?? 0)),
      0,
    )
    await supabase.from('creditos').update({ saldo }).eq('id', credId)
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://jetplus.vercel.app'
  const recibiUrl = `${baseUrl}/ingresos/${ingreso.id}`

  return NextResponse.json({
    ok: true,
    mensaje: 'Ingreso de prueba creado y aplicado a las 2 cuotas',
    ingresoId: ingreso.id,
    numeroRecibo: ingreso.numero_recibo,
    monto: `USD ${montoTotal.toFixed(2)}`,
    reciboUrl: recibiUrl,
    detalle: {
      cliente: 'TELECOMUNICACIONES ROCARLI, C.A.',
      cuotasAplicadas: [
        { credito: 'S06598 (Carro A)', cuota: 1, aplicado: 5814 },
        { credito: 'S06599 (Carro B)', cuota: 1, aplicado: 5814 },
      ],
    },
    instrucciones: [
      `1. Abre el recibo en: ${recibiUrl}`,
      '2. Verifica que aparezcan los DOS vehículos en el bloque "Vehículos (2)"',
      '3. Verifica que la tabla "Cuotas aplicadas" muestre las 2 cuotas con su placa y proforma',
      '4. Para eliminar la prueba: elimina el ingreso desde la UI o corre el endpoint /api/ingresos/test-recibo-rocarli/reset',
    ],
  })
}

// Reset: eliminar el último ingreso de prueba y volver las cuotas a "no pagada"
export async function DELETE(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('s')
  if (secret !== TEST_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Buscar ingresos de prueba de Rocarli
  const { data: pruebas } = await supabase
    .from('ingresos')
    .select('id, numero_recibo')
    .eq('cliente_id', CLIENTE_ROCARLI)
    .ilike('concepto', '%PRUEBA%')

  if (!pruebas || pruebas.length === 0) {
    return NextResponse.json({ ok: true, mensaje: 'No hay ingresos de prueba para eliminar' })
  }

  const ids = pruebas.map(p => p.id)

  // Eliminar cuota_ingresos, luego ingresos
  await supabase.from('cuota_ingresos').delete().in('ingreso_id', ids)
  await supabase.from('ingresos').delete().in('id', ids)

  // Reset cuotas #1 de ambos créditos
  const { data: cuotas } = await supabase
    .from('cuotas')
    .select('id, monto, credito_id')
    .in('credito_id', [CREDITO_S06598, CREDITO_S06599])
    .eq('numero_cuota', 1)

  for (const c of cuotas ?? []) {
    await supabase.from('cuotas').update({
      monto_pagado: 0,
      fecha_pago: null,
      estado: 'vencida',
    }).eq('id', c.id)
  }

  // Recalcular saldos
  for (const credId of [CREDITO_S06598, CREDITO_S06599]) {
    const { data: cuotasCred } = await supabase
      .from('cuotas')
      .select('monto, monto_pagado, estado')
      .eq('credito_id', credId)
      .neq('estado', 'pagada')
    const saldo = (cuotasCred ?? []).reduce(
      (s, x) => s + Math.max(0, Number(x.monto) - Number(x.monto_pagado ?? 0)),
      0,
    )
    await supabase.from('creditos').update({ saldo }).eq('id', credId)
  }

  return NextResponse.json({
    ok: true,
    mensaje: `${pruebas.length} ingreso(s) de prueba eliminado(s)`,
    reciboEliminados: pruebas.map(p => p.numero_recibo),
  })
}
