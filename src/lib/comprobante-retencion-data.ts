import type { ComprobanteRetencionData } from './comprobante-retencion-pdf'
/* eslint-disable @typescript-eslint/no-explicit-any */

const MESES = ['', 'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']

// Arma los datos del comprobante de retención de IVA a partir de un egreso.
// `admin` es un cliente de Supabase con service role.
export async function buildComprobanteData(admin: any, egreso: any): Promise<ComprobanteRetencionData> {
  const { data: conc } = await admin.from('concesionarios').select('nombre, rif, direccion').eq('id', 'la-oriental').maybeSingle()

  let sujetoNombre = egreso.beneficiario ?? '—'
  let sujetoRif = egreso.cedula_rif_benef ?? '—'
  // La dirección va ANCLADA al proveedor: la del proveedor manda; solo si el
  // proveedor no tiene, se usa la capturada en el egreso como respaldo.
  let sujetoDireccion = egreso.beneficiario_direccion ? String(egreso.beneficiario_direccion).trim() : ''
  if (egreso.proveedor_id) {
    const { data: prov } = await admin.from('proveedores').select('nombre, rif, direccion').eq('id', egreso.proveedor_id).maybeSingle()
    if (prov) {
      sujetoNombre = prov.nombre ?? sujetoNombre
      sujetoRif = prov.rif ?? sujetoRif
      if (prov.direccion && String(prov.direccion).trim()) sujetoDireccion = String(prov.direccion).trim()
    }
  }

  const periodo: string = egreso.ret_iva_periodo ?? ''
  const mesNum = parseInt(periodo.slice(4, 6), 10)

  return {
    numeroComprobante: egreso.ret_iva_comprobante ?? '',
    fechaEmision: egreso.ret_iva_fecha_emision ?? egreso.fecha_egreso,
    periodoAnio: periodo.slice(0, 4),
    periodoMes: `${String(mesNum || 0).padStart(2, '0')} - ${MESES[mesNum] ?? ''}`,
    agenteNombre: conc?.nombre ?? 'LA ORIENTAL AUTOMOTORS, C.A.',
    agenteRif: conc?.rif ?? '',
    agenteDireccion: (conc?.direccion ?? '').replace(/\n/g, ' '),
    sujetoNombre,
    sujetoRif,
    sujetoDireccion,
    fechaFactura: egreso.fecha_factura ?? '',
    numeroFactura: egreso.numero_factura ?? '',
    numeroControl: egreso.numero_control ?? '',
    totalConIva: Number(egreso.monto ?? 0),
    baseImponible: Number(egreso.base_imponible ?? 0),
    alicuota: Number(egreso.iva_tasa ?? 16),
    impuestoIva: Number(egreso.iva_monto ?? 0),
    ivaRetenido: Number(egreso.ret_iva_monto ?? 0),
    moneda: egreso.moneda === 'VES' ? 'Bs' : (egreso.moneda ?? 'USD'),
  }
}
