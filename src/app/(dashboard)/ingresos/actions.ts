'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { IngresoSchema } from '@/lib/validations'
import { desglosarIva, IVA_TASA_DEFAULT } from '@/lib/iva'
import { permitido } from '@/lib/rate-limit'

export type CuotaPayload = {
  id: string
  credito_id: string
  monto_aplicar: number
  nuevo_monto_pagado: number
  es_pagada: boolean
}

export type CrearIngresoPayload = {
  // Datos del ingreso
  cliente_id: string
  vehiculo_id: string | null
  placa: string | null
  concepto: string
  monto: number
  moneda: string
  metodo_pago: string
  banco_emisor: string | null
  banco_receptor: string | null
  referencia: string | null
  fecha_pago: string
  observaciones: string | null
  tasa_cambio: number | null
  monto_bs: number | null
  acuerdo_id: string | null
  acuerdo_pagado: number
  acuerdo_acordado: number
  iva_aplica?: boolean
  iva_tasa?: number | null
  monto_exento?: number | null
  centro_costo_id?: string | null
  titular_fondos?: string | null
  banco_nacional?: string | null
  // Cuotas ya calculadas por el cliente
  cuotas: CuotaPayload[]
  // Comprobantes ya subidos al storage
  comprobantes: { url: string; nombre: string }[]
}

export async function crearIngreso(payload: CrearIngresoPayload) {
  // 1. Verificar autenticación server-side
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Rate limit: máx. 40 ingresos por minuto por usuario (evita doble-envío/abuso)
  if (!(await permitido(`crear_ingreso:${user.id}`, 40, 60))) {
    return { error: 'Demasiadas solicitudes seguidas. Espera unos segundos e intenta de nuevo.' }
  }

  // 2. Validar campos del ingreso con Zod server-side
  const parsed = IngresoSchema.safeParse({
    concepto:      payload.concepto,
    monto:         payload.monto,
    moneda:        payload.moneda,
    metodo_pago:   payload.metodo_pago,
    banco_emisor:  payload.banco_emisor,
    banco_receptor: payload.banco_receptor,
    referencia:    payload.referencia,
    fecha_pago:    payload.fecha_pago,
    observaciones: payload.observaciones,
    tasa_cambio:   payload.tasa_cambio,
  })
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Datos inválidos' }
  }

  // 3. Validar que cliente_id sea un UUID válido
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRe.test(payload.cliente_id)) return { error: 'Cliente inválido' }
  if (payload.vehiculo_id && !uuidRe.test(payload.vehiculo_id)) return { error: 'Vehículo inválido' }
  if (payload.acuerdo_id && !uuidRe.test(payload.acuerdo_id)) return { error: 'Acuerdo inválido' }

  // 4. Llamar a la función PostgreSQL atómica (transacción)
  const admin = await createAdminClient()
  const { data: result, error: rpcError } = await admin.rpc('registrar_ingreso', {
    p_cliente_id:       payload.cliente_id,
    p_vehiculo_id:      payload.vehiculo_id,
    p_placa:            payload.placa,
    p_concepto:         parsed.data.concepto,
    p_monto:            parsed.data.monto,
    p_moneda:           parsed.data.moneda,
    p_metodo_pago:      parsed.data.metodo_pago,
    p_banco_emisor:     parsed.data.banco_emisor ?? null,
    p_banco_receptor:   parsed.data.banco_receptor ?? null,
    p_referencia:       parsed.data.referencia ?? null,
    p_fecha_pago:       parsed.data.fecha_pago,
    p_observaciones:    parsed.data.observaciones ?? null,
    p_tasa_cambio:      parsed.data.tasa_cambio ?? null,
    p_monto_bs:         payload.monto_bs,
    p_registrado_por:   user.id,
    p_acuerdo_id:       payload.acuerdo_id,
    p_acuerdo_pagado:   payload.acuerdo_pagado,
    p_acuerdo_acordado: payload.acuerdo_acordado,
    p_cuotas:           payload.cuotas,
  })

  if (rpcError) return { error: 'Error al registrar ingreso' }
  if (!result?.ok) return { error: result?.error ?? 'Error interno' }

  const ingresoId = result.ingreso_id as string

  // 4b. Campos que se guardan con un update posterior para no modificar la
  // función atómica registrar_ingreso: IVA (desglose base + IVA) y centro de costo.
  const updates: Record<string, unknown> = {}
  if (payload.iva_aplica) {
    const tasa = payload.iva_tasa ?? IVA_TASA_DEFAULT
    // Factura mixta: parte exenta sin IVA. El IVA se calcula solo sobre (total - exento).
    const exento = Math.max(0, Math.min(Number(payload.monto_exento) || 0, parsed.data.monto))
    const { base, iva } = desglosarIva(parsed.data.monto - exento, tasa)
    updates.iva_aplica = true
    updates.iva_tasa = tasa
    updates.base_imponible = base
    updates.iva_monto = iva
    updates.monto_exento = exento > 0 ? exento : null
  }
  if (payload.centro_costo_id) updates.centro_costo_id = payload.centro_costo_id
  if (payload.titular_fondos && ['propio', 'vehimotors', 'tercero'].includes(payload.titular_fondos)) {
    updates.titular_fondos = payload.titular_fondos
  }
  if (payload.banco_nacional) updates.banco_nacional = String(payload.banco_nacional).slice(0, 120)
  if (Object.keys(updates).length > 0) {
    await admin.from('ingresos').update(updates).eq('id', ingresoId)
  }

  // 5. Registrar comprobantes (fuera de la transacción — ya subidos al storage)
  if (payload.comprobantes.length > 0) {
    await admin.from('archivos').insert(
      payload.comprobantes.map(c => ({
        tipo: 'comprobante',
        url: c.url,
        nombre: c.nombre,
        ingreso_id: ingresoId,
        subido_por: user.id,
      }))
    )
  }

  return { ok: true, ingresoId }
}
