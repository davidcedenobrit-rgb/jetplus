// Cuentas de movimiento (hojas del plan de cuentas) para el selector en los
// formularios de ingreso/egreso, más el mapeo de sugerencia por categoría.
// Usa un archivo liviano (solo código/nombre/clase) para no cargar todo el
// catálogo al bundle del cliente.
import data from '@/data/cuentas_movimiento.json'

export type CuentaMovimiento = { codigo: string; nombre: string; clase: string }

export const CUENTAS_MOVIMIENTO = (data.cuentas as CuentaMovimiento[])

const NOMBRE_CLASE: Record<string, string> = {
  '1': 'Activo', '2': 'Pasivo', '3': 'Patrimonio', '4': 'Ingresos',
  '5': 'Costos', '6': 'Gastos', '7': 'Otros ingresos', '8': 'Otros gastos', '9': 'Cuentas de orden',
}

export function nombreClase(clase: string): string {
  return NOMBRE_CLASE[clase] ?? `Clase ${clase}`
}

const POR_CODIGO = new Map(CUENTAS_MOVIMIENTO.map(c => [c.codigo, c]))

export function nombreDeCuenta(codigo: string | null | undefined): string | null {
  if (!codigo) return null
  return POR_CODIGO.get(codigo)?.nombre ?? null
}

export function existeCuenta(codigo: string | null | undefined): boolean {
  return !!codigo && POR_CODIGO.has(codigo)
}

// Agrupadas por clase, para render con encabezados.
export function cuentasPorClase(): { clase: string; nombre: string; cuentas: CuentaMovimiento[] }[] {
  const grupos = new Map<string, CuentaMovimiento[]>()
  for (const c of CUENTAS_MOVIMIENTO) {
    if (!grupos.has(c.clase)) grupos.set(c.clase, [])
    grupos.get(c.clase)!.push(c)
  }
  return [...grupos.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([clase, cuentas]) => ({ clase, nombre: nombreClase(clase), cuentas }))
}

// Sugerencia de cuenta contable por CATEGORÍA de egreso. Valores propuestos por
// el sistema; el contador (Neyda) puede ajustarlos. El usuario siempre puede
// cambiar la cuenta en el formulario.
export const SUGERENCIA_EGRESO: Record<string, string> = {
  proveedores: '2.1.03.001',
  gastos_administrativos: '6.2.08.005',
  tramites_vehiculares: '6.2.07.022',
  impuestos: '6.2.12.001',
  seguro: '6.2.01.001',
  logistica: '6.2.07.019',
  mantenimiento: '6.2.02.001',
  comisiones: '5.1.02.004',
  servicios: '6.2.07.022',
  vehimotors: '2.1.09.001',
  bancos_comisiones: '8.1.01.004',
  otros: '6.2.08.005',
  taller: '5.1.02.006',
  repuestos: '5.1.01.002',
  alquiler: '6.2.03.001',
  costos_ventas: '5.1.01.001',
  costos_servicios: '5.1.02.006',
  sueldos_beneficios: '6.1.01.002',
  representacion_viaticos: '6.2.07.019',
  servicios_profesionales: '6.2.06.002',
  instalaciones_servicios: '6.2.04.001',
  articulos_suministros: '6.2.08.001',
  vehiculos_propios: '6.2.02.001',
  seguros_impuestos: '6.2.01.001',
  gastos_financieros: '8.1.01.004',
  cuentas_cobrar: '1.1.06.001',
  cuentas_pagar: '2.1.03.001',
  resultados_reservas: '2.2.02.001',
  cr_avanza_motors: '5.1.01.002',
  cr_plaza: '5.1.01.002',
  costos_repuestos: '5.1.01.002',
  fletes_envios: '5.1.02.006',
  herramientas: '1.3.03.001',
}

// Sugerencia por CONCEPTO de ingreso.
export const SUGERENCIA_INGRESO: Record<string, string> = {
  'Venta de contado': '4.1.01.001',
  'Cuota de vehículo': '4.1.01.001',
  'Reserva AC500': '2.3.01.001',
  'Cuota de AC500': '4.1.01.001',
  'Cuota de inicial': '2.3.01.010',
  'Cuota de inicial + vehículo': '2.3.01.010',
  'Inicial de vehículo': '2.3.01.010',
  'Inicial acuerdo de pago': '2.3.01.010',
  'Saldo de vehículo': '4.1.01.001',
  'Trámite vehicular': '4.1.01.004',
  'Seguro vehicular': '4.1.01.004',
  'Placa': '4.1.01.004',
  'IVA': '2.1.05.005',
  'Accesorios': '4.1.01.001',
  'Servicio de taller': '4.1.01.002',
  'Abono a crédito': '1.1.06.050',
}

export function sugerenciaEgreso(categoria: string | null | undefined): string | null {
  if (!categoria) return null
  const c = SUGERENCIA_EGRESO[categoria]
  return c && existeCuenta(c) ? c : null
}

export function sugerenciaIngreso(concepto: string | null | undefined): string | null {
  if (!concepto) return null
  const c = SUGERENCIA_INGRESO[concepto]
  return c && existeCuenta(c) ? c : null
}
