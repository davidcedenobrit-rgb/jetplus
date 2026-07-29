// Gastos comunes: los egresos de un centro marcado como "común" (Administración)
// no pertenecen a una sola línea de ingreso; se reparten por un % fijo
// configurable entre los centros de ingreso (comisiones, servicio, repuestos)
// para poder ver la utilidad real por línea.

export type RepartoRow = { centro_costo_id: string; porcentaje: number }

// Distribuye un monto total de gasto común entre los centros según el reparto
// configurado. Usa la suma real de porcentajes como denominador (robusto aunque
// no sumen exactamente 100). Devuelve un mapa centro_costo_id → monto.
export function distribuirGastoComun(total: number, reparto: RepartoRow[]): Record<string, number> {
  const out: Record<string, number> = {}
  const suma = reparto.reduce((s, r) => s + Number(r.porcentaje || 0), 0)
  if (suma <= 0 || total === 0) return out
  for (const r of reparto) {
    const p = Number(r.porcentaje || 0)
    if (p > 0) out[r.centro_costo_id] = total * (p / suma)
  }
  return out
}
