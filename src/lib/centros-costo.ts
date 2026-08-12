// Centro de costo "Vehimotors": dinero que NO es de Jetplus (cuotas de
// crédito Vehimotors y cuotas mensuales del plan Asegúrate $500 después de la
// reserva). Solo se reporta a Vehimotors; no cuenta como ingreso propio.

export const CENTRO_VEHIMOTORS = 'vehimotors'
export const CENTRO_VENTAS = 'ventas'

// Centros que NO representan dinero propio (fondos de terceros / custodia).
export const CENTROS_NO_PROPIOS = new Set<string>([CENTRO_VEHIMOTORS])

export type TitularFondos = 'propio' | 'vehimotors' | 'tercero'

// Dado el plan del crédito y el número de cuota ligada, sugiere el centro de
// costo y el titular de los fondos:
//   - inicial_la_oriental              → nuestro (Ventas)
//   - asegurate_500, cuota 0 ($500)    → nuestro (Ventas)
//   - asegurate_500, cuota >= 1        → Vehimotors (no es nuestro)
//   - financiamiento_vehimotors        → Vehimotors (no es nuestro)
//   - cuota_especial / otros / s/cuota → sin sugerencia (revisión manual)
export function centroSugerido(
  planTipo: string | null | undefined,
  numeroCuota: number | null | undefined,
): { centro: string | null; titular: TitularFondos | null; etiqueta: string } {
  if (!planTipo) return { centro: null, titular: null, etiqueta: 'Sin crédito ligado' }
  if (planTipo === 'inicial_la_oriental') return { centro: CENTRO_VENTAS, titular: 'propio', etiqueta: 'Inicial Jetplus' }
  if (planTipo === 'asegurate_500') {
    return Number(numeroCuota) === 0
      ? { centro: CENTRO_VENTAS, titular: 'propio', etiqueta: 'Reserva $500 (AC500)' }
      : { centro: CENTRO_VEHIMOTORS, titular: 'vehimotors', etiqueta: 'Cuota mensual AC500' }
  }
  if (planTipo === 'financiamiento_vehimotors') return { centro: CENTRO_VEHIMOTORS, titular: 'vehimotors', etiqueta: 'Cuota crédito Vehimotors' }
  if (planTipo === 'cuota_especial') return { centro: null, titular: null, etiqueta: 'Cuota especial (revisar)' }
  return { centro: null, titular: null, etiqueta: planTipo }
}

// ¿Una cuota es "cobrable por Jetplus"? (para cuentas por cobrar / cartera)
// Excluye las cuotas de Vehimotors y las mensuales de AC500 (solo la reserva
// $500 —cuota 0— es nuestra).
export function cuotaEsPropia(planTipo: string | null | undefined, numeroCuota: number | null | undefined): boolean {
  if (planTipo === 'financiamiento_vehimotors') return false
  if (planTipo === 'asegurate_500') return Number(numeroCuota) === 0
  return true // inicial_la_oriental, cuota_especial, servicios, etc.
}
