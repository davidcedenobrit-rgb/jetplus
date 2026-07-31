'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// Ari (arianna), José Manuel (taller) y Rojas (admin/director) gestionan el
// almacén. Se incluyen los demás roles administrativos por consistencia.
const ROL_ALMACEN = ['taller', 'arianna', 'admin', 'director', 'jose', 'mary', 'leysdem', 'almacen', 'almacenista']

// Talleres a los que Ari puede transferir un repuesto que sale del almacén.
export const TALLERES = [
  { key: 'la-oriental', label: 'Taller La Oriental' },
  { key: 'ki-auto', label: 'Taller Ki Auto' },
  { key: 'autosurca', label: 'Taller Autosurca' },
] as const

export type TallerKey = typeof TALLERES[number]['key']

async function requireStaff() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' as const }
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROL_ALMACEN.includes(rol)) return { error: 'Sin permisos' as const }
  return { user, rol }
}

const num = (x: unknown) => { const n = Number(x); return Number.isFinite(n) ? n : 0 }
const r2 = (n: number) => Math.round(n * 100) / 100

export type EntradaInput = {
  itemId?: string | null            // si se suma a un ítem existente
  descripcion: string
  referencia?: string | null
  marca?: string | null
  categoria?: string | null
  ubicacion?: string | null
  cantidad: number
  costoUnitario?: number | null
  moneda?: 'USD' | 'VES'
  stockMinimo?: number | null
  solicitudId?: string | null
  referenciaDoc?: string | null
  notas?: string | null
}

// Entrada al almacén: crea el ítem (o le suma cantidad a uno existente) y deja
// el movimiento de entrada en la bitácora.
export async function registrarEntrada(input: EntradaInput): Promise<{ ok?: boolean; itemId?: string; error?: string }> {
  const auth = await requireStaff()
  if ('error' in auth) return { error: auth.error }
  const { user } = auth

  const cant = num(input.cantidad)
  if (!(cant > 0)) return { error: 'La cantidad debe ser mayor a 0' }
  const admin = await createAdminClient()

  let itemId = input.itemId ?? null
  let saldo = 0

  if (itemId) {
    const { data: it } = await admin.from('almacen_items').select('id, cantidad').eq('id', itemId).maybeSingle()
    if (!it) return { error: 'El repuesto no existe en el almacén' }
    saldo = r2(num(it.cantidad) + cant)
    const patch: Record<string, unknown> = { cantidad: saldo, updated_at: new Date().toISOString() }
    if (input.costoUnitario != null) patch.costo_unitario = num(input.costoUnitario)
    if (input.ubicacion) patch.ubicacion = input.ubicacion.trim()
    await admin.from('almacen_items').update(patch).eq('id', itemId)
  } else {
    const descripcion = (input.descripcion ?? '').trim()
    if (!descripcion) return { error: 'Indica la descripción del repuesto' }
    saldo = cant
    const { data: nuevo, error: insErr } = await admin.from('almacen_items').insert({
      descripcion,
      referencia: input.referencia?.trim() || null,
      marca: input.marca?.trim() || null,
      categoria: input.categoria?.trim() || null,
      ubicacion: input.ubicacion?.trim() || null,
      cantidad: saldo,
      costo_unitario: input.costoUnitario != null ? num(input.costoUnitario) : null,
      moneda: input.moneda === 'VES' ? 'VES' : 'USD',
      stock_minimo: input.stockMinimo != null ? num(input.stockMinimo) : 0,
      notas: input.notas?.trim() || null,
      creado_por: user.id,
    }).select('id').single()
    if (insErr || !nuevo) return { error: 'No se pudo crear el repuesto' }
    itemId = nuevo.id
  }

  await admin.from('almacen_movimientos').insert({
    item_id: itemId,
    tipo: 'entrada',
    cantidad: cant,
    solicitud_id: input.solicitudId ?? null,
    referencia_doc: input.referenciaDoc?.trim() || null,
    costo_unitario: input.costoUnitario != null ? num(input.costoUnitario) : null,
    saldo_resultante: saldo,
    usuario_id: user.id,
    usuario_email: user.email ?? null,
    notas: input.notas?.trim() || null,
  })

  revalidatePath('/repuestos/almacen')
  return { ok: true, itemId: itemId ?? undefined }
}

