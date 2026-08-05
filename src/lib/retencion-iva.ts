// Utilidades para la retención de IVA en egresos (comprobante SENIAT).
/* eslint-disable @typescript-eslint/no-explicit-any */

// Período fiscal AAAAMM a partir de una fecha ISO (YYYY-MM-DD).
export function periodoDeFecha(fechaISO: string): string {
  const [y, m] = fechaISO.slice(0, 7).split('-')
  return `${y}${m}`
}

// Siguiente número de comprobante: AAAAMM (período fiscal) + correlativo de 8
// dígitos. El correlativo es CONTINUO (no se reinicia cada mes); el período
// solo antecede como prefijo. Ej.: 202608 + 00000261 → 20260800000261.
// Al cambiar de mes cambia el prefijo (202609…) y el correlativo sigue.
//
// El correlativo arranca desde un "piso" histórico configurable en
// config_cotizaciones (clave 'retencion_iva_correlativo_piso'), pensado para
// continuar el correlativo que el concesionario ya traía antes del sistema.
// A partir de ahí sigue el mayor correlativo ya emitido en los egresos.
export async function siguienteComprobante(admin: any, periodo: string): Promise<string> {
  // Piso histórico (0 si no está configurado).
  const { data: cfg } = await admin
    .from('config_cotizaciones')
    .select('valor')
    .eq('clave', 'retencion_iva_correlativo_piso')
    .maybeSingle()
  const piso = Math.trunc(Number(cfg?.valor) || 0)

  // Mayor correlativo ya emitido (todos los períodos, no solo el actual).
  const { data } = await admin
    .from('egresos')
    .select('ret_iva_comprobante')
    .not('ret_iva_comprobante', 'is', null)
  let maxSeq = 0
  for (const row of (data ?? []) as { ret_iva_comprobante: string }[]) {
    const c = row.ret_iva_comprobante
    if (c && c.length > 6) {
      const seq = parseInt(c.slice(6), 10)
      if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq
    }
  }

  const next = Math.max(piso, maxSeq) + 1
  return `${periodo}${String(next).padStart(8, '0')}`
}

// Monto retenido = IVA de la factura × (75% ó 100%).
export function calcRetIva(ivaMonto: number | null | undefined, pct: number | null | undefined): number {
  const iva = Number(ivaMonto) || 0
  const p = Number(pct) || 0
  return Math.round(iva * p) / 100
}
