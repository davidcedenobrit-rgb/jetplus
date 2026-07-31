// Porcentaje del carro que va a CONTABILIDAD en el plan Asegúrate $500.
// Reglas (definidas por dirección):
//   - MG3 sincrónico (manual / MT)  → 4%
//   - T60 Comfort 4x2               → 4%
//   - Todo el resto de los carros   → 5%
// La base de cálculo es la sumatoria de la cuota 1 a la cuota 5 (mensuales,
// sin incluir la reserva de $500 que va a la bóveda).
export function porcentajeContabilidadAC500(marca?: string | null, modelo?: string | null): number {
  const m = `${marca ?? ''} ${modelo ?? ''}`.toUpperCase()

  // MG3 sincrónico = caja manual (MT). El automático (AT) va a 5%.
  const esMG3 = m.includes('MG3')
  const esManual = /\bMT\b/.test(m) || m.includes('SINCRON') || m.includes('MANUAL')
  if (esMG3 && esManual) return 4

  // T60 Comfort 4x2 (los demás T60 — 4x4, cabina sencilla — van a 5%).
  const esT60 = m.includes('T60')
  const esComfort = m.includes('COMFORT')
  const es4x2 = /\b4\s*X\s*2\b/.test(m) || m.includes('4X2')
  if (esT60 && esComfort && es4x2) return 4

  return 5
}

// Suma de la cuota 1 a la cuota 5 (base para el %). `cuotas` es el arreglo
// de cuotas base de la proforma (c1..c5 en el plan de 6 meses).
export function baseContabilidadAC500(cuotas: unknown): number {
  const arr = Array.isArray(cuotas) ? cuotas.map(x => Number(x) || 0) : []
  const base = arr.slice(0, 5).reduce((s, n) => s + n, 0)
  return Math.round(base * 100) / 100
}
