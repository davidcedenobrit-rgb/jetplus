// Utilidades para la retención de ISLR en egresos (comprobante SENIAT).
/* eslint-disable @typescript-eslint/no-explicit-any */

// Retención de ISLR = base × % − sustraendo (nunca negativa).
//  - 055 Servicios PJ domiciliadas: 2%, sustraendo 0.
//  - 002 Actividades profesionales no mercantiles (PNR): 3% − 107,50.
export function calcRetIslr(base: number | null | undefined, pct: number | null | undefined, sustraendo: number | null | undefined): number {
  const b = Number(base) || 0
  const p = Number(pct) || 0
  const s = Number(sustraendo) || 0
  const ret = (b * p) / 100 - s
  return ret > 0 ? Math.round(ret * 100) / 100 : 0
}

// Número de comprobante ISLR: AAAA-MM-00000000 (secuencial de 8 dígitos por
// período AAAAMM). Se busca el último del período y se incrementa.
export async function siguienteComprobanteIslr(admin: any, periodo: string): Promise<string> {
  const anio = periodo.slice(0, 4)
  const mes = periodo.slice(4, 6)
  const { data } = await admin
    .from('egresos')
    .select('ret_islr_comprobante')
    .eq('ret_islr_periodo', periodo)
    .not('ret_islr_comprobante', 'is', null)
    .order('ret_islr_comprobante', { ascending: false })
    .limit(1)
  let next = 1
  const last: string | undefined = data?.[0]?.ret_islr_comprobante
  if (last) {
    const seq = parseInt(String(last).slice(-8), 10)
    if (Number.isFinite(seq)) next = seq + 1
  }
  return `${anio}-${mes}-${String(next).padStart(8, '0')}`
}
