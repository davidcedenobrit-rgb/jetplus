// Desglose de IVA. `monto` en el sistema es siempre el TOTAL pagado; cuando el
// registro lleva IVA, base + iva = total. Alícuota general de Venezuela: 16%.
export const IVA_TASA_DEFAULT = 16

export type DesgloseIva = { base: number; iva: number }

// Separa un total en base imponible + IVA para una alícuota dada.
export function desglosarIva(total: number, tasa: number): DesgloseIva {
  if (!(total > 0) || !(tasa > 0)) return { base: round2(total > 0 ? total : 0), iva: 0 }
  const base = round2(total / (1 + tasa / 100))
  const iva = round2(total - base)
  return { base, iva }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
