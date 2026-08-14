import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

// Cliente de servicio (bypassa RLS). A propósito NO usa createServerClient
// de @supabase/ssr: ese cliente está atado a las cookies de sesión, y si
// quien llama al endpoint tiene sesión activa (un miembro del staff logueado
// en el panel), @supabase/ssr prioriza el token de ESA sesión sobre la
// service role key pasada — el "admin client" terminaba autenticando como el
// usuario logueado (rol authenticated) y RLS SÍ se aplicaba, en vez de
// bypasearse. Con el cliente plano de @supabase/supabase-js (sin cookies) la
// service role key siempre se usa tal cual.
export async function createAdminClient() {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}