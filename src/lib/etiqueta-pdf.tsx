import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'

const DARK = '#111827'

export interface EtiquetaData {
  logoSrc?: string
  empresa: string
  colorPrimario?: string
  marca: string
  modelo: string
  placa: string
  color: string
  serialMotor: string   // S/M
  serialCarroceria: string // S/C (VIN / chasis)
  recepcion: { dia: string; mes: string; anio: string }
  cliente: string
  vendedor: string
  fechaVenta: string
}

const box = { border: `1.5pt solid ${DARK}`, borderRadius: 3, padding: '14pt 18pt' }

export function EtiquetaPDF({ data }: { data: EtiquetaData }) {
  const primario = data.colorPrimario || '#C41E3A'
  const s = StyleSheet.create({
    page: { paddingTop: 30, paddingHorizontal: 46, fontFamily: 'Helvetica', color: DARK },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18, paddingBottom: 6, borderBottom: `1.5pt solid ${primario}` },
    brandName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: DARK },
    logo: { height: 24, maxWidth: 130, objectFit: 'contain' },
    titulo: { fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 14, textDecoration: 'underline' },
    row: { flexDirection: 'row', marginBottom: 7 },
    k: { fontSize: 12, fontFamily: 'Helvetica-Bold', textDecoration: 'underline', width: 78 },
    v: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
    recTitulo: { fontSize: 12, fontFamily: 'Helvetica-Bold', textAlign: 'center', textDecoration: 'underline', marginTop: 8, marginBottom: 8 },
    fechaRow: { flexDirection: 'row', justifyContent: 'center', gap: 34, marginTop: 2 },
    fechaCol: { alignItems: 'center', minWidth: 46 },
    fechaVal: { fontSize: 13, fontFamily: 'Helvetica-Bold', textDecoration: 'underline', marginBottom: 2 },
    fechaLbl: { fontSize: 7, fontFamily: 'Helvetica-Bold' },
    box2Row: { flexDirection: 'row', marginBottom: 10 },
    box2K: { fontSize: 11, fontFamily: 'Helvetica-Bold', width: 92 },
    box2V: { fontSize: 11, fontFamily: 'Helvetica-Bold', flex: 1 },
  })

  return (
    <Document title={`Etiqueta ${data.placa || data.modelo}`} author={data.empresa}>
      <Page size="A5" style={s.page}>
        <View style={s.brand}>
          {data.logoSrc ? <Image src={data.logoSrc} style={s.logo} /> : null}
          <Text style={s.brandName}>{data.empresa}</Text>
        </View>

        {/* Caja 1 — datos del vehículo */}
        <View style={box}>
          <Text style={s.titulo}>EXPEDIENTE VEHÍCULO</Text>
          {[
            ['MARCA:', data.marca], ['MODELO:', data.modelo], ['PLACA:', data.placa],
            ['COLOR:', data.color], ['S/M:', data.serialMotor], ['S/C:', data.serialCarroceria],
          ].map(([k, v]) => (
            <View key={k} style={s.row}><Text style={s.k}>{k}</Text><Text style={s.v}>{v || '—'}</Text></View>
          ))}
          <Text style={s.recTitulo}>FECHA DE RECEPCIÓN</Text>
          <View style={s.fechaRow}>
            <View style={s.fechaCol}><Text style={s.fechaVal}>{data.recepcion.dia || '__'}</Text><Text style={s.fechaLbl}>DÍA</Text></View>
            <View style={s.fechaCol}><Text style={s.fechaVal}>{data.recepcion.mes || '__'}</Text><Text style={s.fechaLbl}>MES</Text></View>
            <View style={s.fechaCol}><Text style={s.fechaVal}>{data.recepcion.anio || '____'}</Text><Text style={s.fechaLbl}>AÑO</Text></View>
          </View>
        </View>

        {/* Caja 2 — cliente / vendedor / venta */}
        <View style={{ ...box, marginTop: 20 }}>
          <View style={s.box2Row}><Text style={s.box2K}>CLIENTE:</Text><Text style={s.box2V}>{data.cliente || '—'}</Text></View>
          <View style={s.box2Row}><Text style={s.box2K}>VENDEDOR:</Text><Text style={s.box2V}>{data.vendedor || '—'}</Text></View>
          <View style={[s.box2Row, { marginBottom: 0 }]}><Text style={s.box2K}>FECHA DE VENTA:</Text><Text style={s.box2V}>{data.fechaVenta || '—'}</Text></View>
        </View>
      </Page>
    </Document>
  )
}
