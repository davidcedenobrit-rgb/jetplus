'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { EgresoSchema } from '@/lib/validations'
import { permitido } from '@/lib/rate-limit'
import { desglosarIva, IVA_TASA_DEFAULT } from '@/lib/iva'
import { periodoDeFecha, siguienteComprobante, calcRetIva } from '@/lib/retencion-iva'

export type CrearEgresoPayload = {
  categoria: string
  concepto: string
  descripcion: string | null
  monto: number
  moneda: string
  tasa_cambio: number | null
  metodo_pago: string | null
  banco_origen: string | null
  beneficiario: string | null
  cedula_rif_benef: string | null
  referencia: string | null
  fecha_egreso: string
  area_responsable: string | null
  observaciones: string | null
  numero_sa: string | null
  centro_costo_id: string | null
  origen_capital: string | null
  tipo_movimiento: string | null
  proveedor_id: string | null
  iva_aplica?: boolean
  iva_tasa?: number | null
  monto_exento?: number | null
  // Soporte y retención de IVA
  tipo_soporte?: string | null            // 'factura' | 'nota_entrega' | null
  fecha_factura?: string | null
  numero_factura?: string | null
  numero_control?: string | null
  ret_iva_aplica?: boolean
  ret_iva_pct?: number | null             // 75 | 100
  ret_iva_fecha_emision?: string | null
  comprobantes: { url: string; nombre: string }[]
}

export type Proveedor = {
  id: string
  nombre: string
  rif: string | null
  correo: string | null
  telefono: string | null
  numero_cuenta: string | null
  banco: string | null
}

export async function crearEgreso(payload: CrearEgresoPayload) {
  // 1. Verificar autenticación server-side
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Rate limit: máx. 40 egresos por minuto por usuario (evita doble-envío/abuso)
  if (!(await permitido(`crear_egreso:${user.id}`, 40, 60))) {
    return { error: 'Demasiadas solicitudes seguidas. Espera unos segundos e intenta de nuevo.' }
  }

  // 2. Validar con Zod server-side
  const parsed = EgresoSchema.safeParse({
    categoria:       payload.categoria,
    concepto:        payload.concepto,
    descripcion:     payload.descripcion,
    monto:           payload.monto,
    moneda:          payload.moneda,
    tasa_cambio:     payload.tasa_cambio,
    metodo_pago:     payload.metodo_pago,
    banco_origen:    payload.banco_origen,
    beneficiario:    payload.beneficiario,
    cedula_rif_benef: payload.cedula_rif_benef,
    referencia:      payload.referencia,
    fecha_egreso:    payload.fecha_egreso,
    area_responsable: payload.area_responsable,
    observaciones:   payload.observaciones,
    numero_sa:       payload.numero_sa,
  })
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Datos inválidos' }
  }

  // Normalizar los campos nuevos (no forman parte del schema base de Zod)
  const tipoMovimiento = payload.tipo_movimiento === 'inversion' ? 'inversion' : 'gasto'
  const origenCapital = payload.origen_capital?.trim() || null
  const centroCostoId = payload.centro_costo_id?.trim() || null
  const proveedorId = payload.proveedor_id?.trim() || null

  // IVA: monto es el total. En facturas mixtas, `monto_exento` es la parte sin
  // IVA; el IVA se calcula solo sobre (total - exento). total = base + iva + exento.
  const ivaAplica = !!payload.iva_aplica
  const ivaTasa = ivaAplica ? (payload.iva_tasa ?? IVA_TASA_DEFAULT) : null
  const montoExento = ivaAplica
    ? Math.max(0, Math.min(Number(payload.monto_exento) || 0, parsed.data.monto))
    : null
  const { base: baseImponible, iva: ivaMonto } = ivaAplica && ivaTasa
    ? desglosarIva(parsed.data.monto - (montoExento ?? 0), ivaTasa)
    : { base: null as number | null, iva: null as number | null }

  // Retención de IVA: cuando aplica, se retiene 75% o 100% del IVA y se le
  // asigna un número de comprobante (AAAAMM + secuencial) según la fecha de
  // emisión (por defecto hoy). Los campos de factura son obligatorios.
  const retIvaAplica = !!payload.ret_iva_aplica
  const tipoSoporte = payload.tipo_soporte === 'factura' ? 'factura'
    : payload.tipo_soporte === 'nota_entrega' ? 'nota_entrega' : null
  const fechaFactura = payload.fecha_factura?.trim() || null
  const numeroFactura = payload.numero_factura?.trim() || null
  const numeroControl = payload.numero_control?.trim() || null

  // 3. Generar número de egreso y persistir (admin client — SECURITY DEFINER equivalente)
  const admin = await createAdminClient()

  let retIvaPct: number | null = null
  let retIvaMonto: number | null = null
  let retIvaComprobante: string | null = null
  let retIvaPeriodo: string | null = null
  let retIvaFechaEmision: string | null = null
  if (retIvaAplica) {
    if (!ivaAplica || !ivaMonto) return { error: 'Para retener IVA, el egreso debe incluir IVA.' }
    if (!fechaFactura || !numeroFactura || !numeroControl) {
      return { error: 'La retención de IVA requiere fecha, número y número de control de la factura.' }
    }
    retIvaPct = Number(payload.ret_iva_pct) === 100 ? 100 : 75
    retIvaMonto = calcRetIva(ivaMonto, retIvaPct)
    retIvaFechaEmision = payload.ret_iva_fecha_emision?.trim() || new Date().toISOString().slice(0, 10)
    retIvaPeriodo = periodoDeFecha(retIvaFechaEmision)
    retIvaComprobante = await siguienteComprobante(admin, retIvaPeriodo)
  }

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
      centro_costo_id:  centroCostoId,
      origen_capital:   origenCapital,
      tipo_movimiento:  tipoMovimiento,
      proveedor_id:     proveedorId,
      observaciones:    parsed.data.observaciones ?? null,
      numero_sa:        parsed.data.numero_sa ?? null,
      tasa_cambio:      parsed.data.tasa_cambio ?? null,
      monto_bs:         (parsed.data.tasa_cambio && parsed.data.moneda !== 'VES')
                          ? Math.round(parsed.data.monto * parsed.data.tasa_cambio * 100) / 100
                          : null,
      iva_aplica:       ivaAplica,
      iva_tasa:         ivaTasa,
      base_imponible:   baseImponible,
      iva_monto:        ivaMonto,
      monto_exento:     montoExento && montoExento > 0 ? montoExento : null,
      tipo_soporte:     tipoSoporte,
      fecha_factura:    fechaFactura,
      numero_factura:   numeroFactura,
      numero_control:   numeroControl,
      ret_iva_aplica:   retIvaAplica,
      ret_iva_pct:      retIvaPct,
      ret_iva_monto:    retIvaMonto,
      ret_iva_comprobante: retIvaComprobante,
      ret_iva_periodo:  retIvaPeriodo,
      ret_iva_fecha_emision: retIvaFechaEmision,
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

