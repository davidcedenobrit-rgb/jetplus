'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

export type RegistrarAvisoCobroPayload = {
  clienteId: string
  origen: 'panel_cliente' | 'panel_credito' | 'reporte_cobranza'
  whatsappDestino: string
  cuotasVencidasCant: number
  cuotasProximasCant: number
  montoTotalUsd: number | null
  resumen: string
}

const ORIGEN_LABEL: Record<RegistrarAvisoCobroPayload['origen'], string> = {
  panel_cliente: 'Panel del cliente',
  panel_credito: 'Panel de crédito',
  reporte_cobranza: 'Reporte de cobranza',
}

export async function registrarAvisoCobro(payload: RegistrarAvisoCobroPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const registradoPor = (user.user_metadata as any)?.nombre ?? user.email ?? 'Sistema'

  const partesNotas = [
    `Origen: ${ORIGEN_LABEL[payload.origen]}`,
    `WhatsApp: ${payload.whatsappDestino}`,
    payload.cuotasProximasCant > 0 ? `Próximas a vencer: ${payload.cuotasProximasCant}` : null,
    payload.resumen,
  ].filter(Boolean)

  const admin = await createAdminClient()
  const { error } = await admin
    .from('bitacora_cobro')
    .insert({
      cliente_id: payload.clienteId,
      registrado_por: registradoPor,
      tipo_envio: 'whatsapp',
      notas: partesNotas.join('\n\n').slice(0, 2000),
      monto_vencido: payload.montoTotalUsd ?? 0,
      cuotas_vencidas: payload.cuotasVencidasCant,
    })

  if (error) return { error: 'No se pudo registrar el aviso de cobro' }
  return { ok: true }
}
