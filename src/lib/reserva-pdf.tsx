import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { PdfMembrete, MembreteData } from './pdf-membrete'

const DARK = '#111827'
const GRAY = '#6b7280'

export interface ReservaData {
  fecha: string          // dd/mm/aaaa (referencia)
  ciudad: string         // ciudad del concesionario que reserva
  diaTexto: string       // día en que se firma (p. ej. "06")
  mesTexto: string       // mes en letras (p. ej. "agosto")
  anioTexto: string      // año (p. ej. "2.026")
  membrete: MembreteData
  selloSrc?: string
  numeroProforma: string
  clienteNombre: string
  clienteCiRif: string
  vehiculo: { marca: string; modelo: string; placa: string }
  reservaInicial: string // monto de la reserva (vacío = línea para llenar a mano)
}

// Línea para rellenar a mano cuando no hay dato.
const blank = (v: string | null | undefined, n = 18) => (v && String(v).trim() ? String(v) : '_'.repeat(n))

export function ReservaVehiculoPDF({ data }: { data: ReservaData }) {
  const primario = data.membrete.colorPrimario || '#C41E3A'
  const empresa = data.membrete.nombre
  const v = data.vehiculo

  const s = StyleSheet.create({
    page: { paddingTop: 26, paddingHorizontal: 40, paddingBottom: 44, fontFamily: 'Helvetica', fontSize: 10, color: DARK },
    title: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: primario, marginTop: 16, marginBottom: 14, textAlign: 'center' },
    p: { fontSize: 10.5, lineHeight: 1.6, textAlign: 'justify', marginBottom: 10 },
    bold: { fontFamily: 'Helvetica-Bold' },
    secTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#fff', backgroundColor: DARK, paddingVertical: 4, paddingHorizontal: 7, marginTop: 4, marginBottom: 8 },
    firmaBlock: { marginTop: 40, flexDirection: 'row', justifyContent: 'space-between' },
    firmaCol: { width: '46%' },
    firmaLine: { borderBottom: `0.8pt solid ${DARK}`, height: 26, marginBottom: 4 },
    firmaLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
    firmaSub: { fontSize: 8, color: GRAY, marginTop: 8 },
    selloRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 10 },
    sello: { width: 74, height: 74, objectFit: 'contain', opacity: 0.9 },
  })

  return (
    <Document title={`Acuerdo de reserva de vehículo ${data.numeroProforma}`} author={empresa}>
      <Page size="A4" style={s.page}>
        <PdfMembrete data={data.membrete} />

        <Text style={s.title}>ACUERDO DE RESERVA DE VEHÍCULO</Text>

        <Text style={s.p}>
          Por medio del presente documento, el cliente abajo firmante manifiesta su intención de adquirir el
          vehículo descrito a continuación, Marca: <Text style={s.bold}>{blank(v.marca, 12)}</Text>  Modelo:{' '}
          <Text style={s.bold}>{blank(v.modelo, 12)}</Text>  Placa: <Text style={s.bold}>{blank(v.placa, 8)}</Text>{' '}
          dejando constancia de la entrega de una reserva inicial: <Text style={s.bold}>{blank(data.reservaInicial, 20)}</Text>
        </Text>

        <Text style={s.secTitle}>CLÁUSULA DE DESISTIMIENTO Y PENALIZACIÓN</Text>
        <Text style={s.p}>
          El cliente reconoce y acepta expresamente que, en caso de desistimiento unilateral de la compra del
          vehículo después de haber formalizado la reserva, se aplicará una penalización administrativa equivalente
          al 3% (tres por ciento) del monto total entregado en divisas. Si el pago se realizó en bolívares, el
          reembolso se efectuará por el mismo valor depositado, descontando un 2% por concepto de gastos
          administrativos y bancarios.
        </Text>
        <Text style={s.p}>
          Este cargo tiene como finalidad cubrir los gastos operativos, administrativos y la inmovilización del
          inventario generados por la gestión de la reserva. El cliente declara haber recibido esta información de
          forma clara y explícita por parte del personal de ventas antes de realizar el pago.
        </Text>

        <Text style={s.p}>
          He leído, comprendo y acepto las condiciones anteriormente descritas, incluyendo la política de
          penalización por desistimiento. En <Text style={s.bold}>{data.ciudad || 'Maturín'}</Text> a los{' '}
          <Text style={s.bold}>{data.diaTexto}</Text> del mes de <Text style={s.bold}>{data.mesTexto}</Text> del{' '}
          <Text style={s.bold}>{data.anioTexto}</Text>.
        </Text>

        <View style={s.firmaBlock}>
          <View style={s.firmaCol}>
            <View style={s.firmaLine} />
            <Text style={s.firmaLabel}>Representante Autorizado / Concesionario</Text>
            <View style={s.selloRow}>
              {data.selloSrc ? <Image src={data.selloSrc} style={s.sello} /> : <Text style={s.firmaSub}>Sello: ____________________</Text>}
            </View>
          </View>
          <View style={s.firmaCol}>
            <View style={s.firmaLine} />
            <Text style={s.firmaLabel}>Firma del Cliente</Text>
            <Text style={s.firmaSub}>C.I.: {blank(data.clienteCiRif, 20)}</Text>
            <Text style={s.firmaSub}>Nombre y Apellido: {blank(data.clienteNombre, 24)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
