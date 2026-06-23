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

export const BANCOS_VEHIMOTORS = [
  { nombre: 'Bancamiga',          cuenta: '0172-0110-7511-0601-8060' },
  { nombre: 'Delsur',             cuenta: '0157-0056-4637-5621-5020' },
  { nombre: 'Mercantil',          cuenta: '0105-0699-9316-9922-6628' },
  { nombre: 'Provincial',         cuenta: '0108-0956-8701-0002-6927' },
  { nombre: 'Banco Exterior',     cuenta: '0115-0010-2110-0629-0115' },
  { nombre: 'Banco del Tesoro',   cuenta: '0163-0903-6790-3300-8739' },
  { nombre: 'BNC',                cuenta: '0191-0098-7121-9828-9943' },
  { nombre: 'Banesco',            cuenta: '0134-0031-8103-1115-9963' },
  { nombre: 'Banco de Venezuela', cuenta: '0102-0762-2100-0008-3409' },
  { nombre: 'Banplus',            cuenta: '0174-0131-9513-1479-5780' },
  { nombre: '100% Banco',         cuenta: '0156-0030-6602-0216-3130' },
  { nombre: 'Bancaribe',          cuenta: '0114-0165-1516-5027-0262' },
  { nombre: 'Banco Fondo Común',  cuenta: '0151-0100-8010-0363-8142' },
]

export const METODOS_PAGO = [
  'Transferencia bancaria',
  'Transferencia bancaria a Vehimotor',
  'Transferencia bancaria a Oriental',
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
  'Binance USDT',
  'Banesco',
  'Mercantil',
  'BBVA Provincial',
  'Banco de Venezuela',
  'Bancaribe',
  'BOD',
  'Bicentenario',
  'BNC',
  'Otro',
  ...BANCOS_VEHIMOTORS.map(b => b.nombre),
]
