'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const ROL_DIRECTOR = ['jose', 'admin', 'director', 'mary', 'leysdem']

export async function revertirPagoCuota(cuotaId: string, creditoId: string, montoRevertir: number) {
  const supabase = await createClient()

  // Verificar que el usuario es director
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!usuario || !ROL_DIRECTOR.includes(usuario.rol)) {
    return { error: 'Sin permiso — solo directores pueden revertir pagos' }
  }

  // 1. Obtener los ingresos vinculados a esta cuota ANTES de borrar los vínculos
  const { data: vinculos } = await supabase
    .from('cuota_ingresos')
    .select('ingreso_id')
    .eq('cuota_id', cuotaId)

  const ingresoIds = (vinculos ?? []).map((v: any) => v.ingreso_id as string)

  // 2. Eliminar vínculos cuota_ingresos de esta cuota
  await supabase.from('cuota_ingresos').delete().eq('cuota_id', cuotaId)

  // 3. Para cada ingreso vinculado: si ya no tiene NINGUNA cuota activa, eliminarlo completamente
  for (const ingresoId of ingresoIds) {
    const { count } = await supabase
      .from('cuota_ingresos')
      .select('*', { count: 'exact', head: true })
      .eq('ingreso_id', ingresoId)

    if ((count ?? 0) === 0) {
      // Sin más cuotas vinculadas → limpiar archivos y eliminar el ingreso
      await supabase.from('archivos').delete().eq('ingreso_id', ingresoId)
      await supabase.from('ingresos').delete().eq('id', ingresoId)
    }
  }

  // 4. Resetear la cuota a pendiente
  const { error: cuotaErr } = await supabase.from('cuotas').update({
    estado: 'pendiente',
    fecha_pago: null,
    monto_pagado: 0,
  }).eq('id', cuotaId)

  if (cuotaErr) return { error: cuotaErr.message }

  // 5. Restaurar saldo del crédito
  const { data: credito } = await supabase
    .from('creditos').select('saldo, monto_financiado').eq('id', creditoId).single()

  if (credito) {
    const saldoRestaurado = Math.min(Number(credito.monto_financiado), Number(credito.saldo) + montoRevertir)
    await supabase.from('creditos').update({
      saldo: saldoRestaurado,
      estado: 'activo',
      updated_at: new Date().toISOString(),
    }).eq('id', creditoId)
  }

  revalidatePath('/creditos/[id]', 'page')
  revalidatePath('/ingresos', 'page')
  return { ok: true }
}
