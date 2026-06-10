// Auto-generado con: npm run types
// Ejecuta ese comando luego de configurar tu .env.local

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type RolUsuario = 'jose' | 'mary' | 'leysdem' | 'carla' | 'admin' | 'arianna' | 'almacenista'
export type EstadoShowroom = 'llegada' | 'por_enviar_pdi' | 'en_taller' | 'en_agencia' | 'reservado' | 'vendido'
export type EstadoRecibo =
  | 'registrado' | 'pendiente_aprobacion' | 'aprobado' | 'rechazado'
  | 'correccion_requerida' | 'enviado_cliente' | 'enviado_carla'
  | 'listo_depositar' | 'enviado_deposito' | 'depositado'
  | 'entregado_carla' | 'reportado_vehimotors' | 'pendiente_anulacion' | 'anulado'
export type EstadoEgreso =
  | 'registrado' | 'pendiente_aprobacion' | 'aprobado' | 'rechazado'
  | 'correccion_requerida' | 'pagado' | 'reportado_carla'
  | 'reportado_vehimotors' | 'anulado'
export type TipoCliente = 'natural' | 'juridico'
export type TipoCompra = 'contado' | 'financiado'
export type MarcaVehiculo = 'MG' | 'MAXUS'
export type Moneda = 'USD' | 'VES'
export type CategoriaEgreso =
  | 'gastos_administrativos' | 'proveedores' | 'tramites_vehiculares'
  | 'impuestos' | 'seguro' | 'logistica' | 'mantenimiento' | 'comisiones'
  | 'servicios' | 'vehimotors' | 'bancos_comisiones' | 'alquiler' | 'taller' | 'repuestos' | 'otros'

export interface Usuario {
  id: string
  nombre: string
  correo: string
  rol: RolUsuario
  activo: boolean
  created_at: string
  ultimo_acceso: string | null
}

export interface Cliente {
  id: string
  nombre: string
  cedula_rif: string
  telefono: string | null
  whatsapp: string | null
  correo: string | null
  direccion: string | null
  ciudad: string | null
  tipo: TipoCliente
  observaciones: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Vehiculo {
  id: string
  cliente_id: string
  marca: MarcaVehiculo
  modelo: string
  version: string | null
  anio: number | null
  color: string | null
  placa: string | null
  vin: string | null
  serial_motor: string | null
  fecha_entrega: string | null
  tipo_compra: TipoCompra
  estado: string
  observaciones: string | null
  created_at: string
  updated_at: string
}

export interface Credito {
  id: string
  cliente_id: string
  vehiculo_id: string
  placa: string | null
  monto_financiado: number
  inicial: number
  saldo: number
  num_cuotas: number
  frecuencia_pago: string
  fecha_inicio: string
  moneda: Moneda
  estado: string
  plan_tipo: string | null
  observaciones: string | null
  created_at: string
  updated_at: string
}

export interface Cuota {
  id: string
  credito_id: string
  numero_cuota: number
  fecha_vencimiento: string
  monto: number
  estado: string
  fecha_pago: string | null
  mora: number
  concepto: string | null
  observaciones: string | null
  created_at: string
}

export interface Ingreso {
  id: string
  numero_recibo: string
  cliente_id: string
  vehiculo_id: string | null
  cuota_id: string | null
  placa: string | null
  concepto: string
  monto: number
  moneda: Moneda
  metodo_pago: string
  fecha_pago: string
  referencia: string | null
  banco_emisor: string | null
  banco_receptor: string | null
  estado: EstadoRecibo
  observaciones: string | null
  tasa_cambio: number | null
  registrado_por: string
  aprobado_por: string | null
  fecha_registro: string
  fecha_aprobacion: string | null
  enviado_carla_at: string | null
  deposito_at: string | null
  vehimotors_at: string | null
  updated_at: string
  anulacion_solicitada_por: string | null
  anulacion_solicitada_at: string | null
  anulacion_motivo: string | null
  anulacion_observaciones: string | null
  anulacion_estado_previo: string | null
  anulacion_resuelta_por: string | null
  anulacion_resuelta_at: string | null
  anulacion_rechazada_motivo: string | null
}

export interface Egreso {
  id: string
  numero_egreso: string
  categoria: CategoriaEgreso
  concepto: string
  descripcion: string | null
  monto: number
  moneda: Moneda
  metodo_pago: string | null
  banco_origen: string | null
  beneficiario: string | null
  cedula_rif_benef: string | null
  referencia: string | null
  estado: EstadoEgreso
  observaciones: string | null
  cliente_id: string | null
  vehiculo_id: string | null
  placa: string | null
  ingreso_id: string | null
  area_responsable: string | null
  registrado_por: string
  aprobado_por: string | null
  fecha_egreso: string
  fecha_registro: string
  fecha_aprobacion: string | null
  reportado_carla_at: string | null
  vehimotors_at: string | null
  updated_at: string
}

export interface Archivo {
  id: string
  tipo: string
  url: string
  nombre: string | null
  ingreso_id: string | null
  egreso_id: string | null
  cliente_id: string | null
  tipo_documento: string | null
  es_empresa: boolean
  subido_por: string
  created_at: string
}

export interface VehiculoShowroom {
  id: string
  marca: string
  modelo: string
  version: string | null
  anio: number | null
  color: string | null
  placa: string | null
  vin: string | null
  serial_motor: string | null
  observaciones: string | null
  estado: EstadoShowroom
  ubicacion: 'showroom' | 'galpon' | 'otro' | null
  ubicacion_descripcion: string | null
  fecha_llegada: string | null
  fecha_pdi: string | null
  pdi_hecho: boolean
  reservado_por: string | null
  reserva_monto: number | null
  reserva_vence: string | null
  reserva_notas: string | null
  cliente_id: string | null
  vehiculo_id: string | null
  created_at: string
  updated_at: string
}

export interface Auditoria {
  id: string
  usuario_id: string | null
  accion: string
  modulo: string
  registro_id: string | null
  datos_anteriores: Json | null
  datos_nuevos: Json | null
  ip: string | null
  created_at: string
}

// Tipos con relaciones (para joins)
export interface IngresoConRelaciones extends Ingreso {
  clientes?: Cliente
  vehiculos?: Vehiculo
  registrado_por_usuario?: Usuario
}

export interface EgresoConRelaciones extends Egreso {
  clientes?: Cliente
  vehiculos?: Vehiculo
  registrado_por_usuario?: Usuario
}

// Tipo base para Supabase (se reemplaza con npm run types)
export type Database = any
