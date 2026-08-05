import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { PdfMembrete, MembreteData } from './pdf-membrete'

const DARK = '#111827'
const GRAY = '#6b7280'
const LINE = '#d1d5db'

export interface UnidadData {
  marca: string
  modelo: string
  version?: string
  vin?: string
  serialMotor?: string
  anio?: string | number
  placa?: string
  color?: string
  fechaLlegada?: string
}

export interface FeEntregaData {
  fecha: string
  membrete: MembreteData
  selloSrc?: string
  numeroProforma: string
  solicitado: string
  clienteNombre: string
  clienteCiRif: string
  vehiculo: UnidadData
}

// Ítems del acta (checklist para marcar a mano en la entrega).
const ACCESORIOS = [
  'Espejo lateral derecho', 'Parabrisas', 'Varilla de aceite',
  'Espejo lateral izquierdo', 'Emblema trasero', 'Llave de rueda',
  'Espejo retrovisor', 'Cristales de puertas', 'Gato',
  'Alfombras', 'Tapa de encendedor', 'Luces de emergencia',
  'Limpiadores', 'Faros y luces', 'Claxon',
  'Molduras', 'Parachoque trasero', 'Viseras',
  'Emblema delantero', 'Parachoque delantero', 'Cinturones de seguridad',
  'Parrilla', 'Antena', 'Caucho de repuesto',
  'Radio', 'Centros de ruedas', 'Manijas de puerta',
  'Placa delantera', 'Tapa de gasolina', 'Placa trasera',
  'Tapa de radiador', 'Tapa de aceite', 'Extinguidor',
]
const CARROCERIA = [
  'Costado derecho', 'Luces internas',
  'Costado izquierdo', 'Pintura',
  'Capot', 'Sistema de alarma',
  'Techo', 'Compuerta',
  'Exterior limpio', 'Interior limpio',
]
const CAUCHOS = ['Delantera derecha', 'Delantera izquierda', 'Trasera derecha', 'Trasera izquierda', 'Refacción']

const GARANTIA: string[] = [
  'Todos los reclamos son notificados y llevados a cabo por un Servicio Técnico autorizado de MG / MAXUS, durante el período de garantía. Una vez realizados los diagnósticos por garantía, se procede a realizar los trámites con casa matriz, respetando los tiempos de respuesta para su posterior reparación o sustitución del repuesto averiado.',
  'Este manual establece los criterios y normas de inspección técnica y mantenimiento de su vehículo. Incluye todas las instrucciones sobre el mantenimiento y sus intervalos, a fin de asegurar el funcionamiento confiable de su vehículo.',
  'En el caso de que las fallas ocurran durante el uso del vehículo, sólo un Proveedor de Servicios autorizado tiene el derecho de aceptar las solicitudes de garantía de calidad y, cuando encuentre fallas, debe concurrir inmediatamente al Proveedor de Servicios autorizado.',
  'El usuario deberá presentar el Instructivo de Garantía y Servicio sellado por el Proveedor Autorizado de Servicio Técnico, para validar los servicios consecutivos. De no realizarse el primer mantenimiento obligatorio a los 1.500 km según lo estipulado, automáticamente se considerará que su dueño ha renunciado al mantenimiento del vehículo, lo que ocasiona que la garantía quede anulada a nivel nacional.',
  'El plazo de garantía de los neumáticos es de 30 días bajo un uso normal; no se amparan caídas en huecos, sobrepresión o baja presión de aire que llegue a afectar la banda de rodamiento.',
  'El plazo de garantía de la batería es de 12 meses o 20.000 km (lo que suceda primero) bajo un uso normal, siendo determinado el defecto por los resultados del comprobador de baterías.',
  'Los vidrios quedarán sujetos a garantía por su decoloración, distorsión óptica, burbujas y estratificado debido a los materiales y el proceso de fabricación durante un plazo de 30 días a partir de la compra del vehículo.',
  'No quedarán cubiertos por la garantía desperfectos en: ninguna clase de aceite (grasa), líquido de frenos, líquido refrigerante del motor, luces, fusibles, escobillas del limpiaparabrisas, inyector de combustible, filtro de combustible, filtro de aire, filtro de aceite, descascarado de la pintura o resquebrajado, ya sean causados por el usuario o por las condiciones climáticas.',
  'El disco de fricción del embrague y el revestimiento del disco de freno no serán cubiertos por la garantía, excepto en caso de fallo de los materiales ocurrido dentro de los primeros 3 meses o 5.000 km.',
  'En el caso de aquellos vehículos a los que se haya realizado mantenimiento en un centro que no sea un Proveedor Autorizado de Servicio Técnico MAXUS / MG, por la falta de mantenimiento por parte del cliente, no serán indemnizados por nuestra empresa y todo costo inherente quedará a cargo del cliente.',
  'Daños producidos en el vehículo a causa del equipado, reacondicionado o modificación del mismo (sistema eléctrico y otros sistemas mecánicos) sin el consentimiento de nuestra empresa: todo costo ocasionado quedará a cargo del cliente.',
]

