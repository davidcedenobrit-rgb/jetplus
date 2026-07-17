// Correos con acceso de super-administrador (navegación entre concesionarios,
// módulos en construcción como Contabilidad). Configurable por env.
export const SUPER_ADMIN_EMAILS = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS ?? 'admin@gmail.com')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

export function esSuperAdmin(email?: string | null): boolean {
  return !!email && SUPER_ADMIN_EMAILS.includes(email.toLowerCase())
}
