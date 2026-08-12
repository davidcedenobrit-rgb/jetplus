'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { EgresoSchema } from '@/lib/validations'
import { permitido } from '@/lib/rate-limit'
import { desglosarIva, IVA_TASA_DEFAULT } from '@/lib/iva'
import { periodoDeFecha, siguienteComprobante, calcRetIva } from '@/lib/retencion-iva'
import { calcRetIslr, siguienteComprobanteIslr } from '@/lib/retencion-islr'
import { existeCuenta, nombreDeCuenta } from '@/lib/contabilidad/cuentas-selector'

export type CrearEgresoPayload = {
  categoria: string
  concepto: string
  descripcion: string | null
  monto: number
  moneda: string
  tasa_cambio: number | null
  metodo_pago: string | null
  banco_origen: string | null
  banco_destino: string | null
  beneficiario: string | null
  cedula_rif_benef: string | null
  beneficiario_direccion: string | null
  referencia: string | null
  fecha_egreso: string
  area_responsable: string | null
  observaciones: string | null
  numero_sa: string | null
  centro_costo_id: string | null
  es_comun?: boolean
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
  // Retención de ISLR
  ret_islr_aplica?: boolean
  ret_islr_codigo?: string | null         // 055 | 002
  ret_islr_fecha_emision?: string | null
  // Plan de cuentas
  afecta_plan?: boolean
  cuenta_contable?: string | null
  cuenta_contable_nombre?: string | null
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
  direccion: string | null
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
  // Gasto común (gastos fijos): se reparte por % entre las líneas de ingreso, no
  // va a un solo centro de costo.
  const esComun = payload.es_comun === true
  const centroCostoId = esComun ? null : (payload.centro_costo_id?.trim() || null)
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

  // Retención de ISLR: sobre la base imponible (sin IVA), según el concepto
  // elegido (055 servicios PJ 2%, 002 PNR 3% − sustraendo). El % y el sustraendo
  // se toman del catálogo islr_conceptos (autoridad del servidor).
  const retIslrAplica = !!payload.ret_islr_aplica
  let retIslrCodigo: string | null = null
  let retIslrConcepto: string | null = null
  let retIslrPct: number | null = null
  let retIslrSustraendo: number | null = null
  let retIslrBase: number | null = null
  let retIslrMonto: number | null = null
  let retIslrComprobante: string | null = null
  let retIslrPeriodo: string | null = null
  let retIslrFechaEmision: string | null = null
  if (retIslrAplica) {
    const codigo = payload.ret_islr_codigo?.trim() || null
    if (!codigo) return { error: 'Selecciona el concepto de retención de ISLR.' }
    if (!fechaFactura || !numeroFactura || !numeroControl) {
      return { error: 'La retención de ISLR requiere fecha, número y número de control de la factura.' }
    }
    const { data: conc } = await admin.from('islr_conceptos').select('codigo, nombre, porcentaje, sustraendo').eq('codigo', codigo).maybeSingle()
    if (!conc) return { error: 'Concepto de ISLR no válido.' }
    retIslrCodigo = conc.codigo
    retIslrConcepto = conc.nombre
    retIslrPct = Number(conc.porcentaje)
    retIslrSustraendo = Number(conc.sustraendo) || 0
    retIslrBase = baseImponible ?? parsed.data.monto
    retIslrMonto = calcRetIslr(retIslrBase, retIslrPct, retIslrSustraendo)
    retIslrFechaEmision = payload.ret_islr_fecha_emision?.trim() || new Date().toISOString().slice(0, 10)
    retIslrPeriodo = periodoDeFecha(retIslrFechaEmision)
    retIslrComprobante = await siguienteComprobanteIslr(admin, retIslrPeriodo)
  }

  // Plan de cuentas: se valida el código contra el catálogo (no se confía en el
  // cliente) y se guarda el nombre como snapshot para reportar sin joins.
  const afectaPlan = payload.afecta_plan !== false
  const cuentaContable = afectaPlan && payload.cuenta_contable && existeCuenta(payload.cuenta_contable)
    ? payload.cuenta_contable
    : null
  const cuentaContableNombre = cuentaContable ? nombreDeCuenta(cuentaContable) : null

  const year = new Date().getFullYear()
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  const seq = String(buf[0] % 1_000_000).padStart(6, '0')
  const numero_egreso = `JPLUS-EGR-${year}-${seq}`

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
      banco_destino:    payload.banco_destino?.trim() || null,
      beneficiario:     parsed.data.beneficiario ?? null,
      cedula_rif_benef: parsed.data.cedula_rif_benef ?? null,
      beneficiario_direccion: payload.beneficiario_direccion?.trim() || null,
      referencia:       parsed.data.referencia ?? null,
      fecha_egreso:     parsed.data.fecha_egreso,
      area_responsable: parsed.data.area_responsable ?? null,
      centro_costo_id:  centroCostoId,
      es_comun:         esComun,
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
      ret_islr_aplica:  retIslrAplica,
      ret_islr_codigo:  retIslrCodigo,
      ret_islr_concepto: retIslrConcepto,
      ret_islr_pct:     retIslrPct,
      ret_islr_sustraendo: retIslrSustraendo,
      ret_islr_base:    retIslrBase,
      ret_islr_monto:   retIslrMonto,
      ret_islr_comprobante: retIslrComprobante,
      ret_islr_periodo: retIslrPeriodo,
      ret_islr_fecha_emision: retIslrFechaEmision,
      afecta_plan:      afectaPlan,
      cuenta_contable:  cuentaContable,
      cuenta_contable_nombre: cuentaContableNombre,
      estado:           'pendiente_aprobacion',
      registrado_por:   user.id,
    })
    .select('id')
    .single()

  if (insertError || !inserted) return { error: 'Error al guardar el egreso' }

  // 3b. Anclar dirección y banco al proveedor: la dirección/banco capturados en
  // el egreso quedan guardados en la ficha del proveedor (fuente de verdad).
  if (proveedorId) {
    const provUpdate: Record<string, string> = {}
    const dir = payload.beneficiario_direccion?.trim()
    const bancoDest = payload.banco_destino?.trim()
    if (dir) provUpdate.direccion = dir
    if (bancoDest) provUpdate.banco = bancoDest
    if (Object.keys(provUpdate).length > 0) {
      await admin.from('proveedores').update(provUpdate).eq('id', proveedorId)
    }
  }

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

  // 5. Asiento contable de partida doble (borrador). No bloquea el egreso si falla.
  if (afectaPlan && cuentaContable) {
    await admin.rpc('generar_asiento_egreso', { p_egreso_id: inserted.id })
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

const PROVEEDOR_COLS = 'id, nombre, rif, correo, telefono, numero_cuenta, banco, direccion'

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
  direccion?: string | null
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
      direccion:     clean(input.direccion),
    })
    .select(PROVEEDOR_COLS)
    .single()

  if (error || !data) return { error: 'Error al crear el proveedor' }
  return { proveedor: data as Proveedor }
}
