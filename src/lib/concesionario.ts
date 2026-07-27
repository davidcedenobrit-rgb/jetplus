import { getLogoBase64, getSelloBase64 } from './cotizacion-logo'

export interface ConcesionarioIdentity {
  id: string
  nombre: string
  rif: string | null
  direccion: string | null
  telefono: string | null
  correo: string | null
  logoSrc?: string
  selloSrc?: string
  colorPrimario: string
  colorSecundario: string
}

// Colores TOP por defecto (La Oriental): rojo + negro.
export const PDF_COLOR_PRIMARIO = '#C41E3A'
export const PDF_COLOR_SECUNDARIO = '#111827'

const LA_ORIENTAL_FALLBACK = {
  id: 'la-oriental',
  nombre: 'LA ORIENTAL AUTOMOTORS, C.A.',
  rif: 'J-505692143',
  direccion: 'AV. UGARTE ALIRIO PELYO · CENTRO PROFESIONAL DAVID\nMATURÍN - MONAGAS - VENEZUELA',
  telefono: '0414-9989010',
  correo: 'laorientalautomotorsc@gmail.com',
  logo_url: null as string | null,
}

async function fetchLogoBase64(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url)
    if (!res.ok) return undefined
    const contentType = res.headers.get('content-type') || 'image/png'
    const buf = Buffer.from(await res.arrayBuffer())
    return `data:${contentType};base64,${buf.toString('base64')}`
  } catch {
    return undefined
  }
}

/**
 * Carga la identidad de un concesionario (nombre legal, RIF, dirección, etc.)
 * y su logo listo para incrustar en el PDF de la cotización. Si no se encuentra,
 * cae en La Oriental (comportamiento actual).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getConcesionarioIdentity(supabase: any, id: string | null): Promise<ConcesionarioIdentity> {
  const cid = id || 'la-oriental'
  const { data } = await supabase
    .from('concesionarios')
    .select('id, nombre, rif, direccion, telefono, correo, logo_url, sello_url, color_primario, color_secundario')
    .eq('id', cid)
    .maybeSingle()

  const row = data ?? LA_ORIENTAL_FALLBACK

  let logoSrc: string | undefined
  let selloSrc: string | undefined
  if (row.id === 'la-oriental') {
    logoSrc = getLogoBase64()
    // La Oriental usa su sello local; si cargaron uno en BD, tiene prioridad.
    selloSrc = (row as any).sello_url ? await fetchLogoBase64((row as any).sello_url) : getSelloBase64()
  } else {
    if (row.logo_url) logoSrc = await fetchLogoBase64(row.logo_url)
    if ((row as any).sello_url) selloSrc = await fetchLogoBase64((row as any).sello_url)
  }

  return {
    id: row.id,
    nombre: row.nombre,
    rif: row.rif,
    direccion: row.direccion,
    telefono: row.telefono,
    correo: row.correo,
    logoSrc,
    selloSrc,
    colorPrimario: (row as any).color_primario || PDF_COLOR_PRIMARIO,
    colorSecundario: (row as any).color_secundario || PDF_COLOR_SECUNDARIO,
  }
}
