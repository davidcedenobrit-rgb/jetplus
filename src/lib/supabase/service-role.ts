import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Cliente Supabase con service_role_key SIN cookies.
 * Uso: para operaciones administrativas puras (crear usuarios,
 * saltar RLS, etc.). No debe recibir cookies del navegador ni
 * intentar autenticar como el user actual.
 */
export function serviceRoleClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