const ROLES_EDITAR_TASA = ['jose', 'admin', 'director', 'leysdem', 'mary', 'arianna']

export async function actualizarTasaEgreso(egresoId: string, tasa: number, monto: number, moneda: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES_EDITAR_TASA.includes(rol)) return { error: 'Sin permiso para editar la tasa' }

  if (tasa <= 0) return { error: 'La tasa debe ser mayor a 0' }

  // VES: monto ya está en Bs, monto_bs no aplica; USD/USDT: convertir a Bs
  const monto_bs = moneda === 'VES' ? null : Math.round(monto * tasa * 100) / 100

  const admin = await createAdminClient()
  const { error } = await admin
    .from('egresos')
    .update({ tasa_cambio: tasa, monto_bs })
    .eq('id', egresoId)

  if (error) return { error: 'Error al actualizar la tasa' }
  return { ok: true }
}

// ── Proveedores (beneficiario del egreso) ──────────────────────────────────

const PROVEEDOR_COLS = 'id, nombre, rif, correo, telefono, numero_cuenta, banco'

export async function buscarProveedores(query: string): Promise<{ proveedores: Proveedor[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { proveedores: [] }

  const q = query.trim()
  const admin = await createAdminClient()
  let sel = admin.from('proveedores').select(PROVEEDOR_COLS).eq('activo', true)

  if (q) {
    const like = `%${q.replace(/[%_,]/g, '')}%`
    sel = sel.or(`nombre.ilike.${like},rif.ilike.${like}`)
  }

  const { data } = await sel.order('nombre').limit(20)
  return { proveedores: (data ?? []) as Proveedor[] }
}

export async function crearProveedor(input: {
  nombre: string
  rif?: string | null
  correo?: string | null
  telefono?: string | null
  numero_cuenta?: string | null
  banco?: string | null
}): Promise<{ proveedor?: Proveedor; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const nombre = input.nombre?.trim()
  if (!nombre) return { error: 'El nombre del proveedor es requerido' }

  const clean = (v?: string | null) => (v && v.trim() ? v.trim() : null)

  const admin = await createAdminClient()
  const { data, error } = await admin
    .from('proveedores')
    .insert({
      nombre,
      rif:           clean(input.rif),
      correo:        clean(input.correo),
      telefono:      clean(input.telefono),
      numero_cuenta: clean(input.numero_cuenta),
      banco:         clean(input.banco),
    })
    .select(PROVEEDOR_COLS)
    .single()

  if (error || !data) return { error: 'Error al crear el proveedor' }
  return { proveedor: data as Proveedor }
}
