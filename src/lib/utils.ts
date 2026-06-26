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

// Sanitiza input antes de usarlo en filtros .or()/.ilike() de PostgREST.
// Elimina caracteres especiales que podrían alterar la sintaxis del filtro.
export function sanitizeSearch(q: string): string {
  return q.replace(/[%_*(),[\]]/g, '').trim().slice(0, 100)
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
  // ── Costos ──────────────────────────────────────────────────────────
  costos_ventas:              'Costos de Ventas',
  costos_servicios:           'Costos de Prestación de Servicios',
  // ── Gastos de Operación ─────────────────────────────────────────────
  sueldos_beneficios:         'Sueldos, Bonos y Beneficios Laborales',
  comisiones:                 'Comisiones',
  representacion_viaticos:    'Representación, Viáticos y Logística',
  servicios_profesionales:    'Servicios Profesionales y Asesorías',
  instalaciones_servicios:    'Instalaciones y Servicios',
  articulos_suministros:      'Artículos, Suministros y Materiales',
  vehiculos_propios:          'Vehículos Propios',
  seguros_impuestos:          'Seguros, Patrocinios e Impuestos',
  gastos_financieros:         'Gastos Financieros, Multas y Otros',
  // ── Cuentas y Resultados ────────────────────────────────────────────
  cuentas_cobrar:             'Cuentas por Cobrar',
  cuentas_pagar:              'Cuentas por Pagar',
  resultados_reservas:        'Resultados, Apartados y Reservas',
  // ── Categorías heredadas ────────────────────────────────────────────
  gastos_administrativos:     'Gastos administrativos',
  proveedores:                'Proveedores',
  tramites_vehiculares:       'Trámites vehiculares',
  impuestos:                  'Impuestos',
  seguro:                     'Seguro',
  logistica:                  'Logística',
  mantenimiento:              'Mantenimiento',
  servicios:                  'Servicios',
  vehimotors:                 'Vehimotors',
  bancos_comisiones:          'Bancos / Comisiones',
  alquiler:                   'Alquiler',
  taller:                     'Taller',
  repuestos:                  'Repuestos',
  cr_avanza_motors:           'CR Avanza Motors',
  cr_plaza:                   'CR Plaza',
  costos_repuestos:           'Costos de Repuestos',
  otros:                      'Otros',
}

