'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const DIR = ['jose', 'admin', 'director', 'mary', 'leysdem']
// Solo se puede editar mientras no esté aprobado/pagado.
const EDITABLE = ['registrado', 'pendiente_aprobacion', 'correccion_requerida']

export type EditarEgresoPayload = {
  categoria: string
  concepto: string
  descripcion: string | null
  monto: number
  moneda: 'USD' | 'VES'
  tasa_cambio: number | null
  metodo_pago: string | null
  banco_origen: string | null
  banco_destino: string | null
  beneficiario: string | null
  cedula_rif_benef: string | null
  beneficiario_direccion: string | null
  proveedor_id: string | null
  referencia: string | null
  fecha_egreso: string
  centro_costo_id: string | null
  area_responsable: string | null
  origen_capital: string | null
  tipo_movimiento: 'gasto' | 'inversion'
  observaciones: string | null
}

export async function editarEgreso(id: string, p: EditarEgresoPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  const rol = (user.app_metadata?.rol as string) ?? ''

  const admin = await createAdminClient()
  const { data: actual } = await admin.from('egresos').select('registrado_por, estado').eq('id', id).maybeSingle()
  if (!actual) return { error: 'Egreso no encontrado' }
  if (!DIR.includes(rol) && actual.registrado_por !== user.id) return { error: 'Sin permisos para editar este egreso' }
  if (!EDITABLE.includes(actual.estado)) return { error: 'Solo se puede editar mientras esté en registro, pendiente o corrección.' }

  const monto = Number(p.monto)
  if (!p.categoria) return { error: 'Selecciona una categoría' }
  if (isNaN(monto) || monto <= 0) return { error: 'El monto debe ser mayor a 0' }
  if (!p.concepto?.trim()) return { error: 'El concepto es requerido' }

  const tasa = p.tasa_cambio && p.tasa_cambio > 0 ? p.tasa_cambio : null
  const montoBs = (tasa && p.moneda !== 'VES') ? Math.round(monto * tasa * 100) / 100 : null

  const { error } = await admin.from('egresos').update({
    categoria: p.categoria,
    concepto: p.concepto.trim(),
    descripcion: p.descripcion?.trim() || null,
    monto,
    moneda: p.moneda,
    tasa_cambio: tasa,
    monto_bs: montoBs,
    metodo_pago: p.metodo_pago || null,
    banco_origen: p.banco_origen || null,
    banco_destino: p.banco_destino?.trim() || null,
    beneficiario: p.beneficiario?.trim() || null,
    cedula_rif_benef: p.cedula_rif_benef?.trim() || null,
    beneficiario_direccion: p.beneficiario_direccion?.trim() || null,
    proveedor_id: p.proveedor_id || null,
    referencia: p.referencia?.trim() || null,
    fecha_egreso: p.fecha_egreso,
    centro_costo_id: p.centro_costo_id || null,
    area_responsable: p.area_responsable || null,
    origen_capital: p.origen_capital?.trim() || null,
    tipo_movimiento: p.tipo_movimiento === 'inversion' ? 'inversion' : 'gasto',
    observaciones: p.observaciones?.trim() || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) return { error: error.message }

  // Anclar dirección/banco al proveedor (misma regla que al crear).
  if (p.proveedor_id) {
    const prov: Record<string, string> = {}
    if (p.beneficiario_direccion?.trim()) prov.direccion = p.beneficiario_direccion.trim()
    if (p.banco_destino?.trim()) prov.banco = p.banco_destino.trim()
    if (Object.keys(prov).length) await admin.from('proveedores').update(prov).eq('id', p.proveedor_id)
  }

  revalidatePath(`/egresos/${id}`); revalidatePath('/egresos')
  return { ok: true }
}
