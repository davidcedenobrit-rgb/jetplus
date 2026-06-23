import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

const ISO_CURRENCIES = new Set(['USD', 'EUR', 'VES', 'VEF', 'GBP', 'BRL', 'COP', 'MXN', 'ARS', 'CLP', 'PEN', 'UYU', 'BOB', 'PYG', 'DOP', 'CRC', 'GTQ', 'HNL', 'NIO', 'PAB'])

export function formatCurrency(amount: number, currency = 'USD'): string {
  if (!ISO_CURRENCIES.has(currency)) {
    return `${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
  }
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-VE', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

export const ESTADOS_RECIBO_LABEL: Record<string, string> = {
  registrado: 'Registrado',
  pendiente_aprobacion: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  correccion_requerida: 'Corrección',
  enviado_carla: 'Enviado Carla',
  enviado_deposito: 'En depósito',
  depositado: 'Depositado',
  entregado_carla: 'Entregado a Carla',
  reportado_vehimotors: 'Vehimotors',
  pendiente_anulacion: 'Pend. Anulación',
  anulado: 'Anulado',
}

export const ESTADOS_EGRESO_LABEL: Record<string, string> = {
  registrado: 'Registrado',
  pendiente_aprobacion: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  correccion_requerida: 'Corrección',
  pagado: 'Pagado',
  reportado_carla: 'Enviado Carla',
  reportado_vehimotors: 'Vehimotors',
  anulado: 'Anulado',
}

export const CATEGORIAS_EGRESO_LABEL: Record<string, string> = {
  gastos_administrativos: 'Gastos administrativos',
  proveedores: 'Proveedores',
  tramites_vehiculares: 'Trámites vehiculares',
  impuestos: 'Impuestos',
  seguro: 'Seguro',
  logistica: 'Logística',
  mantenimiento: 'Mantenimiento',
  comisiones: 'Comisiones',
  servicios: 'Servicios',
  vehimotors: 'Vehimotors',
  bancos_comisiones: 'Bancos / Comisiones',
  alquiler: 'Alquiler',
  taller: 'Taller',
  repuestos: 'Repuestos',
  otros: 'Otros',
}

export const METODOS_PAGO = [
  'Transferencia bancaria',
  'Pago móvil',
  'Zelle',
  'Binance',
  'USDT CH',
  'USDT JR',
  'USDT VE',
  'Efectivo USD',
  'Efectivo VES',
  'Depósito bancario',
  'Cheque',
  'Otro',
]

export const BANCOS_VE = [
  'Banesco',
  'Mercantil',
  'BBVA Provincial',
  'Banco de Venezuela',
  'Bancaribe',
  'BOD',
  'Bicentenario',
  'BNC',
  'Otro',
]
