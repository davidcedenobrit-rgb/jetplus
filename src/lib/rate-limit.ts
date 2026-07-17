import { createClient as createServiceClient } from '@supabase/supabase-js'

// Rate limiting respaldado en la base (función check_rate_limit). Devuelve true
// si la acción está permitida dentro de la ventana. Es "fail-open": si algo
// falla (sin credenciales, error de red), NO bloquea, para nunca frenar un
// flujo legítimo por un problema de infraestructura.
export async function permitido(clave: string, max: number, ventanaSeg: number): Promise<boolean> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return true
    const svc = createServiceClient(url, key)
    const { data, error } = await svc.rpc('check_rate_limit', {
      p_clave: clave,
      p_max: max,
      p_window_seconds: ventanaSeg,
    })
    if (error) return true
    return data !== false
  } catch {
    return true
  }
}
