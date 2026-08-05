import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { PdfMembrete, MembreteData } from './pdf-membrete'
import { UnidadData } from './fe-entrega-pdf'

const DARK = '#111827'
const GRAY = '#6b7280'
const LINE = '#d1d5db'

export interface ExoneracionData {
  fecha: string
  ciudad: string
  membrete: MembreteData
  selloSrc?: string
  numeroProforma: string
  solicitado: string
  clienteNombre: string
  clienteCiRif: string
  vehiculo: UnidadData
}

const CLAUSULAS: { t: string; c: string }[] = [
  {
    t: 'PRIMERA: Declaración de indemnidad.',
    c: 'EL CLIENTE libera de toda responsabilidad legal, administrativa y comercial a {EMPRESA}, a sus directivos y a su personal técnico por cualquier falla eléctrica o electrónica que se presente en la unidad posterior a intervenciones de terceros en los vidrios del vehículo; esto incluye la instalación de papel ahumado (láminas de control solar) por terceros. No se aceptarán reclamos, notas de débito ni solicitudes de sustitución de componentes en garantía por estas causas.',
  },
  {
    t: 'SEGUNDA: Riesgo técnico conocido.',
    c: 'EL CLIENTE declara conocer que los vehículos modernos (especialmente las líneas MG y MAXUS distribuidas por el concesionario) poseen sistemas de cableado multiplexado, sensores de proximidad, antenas integradas y módulos electrónicos de alta sensibilidad (tales como la BCM, cajas de fusibles y sistemas de infoentretenimiento) ubicados debajo de las zonas de los cristales y tableros.',
  },
  {
    t: 'TERCERA: Pérdida automática de garantía por líquidos.',
    c: 'EL CLIENTE asume toda la responsabilidad civil, mecánica y financiera por cualquier daño derivado del exceso de agua, soluciones jabonosas u otros líquidos utilizados por talleres externos en el proceso de termo-formado e instalación de papel ahumado. Se especifica de manera vinculante que LA GARANTÍA DE FÁBRICA Y DE POST-VENTA DE {EMPRESA} NO CUBRE: sulfatación, cortocircuitos o quemaduras de módulos electrónicos debido a filtración de líquidos; inoperatividad del sistema de desempañado (defroster) por cortes o uso de navajas en la luneta trasera; desprendimiento de molduras, gomas o daños en los mecanismos elevalunas eléctricos.',
  },
]

