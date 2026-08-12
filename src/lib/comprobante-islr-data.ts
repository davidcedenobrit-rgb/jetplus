import type { ComprobanteIslrData } from './comprobante-islr-pdf'
/* eslint-disable @typescript-eslint/no-explicit-any */

const fmtNum = (n: number) => Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Arma los datos del comprobante de retención de ISLR a partir de un egreso.
export async function buildComprobanteIslrData(admin: any, egreso: any): Promise<ComprobanteIslrData> {
  const { data: conc } = await admin.from('concesionarios').select('nombre, rif, direccion').eq('id', 'jetplus').maybeSingle()

  let sujetoNombre = egreso.beneficiario ?? '—'
  let sujetoRif = egreso.cedula_rif_benef ?? '—'
  let sujetoDireccion = egreso.beneficiario_direccion ? String(egreso.beneficiario_direccion).trim() : ''
  if (egreso.proveedor_id) {
    const { data: prov } = await admin.from('proveedores').select('nombre, rif, direccion').eq('id', egreso.proveedor_id).maybeSingle()
    if (prov) {
      sujetoNombre = prov.nombre ?? sujetoNombre
      sujetoRif = prov.rif ?? sujetoRif
      if (prov.direccion && String(prov.direccion).trim()) sujetoDireccion = String(prov.direccion).trim()
    }
  }

  const periodo: string = egreso.ret_islr_periodo ?? ''
  const anio = periodo.slice(0, 4)
  const mes = periodo.slice(4, 6)
  const pct = Number(egreso.ret_islr_pct) || 0
  const sustraendo = Number(egreso.ret_islr_sustraendo) || 0
  const pctLabel = sustraendo > 0 ? `${pct}%- ${fmtNum(sustraendo)}` : `${pct}%`
  const montoTotal = Number(egreso.monto ?? 0)
  const valorRetencion = Number(egreso.ret_islr_monto ?? 0)

  return {
    numeroComprobante: egreso.ret_islr_comprobante ?? '',
    fechaEmision: egreso.ret_islr_fecha_emision ?? egreso.fecha_egreso,
    periodoLabel: `${mes}-${anio}`,
    agenteNombre: conc?.nombre ?? 'JETPLUS',
    agenteRif: conc?.rif ?? '',
    agenteDireccion: (conc?.direccion ?? '').replace(/\n/g, ' '),
    sujetoNombre,
    sujetoRif,
    sujetoDireccion,
    codigo: egreso.ret_islr_codigo ?? '',
    concepto: egreso.ret_islr_concepto ?? '',
    pctLabel,
    fechaFactura: egreso.fecha_factura ?? '',
    numeroFactura: egreso.numero_factura ?? '',
    numeroControl: egreso.numero_control ?? '',
    montoTotal,
    base: Number(egreso.ret_islr_base ?? 0),
    valorRetencion,
    totalPagar: montoTotal - valorRetencion,
    moneda: egreso.moneda === 'VES' ? 'Bs' : (egreso.moneda ?? 'USD'),
  }
}
