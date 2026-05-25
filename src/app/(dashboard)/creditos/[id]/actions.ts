'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const ROL_DIRECTOR = ['jose', 'admin', 'director']

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

  // Eliminar registros cuota_ingresos vinculados
  await supabase.from('cuota_ingresos').delete().eq('cuota_id', cuotaId)

  // Resetear la cuota a pendiente
  const { error: cuotaErr } = await supabase.from('cuotas').update({
    estado: 'pendiente',
    fecha_pago: null,
    monto_pagado: 0,
  }).eq('id', cuotaId)

  if (cuotaErr) return { error: cuotaErr.message }

  // Restaurar saldo del crédito
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
  return { ok: true }
}
