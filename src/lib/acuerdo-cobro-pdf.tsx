import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const BLACK = '#111111'
const GRAY = '#4b5563'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 10.5,
    color: BLACK,
    padding: '2cm 2.2cm 1.8cm',
    backgroundColor: '#fff',
    lineHeight: 1.4,
  },
  title: {
    fontFamily: 'Times-Bold',
    fontSize: 13.5,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  metaRow: { flexDirection: 'row', marginBottom: 3 },
  metaLabel: { fontFamily: 'Times-Bold', width: 150 },
  metaVal: { flex: 1 },
  sectionTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 11,
    marginTop: 12,
    marginBottom: 5,
  },
  p: { textAlign: 'justify', marginBottom: 6 },
  bold: { fontFamily: 'Times-Bold' },
  montoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2, paddingLeft: 8 },
  li: { flexDirection: 'row', marginBottom: 5 },
  liDot: { width: 14 },
  liText: { flex: 1, textAlign: 'justify' },
  firmaWrap: { marginTop: 34, alignItems: 'center' },
  firmaLine: { borderTop: '1px solid #111', width: 260, marginBottom: 3 },
  smallLabel: { fontSize: 9.5, color: GRAY, textAlign: 'center' },
})

export interface AcuerdoCobroData {
  fecha: string
  concesionario: string
  vendedoras: string
  clienteNombre: string
  clienteCiRif: string
  marca: string
  modelo: string
  vin?: string | null
  inicialTotal?: number | null
  montoContado?: number | null
  montoFinanciado: number
  planCuotas?: string | null
  observaciones?: string | null
}

const fmtUsd = (n: number | null | undefined) =>
  n == null ? '____________' : `$ ${Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtFecha = (d: string) => {
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return d }
}

export function AcuerdoCobroPDF({ data }: { data: AcuerdoCobroData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>Acuerdo de Responsabilidad de Gestión de Cobro y{'\n'}Condición de Pago de Comisión</Text>

        <View style={s.metaRow}><Text style={s.metaLabel}>Fecha:</Text><Text style={s.metaVal}>{fmtFecha(data.fecha)}</Text></View>
        <View style={s.metaRow}><Text style={s.metaLabel}>Concesionario:</Text><Text style={s.metaVal}>{data.concesionario}</Text></View>
        <View style={s.metaRow}><Text style={s.metaLabel}>Ejecutivo(a) de Ventas:</Text><Text style={s.metaVal}>{data.vendedoras || '________________'}</Text></View>
        <View style={s.metaRow}><Text style={s.metaLabel}>Cliente:</Text><Text style={s.metaVal}>{data.clienteNombre}</Text></View>
        <View style={s.metaRow}><Text style={s.metaLabel}>C.I. / R.I.F.:</Text><Text style={s.metaVal}>{data.clienteCiRif}</Text></View>
        <View style={s.metaRow}><Text style={s.metaLabel}>Marca / Modelo:</Text><Text style={s.metaVal}>{[data.marca, data.modelo].filter(Boolean).join(' — ')}</Text></View>
        {data.vin ? (
          <View style={s.metaRow}><Text style={s.metaLabel}>VIN / N° de Chasis:</Text><Text style={s.metaVal}>{data.vin}</Text></View>
        ) : null}

        <Text style={s.sectionTitle}>Declaración de Financiamiento de Inicial</Text>
        <Text style={s.p}>
          Por medio del presente documento, [el/la Ejecutivo(a) de Ventas] hace constar que la negociación del vehículo antes descrito
          incluye una modalidad de doble financiamiento, donde <Text style={s.bold}>{data.concesionario}</Text> otorga un crédito especial para
          cubrir el saldo pendiente de la inicial del vehículo, de forma paralela al crédito ordinario gestionado vía Vehimotor.
        </Text>

        <View style={s.montoRow}><Text>Monto total de la Inicial:</Text><Text style={s.bold}>{fmtUsd(data.inicialTotal)}</Text></View>
        <View style={s.montoRow}><Text>Monto pagado al contado por el cliente:</Text><Text style={s.bold}>{fmtUsd(data.montoContado)}</Text></View>
        <View style={s.montoRow}><Text>Monto financiado por {data.concesionario}:</Text><Text style={s.bold}>{fmtUsd(data.montoFinanciado)}</Text></View>
        <View style={[s.montoRow, { marginTop: 3 }]}><Text>Plan de Cuotas de la Inicial:</Text><Text style={s.bold}>{data.planCuotas || '________________'}</Text></View>

        <Text style={s.sectionTitle}>Compromiso de Gestión y Seguimiento de Cobranza</Text>
        <Text style={s.p}>
          [El/La Ejecutivo(a) de Ventas] asume formalmente la responsabilidad operativa y de gestión para hacer el seguimiento directo al
          cliente, garantizando el cobro puntual de cada una de las cuotas pactadas hasta la cancelación total del saldo financiado por {data.concesionario}.
        </Text>

        <Text style={s.sectionTitle}>Condición para la Liberación y Pago de Comisión</Text>
        <Text style={s.p}>[El/La Ejecutivo(a) de Ventas] acepta y manifiesta su conformidad con las siguientes condiciones comerciales:</Text>
        <View style={s.li}>
          <Text style={s.liDot}>•</Text>
          <Text style={s.liText}>
            El pago total de la comisión de venta de este vehículo se liquidará únicamente cuando el cliente haya saldado el 100% del monto
            financiado por {data.concesionario} correspondiente a la inicial del vehículo.
          </Text>
        </View>
        <View style={s.li}>
          <Text style={s.liDot}>•</Text>
          <Text style={s.liText}>El reporte de cumplimiento será validado por la Gerencia de Administración previo al desembolso.</Text>
        </View>

        {data.observaciones ? (
          <>
            <Text style={s.sectionTitle}>Observaciones</Text>
            <Text style={s.p}>{data.observaciones}</Text>
          </>
        ) : null}

        <Text style={[s.p, { marginTop: 10 }]}>En señal de conformidad con los términos expresados, se firma la presente acta:</Text>

        <View style={s.firmaWrap}>
          <View style={s.firmaLine} />
          <Text style={s.smallLabel}>{data.vendedoras || '[Ejecutivo(a) de Ventas]'}</Text>
          <Text style={s.smallLabel}>C.I.: ____________________</Text>
        </View>
      </Page>
    </Document>
  )
}
