import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

// Anexo "A" del Plan Asegúrate con $500 — diseño TOP con membrete del concesionario.
// Dos variantes:
//   · 'oriental'    → montos idénticos a la proforma (cuota 1 incluye los $500).
//   · 'vehimotors'  → cuota 1 = cuota 1 base − $500 (lo que se solicita a Vehimotors).

const RED = '#C41E3A'
const DARK = '#111827'
const GRAY = '#6b7280'
const LIGHT = '#f9fafb'
const BORDER = '#e5e7eb'

export interface AnexoACuota { label: string; monto: number }

export interface AnexoAData {
  // Membrete / concesionario
  logoSrc?: string
  selloSrc?: string
  membreteSrc?: string   // banner full-width (p. ej. membrete de Vehimotors); si está, ocupa todo el ancho del header
  empresaNombre?: string
  empresaRif?: string | null
  empresaDireccion?: string | null
  empresaTelefono?: string | null
  empresaCorreo?: string | null
  colorPrimario?: string | null
  colorSecundario?: string | null
  // Meta
  variante: 'oriental' | 'vehimotors'
  ciclo?: string | number | null
  fecha: string
  // Cliente
  clienteNombre: string
  estadoCivil?: string | null
  conyuge?: { nombre?: string | null; cedula?: string | null; rif?: string | null } | null
  clienteCedula?: string | null
  clienteRif?: string | null
  clienteDireccion?: string | null
  clienteTelefono?: string | null
  clienteCorreo?: string | null
  // Plan
  unidad: string
  colores?: string | null
  gastosAsociados: number      // = cuota 6
  valorVentaUnidad: number     // = reserva + cuotas 1..5
  reserva: number
  cuotas: AnexoACuota[]        // cuotas 1..5 (ya ajustadas según variante)
  totalPagar: number
  serieCobertura?: string | null  // fila de garantía resaltada según modelo
  firmaClienteSrc?: string | null  // firma digital del cliente (PNG), se dibuja sobre la línea
}

const fmt = (n: number) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const COBERTURAS: { marca: string; cobertura: string }[] = [
  { marca: 'Maxus Series T, V, S, C, G', cobertura: '3 años / 100.000 km' },
  { marca: 'Maxus Series D', cobertura: '5 años / 120.000 km' },
  { marca: 'Maxus Series H, K', cobertura: '2 años / 240.000 km' },
  { marca: 'MG (VIN > 2025)', cobertura: '6 años / 120.000 km' },
  { marca: 'Baterías eléctricas / híbridas', cobertura: '8 años / 150.000 km' },
]

const NOTA_FLETES = 'Ciertas condiciones podrán aplicar, relacionadas con el gasto por concepto de cancelación de fletes, por nuevas regulaciones marítimas, y de impuestos de nacionalización, que se encuentran de manera específica en el contrato final. (Las cuales el Comprador declara conocer).'

const NOTA_COLOR = 'Nota *1: El Cliente acepta y entiende que la selección de este(os) color(es) es solo a manera referencial, y que los mismos dependerán del proceso interno de disponibilidad al momento de la orden de compra y de posterior ensamblaje, según disponibilidad de la Fábrica SAIC MOTORS de la República Popular China; por lo que, ésta declaración de preferencia de color(es), solo es a modo de señalamiento, y de ninguna manera implica, ni se constituye en una obligación de VEHIMOTORS, de hacer la entrega a EL COMPRADOR, del(os) vehículo(s) del color indicado como preferencia el comprador, pues los mismos estarán sujetos al proceso interno de disponibilidad manejado en la fábrica de SAIC MOTORS en la República Popular China.'

const COND_GARANTIA = [
  'Que todos los reclamos sean notificados y llevados a cabo por el concesionario o distribuidor autorizado durante el período de garantía.',
  'Que todas las reparaciones, rectificación de desperfectos, mantenimiento o montaje de repuestos y accesorios sean realizadas por el Concesionario o distribuidor autorizado por la marca.',
  'El vehículo debe contar con un registro de mantenimiento acorde a las pautas establecidas por el fabricante (cada 5.000 km).',
  'Todas las operaciones de mantenimiento deben realizarse de acuerdo con el Plan de Mantenimiento (lo podrá encontrar en nuestras páginas webs oficiales o en cualquier centro de servicio autorizado).',
]

