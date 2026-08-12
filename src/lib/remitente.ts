/**
 * Determina el nombre del remitente según email y rol del usuario logueado.
 * Usado en el mensaje de recordatorio de WhatsApp.
 */
export function getNombreRemitente(email: string | undefined, rol: string | undefined): string {
  if (!email && !rol) return 'JETPLUS'

  // Por email (más específico)
  if (email === 'admin@gmail.com' || email === 'admin@gmail.co') return 'José'
  if (email === 'davidcedenobrit@gmail.com') return 'Mary'
  if (email === 'davidcedenobrit@gmail.com') return 'Leysdem'

  // Por rol como fallback
  switch (rol) {
    case 'jose':
    case 'director':
    case 'admin':   return 'José'
    case 'mary':    return 'Mary'
    case 'leysdem': return 'Leysdem'
    case 'carla':   return 'Carla'
    case 'arianna':      return 'Arianna'
    case 'almacenista':  return 'José Manuel'
    default:        return 'JETPLUS'
  }
}
