import { buildAnexoMontos, type AnexoAData } from './anexo-a-pdf'
import type { ConcesionarioIdentity } from './concesionario'
import { getMembreteVehimotorsBase64 } from './cotizacion-logo'

const num = (x: unknown) => { const n = Number(x); return Number.isFinite(n) ? n : 0 }

function fmtDate(s: string | null) {
  if (!s) return ''
  try { return new Date(s + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return s }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Arma los datos del Anexo A a partir de una fila de precompra_proformas.
export function buildAnexoData(pf: any, conces: ConcesionarioIdentity, variante: 'oriental' | 'vehimotors'): AnexoAData {
  const cuotasBase: number[] = Array.isArray(pf.cuotas) ? pf.cuotas.map(num) : []
  const montos = buildAnexoMontos({ variante, reserva: num(pf.reserva) || 500, cuotasBase, cuotaFinal: num(pf.cuota_final) })
  return {
    logoSrc: conces.logoSrc,
    // Membrete full-width de Vehimotors en la copia que se le envía (si el archivo existe).
    membreteSrc: variante === 'vehimotors' ? getMembreteVehimotorsBase64() : undefined,
    empresaNombre: conces.nombre,
    empresaRif: conces.rif,
    empresaDireccion: conces.direccion,
    empresaTelefono: conces.telefono,
    empresaCorreo: conces.correo,
    variante,
    ciclo: pf.ciclo ?? null,
    fecha: fmtDate(pf.fecha_plan) || fmtDate(new Date().toISOString().slice(0, 10)),
    clienteNombre: pf.cliente_nombre,
    estadoCivil: pf.estado_civil,
    conyuge: pf.conyuge ?? null,
    clienteCedula: pf.cliente_cedula,
    clienteRif: pf.cliente_rif,
    clienteDireccion: pf.cliente_direccion,
    clienteTelefono: pf.cliente_telefono,
    clienteCorreo: pf.cliente_correo,
    unidad: pf.unidad || pf.modelo || '',
    colores: pf.colores,
    gastosAsociados: montos.gastosAsociados,
    valorVentaUnidad: montos.valorVentaUnidad,
    reserva: montos.reserva,
    cuotas: montos.cuotas,
    totalPagar: montos.totalPagar,
    serieCobertura: pf.serie_cobertura,
    firmaClienteSrc: pf.firma_cliente ?? null,
  }
}
