'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem', 'arianna']

type ItemInput = { descripcion: string; cantidad: number; referencia?: string | null }

export type NuevaCompraPlazaInput = {
  proveedorId: string | null
  proveedorNombre: string
  items: ItemInput[]
  monto: number
  moneda: 'USD' | 'VES'
  tasa?: number | null
  fechaCompra: string
  metodoPago?: string | null
  bancoOrigen?: string | null
  referencia?: string | null
  notas?: string | null
  destino: 'oriental' | 'cliente' | 'externo'
  clienteId?: string | null
  clienteExterno?: string | null
}

function numeroEgreso() {
  const year = new Date().getFullYear()
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return `LOA-EGR-${year}-${String(buf[0] % 1_000_000).padStart(6, '0')}`
}

// Compra en plaza directa (sin cotización de Vehimotors). Crea la solicitud en
// estado comprado_plaza, sus ítems y el egreso vinculado.
export async function crearCompraPlazaDirecta(input: NuevaCompraPlazaInput): Promise<{ ok?: boolean; solicitudId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return { error: 'Sin permisos' }

  const proveedorNombre = input.proveedorNombre?.trim()
  if (!proveedorNombre) return { error: 'Selecciona o crea el proveedor' }
  const items = (input.items ?? []).filter(i => i.descripcion?.trim())
  if (items.length === 0) return { error: 'Agrega al menos un ítem' }
  const montoNum = Number(input.monto)
  if (!(montoNum > 0)) return { error: 'Monto inválido' }
  const moneda = input.moneda === 'VES' ? 'VES' : 'USD'
  // Un egreso en bolívares requiere la tasa del día; si no, no se puede expresar
  // en USD y quedaría en 0 en los reportes.
  const tasa = Number(input.tasa)
  if (moneda === 'VES' && !(tasa > 0)) return { error: 'Para pagos en Bs ingresa la tasa del día (Bs/$)' }
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(input.fechaCompra) ? input.fechaCompra : new Date().toISOString().slice(0, 10)

  const admin = await createAdminClient()

  // Numero SORE
  const year = new Date().getFullYear()
  const { data: last } = await admin
    .from('solicitudes_repuestos')
    .select('numero')
    .ilike('numero', `SORE-${year}-%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  let seq = 1
  if (last?.numero) {
    const n = parseInt(String(last.numero).split('-')[2] ?? '0', 10)
    if (!isNaN(n)) seq = n + 1
  }
  const numero = `SORE-${year}-${String(seq).padStart(5, '0')}`

  // Solicitud directamente en comprado_plaza
  const { data: sol, error: solErr } = await admin
    .from('solicitudes_repuestos')
    .insert({
      numero,
      estado: 'comprado_plaza',
      solicitado_por_id: user.id,
      solicitado_por_email: user.email,
      cliente_id: input.destino === 'cliente' ? (input.clienteId ?? null) : null,
      para_la_oriental: input.destino === 'oriental',
      cliente_externo: input.destino === 'externo' ? (input.clienteExterno?.trim() || null) : null,
      proveedor_id: input.proveedorId,
      proveedor_plaza: proveedorNombre,
      monto_plaza: montoNum,
      moneda_plaza: moneda,
      tasa_plaza: moneda === 'VES' ? tasa : null,
      fecha_compra_plaza: fecha,
      notas_plaza: input.notas?.trim() || null,
    })
    .select('id')
    .single()

  if (solErr || !sol) return { error: 'No se pudo crear la compra' }

  await admin.from('repuestos_items').insert(
    items.map(it => ({
      solicitud_id: sol.id,
      descripcion: it.descripcion.trim(),
      referencia: it.referencia?.trim() || null,
      cantidad: it.cantidad > 0 ? it.cantidad : 1,
    }))
  )

  // Egreso vinculado
  const { data: egreso } = await admin
    .from('egresos')
    .insert({
      numero_egreso: numeroEgreso(),
      categoria: 'cr_plaza',
      concepto: `Compra de repuestos en plaza — ${numero}`,
      descripcion: input.notas?.trim() || null,
      monto: montoNum,
      moneda,
      tasa_cambio: moneda === 'VES' ? tasa : null,
      metodo_pago: input.metodoPago?.trim() || null,
      banco_origen: input.bancoOrigen?.trim() || null,
      beneficiario: proveedorNombre,
      proveedor_id: input.proveedorId,
      referencia: input.referencia?.trim() || null,
      fecha_egreso: fecha,
      area_responsable: 'Repuestos',
      centro_costo_id: 'repuestos',
      tipo_movimiento: 'gasto',
      cliente_id: input.destino === 'cliente' ? (input.clienteId ?? null) : null,
      registrado_por: user.id,
      estado: 'registrado',
    })
    .select('id')
    .single()

  if (egreso?.id) {
    await admin.from('solicitudes_repuestos').update({ egreso_plaza_id: egreso.id }).eq('id', sol.id)
  }

  await admin.from('repuestos_historial').insert({
    solicitud_id: sol.id,
    estado_nuevo: 'comprado_plaza',
    usuario_email: user.email ?? null,
    notas: `Compra en plaza directa a ${proveedorNombre} (${items.length} ítem${items.length !== 1 ? 's' : ''}).`,
  })

  revalidatePath('/repuestos')
  revalidatePath('/repuestos/compra-plaza')
  revalidatePath('/egresos')
  return { ok: true, solicitudId: sol.id }
}
