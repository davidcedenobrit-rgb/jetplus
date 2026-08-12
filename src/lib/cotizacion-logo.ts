import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Logo de Jetplus recortado (archivo local, sin espacios en blanco) en
 * base64, para incrustarlo en el PDF de la cotización. Se usa como `logoSrc`.
 *
 * Importante: el logo de respaldo (URL remota) tiene whitespace alrededor y se
 * ve pequeño en el PDF. Usar SIEMPRE este helper al generar/enviar el PDF para
 * que el logo se vea al tamaño correcto.
 */
export function getLogoBase64(): string {
  try {
    const buf = readFileSync(join(process.cwd(), 'public', 'logo-jetplus.png'))
    return `data:image/png;base64,${buf.toString('base64')}`
  } catch {
    return 'https://assets.cdn.filesafe.space/XZDJ4aSOAL1crWRCXyY6/media/698367bc1dfc0253b24abd7a.png'
  }
}

/** Sello de Jetplus (archivo local) en base64, para estamparlo en el PDF. */
export function getSelloBase64(): string | undefined {
  try {
    const buf = readFileSync(join(process.cwd(), 'public', 'sello-jetplus.jpeg'))
    return `data:image/jpeg;base64,${buf.toString('base64')}`
  } catch {
    return undefined
  }
}

/**
 * Membrete full-width de VEHIMOTORS (banner con logo + fondo) en base64, para
 * usarlo como cabecera del Anexo A. Devuelve undefined si el archivo no existe
 * (en ese caso el PDF cae al header de texto).
 */
const MEMBRETE_VEHIMOTORS_URL = 'https://assets.cdn.filesafe.space/XZDJ4aSOAL1crWRCXyY6/media/6a70efff32db2dd15782dcd5.jpg'

export function getMembreteVehimotorsBase64(): string | undefined {
  // Prioridad: archivo local en public/ (más confiable, va empacado). Si no está,
  // se usa la imagen alojada en el CDN (react-pdf la descarga al generar el PDF).
  for (const [file, mime] of [['membrete-vehimotors.png', 'image/png'], ['membrete-vehimotors.jpg', 'image/jpeg']] as const) {
    try {
      const buf = readFileSync(join(process.cwd(), 'public', file))
      return `data:${mime};base64,${buf.toString('base64')}`
    } catch { /* sigue */ }
  }
  return MEMBRETE_VEHIMOTORS_URL
}
