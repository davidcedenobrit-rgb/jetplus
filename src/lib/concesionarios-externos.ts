// Concesionarios con base de datos propia (proyecto Supabase aparte).
// Las llaves se configuran por variables de entorno en cada proyecto.
// Solo se listan los que tengan su conexión realmente configurada y que NO
// sean la base local (se excluye "sí mismo" comparando la URL).

export type ConcesionarioExterno = { key: string; label: string; url: string; serviceKey: string }

// Definición de TODOS los concesionarios del grupo. Cada uno se activa cuando su
// URL + service key estén configuradas en el proyecto actual.
const DEFINICIONES: { key: string; label: string; envUrl: string; envKey: string }[] = [
  { key: 'la_oriental', label: 'La Oriental', envUrl: 'CONCESIONARIO_LAORIENTAL_URL', envKey: 'CONCESIONARIO_LAORIENTAL_SERVICE_KEY' },
  { key: 'ki_auto', label: 'Ki Auto', envUrl: 'CONCESIONARIO_KIAUTO_URL', envKey: 'CONCESIONARIO_KIAUTO_SERVICE_KEY' },
  { key: 'autosurca', label: 'Autosurca', envUrl: 'CONCESIONARIO_AUTOSURCA_URL', envKey: 'CONCESIONARIO_AUTOSURCA_SERVICE_KEY' },
  { key: 'capital_motors', label: 'Capital Motors', envUrl: 'CONCESIONARIO_CAPITALMOTORS_URL', envKey: 'CONCESIONARIO_CAPITALMOTORS_SERVICE_KEY' },
]

const norm = (u?: string | null) => String(u ?? '').trim().replace(/\/+$/, '').toLowerCase()

// Concesionarios externos (aliados) configurados, EXCLUYENDO la base local.
export function listaConcesionariosExternos(): ConcesionarioExterno[] {
  const local = norm(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const out: ConcesionarioExterno[] = []
  for (const d of DEFINICIONES) {
    const url = process.env[d.envUrl]
    const serviceKey = process.env[d.envKey]
    if (url && serviceKey && norm(url) !== local) out.push({ key: d.key, label: d.label, url, serviceKey })
  }
  return out
}

export function concesionarioExternoPorKey(key: string): ConcesionarioExterno | null {
  return listaConcesionariosExternos().find(c => c.key === key) ?? null
}
