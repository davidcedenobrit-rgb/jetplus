import { z } from 'zod'

const CATEGORIAS_EGRESO = [
  'gastos_administrativos', 'proveedores', 'tramites_vehiculares',
  'impuestos', 'seguro', 'logistica', 'mantenimiento', 'comisiones',
  'servicios', 'vehimotors', 'bancos_comisiones', 'otros',
] as const

const MONEDA = ['USD', 'VES'] as const
const TIPO_CLIENTE = ['natural', 'juridico'] as const
const MARCA_VEHICULO = ['MG', 'MAXUS'] as const
const TIPO_COMPRA = ['contado', 'financiado'] as const
const FRECUENCIA_PAGO = ['mensual', 'quincenal', 'semanal'] as const

export const LoginSchema = z.object({
  email: z.string().email('Correo inválido').max(254),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(128),
})

export const IngresoSchema = z.object({
  concepto: z.string().min(1, 'El concepto es requerido').max(200),
  monto: z
    .number({ invalid_type_error: 'El monto debe ser un número' })
    .positive('El monto debe ser mayor a 0')
    .max(10_000_000, 'Monto fuera de rango'),
  moneda: z.enum(MONEDA),
  metodo_pago: z.string().min(1, 'El método de pago es requerido').max(100),
  banco_emisor: z.string().max(100).optional().nullable(),
  banco_receptor: z.string().max(100).optional().nullable(),
  referencia: z.string().max(100).optional().nullable(),
  fecha_pago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  observaciones: z.string().max(500).optional().nullable(),
})

export const EgresoSchema = z.object({
  categoria: z.enum(CATEGORIAS_EGRESO, { errorMap: () => ({ message: 'Categoría inválida' }) }),
  concepto: z.string().min(1, 'El concepto es requerido').max(200),
  descripcion: z.string().max(500).optional().nullable(),
  monto: z
    .number({ invalid_type_error: 'El monto debe ser un número' })
    .positive('El monto debe ser mayor a 0')
    .max(10_000_000, 'Monto fuera de rango'),
  moneda: z.enum(MONEDA),
  metodo_pago: z.string().max(100).optional().nullable(),
  banco_origen: z.string().max(100).optional().nullable(),
  beneficiario: z.string().max(200).optional().nullable(),
  cedula_rif_benef: z.string().max(20).optional().nullable(),
  referencia: z.string().max(100).optional().nullable(),
  fecha_egreso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  area_responsable: z.string().max(100).optional().nullable(),
  observaciones: z.string().max(500).optional().nullable(),
})

export const ClienteSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(200).trim(),
  cedula_rif: z
    .string()
    .min(5, 'Cédula/RIF inválido')
    .max(20)
    .regex(/^[VEJGPvejgp]?[\d-]+$/, 'Formato inválido (ej: V12345678)')
    .transform(v => v.toUpperCase()),
  tipo: z.enum(TIPO_CLIENTE),
  telefono: z.string().max(20).optional().nullable(),
  whatsapp: z.string().max(20).optional().nullable(),
  correo: z
    .string()
    .email('Correo inválido')
    .max(254)
    .optional()
    .or(z.literal(''))
    .nullable(),
  direccion: z.string().max(500).optional().nullable(),
  ciudad: z.string().max(100).optional().nullable(),
  observaciones: z.string().max(500).optional().nullable(),
})

export const VehiculoSchema = z.object({
  marca: z.enum(MARCA_VEHICULO),
  modelo: z.string().min(1, 'El modelo es requerido').max(100),
  version: z.string().max(100).optional().nullable(),
  anio: z.number().int().min(2000).max(2100).optional().nullable(),
  color: z.string().max(50).optional().nullable(),
  placa: z.string().max(10).optional().nullable(),
  vin: z.string().max(50).optional().nullable(),
  tipo_compra: z.enum(TIPO_COMPRA),
  fecha_entrega: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  estado: z.string().max(50).default('disponible'),
  observaciones: z.string().max(500).optional().nullable(),
})

export const CreditoSchema = z.object({
  monto_financiado: z
    .number({ invalid_type_error: 'Monto inválido' })
    .positive()
    .max(10_000_000),
  inicial: z.number().min(0).max(10_000_000),
  num_cuotas: z.number().int().min(1).max(120),
  frecuencia_pago: z.enum(FRECUENCIA_PAGO),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  moneda: z.enum(MONEDA),
  observaciones: z.string().max(500).optional().nullable(),
})
