// Concesionarios aliados con base de datos propia (proyecto Supabase aparte).
// Las llaves se configuran por variables de entorno en el proyecto de La Oriental.
// Solo se listan los que tengan su conexión realmente configurada.

export type ConcesionarioExterno = { key: string; label: string; url: string; serviceKey: string }

export function listaConcesionariosExternos(): ConcesionarioExterno[] {
  const out: ConcesionarioExterno[] = []
  if (process.env.CONCESIONARIO_KIAUTO_URL && process.env.CONCESIONARIO_KIAUTO_SERVICE_KEY) {
    out.push({
      key: 'ki_auto',
      label: 'Ki Auto',
      url: process.env.CONCESIONARIO_KIAUTO_URL,
      serviceKey: process.env.CONCESIONARIO_KIAUTO_SERVICE_KEY,
    })
  }
  return out
}

export function concesionarioExternoPorKey(key: string): ConcesionarioExterno | null {
  return listaConcesionariosExternos().find(c => c.key === key) ?? null
}
