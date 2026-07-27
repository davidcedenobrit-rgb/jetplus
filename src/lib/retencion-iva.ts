// Utilidades para la retención de IVA en egresos (comprobante SENIAT).
/* eslint-disable @typescript-eslint/no-explicit-any */

// Período fiscal AAAAMM a partir de una fecha ISO (YYYY-MM-DD).
export function periodoDeFecha(fechaISO: string): string {
  const [y, m] = fechaISO.slice(0, 7).split('-')
  return `${y}${m}`
}

// Siguiente número de comprobante para un período: AAAAMM + secuencial de 8
// dígitos (formato estándar del comprobante de retención de IVA).
export async function siguienteComprobante(admin: any, periodo: string): Promise<string> {
  const { data } = await admin
    .from('egresos')
    .select('ret_iva_comprobante')
    .eq('ret_iva_periodo', periodo)
    .not('ret_iva_comprobante', 'is', null)
    .order('ret_iva_comprobante', { ascending: false })
    .limit(1)
  let next = 1
  const last: string | undefined = data?.[0]?.ret_iva_comprobante
  if (last && last.length >= 14) {
    const seq = parseInt(last.slice(6), 10)
    if (Number.isFinite(seq)) next = seq + 1
  }
  return `${periodo}${String(next).padStart(8, '0')}`
}

// Monto retenido = IVA de la factura × (75% ó 100%).
export function calcRetIva(ivaMonto: number | null | undefined, pct: number | null | undefined): number {
  const iva = Number(ivaMonto) || 0
  const p = Number(pct) || 0
  return Math.round(iva * p) / 100
}
