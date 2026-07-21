// Concesionarios aliados con base de datos propia (proyecto Supabase aparte).
// Las llaves se configuran por variables de entorno en el proyecto de La Oriental.
// Solo se listan los que tengan su conexión realmente configurada.

export type ConcesionarioExterno = { key: string; label: string; url: string; serviceKey: string }

// Cada aliado se activa cuando tenga configuradas sus variables de entorno
// (URL + service key). Mientras no estén, no aparece (no rompe la venta normal).
const DEFINICIONES: { key: string; label: string; envUrl: string; envKey: string }[] = [
  { key: 'ki_auto', label: 'Ki Auto', envUrl: 'CONCESIONARIO_KIAUTO_URL', envKey: 'CONCESIONARIO_KIAUTO_SERVICE_KEY' },
  { key: 'autosurca', label: 'Autosurca', envUrl: 'CONCESIONARIO_AUTOSURCA_URL', envKey: 'CONCESIONARIO_AUTOSURCA_SERVICE_KEY' },
  { key: 'capital_motors', label: 'Capital Motors', envUrl: 'CONCESIONARIO_CAPITALMOTORS_URL', envKey: 'CONCESIONARIO_CAPITALMOTORS_SERVICE_KEY' },
]

export function listaConcesionariosExternos(): ConcesionarioExterno[] {
  const out: ConcesionarioExterno[] = []
  for (const d of DEFINICIONES) {
    const url = process.env[d.envUrl]
    const serviceKey = process.env[d.envKey]
    if (url && serviceKey) out.push({ key: d.key, label: d.label, url, serviceKey })
  }
  return out
}

export function concesionarioExternoPorKey(key: string): ConcesionarioExterno | null {
  return listaConcesionariosExternos().find(c => c.key === key) ?? null
}
