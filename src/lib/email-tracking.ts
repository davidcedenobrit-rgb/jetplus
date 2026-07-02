import { createAdminClient } from '@/lib/supabase/server'

export type EntidadEmail =
  | 'cotizacion'
  | 'proforma'
  | 'solicitud_repuesto'
  | 'reporte_vehimotors'
  | 'ingreso'
  | 'cobro'
  | 'otro'

const TABLA_POR_ENTIDAD: Partial<Record<EntidadEmail, string>> = {
  cotizacion: 'cotizaciones',
  proforma: 'proformas',
  solicitud_repuesto: 'solicitudes_repuestos',
  reporte_vehimotors: 'reportes_vehimotors',
}

interface RegistrarEnvioOpts {
  resendEmailId: string
  entidadTipo: EntidadEmail
  entidadId?: string | null
  destinatarios: string[]
  asunto: string
  metadata?: Record<string, unknown>
}

/**
 * Registra un envío de correo:
 *  - Inserta un evento 'sent' en email_eventos.
 *  - Si la entidad soporta columnas de tracking, guarda resend_email_id + estado.
 *
 * Nunca lanza. Si algo falla, lo logea y devuelve.
 */
export async function registrarEnvioEmail(opts: RegistrarEnvioOpts): Promise<void> {
  const { resendEmailId, entidadTipo, entidadId, destinatarios, asunto, metadata } = opts
  if (!resendEmailId) return

  try {
    const supabase = await createAdminClient()

    await supabase.from('email_eventos').insert([{
      resend_email_id: resendEmailId,
      entidad_tipo: entidadTipo,
      entidad_id: entidadId ?? null,
      evento: 'sent',
      destinatarios,
      asunto,
      metadata: metadata ?? {},
      event_timestamp: new Date().toISOString(),
    }])

    const tabla = TABLA_POR_ENTIDAD[entidadTipo]
    if (tabla && entidadId) {
      await supabase.from(tabla).update({
        resend_email_id: resendEmailId,
        email_ultimo_estado: 'sent',
        email_ultimo_evento_at: new Date().toISOString(),
      }).eq('id', entidadId)
    }
  } catch (err) {
    console.error('[email-tracking] error al registrar envio:', err)
  }
}

/**
 * Extrae el id de un resultado de Resend `.emails.send(...)`.
 * Devuelve null si no encuentra un id útil.
 */
export function extraerResendId(result: unknown): string | null {
  if (!result || typeof result !== 'object') return null
  const r = result as Record<string, any>
  // Nuevas versiones del SDK: { data: { id }, error }
  if (r.data?.id) return String(r.data.id)
  // Versiones anteriores: { id }
  if (r.id) return String(r.id)
  return null
}