export const CONCEPTOS_POR_CATEGORIA: Record<string, string[]> = {
  costos_ventas: [
    'Inventario inicial de mercancías y repuestos',
    'Compras de mercancías y repuestos',
    'Fletes en compras y envíos de repuestos',
    'Costos de accesorios',
    'Total de mercancía disponible para la venta',
    'Inventario final de mercancías y repuestos',
    'Acondicionamiento de vehículos nuevos',
    'Atenciones y obsequios a clientes',
    'Total costos de ventas',
  ],
  costos_servicios: [
    'Comisiones de servicios',
    'Bono de producción de servicios',
    'Reparaciones T.O.T.',
    'Reparaciones y mantenimiento de equipos de taller',
    'Reparaciones y mantenimiento del local del taller',
    'Aceites y lubricantes',
    'Consumibles de taller',
    'Herramientas menores',
    'Herramientas de taller',
    'Artículos de limpieza para el taller',
    'Dotación de implementos de seguridad para el taller',
    'Servicio de internet del taller',
    'Mensualidad del sistema de taller',
    'Declaración de pensiones del taller',
    'Total costos de prestación de servicios',
  ],
  sueldos_beneficios: [
    'Sueldos de directivos',
    'Sueldos y salarios',
    'Bono de alimentación de directivos',
    'Bono de alimentación del personal de ventas',
    'Bono de alimentación del personal de taller',
    'Bono de alimentación del personal de administración',
    'Bono de transporte',
    'Bono complementario de alimentación',
    'Bono único',
    'Aportes parafiscales',
    'Prestaciones sociales',
    'Uniformes',
    'Atenciones y obsequios al personal',
    'Agasajos y celebraciones para el personal',
  ],
  comisiones: [
    'Comisiones de vendedores',
    'Comisiones de cobranza',
    'Comisiones de servicios',
  ],
  representacion_viaticos: [
    'Gastos de representación y viáticos de directivos',
    'Gastos de representación y viáticos de empleados',
    'Gastos de representación y viáticos de terceros',
    'Logística de personal',
    'Logística de terceros',
  ],
  servicios_profesionales: [
    'Honorarios contables',
    'Asesoría en seguridad laboral',
    'Servicio de marketing digital',
  ],
  instalaciones_servicios: [
    'Alquiler',
    'Servicio de vigilancia',
    'Servicio de internet',
    'Servicio de internet del taller',
    'Mensualidad del sistema de taller',
    'Reparaciones y mantenimiento del local del taller',
  ],
  articulos_suministros: [
    'Artículos de limpieza',
    'Artículos de limpieza para el taller',
    'Artículos de cafetería',
    'Artículos de oficina',
    'Artículos de papelería',
    'Alimentos y gastos veterinarios',
    'Dotación de implementos de seguridad para el taller',
  ],
  vehiculos_propios: [
    'Acondicionamiento de vehículos propios',
    'Reparaciones T.O.T. de vehículos propios',
  ],
  seguros_impuestos: [
    'Póliza empresarial',
    'Patrocinios a terceros',
    'Impuestos municipales',
    'Impuestos municipales de directivos',
    'Declaración de pensiones',
    'Declaración de pensiones del taller',
    'Impuesto a las Grandes Transacciones Financieras — I.G.T.F.',
    'Aporte FONADE',
    'Impuesto sobre la Renta por pagar — I.S.L.R.',
  ],
  gastos_financieros: [
    'Cargos y comisiones bancarias',
    'Multas y sanciones del SENIAT',
    'Otros gastos no especificados',
  ],
  cuentas_cobrar: [
    'Cuentas por cobrar Compas',
  ],
  cuentas_pagar: [
    'Cuentas por pagar a compañías interrelacionadas',
    'Cuenta por pagar a Avanza Motors',
  ],
  resultados_reservas: [
    'Superávit o déficit antes de apartados y reservas',
    'Impuesto sobre la Renta por pagar — I.S.L.R.',
    'Reserva legal',
  ],
  // Categorías heredadas con sus conceptos más comunes
  taller: [
    'Reparaciones T.O.T.',
    'Reparaciones y mantenimiento de equipos de taller',
    'Aceites y lubricantes',
    'Consumibles de taller',
    'Herramientas menores',
    'Herramientas de taller',
    'Artículos de limpieza para el taller',
    'Dotación de implementos de seguridad para el taller',
    'Servicio de internet del taller',
    'Mensualidad del sistema de taller',
  ],
  repuestos: [
    'Compras de mercancías y repuestos',
    'Fletes en compras y envíos de repuestos',
    'Inventario inicial de mercancías y repuestos',
    'Costos de accesorios',
  ],
  gastos_administrativos: [
    'Artículos de oficina',
    'Artículos de papelería',
    'Artículos de limpieza',
    'Artículos de cafetería',
    'Honorarios contables',
    'Asesoría en seguridad laboral',
  ],
  impuestos: [
    'Impuestos municipales',
    'Impuesto a las Grandes Transacciones Financieras — I.G.T.F.',
    'Aporte FONADE',
    'Impuesto sobre la Renta por pagar — I.S.L.R.',
    'Declaración de pensiones',
    'Multas y sanciones del SENIAT',
  ],
  seguro: [
    'Póliza empresarial',
  ],
  logistica: [
    'Logística de personal',
    'Logística de terceros',
    'Fletes en compras y envíos de repuestos',
  ],
  mantenimiento: [
    'Reparaciones y mantenimiento del local del taller',
    'Reparaciones y mantenimiento de equipos de taller',
    'Acondicionamiento de vehículos propios',
    'Reparaciones T.O.T. de vehículos propios',
  ],
  bancos_comisiones: [
    'Cargos y comisiones bancarias',
  ],
  alquiler: [
    'Alquiler',
  ],
  servicios: [
    'Servicio de vigilancia',
    'Servicio de internet',
    'Servicio de marketing digital',
  ],
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
