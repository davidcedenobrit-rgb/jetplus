// Resuelve una cotización por id buscando primero en la base local y, si no
// está, en las bases de las otras sedes del grupo (cada una con su propia BD).
// Devuelve el cliente de la base donde vive, para poder leer/escribir en la
// correcta desde el panel central (reenviar, editar, etc.).
import { createAdminClient } from '@/lib/supabase/server'
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'
import { listaConcesionariosExternos, type ConcesionarioExterno } from '@/lib/concesionarios-externos'

export type CotizacionResuelta = { db: SupabaseClient; cot: any; externo: ConcesionarioExterno | null }

export async function resolverCotizacionDB(id: string): Promise<CotizacionResuelta | null> {
  const local = await createAdminClient()
  const { data } = await local.from('cotizaciones').select('*').eq('id', id).maybeSingle()
  if (data) return { db: local, cot: data, externo: null }

  for (const a of listaConcesionariosExternos()) {
    try {
      const db = createServiceClient(a.url, a.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
      const { data: ext } = await db.from('cotizaciones').select('*').eq('id', id).maybeSingle()
      if (ext) return { db, cot: ext, externo: a }
    } catch { /* sede no disponible: se ignora y se sigue con la siguiente */ }
  }
  return null
}