const ALCANCE = [
  'La reparación, el reemplazo o el ajuste sin cobro adicional por parte del Concesionario o Distribuidor autorizado, de las piezas que puedan llegar a fallar durante el período de garantía como resultado de un defecto de fabricación o ensamblaje (consulte el alcance y períodos de cobertura específica).',
  'Para mantenimientos y/o reparaciones se deben utilizar repuestos originales.',
  'Para hacer uso de la garantía, se debe acudir al concesionario autorizado más cercano para su análisis, gestión y reparación.',
]

const NO_CUBRE = [
  'Cualquier falla causada por métodos de almacenamiento inadecuados, tales como fallas de motor o del sistema de combustible causados por aceites o combustibles contaminados, entre otros.',
  'Descarga de la batería o daño sobre la pintura por acción del medioambiente.',
  'Aquellos artículos que requieran reemplazo o mantenimiento debido a un desgaste normal o suscitado por factores externos (combustible, uso extremo o anormal), tales como neumáticos, pastillas de freno, disco de embrague, bombillos, limpiaparabrisas, bombas de combustibles, bombas de inyección, inyectores, riel de inyección.',
  'Cualquier falla causada por falta de mantenimiento periódico.',
  'Daños causados por no seguir las instrucciones de mantenimiento del manual del usuario.',
  'Daños provocados por la caída de sustancias (sustancias químicas, lluvia ácida), piedras, granizo, rayos, terremotos, inundaciones, conmociones sociales, humedad del ambiente, etc.',
  'Daños al vehículo causados por el uso de productos no autorizados.',
  'Daños causados por un uso inadecuado o por un mantenimiento deficiente, incluida la sobrecarga o utilizar el vehículo para carreras, exhibiciones o pruebas de manejo externas no autorizadas por la marca.',
  'Daños causados por modificaciones al vehículo (incluyendo carrocería, chasis, tren motriz, sistemas electrónicos u otros).',
  'Cualquier vehículo cuyo odómetro haya sido desconectado o cambiado (que no sea un cambio realizado por un distribuidor autorizado).',
  'Cualquier gasto que esté fuera del alcance de la garantía del automóvil, como pérdida de uso del vehículo, pérdida de salarios, molestias, costos de almacenamiento, costo de alquiler de autos, hospedaje, comidas o gastos de viaje, grúas, gastos legales, entre otros.',
]

const OTROS_COMPONENTES: [string, string][] = [
  ['Filtro de aire motor', '3 meses o 5.000 km'],
  ['Filtro de polen', '3 meses o 5.000 km'],
  ['Filtro de aceite motor', '3 meses o 5.000 km'],
  ['Filtro de combustible', '6 meses o 10.000 km'],
  ['Bujías (sin óxido)', '3 meses o 5.000 km'],
  ['Discos y pastillas de freno', '6 meses o 10.000 km'],
  ['Conjunto de embrague', '6 meses o 10.000 km'],
  ['Batería (acumulador)', '12 meses o 20.000 km'],
  ['Batería de control remoto', '3 meses o 5.000 km'],
  ['Plumillas de limpiaparabrisas', '3 meses o 5.000 km'],
  ['Bombillería', '3 meses o 5.000 km'],
  ['Amortiguadores', '12 meses o 20.000 km (uso normal)'],
  ['Alineación y balanceo', '6 meses o 10.000 km'],
  ['Neumáticos', '6 meses o 10.000 km'],
]

