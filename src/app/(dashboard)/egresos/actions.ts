'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { EgresoSchema } from '@/lib/validations'

export type CrearEgresoPayload = {
  categoria: string
  concepto: string
  descripcion: string | null
  monto: number
  moneda: string
  metodo_pago: string | null
  banco_origen: string | null
  beneficiario: string | null
  cedula_rif_benef: string | null
  referencia: string | null
  fecha_egreso: string
  area_responsable: string | null
  observaciones: string | null
  comprobantes: { url: string; nombre: string }[]
}

export async function crearEgreso(payload: CrearEgresoPayload) {
  // 1. Verificar autenticación server-side
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // 2. Validar con Zod server-side
  const parsed = EgresoSchema.safeParse({
    categoria:       payload.categoria,
    concepto:        payload.concepto,
    descripcion:     payload.descripcion,
    monto:           payload.monto,
    moneda:          payload.moneda,
    metodo_pago:     payload.metodo_pago,
    banco_origen:    payload.banco_origen,
    beneficiario:    payload.beneficiario,
    cedula_rif_benef: payload.cedula_rif_benef,
    referencia:      payload.referencia,
    fecha_egreso:    payload.fecha_egreso,
    area_responsable: payload.area_responsable,
    observaciones:   payload.observaciones,
  })
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Datos inválidos' }
  }

  // 3. Generar número de egreso y persistir (admin client — SECURITY DEFINER equivalente)
  const admin = await createAdminClient()

  const year = new Date().getFullYear()
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  const seq = String(buf[0] % 1_000_000).padStart(6, '0')
  const numero_egreso = `LOA-EGR-${year}-${seq}`

  const { data: inserted, error: insertError } = await admin
    .from('egresos')
    .insert({
      numero_egreso,
      categoria:        parsed.data.categoria,
      concepto:         parsed.data.concepto,
      descripcion:      parsed.data.descripcion ?? null,
      monto:            parsed.data.monto,
      moneda:           parsed.data.moneda,
      metodo_pago:      parsed.data.metodo_pago ?? null,
      banco_origen:     parsed.data.banco_origen ?? null,
      beneficiario:     parsed.data.beneficiario ?? null,
      cedula_rif_benef: parsed.data.cedula_rif_benef ?? null,
      referencia:       parsed.data.referencia ?? null,
      fecha_egreso:     parsed.data.fecha_egreso,
      area_responsable: parsed.data.area_responsable ?? null,
      observaciones:    parsed.data.observaciones ?? null,
      estado:           'pendiente_aprobacion',
      registrado_por:   user.id,
    })
    .select('id')
    .single()

  if (insertError || !inserted) return { error: 'Error al guardar el egreso' }

  // 4. Registrar comprobantes
  if (payload.comprobantes.length > 0) {
    await admin.from('archivos').insert(
      payload.comprobantes.map(c => ({
        tipo: 'comprobante',
        url: c.url,
        nombre: c.nombre,
        egreso_id: inserted.id,
        subido_por: user.id,
      }))
    )
  }

  return { ok: true, egresoId: inserted.id }
}
