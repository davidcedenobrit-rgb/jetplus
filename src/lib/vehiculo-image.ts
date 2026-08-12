const IMAGENES_MODELO: Array<[RegExp, string]> = [
  [/\bMG\s*3\b/i, '/vehiculos/mg3.png'],
  [/\bMG\s*5\b/i, '/vehiculos/mg5.png'],
  [/\b(?:MG\s*)?RX\s*5\b/i, '/vehiculos/mg-rx5.png'],
  [/\b(?:MG\s*)?RX\s*9\b/i, '/vehiculos/rx9.png'],
  [/\b(?:MAXUS\s*)?T\s*60\b/i, '/vehiculos/maxus-t60.png'],
  [/(?:\b(?:NEW|NUEVA?)\b.*\bMG\s*ZS\b|\bMG\s*ZS\b.*\b(?:NEW|NUEVA?)\b)/i, '/vehiculos/mg-zs-new.png'],
  [/\b(?:MG\s*)?ZS\b.*\b(?:MT|SINCRONICA|CLASICA)\b/i, '/vehiculos/mg-zs-clasica-sincronica.png'],
]

function normalizarModelo(modelo: string) {
  return modelo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_/]+/g, ' ')
}

/** Foto local aprobada para el modelo; conserva img_url para el resto del catálogo. */
export function imagenVehiculo(modelo: string, imgUrl?: string | null) {
  const nombre = normalizarModelo(modelo)
  return IMAGENES_MODELO.find(([patron]) => patron.test(nombre))?.[1] ?? imgUrl ?? null
}