export function AnexoADocument({ data }: { data: AnexoAData }) {
  const primario = data.colorPrimario || RED
  const secundario = data.colorSecundario || DARK
  const esVehimotors = data.variante === 'vehimotors'
  // El anexo que se envía a Vehimotors lleva el membrete de Vehimotors, C.A.
  const emp = esVehimotors ? {
    nombre: 'VEHIMOTORS, C.A.',
    rif: 'J-50091794-5',
    dir: 'Avenida Blandin, La Castellana\nCaracas 1080 - Venezuela',
    tel: null as string | null,
    correo: null as string | null,
    logo: undefined as string | undefined,
    membrete: data.membreteSrc,
  } : {
    nombre: data.empresaNombre,
    rif: data.empresaRif ?? null,
    dir: data.empresaDireccion ?? null,
    tel: data.empresaTelefono ?? null,
    correo: data.empresaCorreo ?? null,
    logo: data.logoSrc,
    membrete: data.membreteSrc,
  }
  const empDir = (emp.dir || '').split('\n').filter(Boolean)

  const s = StyleSheet.create({
    page: { fontSize: 9, fontFamily: 'Helvetica', color: DARK, paddingBottom: 46 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '14pt 30pt 12pt', borderBottom: `2pt solid ${primario}` },
    logoWrap: { flexShrink: 0, width: 180 },
    logo: { width: 180, height: 42, objectFit: 'contain', objectPositionX: 0 },
    company: { flex: 1, alignItems: 'flex-end', paddingLeft: 18 },
    membreteWrap: { position: 'relative', borderBottom: `2pt solid ${primario}` },
    membreteFull: { width: '100%', objectFit: 'contain' },
    membreteDataAbs: { position: 'absolute', top: 10, right: 30, alignItems: 'flex-end' },
    companyName: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: secundario, textAlign: 'right' },
    companyRif: { fontSize: 6.5, color: primario, fontFamily: 'Helvetica-Bold', marginTop: 1, textAlign: 'right' },
    companyLine: { fontSize: 6, color: GRAY, textAlign: 'right' },

    body: { padding: '14pt 30pt' },

    // Título (más compacto)
    titleBand: { backgroundColor: secundario, borderRadius: 7, padding: '7pt 14pt', marginBottom: 12, position: 'relative', overflow: 'hidden' },
    titleAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: primario },
    titleMain: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#fff', letterSpacing: 1 },
    titleSub: { fontSize: 6.5, color: '#d1d5db', marginTop: 1.5, letterSpacing: 0.5, textTransform: 'uppercase' },
    pill: { position: 'absolute', right: 12, top: 11, backgroundColor: primario, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10 },
    pillText: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#fff' },

    sectionLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: primario, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, marginTop: 4 },

    card: { backgroundColor: LIGHT, border: `1pt solid ${BORDER}`, borderRadius: 8, padding: '10pt 12pt', marginBottom: 12 },
    row: { flexDirection: 'row', marginBottom: 3 },
    key: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: DARK, width: 130 },
    val: { fontSize: 8.5, color: '#374151', flex: 1 },

    grid2: { flexDirection: 'row', gap: 12 },
    col: { flex: 1 },

    planRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
    planKey: { fontSize: 8.5, color: GRAY },
    planVal: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: DARK },
    nota: { fontSize: 7, color: primario, fontStyle: 'italic', marginTop: 4, lineHeight: 1.3 },

    // Cronograma
    tHead: { flexDirection: 'row', backgroundColor: secundario, borderRadius: 4, padding: '6pt 10pt' },
    tHeadCell: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fff' },
    tRow: { flexDirection: 'row', padding: '6pt 10pt', borderBottom: `0.5pt solid ${BORDER}` },
    tRowAlt: { backgroundColor: LIGHT },
    tConcepto: { flex: 1, fontSize: 8.5, color: DARK },
    tMonto: { width: 90, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: DARK, textAlign: 'right' },

    valorBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: LIGHT, border: `1pt solid ${BORDER}`, borderRadius: 6, padding: '8pt 12pt', marginTop: 8 },
    valorLbl: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: DARK },
    valorVal: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK },
    totalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: primario, borderRadius: 6, padding: '10pt 14pt', marginTop: 6 },
    totalLbl: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#fff', letterSpacing: 0.5 },
    totalVal: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#fff' },

    // Garantía (compacta para que quepa toda en 1 página)
    gTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: secundario, marginBottom: 2.5, marginTop: 5 },
    gIntro: { fontSize: 6.5, color: '#4b5563', marginBottom: 1.5, lineHeight: 1.2 },
    gItem: { fontSize: 6.3, color: '#4b5563', marginBottom: 0.8, lineHeight: 1.2, flexDirection: 'row' },
    gBullet: { width: 8, color: primario },
    numNo: { width: 13, color: primario, fontFamily: 'Helvetica-Bold' },
    // Otros componentes y coberturas: dos columnas para ahorrar altura
    twoCol: { flexDirection: 'row', gap: 16 },
    twoColItem: { width: '48%' },
    otrosRow: { flexDirection: 'row', borderBottom: `0.5pt solid ${BORDER}`, paddingVertical: 1 },
    otrosPieza: { flex: 1, fontSize: 6.3, color: '#4b5563' },
    otrosPlazo: { fontSize: 6.3, fontFamily: 'Helvetica-Bold', color: DARK, textAlign: 'right' },
    covRow: { flexDirection: 'row', borderBottom: `0.5pt solid ${BORDER}`, paddingVertical: 1.5 },
    covMarca: { flex: 1, fontSize: 6.5, color: DARK },
    covCob: { width: 110, fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: DARK, textAlign: 'right' },
    covOn: { backgroundColor: '#fef2f2' },

    // Firmas
    firmas: { flexDirection: 'row', gap: 20, marginTop: 26 },
    firmaBox: { flex: 1, alignItems: 'center' },
    firmaImg: { height: 40, width: 120, objectFit: 'contain', marginBottom: -4, alignSelf: 'center' },
    firmaLine: { borderTop: `1pt solid ${DARK}`, width: '100%', marginBottom: 4 },
    firmaNom: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: DARK, textAlign: 'center' },
    firmaRol: { fontSize: 7.5, color: GRAY },
    sello: { position: 'absolute', right: 40, bottom: 60, width: 110, height: 110, objectFit: 'contain', opacity: 0.9 },

    footer: { position: 'absolute', bottom: 18, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between', borderTop: `0.5pt solid ${BORDER}`, paddingTop: 6 },
    footerText: { fontSize: 7, color: GRAY },
  })

  const Bullet = ({ children }: { children: React.ReactNode }) => (
    <View style={s.gItem}><Text style={s.gBullet}>•</Text><Text style={{ flex: 1 }}>{children}</Text></View>
  )
  const NumList = ({ items }: { items: string[] }) => (
    <>{items.map((t, i) => (
      <View key={i} style={s.gItem}><Text style={s.numNo}>{i + 1}.</Text><Text style={{ flex: 1 }}>{t}</Text></View>
    ))}</>
  )

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header / membrete */}
        {emp.membrete ? (
          /* Membrete full-width (banner) con los datos legales arriba a la derecha */
          <View fixed style={s.membreteWrap}>
            <Image src={emp.membrete} style={s.membreteFull} />
            <View style={s.membreteDataAbs}>
              <Text style={s.companyName}>{emp.nombre}{emp.rif ? `  ·  RIF: ${emp.rif}` : ''}</Text>
              {empDir.map((l, i) => <Text key={i} style={s.companyLine}>{l}</Text>)}
              {emp.tel ? <Text style={s.companyLine}>{emp.tel}{emp.correo ? ` · ${emp.correo}` : ''}</Text> : null}
            </View>
          </View>
        ) : (
          <View style={s.header} fixed>
            <View style={s.logoWrap}>
              {emp.logo ? <Image src={emp.logo} style={s.logo} /> : <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: secundario }}>{emp.nombre}</Text>}
            </View>
            <View style={s.company}>
              <Text style={s.companyName}>{emp.nombre}</Text>
              {emp.rif ? <Text style={s.companyRif}>RIF: {emp.rif}</Text> : null}
              {empDir.map((l, i) => <Text key={i} style={s.companyLine}>{l}</Text>)}
              {emp.tel ? <Text style={s.companyLine}>{emp.tel}{emp.correo ? ` · ${emp.correo}` : ''}</Text> : null}
            </View>
          </View>
        )}

        <View style={s.body}>
          {/* Título */}
          <View style={s.titleBand}>
            <View style={s.titleAccent} />
            <Text style={s.titleMain}>ANEXO «A»</Text>
            <Text style={s.titleSub}>Precio de venta, condiciones y cronograma de pago</Text>
            <View style={s.pill}><Text style={s.pillText}>ASEGÚRATE CON $500{data.ciclo ? `  ·  CICLO #${data.ciclo}` : ''}</Text></View>
          </View>

          {/* Cliente */}
          <Text style={s.sectionLabel}>Señores:</Text>
          <View style={s.card}>
            <View style={s.row}><Text style={s.key}>Cliente:</Text><Text style={s.val}>{data.clienteNombre}</Text></View>
            {data.estadoCivil ? <View style={s.row}><Text style={s.key}>Estado civil:</Text><Text style={s.val}>{data.estadoCivil}</Text></View> : null}
            {data.conyuge?.nombre ? <View style={s.row}><Text style={s.key}>Cónyuge:</Text><Text style={s.val}>{data.conyuge.nombre}{data.conyuge.cedula ? ` · C.I. ${data.conyuge.cedula}` : ''}{data.conyuge.rif ? ` · RIF ${data.conyuge.rif}` : ''}</Text></View> : null}
            <View style={s.row}><Text style={s.key}>Cédula de identidad:</Text><Text style={s.val}>{data.clienteCedula || '—'}</Text></View>
            <View style={s.row}><Text style={s.key}>RIF:</Text><Text style={s.val}>{data.clienteRif || '—'}</Text></View>
            <View style={s.row}><Text style={s.key}>Dirección:</Text><Text style={s.val}>{data.clienteDireccion || '—'}</Text></View>
            <View style={s.row}><Text style={s.key}>Teléfono:</Text><Text style={s.val}>{data.clienteTelefono || '—'}</Text></View>
            <View style={s.row}><Text style={s.key}>Correo electrónico:</Text><Text style={s.val}>{data.clienteCorreo || '—'}</Text></View>
          </View>

          <Text style={{ fontSize: 8.5, color: '#374151', marginBottom: 8 }}>
            A continuación, le presentamos un resumen de los acuerdos de nuestro plan de compra programada:
          </Text>

          {/* Plan — una sola columna: los gastos van debajo de los colores; la nota
              en rojo va DENTRO del cuadro, justo debajo de los gastos. */}
          <View style={s.card}>
            <View style={s.planRow}><Text style={s.planKey}>Fecha de inicio del plan:</Text><Text style={s.planVal}>{data.fecha}</Text></View>
            <View style={s.planRow}><Text style={s.planKey}>Unidad</Text><Text style={s.planVal}>{data.unidad}</Text></View>
            <View style={s.planRow}><Text style={s.planKey}>Color(es) de preferencia</Text><Text style={s.planVal}>{data.colores || '—'}</Text></View>
            <View style={s.planRow}><Text style={s.planKey}>Gastos asociados (IVA, IGTF y matriculación)</Text><Text style={s.planVal}>${fmt(data.gastosAsociados)}</Text></View>
            <Text style={{ fontSize: 7.5, color: primario, fontStyle: 'italic', lineHeight: 1.3, marginTop: 8, paddingTop: 6, borderTop: `0.5pt solid ${BORDER}` }}>
              Nota: estos valores son estimados a esta fecha y están sujetos a variación por orden o datos suministrados por los entes gubernamentales; se recotizarán al momento de ejecutar el pago final.
            </Text>
          </View>

          {/* Valor de venta de la unidad — antes del cronograma */}
          <View style={s.valorBox}>
            <Text style={s.valorLbl}>Valor (venta) de la unidad</Text>
            <Text style={s.valorVal}>${fmt(data.valorVentaUnidad)}</Text>
          </View>

          {/* Cronograma */}
          <Text style={[s.sectionLabel, { marginTop: 10 }]}>Cronograma de pagos convenido</Text>
          <View style={s.tHead}>
            <Text style={[s.tHeadCell, { flex: 1 }]}>CONCEPTO</Text>
            <Text style={[s.tHeadCell, { width: 90, textAlign: 'right' }]}>MONTO ($)</Text>
          </View>
          <View style={[s.tRow, s.tRowAlt]}><Text style={s.tConcepto}>Reserva</Text><Text style={s.tMonto}>{fmt(data.reserva)}</Text></View>
          {data.cuotas.map((c, i) => (
            <View key={i} style={i % 2 === 0 ? s.tRow : [s.tRow, s.tRowAlt]}>
              <Text style={s.tConcepto}>{c.label}</Text><Text style={s.tMonto}>{fmt(c.monto)}</Text>
            </View>
          ))}
          <View style={data.cuotas.length % 2 === 0 ? s.tRow : [s.tRow, s.tRowAlt]}>
            <Text style={s.tConcepto}>Al momento de la entrega del vehículo, cuota final (incluye IVA, IGTF y gastos de matriculación)</Text>
            <Text style={s.tMonto}>{fmt(data.gastosAsociados)}</Text>
          </View>

          {/* Cuadro de pago total — después del cronograma */}
          <View style={s.totalBox}>
            <Text style={s.totalLbl}>TOTAL A PAGAR</Text>
            <Text style={s.totalVal}>${fmt(data.totalPagar)}</Text>
          </View>

          {/* Notas de la primera página (carácter más pequeño) */}
          <Text style={[s.nota, { color: GRAY, marginTop: 6 }]}>{NOTA_FLETES}</Text>
          <Text style={s.nota}>{NOTA_COLOR}</Text>

          {/* Página 2: condiciones de garantía (texto completo del anexo) */}
          <View break />
          <View style={{ height: 16 }} />
          <Text style={s.gIntro}>Información de interés y de referencia para el proceso del plan de compra programada, a ejecutar.</Text>

          {/* Condiciones de garantía */}
          <Text style={s.gTitle}>Condiciones de garantía</Text>
          <Text style={s.gIntro}>Las condiciones de garantía requieren lo siguiente:</Text>
          <NumList items={COND_GARANTIA} />

          {/* Alcance */}
          <Text style={s.gTitle}>Alcance de la garantía</Text>
          <NumList items={ALCANCE} />

          {/* No cubre */}
          <Text style={s.gTitle}>El alcance de esta garantía, lo que no cubre:</Text>
          <NumList items={NO_CUBRE} />

          {/* Tiempo y kilometraje */}
          <Text style={[s.gTitle, { fontSize: 9 }]} wrap={false}>Tiempo y kilometraje por marca y serie</Text>
          <View style={s.covRow} wrap={false}>
            <Text style={[s.covMarca, { fontFamily: 'Helvetica-Bold' }]}>Marca</Text>
            <Text style={s.covCob}>Cobertura</Text>
          </View>
          {COBERTURAS.map((c, i) => {
            const on = data.serieCobertura && c.marca === data.serieCobertura
            return (
              <View key={i} style={on ? [s.covRow, s.covOn] : s.covRow} wrap={false}>
                <Text style={s.covMarca}>{c.marca}</Text>
                <Text style={s.covCob}>{c.cobertura}</Text>
              </View>
            )
          })}

          {/* Otros componentes con delimitación — en dos columnas para ahorrar espacio */}
          <Text style={[s.gTitle, { fontSize: 8.5 }]}>Otros componentes con delimitación</Text>
          <View style={s.twoCol}>
            {[OTROS_COMPONENTES.slice(0, Math.ceil(OTROS_COMPONENTES.length / 2)), OTROS_COMPONENTES.slice(Math.ceil(OTROS_COMPONENTES.length / 2))].map((col, ci) => (
              <View key={ci} style={s.twoColItem}>
                {col.map(([pieza, plazo], i) => (
                  <View key={i} style={s.otrosRow} wrap={false}>
                    <Text style={s.otrosPieza}>{pieza}</Text>
                    <Text style={s.otrosPlazo}>{plazo}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>

          {/* Firmas */}
          <View style={s.firmas} wrap={false}>
            <View style={s.firmaBox}>
              {!esVehimotors && data.firmaClienteSrc ? <Image src={data.firmaClienteSrc} style={s.firmaImg} /> : null}
              <View style={s.firmaLine} />
              <Text style={s.firmaNom}>Por: {esVehimotors ? 'TELECOMUNICACIONES ROCARLI, C.A.' : data.clienteNombre}</Text>
              <Text style={s.firmaRol}>{esVehimotors ? 'Firma' : 'Firma del comprador'}</Text>
            </View>
            <View style={s.firmaBox}>
              <View style={s.firmaLine} />
              <Text style={s.firmaNom}>Por: {esVehimotors ? 'VEHIMOTORS, C.A.' : (data.empresaNombre || 'JETPLUS')}</Text>
              <Text style={s.firmaRol}>{esVehimotors ? 'Firma' : 'Firma autorizada'}</Text>
            </View>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>{emp.nombre}{emp.rif ? ` · RIF ${emp.rif}` : ''}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

// Construye el cronograma y montos del Anexo según la variante.
// `cuotasBase` = cuotas 1..5 tal como salen del plan (con los $500 en la cuota 1).
// `cuotaFinal` = cuota 6 (gastos asociados: IVA, IGTF, matriculación).
export function buildAnexoMontos(opts: {
  variante: 'oriental' | 'vehimotors'
  reserva: number
  cuotasBase: number[]     // 5 cuotas
  cuotaFinal: number
}): { reserva: number; cuotas: AnexoACuota[]; gastosAsociados: number; valorVentaUnidad: number; totalPagar: number } {
  const r2 = (n: number) => Math.round(n * 100) / 100
  const reserva = opts.reserva
  const cuotasArr = [...opts.cuotasBase]
  // La versión Vehimotors resta los $500 a la cuota 1 (la reserva/gasto admin la retiene Jetplus).
  if (opts.variante === 'vehimotors' && cuotasArr.length > 0) {
    cuotasArr[0] = r2(cuotasArr[0] - 500)
  }
  const cuotas: AnexoACuota[] = cuotasArr.map((m, i) => ({ label: `${i + 1}, pago cuota ${i + 1}`, monto: r2(m) }))
  const gastosAsociados = r2(opts.cuotaFinal)
  const valorVentaUnidad = r2(reserva + cuotasArr.reduce((s, m) => s + m, 0))
  const totalPagar = r2(valorVentaUnidad + gastosAsociados)
  return { reserva, cuotas, gastosAsociados, valorVentaUnidad, totalPagar }
}
