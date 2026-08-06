import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { PdfMembrete, MembreteData } from './pdf-membrete'

const DARK = '#111827'
const GRAY = '#6b7280'
const LINE = '#e5e7eb'

export interface ResumenEntregaData {
  fecha: string
  ciudad: string
  membrete: MembreteData
  numeroProforma: string
  cliente: { nombre: string; ciRif: string }
  vehiculo: {
    marca: string; modelo: string; version?: string | null; color?: string | null
    anio?: string | number | null; vin?: string | null; serialMotor?: string | null
    placa?: string | null; proformaVehimotors?: string | null
  }
  pago: {
    modalidad: string
    total: number
    inicial: number
    financiamiento: number | null
    numCuotas: number | null
    cuota: number | null
  }
  // Documentos que forman parte de la entrega (para el checklist).
  documentos: string[]
}

const fmt = (n: number | null | undefined) => (n == null ? '0,00' : n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

export function ResumenEntregaPDF({ data }: { data: ResumenEntregaData }) {
  const primario = data.membrete.colorPrimario || '#C41E3A'
  const v = data.vehiculo
  const p = data.pago
  const esCredito = (p.financiamiento ?? 0) > 0 && (p.numCuotas ?? 0) > 0
  const s = StyleSheet.create({
    page: { paddingTop: 26, paddingHorizontal: 34, paddingBottom: 40, fontFamily: 'Helvetica', fontSize: 9, color: DARK },
    title: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: primario, marginTop: 10, textAlign: 'center' },
    sub: { fontSize: 7.5, color: GRAY, textAlign: 'center', marginBottom: 8 },
    secTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#fff', backgroundColor: DARK, paddingVertical: 3, paddingHorizontal: 6, marginTop: 10, marginBottom: 4 },
    row: { flexDirection: 'row', paddingVertical: 2, paddingHorizontal: 3, borderBottom: `0.5pt solid ${LINE}` },
    k: { width: 110, color: GRAY, fontSize: 8 },
    val: { flex: 1, fontFamily: 'Helvetica-Bold', fontSize: 8.5 },
    twoCol: { flexDirection: 'row', gap: 14 },
    col: { flex: 1 },
    pRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, paddingHorizontal: 4, borderBottom: `0.5pt solid ${LINE}` },
    pLbl: { fontSize: 8.5, color: GRAY },
    pVal: { fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
    pTotal: { flexDirection: 'row', justifyContent: 'space-between', padding: '5pt 4pt', backgroundColor: '#fef9c3' },
    check: { flexDirection: 'row', alignItems: 'center', width: '50%', paddingVertical: 2.5 },
    box: { width: 9, height: 9, border: `1pt solid ${DARK}`, marginRight: 6 },
    checkTxt: { fontSize: 8.5 },
    p: { fontSize: 8.5, lineHeight: 1.5, textAlign: 'justify', marginTop: 8 },
    firmaBlock: { marginTop: 34, flexDirection: 'row', justifyContent: 'space-between' },
    firmaCol: { width: '46%' },
    firmaLine: { borderBottom: `0.8pt solid ${DARK}`, height: 26, marginBottom: 4 },
    firmaLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
    firmaSub: { fontSize: 7.5, color: GRAY, marginTop: 2 },
  })

  const specs: [string, string | null | undefined][] = [
    ['Marca', v.marca], ['Modelo', v.version ? `${v.modelo} ${v.version}` : v.modelo],
    ['Color', v.color], ['Año', v.anio != null ? String(v.anio) : ''],
    ['Serial VIN', v.vin], ['Serial motor', v.serialMotor],
    ['Placa', v.placa], ['N° Proforma Vehimotors', v.proformaVehimotors],
  ]

  return (
    <Document title={`Resumen de entrega ${data.numeroProforma}`} author={data.membrete.nombre}>
      <Page size="A4" style={s.page}>
        <PdfMembrete data={data.membrete} />
        <Text style={s.title}>RESUMEN DE ENTREGA DEL VEHÍCULO</Text>
        <Text style={s.sub}>Proforma {data.numeroProforma} · {data.fecha}</Text>

        <Text style={s.secTitle}>CLIENTE</Text>
        <View style={s.row}><Text style={s.k}>Nombre:</Text><Text style={s.val}>{data.cliente.nombre}</Text></View>
        <View style={s.row}><Text style={s.k}>C.I./RIF:</Text><Text style={s.val}>{data.cliente.ciRif || '—'}</Text></View>

        <Text style={s.secTitle}>VEHÍCULO ENTREGADO</Text>
        <View style={s.twoCol}>
          <View style={s.col}>{specs.slice(0, 4).map(([k, val]) => (
            <View key={k} style={s.row}><Text style={s.k}>{k}:</Text><Text style={s.val}>{val || '—'}</Text></View>
          ))}</View>
          <View style={s.col}>{specs.slice(4).map(([k, val]) => (
            <View key={k} style={s.row}><Text style={s.k}>{k}:</Text><Text style={s.val}>{val || '—'}</Text></View>
          ))}</View>
        </View>

        <Text style={s.secTitle}>RESUMEN DE LA OPERACIÓN</Text>
        <View style={s.pRow}><Text style={s.pLbl}>Modalidad</Text><Text style={s.pVal}>{p.modalidad}</Text></View>
        <View style={s.pRow}><Text style={s.pLbl}>{esCredito ? 'Inicial pagada' : 'Total pagado'}</Text><Text style={s.pVal}>${fmt(p.inicial || p.total)}</Text></View>
        {esCredito && (
          <>
            <View style={s.pRow}><Text style={s.pLbl}>Financiamiento</Text><Text style={s.pVal}>${fmt(p.financiamiento)}</Text></View>
            <View style={s.pTotal}><Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#92400e' }}>{p.numCuotas} cuotas de</Text><Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#92400e' }}>${fmt(p.cuota)}</Text></View>
          </>
        )}

        <Text style={s.secTitle}>DOCUMENTOS ENTREGADOS</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 3 }}>
          {data.documentos.map((d, i) => (
            <View key={i} style={s.check}><View style={s.box} /><Text style={s.checkTxt}>{d}</Text></View>
          ))}
        </View>

        <Text style={s.p}>
          El cliente <Text style={{ fontFamily: 'Helvetica-Bold' }}>{data.cliente.nombre}</Text> declara recibir a entera satisfacción
          el vehículo descrito y los documentos señalados, en la ciudad de{' '}
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{data.ciudad || 'Maturín'}</Text> en la fecha{' '}
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{data.fecha}</Text>.
        </Text>

        <View style={s.firmaBlock}>
          <View style={s.firmaCol}><View style={s.firmaLine} /><Text style={s.firmaLabel}>Entregado por</Text><Text style={s.firmaSub}>{data.membrete.nombre}</Text></View>
          <View style={s.firmaCol}><View style={s.firmaLine} /><Text style={s.firmaLabel}>Recibido conforme — Cliente</Text><Text style={s.firmaSub}>{data.cliente.nombre} · C.I./RIF: {data.cliente.ciRif || '—'}</Text></View>
        </View>
      </Page>
    </Document>
  )
}
