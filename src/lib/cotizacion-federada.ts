// Resuelve una cotización por id buscando primero en la base local y, si no
// está, en las bases de las otras sedes del grupo (cada una con su propia BD).
// Devuelve el cliente de la base donde vive, para poder leer/escribir en la
// correcta desde el panel central (reenviar, editar, etc.).
import { createAdminClient } from '@/lib/supabase/server'
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'
import { listaConcesionariosExternos, type ConcesionarioExterno } from '@/lib/concesionarios-externos'

// CANDADO DE VISIBILIDAD: solo el deployment MATRIZ (La Oriental / dirección)
// puede ver/gestionar las cotizaciones y proformas de las OTRAS sedes. En los
// deployments de las sedes (Autosurca, Ki Auto) esta bandera NO existe, así que
// solo ven lo suyo — nunca La Oriental ni entre ellas.
// (La cartera de clientes compartida es aparte y NO usa este candado.)
export function esPanelMatriz(): boolean {
  const v = String(process.env.PANEL_MATRIZ ?? '').trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'si' || v === 'yes'
}

// Sedes externas visibles para el panel de gestión: vacío si no es la matriz.
export function sedesExternas(): ConcesionarioExterno[] {
  return esPanelMatriz() ? listaConcesionariosExternos() : []
}

export type CotizacionResuelta = { db: SupabaseClient; cot: any; externo: ConcesionarioExterno | null }

export async function resolverCotizacionDB(id: string): Promise<CotizacionResuelta | null> {
  const local = await createAdminClient()
  const { data } = await local.from('cotizaciones').select('*').eq('id', id).maybeSingle()
  if (data) return { db: local, cot: data, externo: null }

  for (const a of sedesExternas()) {
    try {
      const db = createServiceClient(a.url, a.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
      const { data: ext } = await db.from('cotizaciones').select('*').eq('id', id).maybeSingle()
      if (ext) return { db, cot: ext, externo: a }
    } catch { /* sede no disponible: se ignora y se sigue con la siguiente */ }
  }
  return null
}

// Devuelve solo el cliente de la base donde vive la cotización (local o sede).
// Útil para endpoints que solo necesitan operar contra esa base (showroom,
// anticipos) sin la cotización en sí.
export async function dbDeCotizacion(id: string): Promise<SupabaseClient | null> {
  const r = await resolverCotizacionDB(id)
  return r?.db ?? null
}

// Todas las bases del grupo (local + sedes) para listados federados.
export async function basesFederadas(): Promise<{ db: SupabaseClient; externo: ConcesionarioExterno | null }[]> {
  const local = await createAdminClient()
  const out: { db: SupabaseClient; externo: ConcesionarioExterno | null }[] = [{ db: local, externo: null }]
  for (const a of sedesExternas()) {
    try {
      out.push({ db: createServiceClient(a.url, a.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }), externo: a })
    } catch { /* sede no disponible */ }
  }
  return out
}

export type PrecompraResuelta = { db: SupabaseClient; proforma: any; externo: ConcesionarioExterno | null }

// Resuelve una proforma de precompra (AC500) por id: base local o la de la sede.
export async function resolverPrecompraProformaDB(id: string): Promise<PrecompraResuelta | null> {
  const local = await createAdminClient()
  const { data } = await local.from('precompra_proformas').select('*').eq('id', id).maybeSingle()
  if (data) return { db: local, proforma: data, externo: null }

  for (const a of sedesExternas()) {
    try {
      const db = createServiceClient(a.url, a.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
      const { data: ext } = await db.from('precompra_proformas').select('*').eq('id', id).maybeSingle()
      if (ext) return { db, proforma: ext, externo: a }
    } catch { /* sede no disponible */ }
  }
  return null
}

export type ProformaResuelta = { db: SupabaseClient; proforma: any; externo: ConcesionarioExterno | null }

// Igual que resolverCotizacionDB pero para una proforma por id.
export async function resolverProformaDB(id: string): Promise<ProformaResuelta | null> {
  const local = await createAdminClient()
  const { data } = await local.from('proformas').select('*').eq('id', id).maybeSingle()
  if (data) return { db: local, proforma: data, externo: null }

  for (const a of sedesExternas()) {
    try {
      const db = createServiceClient(a.url, a.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
      const { data: ext } = await db.from('proformas').select('*').eq('id', id).maybeSingle()
      if (ext) return { db, proforma: ext, externo: a }
    } catch { /* sede no disponible */ }
  }
  return null
}
