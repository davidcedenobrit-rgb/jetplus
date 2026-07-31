import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { PdfMembrete, MembreteData } from './pdf-membrete'

const DARK = '#111827'
const GRAY = '#6b7280'
const LINE = '#e5e7eb'

const fmt = (n: number) => Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export interface AcuerdoPagoData {
  fecha: string
  membrete: MembreteData
  selloSrc?: string
  numeroProforma: string
  clienteNombre: string
  clienteCiRif: string
  vehiculo: string
  precio: number
  inicialTotal: number
  financiado: number
  condiciones: string
  filas: { numero: number; tipo: string; etiqueta: string; monto: number }[]
}

export function AcuerdoPagoPDF({ data }: { data: AcuerdoPagoData }) {
  const primario = data.membrete.colorPrimario || '#C41E3A'
  const s = StyleSheet.create({
    page: { paddingTop: 28, paddingHorizontal: 34, paddingBottom: 40, fontFamily: 'Helvetica', fontSize: 9, color: DARK },
    title: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: primario, marginTop: 12, textAlign: 'center' },
    sub: { fontSize: 8, color: GRAY, textAlign: 'center', marginBottom: 12 },
    p: { fontSize: 9, lineHeight: 1.5, marginBottom: 6, textAlign: 'justify' },
    b: { fontFamily: 'Helvetica-Bold' },
    grid: { flexDirection: 'row', justifyContent: 'space-between', borderTop: `1pt solid ${LINE}`, borderBottom: `1pt solid ${LINE}`, paddingVertical: 6, marginBottom: 10, marginTop: 4 },
    cell: { flex: 1 },
    cLabel: { fontSize: 7, color: GRAY, textTransform: 'uppercase' },
    cVal: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', marginTop: 1 },
    tHead: { flexDirection: 'row', backgroundColor: DARK, paddingVertical: 4, paddingHorizontal: 6 },
    tHeadTxt: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#fff' },
    tRow: { flexDirection: 'row', paddingVertical: 3.5, paddingHorizontal: 6, borderBottom: `0.5pt solid ${LINE}` },
    tag: { fontSize: 6.5, fontFamily: 'Helvetica-Bold' },
    tTot: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#f3f4f6' },
    firmaBlock: { marginTop: 34, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
    firmaCol: { alignItems: 'center', width: 220 },
    firmaLine: { width: 200, borderBottom: `1pt solid ${DARK}`, height: 24, marginBottom: 4 },
    firmaLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
    firmaSub: { fontSize: 7, color: GRAY },
    sello: { width: 90, height: 90, objectFit: 'contain', opacity: 0.9 },
  })

  const totalPlan = data.filas.reduce((acc, f) => acc + Number(f.monto || 0), 0)

  return (
    <Document title={`Acuerdo de pago ${data.numeroProforma}`} author={data.membrete.nombre}>
      <Page size="A4" style={s.page}>
        <PdfMembrete data={data.membrete} />

        <Text style={s.title}>ACUERDO DE PAGO</Text>
        <Text style={s.sub}>Proforma {data.numeroProforma} · {data.fecha}</Text>

        <Text style={s.p}>
          Entre <Text style={s.b}>{data.membrete.nombre}</Text> y el cliente <Text style={s.b}>{data.clienteNombre}</Text>
          {data.clienteCiRif ? <> (C.I./RIF: <Text style={s.b}>{data.clienteCiRif}</Text>)</> : null}, se establece el presente
          acuerdo de pago para la adquisición del vehículo <Text style={s.b}>{data.vehiculo}</Text>, bajo las condiciones aquí descritas.
        </Text>

        <View style={s.grid}>
          <View style={s.cell}><Text style={s.cLabel}>Precio del vehículo</Text><Text style={s.cVal}>${fmt(data.precio)}</Text></View>
          <View style={s.cell}><Text style={s.cLabel}>Inicial</Text><Text style={s.cVal}>${fmt(data.inicialTotal)}</Text></View>
          <View style={s.cell}><Text style={s.cLabel}>Financiado (Vehimotor)</Text><Text style={s.cVal}>${fmt(data.financiado)}</Text></View>
        </View>

        {data.condiciones ? <Text style={s.p}><Text style={s.b}>El cliente se compromete a pagar: </Text>{data.condiciones}</Text> : null}

        <Text style={[s.b, { fontSize: 9, marginTop: 4, marginBottom: 3 }]}>Plan de pagos</Text>
        <View style={s.tHead}>
          <Text style={[s.tHeadTxt, { width: 24 }]}>#</Text>
          <Text style={[s.tHeadTxt, { flex: 1 }]}>Concepto</Text>
          <Text style={[s.tHeadTxt, { width: 90, textAlign: 'right' }]}>Monto</Text>
        </View>
        {data.filas.map(f => (
          <View key={f.numero} style={[s.tRow, f.tipo === 'Inicial' ? { backgroundColor: '#fffbeb' } : {}]}>
            <Text style={{ width: 24, color: GRAY }}>{f.numero}</Text>
            <Text style={{ flex: 1 }}>
              <Text style={[s.tag, { color: f.tipo === 'Inicial' ? '#b45309' : primario }]}>{f.tipo === 'Inicial' ? 'INICIAL ' : 'VEHIMOTOR '}</Text>
              {f.etiqueta}
            </Text>
            <Text style={{ width: 90, textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>${fmt(f.monto)}</Text>
          </View>
        ))}
        <View style={s.tTot}>
          <Text style={[s.b, { flex: 1 }]}>Total programado</Text>
          <Text style={[s.b, { width: 90, textAlign: 'right' }]}>${fmt(totalPlan)}</Text>
        </View>

        <Text style={[s.p, { marginTop: 12 }]}>
          El cliente declara conocer y aceptar el presente plan de pago, comprometiéndose a cumplir con los montos y fechas
          aquí establecidos. El crédito Vehimotor inicia una vez completado el pago del inicial.
        </Text>

        <View style={s.firmaBlock} wrap={false}>
          <View style={s.firmaCol}>
            <View style={s.firmaLine} />
            <Text style={s.firmaLabel}>{data.clienteNombre}</Text>
            <Text style={s.firmaSub}>C.I./RIF: {data.clienteCiRif || '____________________'}</Text>
            <Text style={s.firmaSub}>El Cliente</Text>
          </View>
          <View style={s.firmaCol}>
            {data.selloSrc ? <Image src={data.selloSrc} style={s.sello} /> : <View style={s.firmaLine} />}
            <Text style={s.firmaLabel}>Por {data.membrete.nombre}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