export type TransferenciaInput = {
  itemId: string
  cantidad: number
  tallerDestino: TallerKey
  motivo?: string | null
  notas?: string | null
}

// Salida del almacén hacia un taller (La Oriental / Ki Auto / Autosurca).
// Descuenta el stock y deja la transferencia en la bitácora.
export async function transferirATaller(input: TransferenciaInput): Promise<{ ok?: boolean; error?: string }> {
  const auth = await requireStaff()
  if ('error' in auth) return { error: auth.error }
  const { user } = auth

  const cant = num(input.cantidad)
  if (!(cant > 0)) return { error: 'La cantidad debe ser mayor a 0' }
  const taller = TALLERES.find(t => t.key === input.tallerDestino)
  if (!taller) return { error: 'Selecciona el taller destino' }

  const admin = await createAdminClient()
  const { data: it } = await admin.from('almacen_items').select('id, descripcion, cantidad, costo_unitario').eq('id', input.itemId).maybeSingle()
  if (!it) return { error: 'El repuesto no existe en el almacén' }
  const disponible = num(it.cantidad)
  if (cant > disponible) return { error: `Solo hay ${disponible} en stock` }

  const saldo = r2(disponible - cant)
  await admin.from('almacen_items').update({ cantidad: saldo, updated_at: new Date().toISOString() }).eq('id', input.itemId)

  await admin.from('almacen_movimientos').insert({
    item_id: input.itemId,
    tipo: 'transferencia',
    cantidad: cant,
    taller_destino: input.tallerDestino,
    motivo: input.motivo?.trim() || null,
    costo_unitario: it.costo_unitario != null ? num(it.costo_unitario) : null,
    saldo_resultante: saldo,
    usuario_id: user.id,
    usuario_email: user.email ?? null,
    notas: input.notas?.trim() || null,
  })

  revalidatePath('/repuestos/almacen')
  return { ok: true }
}

export type AjusteInput = {
  itemId: string
  nuevaCantidad: number
  motivo?: string | null
}

// Ajuste de inventario (corrección de conteo físico).
export async function ajustarStock(input: AjusteInput): Promise<{ ok?: boolean; error?: string }> {
  const auth = await requireStaff()
  if ('error' in auth) return { error: auth.error }
  const { user } = auth

  const nueva = num(input.nuevaCantidad)
  if (nueva < 0) return { error: 'La cantidad no puede ser negativa' }
  const admin = await createAdminClient()
  const { data: it } = await admin.from('almacen_items').select('id, cantidad').eq('id', input.itemId).maybeSingle()
  if (!it) return { error: 'El repuesto no existe en el almacén' }

  const antes = num(it.cantidad)
  const delta = r2(nueva - antes)
  await admin.from('almacen_items').update({ cantidad: nueva, updated_at: new Date().toISOString() }).eq('id', input.itemId)

  await admin.from('almacen_movimientos').insert({
    item_id: input.itemId,
    tipo: 'ajuste',
    cantidad: Math.abs(delta),
    motivo: (input.motivo?.trim() || `Ajuste de conteo (${antes} → ${nueva})`),
    saldo_resultante: nueva,
    usuario_id: user.id,
    usuario_email: user.email ?? null,
  })

  revalidatePath('/repuestos/almacen')
  return { ok: true }
}

export type EditarItemInput = {
  itemId: string
  descripcion?: string
  referencia?: string | null
  marca?: string | null
  categoria?: string | null
  ubicacion?: string | null
  costoUnitario?: number | null
  moneda?: 'USD' | 'VES'
  stockMinimo?: number | null
  notas?: string | null
}