export function FeEntregaPDF({ data }: { data: FeEntregaData }) {
  const primario = data.membrete.colorPrimario || '#C41E3A'
  const v = data.vehiculo
  const s = StyleSheet.create({
    page: { paddingTop: 26, paddingHorizontal: 30, paddingBottom: 36, fontFamily: 'Helvetica', fontSize: 7.5, color: DARK },
    pageNum: { position: 'absolute', top: 12, right: 30, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: GRAY },
    title: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: primario, marginTop: 8, textAlign: 'center' },
    sub: { fontSize: 7.5, color: GRAY, textAlign: 'center', marginBottom: 6 },
    secTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fff', backgroundColor: DARK, paddingVertical: 2.5, paddingHorizontal: 6, marginTop: 7 },
    row: { flexDirection: 'row' },
    box: { width: 8.5, height: 8.5, border: `0.7pt solid ${GRAY}`, borderRadius: 1 },
    infoRow: { flexDirection: 'row', marginTop: 4, marginBottom: 2 },
    infoCell: { flex: 1 },
    lbl: { fontSize: 6.5, color: GRAY, textTransform: 'uppercase' },
    val: { fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
    th: { fontSize: 6.6, fontFamily: 'Helvetica-Bold', color: DARK, textAlign: 'center' },
    cellTxt: { fontSize: 6.9 },
    p: { fontSize: 7.2, lineHeight: 1.4, marginBottom: 3, textAlign: 'justify' },
    firmaBlock: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    firmaCol: { width: '48%', alignItems: 'center', marginTop: 16 },
    firmaLine: { width: '100%', borderBottom: `0.8pt solid ${DARK}`, height: 18, marginBottom: 3 },
    firmaLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold' },
    firmaSub: { fontSize: 6.5, color: GRAY },
    selloWrap: { height: 62, alignItems: 'center', justifyContent: 'center' },
    sello: { width: 78, height: 62, objectFit: 'contain', opacity: 0.9 },
  })

  // Celda "item + SÍ + NO" (una de las 3 columnas del checklist).
  const SiNo = ({ item }: { item: string }) => (
    <View style={[s.row, { flex: 1, alignItems: 'center', paddingVertical: 1.5, paddingHorizontal: 3, borderBottom: `0.5pt solid ${LINE}` }]}>
      <Text style={[s.cellTxt, { flex: 1 }]}>{item}</Text>
      <View style={[s.box, { marginHorizontal: 5 }]} />
      <View style={s.box} />
    </View>
  )
  const Membrete = ({ n }: { n: string }) => (
    <>
      <Text style={s.pageNum} fixed>{n}</Text>
      <PdfMembrete data={data.membrete} />
    </>
  )
  const Firmas = () => (
    <View style={s.firmaBlock} wrap={false}>
      <View style={s.firmaCol}><View style={s.firmaLine} /><Text style={s.firmaLabel}>Nombre y firma</Text><Text style={s.firmaSub}>Dpto. Servicios (Entrega)</Text></View>
      <View style={s.firmaCol}><View style={s.firmaLine} /><Text style={s.firmaLabel}>Nombre y firma</Text><Text style={s.firmaSub}>Dpto. Ventas</Text></View>
      <View style={s.firmaCol}><View style={s.firmaLine} /><Text style={s.firmaLabel}>Nombre y firma</Text><Text style={s.firmaSub}>Vendedor</Text></View>
      <View style={s.firmaCol}>
        {data.selloSrc ? <View style={s.selloWrap}><Image src={data.selloSrc} style={s.sello} /></View> : <View style={s.firmaLine} />}
        <Text style={s.firmaLabel}>{data.clienteNombre}</Text><Text style={s.firmaSub}>Cliente (Recibe)</Text>
      </View>
    </View>
  )

  return (
    <Document title={`Fe de entrega ${data.numeroProforma}`} author={data.membrete.nombre}>
      {/* ── PÁGINA 1: inspección + firmas ── */}
      <Page size="A4" style={s.page}>
        <Membrete n="1 / 2" />
        <Text style={s.title}>FE DE ENTREGA DEL VEHÍCULO</Text>
        <Text style={s.sub}>Proforma {data.numeroProforma} · {data.fecha}</Text>

        <View style={s.infoRow}>
          <View style={s.infoCell}><Text style={s.lbl}>Solicitado por</Text><Text style={s.val}>{data.solicitado || '—'}</Text></View>
          <View style={{ flex: 2 }}><Text style={s.lbl}>Cliente</Text><Text style={s.val}>{data.clienteNombre}{data.clienteCiRif ? `  ·  ${data.clienteCiRif}` : ''}</Text></View>
        </View>

        {/* Características de la unidad */}
        <Text style={s.secTitle}>CARACTERÍSTICAS DE LA UNIDAD</Text>
        <View style={[s.row, { borderTop: `0.5pt solid ${LINE}` }]}>
          <View style={{ flex: 1 }}>
            {[['Marca', v.marca], ['Modelo', v.version ? `${v.modelo} ${v.version}` : v.modelo], ['Serial VIN', v.vin], ['Serial motor', v.serialMotor]].map(([k, val]) => (
              <View key={k as string} style={[s.row, { paddingVertical: 1.7, paddingHorizontal: 3, borderBottom: `0.5pt solid ${LINE}` }]}>
                <Text style={[s.cellTxt, { width: 60, color: GRAY }]}>{k}:</Text>
                <Text style={[s.cellTxt, { flex: 1, fontFamily: 'Helvetica-Bold' }]}>{val || ''}</Text>
              </View>
            ))}
          </View>
          <View style={{ flex: 1 }}>
            {[['Año', v.anio != null ? String(v.anio) : ''], ['Placa', v.placa], ['Color', v.color], ['Fecha de llegada', v.fechaLlegada]].map(([k, val]) => (
              <View key={k as string} style={[s.row, { paddingVertical: 1.7, paddingHorizontal: 3, borderBottom: `0.5pt solid ${LINE}` }]}>
                <Text style={[s.cellTxt, { width: 76, color: GRAY }]}>{k}:</Text>
                <Text style={[s.cellTxt, { flex: 1, fontFamily: 'Helvetica-Bold' }]}>{val || ''}</Text>
              </View>
            ))}
          </View>
          <View style={{ flex: 1 }}>
            {['Manuales', 'Póliza de seguros', 'Fecha de entrega', 'Kilometraje llegada', 'Kilometraje de salida'].map(k => (
              <View key={k} style={[s.row, { alignItems: 'center', paddingVertical: 1.35, paddingHorizontal: 3, borderBottom: `0.5pt solid ${LINE}` }]}>
                <Text style={[s.cellTxt, { flex: 1 }]}>{k}</Text>
                <View style={[s.box, { marginRight: 4 }]} />
              </View>
            ))}
          </View>
        </View>

        {/* Accesorios y herramientas — 3 columnas */}
        <Text style={s.secTitle}>ACCESORIOS Y HERRAMIENTAS</Text>
        <View style={[s.row, { backgroundColor: '#f3f4f6', paddingVertical: 2 }]}>
          {[0, 1, 2].map(c => (
            <View key={c} style={[s.row, { flex: 1 }]}>
              <Text style={[s.th, { flex: 1, textAlign: 'left', paddingLeft: 3 }]}>Descripción</Text>
              <Text style={[s.th, { width: 19 }]}>SÍ</Text>
              <Text style={[s.th, { width: 14 }]}>NO</Text>
            </View>
          ))}
        </View>
        {Array.from({ length: Math.ceil(ACCESORIOS.length / 3) }).map((_, r) => (
          <View key={r} style={s.row}>
            <SiNo item={ACCESORIOS[r * 3] ?? ''} />
            <SiNo item={ACCESORIOS[r * 3 + 1] ?? ''} />
            <SiNo item={ACCESORIOS[r * 3 + 2] ?? ''} />
          </View>
        ))}

        {/* Carrocería e interiores */}
        <Text style={s.secTitle}>CARROCERÍA E INTERIORES</Text>
        <View style={[s.row, { backgroundColor: '#f3f4f6', paddingVertical: 2 }]}>
          {[0, 1].map(c => (
            <View key={c} style={[s.row, { flex: 1 }]}>
              <Text style={[s.th, { flex: 1, textAlign: 'left', paddingLeft: 3 }]}>Descripción</Text>
              <Text style={[s.th, { width: 30 }]}>Bueno</Text>
              <Text style={[s.th, { width: 34 }]}>Regular</Text>
              <Text style={[s.th, { width: 26 }]}>Malo</Text>
            </View>
          ))}
        </View>
        {Array.from({ length: Math.ceil(CARROCERIA.length / 2) }).map((_, r) => (
          <View key={r} style={s.row}>
            {[0, 1].map(c => {
              const item = CARROCERIA[r * 2 + c] ?? ''
              return (
                <View key={c} style={[s.row, { flex: 1, alignItems: 'center', paddingVertical: 1.5, paddingHorizontal: 3, borderBottom: `0.5pt solid ${LINE}` }]}>
                  <Text style={[s.cellTxt, { flex: 1 }]}>{item}</Text>
                  <View style={{ width: 30, alignItems: 'center' }}><View style={s.box} /></View>
                  <View style={{ width: 34, alignItems: 'center' }}><View style={s.box} /></View>
                  <View style={{ width: 26, alignItems: 'center' }}><View style={s.box} /></View>
                </View>
              )
            })}
          </View>
        ))}

        {/* Cauchos */}
        <Text style={s.secTitle}>CAUCHOS</Text>
        <View style={[s.row, { backgroundColor: '#f3f4f6', paddingVertical: 2 }]}>
          <Text style={[s.th, { flex: 1, textAlign: 'left', paddingLeft: 3 }]}>Descripción</Text>
          {['Nueva', '½ vida', '¼ vida', 'Lisa'].map(h => <Text key={h} style={[s.th, { width: 44 }]}>{h}</Text>)}
        </View>
        {CAUCHOS.map(item => (
          <View key={item} style={[s.row, { alignItems: 'center', paddingVertical: 1.7, paddingHorizontal: 3, borderBottom: `0.5pt solid ${LINE}` }]}>
            <Text style={[s.cellTxt, { flex: 1 }]}>{item}</Text>
            {[0, 1, 2, 3].map(i => <View key={i} style={{ width: 44, alignItems: 'center' }}><View style={s.box} /></View>)}
          </View>
        ))}

        {/* Observaciones — 4 líneas */}
        <Text style={s.secTitle}>OBSERVACIONES</Text>
        {[0, 1, 2, 3].map(i => <View key={i} style={{ borderBottom: `0.5pt solid ${LINE}`, height: 14 }} />)}

        {/* Firmas (página 1) — el cliente firma y va el sello */}
        <Firmas />
      </Page>

      {/* ── PÁGINA 2: términos y condiciones de garantía ── */}
      <Page size="A4" style={s.page}>
        <Membrete n="2 / 2" />
        <Text style={s.title}>TÉRMINOS Y CONDICIONES DE GARANTÍA GENERAL</Text>
        <Text style={s.sub}>Fe de entrega · Proforma {data.numeroProforma} · {data.fecha}</Text>

        <View style={{ marginTop: 6 }}>
          {GARANTIA.map((t, i) => <Text key={i} style={s.p}>• {t}</Text>)}
        </View>

        <Text style={[s.p, { marginTop: 8 }]}>
          Mediante el presente documento se deja constancia de que el cliente <Text style={{ fontFamily: 'Helvetica-Bold' }}>{data.clienteNombre}</Text> ha
          recibido un breve resumen de las cláusulas de garantía y queda conforme con lo antes mencionado. Fecha:{' '}
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{data.fecha}</Text>.
        </Text>

        {/* Firmas (página 2) */}
        <Firmas />
      </Page>
    </Document>
  )
}
