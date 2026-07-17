// Plantillas estándar (v1) para los procesos de showroom: recepción en grúa,
// chequeo de vehículo y PDI (pre-entrega). Rojas puede afinar los ítems luego.

export type CampoTipo = 'text' | 'number' | 'date' | 'select'
export type Campo = { clave: string; label: string; tipo: CampoTipo; opciones?: string[] }
export type ItemPlantilla = { clave: string; label: string }
export type EstadoOpcion = { value: string; label: string; tono: 'ok' | 'warn' | 'bad' | 'muted' }

export type Plantilla = {
  tipo: 'recepcion' | 'chequeo' | 'pdi'
  titulo: string
  descripcion: string
  campos: Campo[]
  estados: EstadoOpcion[]
  items: ItemPlantilla[]
}

const NIVEL_COMBUSTIBLE = ['Reserva', '1/4', '1/2', '3/4', 'Lleno']

export const PLANTILLAS: Record<Plantilla['tipo'], Plantilla> = {
  recepcion: {
    tipo: 'recepcion',
    titulo: 'Recepción en grúa',
    descripcion: 'Estado del vehículo al momento de llegar a la agencia.',
    campos: [
      { clave: 'fecha', label: 'Fecha de recepción', tipo: 'date' },
      { clave: 'recibido_por', label: 'Recibido por', tipo: 'text' },
      { clave: 'transportista', label: 'Transportista / grúa', tipo: 'text' },
      { clave: 'kilometraje', label: 'Kilometraje', tipo: 'number' },
      { clave: 'combustible', label: 'Nivel de combustible', tipo: 'select', opciones: NIVEL_COMBUSTIBLE },
    ],
    estados: [
      { value: 'ok', label: 'Conforme', tono: 'ok' },
      { value: 'observacion', label: 'Con observación', tono: 'warn' },
      { value: 'na', label: 'N/A', tono: 'muted' },
    ],
    items: [
      { clave: 'carroceria', label: 'Carrocería y pintura' },
      { clave: 'parabrisas', label: 'Parabrisas y vidrios' },
      { clave: 'luces', label: 'Luces y ópticas' },
      { clave: 'neumaticos', label: 'Neumáticos' },
      { clave: 'retrovisores', label: 'Retrovisores' },
      { clave: 'interior', label: 'Interior y tapicería' },
      { clave: 'llaves', label: 'Llaves / control' },
      { clave: 'documentos', label: 'Documentos del vehículo' },
      { clave: 'herramientas', label: 'Herramientas y gato' },
      { clave: 'repuesto', label: 'Caucho de repuesto' },
    ],
  },
  chequeo: {
    tipo: 'chequeo',
    titulo: 'Chequeo de vehículo',
    descripcion: 'Revisión mecánica y estética del vehículo.',
    campos: [
      { clave: 'fecha', label: 'Fecha de chequeo', tipo: 'date' },
      { clave: 'realizado_por', label: 'Realizado por', tipo: 'text' },
      { clave: 'kilometraje', label: 'Kilometraje', tipo: 'number' },
    ],
    estados: [
      { value: 'ok', label: 'Bien', tono: 'ok' },
      { value: 'falla', label: 'Con falla', tono: 'bad' },
      { value: 'na', label: 'N/A', tono: 'muted' },
    ],
    items: [
      { clave: 'motor', label: 'Motor' },
      { clave: 'transmision', label: 'Transmisión' },
      { clave: 'frenos', label: 'Frenos' },
      { clave: 'direccion', label: 'Dirección' },
      { clave: 'suspension', label: 'Suspensión' },
      { clave: 'electrico', label: 'Sistema eléctrico' },
      { clave: 'luces', label: 'Luces' },
      { clave: 'aire', label: 'Aire acondicionado' },
      { clave: 'neumaticos', label: 'Neumáticos' },
      { clave: 'bateria', label: 'Batería' },
      { clave: 'fluidos', label: 'Niveles de fluidos' },
      { clave: 'tablero', label: 'Tablero / testigos' },
      { clave: 'carroceria', label: 'Carrocería' },
      { clave: 'tapiceria', label: 'Tapicería' },
    ],
  },
  pdi: {
    tipo: 'pdi',
    titulo: 'PDI — Inspección pre-entrega',
    descripcion: 'Verificación final antes de entregar el vehículo al cliente.',
    campos: [
      { clave: 'fecha', label: 'Fecha de PDI', tipo: 'date' },
      { clave: 'realizado_por', label: 'Realizado por', tipo: 'text' },
    ],
    estados: [
      { value: 'ok', label: 'Listo', tono: 'ok' },
      { value: 'pendiente', label: 'Pendiente', tono: 'warn' },
      { value: 'na', label: 'N/A', tono: 'muted' },
    ],
    items: [
      { clave: 'fluidos', label: 'Niveles de fluidos' },
      { clave: 'presion', label: 'Presión de neumáticos' },
      { clave: 'bateria', label: 'Batería' },
      { clave: 'limpieza_ext', label: 'Limpieza exterior' },
      { clave: 'limpieza_int', label: 'Limpieza interior' },
      { clave: 'accesorios', label: 'Accesorios completos' },
      { clave: 'documentos', label: 'Documentos' },
      { clave: 'manual_llaves', label: 'Manual y llaves' },
      { clave: 'encendido', label: 'Prueba de encendido' },
      { clave: 'prueba_manejo', label: 'Prueba de manejo' },
      { clave: 'testigos', label: 'Sin testigos encendidos' },
    ],
  },
}

export const TIPO_LABEL: Record<string, string> = {
  recepcion: 'Recepción',
  chequeo: 'Chequeo',
  pdi: 'PDI',
}
