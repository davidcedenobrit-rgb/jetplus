// Plantillas de inspección de vehículos — formato MG / MAXUS (sirve para ambas).
//  - recepcion: "Lista de inspección de vehículos" que hace el asesor (Ari) al
//    recibir el vehículo. Estados OK / NF / NE / R.
//  - pdi: "PDI en taller" que hacen los técnicos (Jose Manuel, Yoiber).
//  - chequeo: revisión intermedia (se conserva).

export type CampoTipo = 'text' | 'number' | 'date' | 'select'
export type Campo = { clave: string; label: string; tipo: CampoTipo; opciones?: string[] }
export type ItemPlantilla = { clave: string; label: string; grupo?: string }
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

// Leyenda estándar MG: OK bien · NF no funciona · NE no existe · R requerido.
const ESTADOS_MG: EstadoOpcion[] = [
  { value: 'ok', label: 'OK', tono: 'ok' },
  { value: 'nf', label: 'NF', tono: 'bad' },
  { value: 'ne', label: 'NE', tono: 'muted' },
  { value: 'r', label: 'R', tono: 'warn' },
]

export const PLANTILLAS: Record<Plantilla['tipo'], Plantilla> = {
  recepcion: {
    tipo: 'recepcion',
    titulo: 'Recepción / Inspección',
    descripcion: 'Lista de inspección de vehículos MG / MAXUS al recibirlo. OK: Bien · NF: No funciona · NE: No existe · R: Requerido.',
    campos: [
      { clave: 'asesor', label: 'Asesor de servicios', tipo: 'text' },
      { clave: 'cliente', label: 'Cliente', tipo: 'text' },
      { clave: 'ci', label: 'C.I.', tipo: 'text' },
      { clave: 'fecha', label: 'Fecha de entrada', tipo: 'date' },
      { clave: 'hora', label: 'Hora de entrada', tipo: 'text' },
      { clave: 'marca', label: 'Marca', tipo: 'select', opciones: ['MG', 'MAXUS'] },
      { clave: 'modelo', label: 'Modelo', tipo: 'text' },
      { clave: 'color', label: 'Color', tipo: 'text' },
      { clave: 'placa', label: 'Placa', tipo: 'text' },
      { clave: 'km', label: 'Kilometraje', tipo: 'number' },
      { clave: 'serial_carroceria', label: 'Serial de carrocería', tipo: 'text' },
      { clave: 'serial_motor', label: 'Serial de motor', tipo: 'text' },
      { clave: 'combustible', label: 'Nivel de combustible', tipo: 'select', opciones: NIVEL_COMBUSTIBLE },
    ],
    estados: ESTADOS_MG,
    items: [
      // Exterior — Luces
      { grupo: 'Exterior · Luces', clave: 'luz_bajas', label: 'Luces bajas' },
      { grupo: 'Exterior · Luces', clave: 'luz_altas', label: 'Luces altas' },
      { grupo: 'Exterior · Luces', clave: 'luz_reposo', label: 'Luz de reposo' },
      { grupo: 'Exterior · Luces', clave: 'luz_freno', label: 'Luz de freno' },
      { grupo: 'Exterior · Luces', clave: 'luz_retroceso', label: 'Luz de retroceso' },
      { grupo: 'Exterior · Luces', clave: 'luz_cruce', label: 'Luces de cruce' },
      { grupo: 'Exterior · Luces', clave: 'luz_intermitentes', label: 'Luces intermitentes' },
      // Exterior — Neumáticos
      { grupo: 'Exterior · Neumáticos', clave: 'neu_del_der', label: 'Delantero derecho' },
      { grupo: 'Exterior · Neumáticos', clave: 'neu_del_izq', label: 'Delantero izquierdo' },
      { grupo: 'Exterior · Neumáticos', clave: 'neu_tra_der', label: 'Trasero derecho' },
      { grupo: 'Exterior · Neumáticos', clave: 'neu_tra_izq', label: 'Trasero izquierdo' },
      { grupo: 'Exterior · Neumáticos', clave: 'neu_tuerca', label: 'Tuerca sujetadora del rin' },
      { grupo: 'Exterior · Neumáticos', clave: 'neu_tapas_del', label: 'Tapas delanteras' },
      { grupo: 'Exterior · Neumáticos', clave: 'neu_tapas_tra', label: 'Tapas traseras' },
      // Exterior — General
      { grupo: 'Exterior · General', clave: 'guardapolvo', label: 'Guardapolvo' },
      { grupo: 'Exterior · General', clave: 'amortiguadores', label: 'Amortiguadores' },
      { grupo: 'Exterior · General', clave: 'tapa_gasolina', label: 'Tapa de gasolina' },
      // Accesorios
      { grupo: 'Accesorios', clave: 'acc_gato', label: 'Gato' },
      { grupo: 'Accesorios', clave: 'acc_triangulo', label: 'Triángulo' },
      { grupo: 'Accesorios', clave: 'acc_extintor', label: 'Extintor' },
      { grupo: 'Accesorios', clave: 'acc_repuesto', label: 'Caucho de repuesto' },
      { grupo: 'Accesorios', clave: 'acc_llave_rueda', label: 'Llave de rueda' },
      { grupo: 'Accesorios', clave: 'acc_caja_herr', label: 'Caja de herramientas' },
      // Capó abierto
      { grupo: 'Capó abierto', clave: 'cap_tapa_aceite_motor', label: 'Tapa de aceite de motor' },
      { grupo: 'Capó abierto', clave: 'cap_nivel_aceite_motor', label: 'Nivel de aceite motor' },
      { grupo: 'Capó abierto', clave: 'cap_tapa_aceite_caja', label: 'Tapa de aceite de caja' },
      { grupo: 'Capó abierto', clave: 'cap_tapa_aceite_dir', label: 'Tapa de aceite de dirección' },
      { grupo: 'Capó abierto', clave: 'cap_nivel_aceite_dir', label: 'Nivel de aceite de dirección' },
      { grupo: 'Capó abierto', clave: 'cap_tapa_limpiap', label: 'Tapa líq. limpiaparabrisas' },
      { grupo: 'Capó abierto', clave: 'cap_tapa_liga_freno', label: 'Tapa liga de freno' },
      { grupo: 'Capó abierto', clave: 'cap_nivel_liga_freno', label: 'Nivel de liga de freno' },
      { grupo: 'Capó abierto', clave: 'cap_tapa_refrigerante', label: 'Tapa de refrigerante' },
      { grupo: 'Capó abierto', clave: 'cap_nivel_refrigerante', label: 'Nivel líquido refrigerante' },
      { grupo: 'Capó abierto', clave: 'cap_correas', label: 'Correas' },
      { grupo: 'Capó abierto', clave: 'cap_bornes_bateria', label: 'Bornes de batería' },
      { grupo: 'Capó abierto', clave: 'cap_carga_bateria', label: 'Carga de batería' },
      // Inspección interna
      { grupo: 'Inspección interna', clave: 'int_alfombra', label: 'Alfombra' },
      { grupo: 'Inspección interna', clave: 'int_pantalla', label: 'Pantalla' },
      { grupo: 'Inspección interna', clave: 'int_tapasol', label: 'Tapasol' },
      { grupo: 'Inspección interna', clave: 'int_limpiap_tras', label: 'Limpiaparabrisas trasero' },
      { grupo: 'Inspección interna', clave: 'int_tapiceria', label: 'Tapicería' },
      { grupo: 'Inspección interna', clave: 'int_aire', label: 'Aire acondicionado' },
      { grupo: 'Inspección interna', clave: 'int_cenicero', label: 'Cenicero' },
      { grupo: 'Inspección interna', clave: 'int_freno_mano', label: 'Freno de mano' },
      { grupo: 'Inspección interna', clave: 'int_luces_ext', label: 'Luces externas' },
      { grupo: 'Inspección interna', clave: 'int_luces_int', label: 'Luces interiores' },
      { grupo: 'Inspección interna', clave: 'int_antena', label: 'Antena' },
      { grupo: 'Inspección interna', clave: 'int_radio', label: 'Radio' },
      { grupo: 'Inspección interna', clave: 'int_vidrios', label: 'Vidrios' },
      { grupo: 'Inspección interna', clave: 'int_cornetas', label: 'Cornetas' },
      { grupo: 'Inspección interna', clave: 'int_reloj', label: 'Reloj' },
      { grupo: 'Inspección interna', clave: 'int_frontal', label: 'Frontal' },
      { grupo: 'Inspección interna', clave: 'int_limpiap_del', label: 'Limpiaparabrisas delantero' },
      { grupo: 'Inspección interna', clave: 'int_embrague', label: 'Embrague' },
      { grupo: 'Inspección interna', clave: 'int_retrovisor', label: 'Retrovisor' },
      { grupo: 'Inspección interna', clave: 'int_encendedor', label: 'Encendedor' },
      { grupo: 'Inspección interna', clave: 'int_documentos', label: 'Documentos' },
    ],
  },
  chequeo: {
    tipo: 'chequeo',
    titulo: 'Chequeo de vehículo',
    descripcion: 'Revisión mecánica y estética intermedia del vehículo.',
    campos: [
      { clave: 'fecha', label: 'Fecha de chequeo', tipo: 'date' },
      { clave: 'realizado_por', label: 'Realizado por', tipo: 'text' },
      { clave: 'km', label: 'Kilometraje', tipo: 'number' },
    ],
    estados: ESTADOS_MG,
    items: [
      { grupo: 'Mecánica', clave: 'motor', label: 'Motor' },
      { grupo: 'Mecánica', clave: 'transmision', label: 'Transmisión' },
      { grupo: 'Mecánica', clave: 'frenos', label: 'Frenos' },
      { grupo: 'Mecánica', clave: 'direccion', label: 'Dirección' },
      { grupo: 'Mecánica', clave: 'suspension', label: 'Suspensión' },
      { grupo: 'Eléctrico', clave: 'electrico', label: 'Sistema eléctrico' },
      { grupo: 'Eléctrico', clave: 'luces', label: 'Luces' },
      { grupo: 'Eléctrico', clave: 'aire', label: 'Aire acondicionado' },
      { grupo: 'Eléctrico', clave: 'bateria', label: 'Batería' },
      { grupo: 'General', clave: 'neumaticos', label: 'Neumáticos' },
      { grupo: 'General', clave: 'fluidos', label: 'Niveles de fluidos' },
      { grupo: 'General', clave: 'tablero', label: 'Tablero / testigos' },
      { grupo: 'General', clave: 'carroceria', label: 'Carrocería' },
      { grupo: 'General', clave: 'tapiceria', label: 'Tapicería' },
    ],
  },
  pdi: {
    tipo: 'pdi',
    titulo: 'PDI en taller',
    descripcion: 'Inspección pre-entrega en taller (MG / MAXUS). OK: Bien · NF: No funciona · NE: No existe · R: Requerido.',
    campos: [
      { clave: 'fecha', label: 'Fecha de PDI', tipo: 'date' },
      { clave: 'realizado_por', label: 'Técnico responsable', tipo: 'text' },
      { clave: 'marca', label: 'Marca', tipo: 'select', opciones: ['MG', 'MAXUS'] },
      { clave: 'modelo', label: 'Modelo', tipo: 'text' },
      { clave: 'placa', label: 'Placa', tipo: 'text' },
      { clave: 'serial_carroceria', label: 'Serial de carrocería', tipo: 'text' },
      { clave: 'km', label: 'Kilometraje', tipo: 'number' },
    ],
    estados: ESTADOS_MG,
    items: [
      // Cabina delantera
      { grupo: 'Cabina delantera', clave: 'cab_puesto_conduccion', label: 'Inspección visual del puesto de conducción y acompañante' },
      { grupo: 'Cabina delantera', clave: 'cab_encendido', label: 'Verificación del sistema de encendido / botón Start-Stop' },
      { grupo: 'Cabina delantera', clave: 'cab_testigos_cuadro', label: 'Funcionalidad de testigos luminosos en el cuadro de instrumentos' },
      { grupo: 'Cabina delantera', clave: 'cab_indicadores_tablero', label: 'Chequeo de indicadores y testigos luminosos en tablero' },
      { grupo: 'Cabina delantera', clave: 'cab_volante_direccion', label: 'Revisión de volante, levas de cambio y sistema de dirección' },
      { grupo: 'Cabina delantera', clave: 'cab_botones_bocina', label: 'Funcionalidad de botones multifunción y bocina' },
      { grupo: 'Cabina delantera', clave: 'cab_palanca_luces', label: 'Operatividad de palanca de luces, intermitentes y limpiaparabrisas' },
      { grupo: 'Cabina delantera', clave: 'cab_elevavidrios', label: 'Comprobación del sistema de elevavidrios eléctrico (centralizado)' },
      { grupo: 'Cabina delantera', clave: 'cab_nivelacion_faros', label: 'Ajuste de nivelación de faros y retroiluminación del tablero' },
      { grupo: 'Cabina delantera', clave: 'cab_espejos_electricos', label: 'Funcionamiento de control eléctrico de espejos laterales' },
      { grupo: 'Cabina delantera', clave: 'cab_climatizacion', label: 'Revisión del sistema de climatización / salidas de aire frontales' },
      { grupo: 'Cabina delantera', clave: 'cab_pantalla_instrumentos', label: 'Centro de información del conductor (pantalla de instrumentos)' },
      { grupo: 'Cabina delantera', clave: 'cab_multimedia', label: 'Verificación de sistema multimedia MP3/MP5 y conectividad' },
      { grupo: 'Cabina delantera', clave: 'cab_tomas_corriente', label: 'Chequeo de tomas de corriente, encendedor, cenicero y portavasos' },
      { grupo: 'Cabina delantera', clave: 'cab_botones_aux', label: 'Funcionamiento de botones auxiliares / funciones especiales' },
      { grupo: 'Cabina delantera', clave: 'cab_parasoles', label: 'Estado de parasoles y espejo de cortesía' },
      { grupo: 'Cabina delantera', clave: 'cab_retrovisor_interno', label: 'Inspección del espejo retrovisor interno (manual / electrónico)' },
      { grupo: 'Cabina delantera', clave: 'cab_techo_corredizo', label: 'Operatividad del techo corredizo y cortina (si aplica)' },
      { grupo: 'Cabina delantera', clave: 'cab_porta_lentes', label: 'Estado de porta lentes y asas de sujeción' },
      { grupo: 'Cabina delantera', clave: 'cab_cinturones', label: 'Condición de cinturones de seguridad (retracción, fijación y alerta)' },
      { grupo: 'Cabina delantera', clave: 'cab_pilar_b', label: 'Moldura y agarraderas del pilar B' },
      { grupo: 'Cabina delantera', clave: 'cab_asientos', label: 'Ajuste y confort de asientos delanteros (manual / eléctrico)' },
      { grupo: 'Cabina delantera', clave: 'cab_freno_estac', label: 'Revisión del freno de estacionamiento (mecánico / electrónico)' },
      { grupo: 'Cabina delantera', clave: 'cab_guantera', label: 'Inspección de guantera y compartimientos adicionales' },
      { grupo: 'Cabina delantera', clave: 'cab_pilar_a', label: 'Moldura del pilar A y estado del tapizado interior del techo' },
      // Sistemas complementarios
      { grupo: 'Sistemas complementarios', clave: 'sc_camara_360', label: 'Inspección de cámara de reversa, sensores y sistema 360°' },
      { grupo: 'Sistemas complementarios', clave: 'sc_control_remoto', label: 'Prueba de apertura/cierre con control remoto y llave mecánica' },
      { grupo: 'Sistemas complementarios', clave: 'sc_microinterruptores', label: 'Chequeo de microinterruptores de puertas y capó' },
      { grupo: 'Sistemas complementarios', clave: 'sc_porton_kick', label: 'Apertura automática de portón trasero (kick sensor)' },
      // Compartimiento del motor
      { grupo: 'Compartimiento del motor', clave: 'cm_apertura_capo', label: 'Apertura por manija interior / verificación del capó' },
      { grupo: 'Compartimiento del motor', clave: 'cm_aislamiento', label: 'Inspección de aislamiento acústico, paneles y recubrimientos' },
      { grupo: 'Compartimiento del motor', clave: 'cm_tuberias', label: 'Chequeo del sistema de tuberías (combustible, refrigeración, aire)' },
      { grupo: 'Compartimiento del motor', clave: 'cm_arnes', label: 'Integridad del arnés eléctrico' },
      { grupo: 'Compartimiento del motor', clave: 'cm_etiquetas', label: 'Visibilidad de etiquetas de advertencia y normativas técnicas' },
      // Chasis y tren motriz
      { grupo: 'Chasis y tren motriz', clave: 'ch_suspension', label: 'Verificación del sistema de suspensión y componentes' },
      { grupo: 'Chasis y tren motriz', clave: 'ch_motor_fugas', label: 'Estado del motor y posibles fugas externas' },
      { grupo: 'Chasis y tren motriz', clave: 'ch_transmision', label: 'Chequeo visual de la caja de transmisión y subchasis' },
      { grupo: 'Chasis y tren motriz', clave: 'ch_frenos', label: 'Revisión de sistema de frenos (discos, tambores, cilindros)' },
      { grupo: 'Chasis y tren motriz', clave: 'ch_tanque', label: 'Integridad del tanque de combustible' },
      { grupo: 'Chasis y tren motriz', clave: 'ch_baterias', label: 'Condición del paquete de baterías (híbridos o eléctricos)' },
      { grupo: 'Chasis y tren motriz', clave: 'ch_oleoductos', label: 'Comprobación de oleoductos, cables de alimentación y aislamiento' },
      { grupo: 'Chasis y tren motriz', clave: 'ch_eje_trasero', label: 'Estado del eje trasero y ballestas (si aplica)' },
      { grupo: 'Chasis y tren motriz', clave: 'ch_capa_protectora', label: 'Capa protectora inferior del chasis' },
      { grupo: 'Chasis y tren motriz', clave: 'ch_escape', label: 'Inspección del sistema de escape' },
      { grupo: 'Chasis y tren motriz', clave: 'ch_repuesto', label: 'Verificación de neumático de repuesto (presión, fijación)' },
    ],
  },
}

export const TIPO_LABEL: Record<string, string> = {
  recepcion: 'Recepción',
  chequeo: 'Chequeo',
  pdi: 'PDI',
}

// Agrupa los ítems de una plantilla por su campo `grupo`, preservando el orden.
export function agruparItems(items: ItemPlantilla[]): { grupo: string; items: ItemPlantilla[] }[] {
  const orden: string[] = []
  const mapa: Record<string, ItemPlantilla[]> = {}
  for (const it of items) {
    const g = it.grupo || 'General'
    if (!mapa[g]) { mapa[g] = []; orden.push(g) }
    mapa[g].push(it)
  }
  return orden.map(g => ({ grupo: g, items: mapa[g] }))
}