export async function editarItem(input: EditarItemInput): Promise<{ ok?: boolean; error?: string }> {
  const auth = await requireStaff()
  if ('error' in auth) return { error: auth.error }
  const admin = await createAdminClient()

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.descripcion != null) { const d = input.descripcion.trim(); if (!d) return { error: 'La descripción no puede quedar vacía' }; patch.descripcion = d }
  if (input.referencia !== undefined) patch.referencia = input.referencia?.trim() || null
  if (input.marca !== undefined) patch.marca = input.marca?.trim() || null
  if (input.categoria !== undefined) patch.categoria = input.categoria?.trim() || null
  if (input.ubicacion !== undefined) patch.ubicacion = input.ubicacion?.trim() || null
  if (input.costoUnitario !== undefined) patch.costo_unitario = input.costoUnitario != null ? num(input.costoUnitario) : null
  if (input.moneda !== undefined) patch.moneda = input.moneda === 'VES' ? 'VES' : 'USD'
  if (input.stockMinimo !== undefined) patch.stock_minimo = input.stockMinimo != null ? num(input.stockMinimo) : 0
  if (input.notas !== undefined) patch.notas = input.notas?.trim() || null

  const { error } = await admin.from('almacen_items').update(patch).eq('id', input.itemId)
  if (error) return { error: 'No se pudo guardar' }
  revalidatePath('/repuestos/almacen')
  return { ok: true }
}

export async function eliminarItem(itemId: string): Promise<{ ok?: boolean; error?: string }> {
  const auth = await requireStaff()
  if ('error' in auth) return { error: auth.error }
  const admin = await createAdminClient()
  // Baja lógica: no se pierde la bitácora.
  const { error } = await admin.from('almacen_items').update({ activo: false, updated_at: new Date().toISOString() }).eq('id', itemId)
  if (error) return { error: 'No se pudo eliminar' }
  revalidatePath('/repuestos/almacen')
  return { ok: true }
}

export type CargaMasivaRow = {
  descripcion: string
  referencia?: string | null
  marca?: string | null
  categoria?: string | null
  ubicacion?: string | null
  cantidad: number
  costoUnitario?: number | null
  moneda?: 'USD' | 'VES'
}

// Carga inicial del inventario (el levantado por Ari). Inserta todas las filas
// como ítems con su entrada inicial en la bitácora.
export async function cargaMasiva(rows: CargaMasivaRow[]): Promise<{ ok?: boolean; creados?: number; error?: string }> {
  const auth = await requireStaff()
  if ('error' in auth) return { error: auth.error }
  const { user } = auth

  const validas = (rows ?? []).filter(r => (r.descripcion ?? '').trim())
  if (validas.length === 0) return { error: 'No hay filas válidas para cargar' }
  if (validas.length > 2000) return { error: 'Máximo 2000 filas por carga' }

  const admin = await createAdminClient()
  const nowIso = new Date().toISOString()
  const { data: insertados, error } = await admin.from('almacen_items').insert(
    validas.map(r => ({
      descripcion: r.descripcion.trim(),
      referencia: r.referencia?.trim() || null,
      marca: r.marca?.trim() || null,
      categoria: r.categoria?.trim() || null,
      ubicacion: r.ubicacion?.trim() || null,
      cantidad: num(r.cantidad),
      costo_unitario: r.costoUnitario != null ? num(r.costoUnitario) : null,
      moneda: r.moneda === 'VES' ? 'VES' : 'USD',
      creado_por: user.id,
      created_at: nowIso,
    }))
  ).select('id, cantidad')

  if (error || !insertados) return { error: 'No se pudo cargar el inventario' }

  const movs = insertados
    .filter(it => num(it.cantidad) > 0)
    .map(it => ({
      item_id: it.id,
      tipo: 'entrada' as const,
      cantidad: num(it.cantidad),
      motivo: 'Carga inicial de inventario',
      saldo_resultante: num(it.cantidad),
      usuario_id: user.id,
      usuario_email: user.email ?? null,
    }))
  if (movs.length > 0) await admin.from('almacen_movimientos').insert(movs)

  revalidatePath('/repuestos/almacen')
  return { ok: true, creados: insertados.length }
}