export function ExoneracionPDF({ data }: { data: ExoneracionData }) {
  const primario = data.membrete.colorPrimario || '#C41E3A'
  const empresa = data.membrete.nombre
  const v = data.vehiculo
  const s = StyleSheet.create({
    page: { paddingTop: 26, paddingHorizontal: 34, paddingBottom: 40, fontFamily: 'Helvetica', fontSize: 9, color: DARK },
    title: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: primario, marginTop: 10, textAlign: 'center' },
    sub: { fontSize: 7.5, color: GRAY, textAlign: 'center', marginBottom: 8 },
    secTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#fff', backgroundColor: DARK, paddingVertical: 3, paddingHorizontal: 6, marginTop: 8 },
    row: { flexDirection: 'row' },
    infoRow: { flexDirection: 'row', marginTop: 4, marginBottom: 2 },
    infoCell: { flex: 1 },
    lbl: { fontSize: 6.5, color: GRAY, textTransform: 'uppercase' },
    val: { fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
    cellTxt: { fontSize: 7.6 },
    clTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginTop: 8, marginBottom: 2 },
    p: { fontSize: 8.5, lineHeight: 1.5, textAlign: 'justify' },
    firmaBlock: { marginTop: 22, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    firmaCol: { width: '48%', alignItems: 'center', marginTop: 20 },
    firmaLine: { width: '100%', borderBottom: `0.8pt solid ${DARK}`, height: 22, marginBottom: 3 },
    firmaLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
    firmaSub: { fontSize: 6.8, color: GRAY },
    sello: { width: 80, height: 80, objectFit: 'contain', opacity: 0.9 },
  })

  return (
    <Document title={`Exoneración de responsabilidad ${data.numeroProforma}`} author={empresa}>
      <Page size="A4" style={s.page}>
        <PdfMembrete data={data.membrete} />
        <Text style={s.title}>EXONERACIÓN DE RESPONSABILIDAD Y GARANTÍA LIMITADA</Text>
        <Text style={s.sub}>Instalación de papel ahumado · Proforma {data.numeroProforma} · {data.fecha}</Text>

        <View style={s.infoRow}>
          <View style={s.infoCell}><Text style={s.lbl}>Solicitado por</Text><Text style={s.val}>{data.solicitado || '—'}</Text></View>
          <View style={{ flex: 2 }}><Text style={s.lbl}>Cliente</Text><Text style={s.val}>{data.clienteNombre}{data.clienteCiRif ? `  ·  ${data.clienteCiRif}` : ''}</Text></View>
        </View>

        <Text style={s.secTitle}>CARACTERÍSTICAS DE LA UNIDAD</Text>
        <View style={[s.row, { borderTop: `0.5pt solid ${LINE}` }]}>
          <View style={{ flex: 1 }}>
            {[['Marca', v.marca], ['Modelo', v.version ? `${v.modelo} ${v.version}` : v.modelo], ['Serial VIN', v.vin], ['Serial motor', v.serialMotor]].map(([k, val]) => (
              <View key={k as string} style={[s.row, { paddingVertical: 2, paddingHorizontal: 3, borderBottom: `0.5pt solid ${LINE}` }]}>
                <Text style={[s.cellTxt, { width: 62, color: GRAY }]}>{k}:</Text>
                <Text style={[s.cellTxt, { flex: 1, fontFamily: 'Helvetica-Bold' }]}>{val || ''}</Text>
              </View>
            ))}
          </View>
          <View style={{ flex: 1 }}>
            {[['Año', v.anio != null ? String(v.anio) : ''], ['Placa', v.placa], ['Color', v.color], ['Fecha de llegada', v.fechaLlegada]].map(([k, val]) => (
              <View key={k as string} style={[s.row, { paddingVertical: 2, paddingHorizontal: 3, borderBottom: `0.5pt solid ${LINE}` }]}>
                <Text style={[s.cellTxt, { width: 78, color: GRAY }]}>{k}:</Text>
                <Text style={[s.cellTxt, { flex: 1, fontFamily: 'Helvetica-Bold' }]}>{val || ''}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={s.secTitle}>CLÁUSULAS DE EXONERACIÓN DE RESPONSABILIDAD Y GARANTÍA LIMITADA PARA INSTALACIÓN DE PAPEL AHUMADO</Text>
        {CLAUSULAS.map((cl, i) => (
          <View key={i} wrap={false}>
            <Text style={s.clTitle}>{cl.t}</Text>
            <Text style={s.p}>{cl.c.replace(/\{EMPRESA\}/g, empresa)}</Text>
          </View>
        ))}

        <Text style={s.secTitle}>CONFORMIDAD Y FIRMAS</Text>
        <Text style={[s.p, { marginTop: 6 }]}>
          En señal de absoluta conformidad con los términos expuestos, habiendo leído y comprendido el alcance de la
          pérdida de garantía sobre los componentes afectados, firmo el presente formulario en la ciudad de{' '}
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{data.ciudad || 'Maturín'}</Text>, en la fecha{' '}
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{data.fecha}</Text>.
        </Text>

        <View style={s.firmaBlock}>
          <View style={s.firmaCol}><View style={s.firmaLine} /><Text style={s.firmaLabel}>Nombre y firma</Text><Text style={s.firmaSub}>Dpto. Servicios (Entrega)</Text></View>
          <View style={s.firmaCol}><View style={s.firmaLine} /><Text style={s.firmaLabel}>Nombre y firma</Text><Text style={s.firmaSub}>Dpto. Ventas</Text></View>
          <View style={s.firmaCol}><View style={s.firmaLine} /><Text style={s.firmaLabel}>Nombre y firma</Text><Text style={s.firmaSub}>Vendedor</Text></View>
          <View style={s.firmaCol}>
            {data.selloSrc ? <Image src={data.selloSrc} style={s.sello} /> : <View style={s.firmaLine} />}
            <Text style={s.firmaLabel}>{data.clienteNombre}</Text><Text style={s.firmaSub}>Cliente</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
