import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'

const DARK = '#111827'
const INK = '#1f2937'
const MUTED = '#6b7280'
const LINE = '#e5e7eb'
const SOFT = '#f9fafb'

export interface EtiquetaData {
  logoSrc?: string
  empresa: string
  rif?: string | null
  colorPrimario?: string
  colorSecundario?: string
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

export function EtiquetaPDF({ data }: { data: EtiquetaData }) {
  const primario = data.colorPrimario || '#C41E3A'
  const secundario = data.colorSecundario || DARK

  const s = StyleSheet.create({
    page: { paddingTop: 26, paddingBottom: 30, paddingHorizontal: 34, fontFamily: 'Helvetica', color: INK, fontSize: 10 },

    // Encabezado de marca
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10 },
    logo: { height: 30, maxWidth: 150, objectFit: 'contain' },
    empresaWrap: { alignItems: 'flex-end', maxWidth: 220 },
    empresaName: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: secundario, textAlign: 'right' },
    empresaRif: { fontSize: 7.5, color: MUTED, marginTop: 2, textAlign: 'right' },
    rule: { height: 2.5, backgroundColor: primario, borderRadius: 2 },

    // Título principal
    titleBar: { backgroundColor: secundario, borderRadius: 5, paddingVertical: 9, marginTop: 18, marginBottom: 16 },
    titleTxt: { color: '#ffffff', fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'center', letterSpacing: 1.5 },

    // Tarjeta de datos del vehículo
    card: { borderWidth: 1, borderColor: LINE, borderRadius: 6 },
    cardHead: { backgroundColor: primario, paddingVertical: 6, paddingHorizontal: 12, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
    cardHeadTxt: { color: '#ffffff', fontSize: 9, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },

    dataRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: LINE },
    dataRowAlt: { backgroundColor: SOFT },
    dataRowLast: { borderBottomWidth: 0 },
    k: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: primario, letterSpacing: 0.5, width: 92 },
    v: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: INK, flex: 1 },

    // Fecha de recepción
    fechaWrap: { paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center' },
    fechaLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED, letterSpacing: 1, marginBottom: 8 },
    fechaRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
    fechaCell: { borderWidth: 1, borderColor: LINE, borderRadius: 5, backgroundColor: SOFT, width: 74, paddingVertical: 8, alignItems: 'center' },
    fechaVal: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: secundario },
    fechaSub: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: MUTED, letterSpacing: 1, marginTop: 3 },

    // Tarjeta cliente / venta
    row2: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: LINE },
    k2: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: primario, letterSpacing: 0.5, width: 110 },
    v2: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: INK, flex: 1 },

    footer: { position: 'absolute', bottom: 18, left: 34, right: 34, textAlign: 'center', fontSize: 7, color: MUTED, letterSpacing: 0.5 },
  })

  const veh: [string, string][] = [
    ['MARCA', data.marca],
    ['MODELO', data.modelo],
    ['PLACA', data.placa],
    ['COLOR', data.color],
    ['S/M', data.serialMotor],
    ['S/C', data.serialCarroceria],
  ]

  return (
    <Document title={`Etiqueta ${data.placa || data.modelo}`} author={data.empresa}>
      <Page size="A5" style={s.page}>
        {/* Encabezado */}
        <View style={s.header}>
          {data.logoSrc ? <Image src={data.logoSrc} style={s.logo} /> : <Text style={s.empresaName}>{data.empresa}</Text>}
          <View style={s.empresaWrap}>
            <Text style={s.empresaName}>{data.empresa}</Text>
            {data.rif ? <Text style={s.empresaRif}>RIF {data.rif}</Text> : null}
          </View>
        </View>
        <View style={s.rule} />

        {/* Título */}
        <View style={s.titleBar}>
          <Text style={s.titleTxt}>EXPEDIENTE DEL VEHÍCULO</Text>
        </View>

        {/* Datos del vehículo */}
        <View style={s.card}>
          <View style={s.cardHead}><Text style={s.cardHeadTxt}>IDENTIFICACIÓN</Text></View>
          {veh.map(([k, v], i) => (
            <View key={k} style={[s.dataRow, i % 2 === 1 ? s.dataRowAlt : {}]}>
              <Text style={s.k}>{k}</Text>
              <Text style={s.v}>{v || '—'}</Text>
            </View>
          ))}
          <View style={s.fechaWrap}>
            <Text style={s.fechaLabel}>FECHA DE RECEPCIÓN</Text>
            <View style={s.fechaRow}>
              <View style={s.fechaCell}><Text style={s.fechaVal}>{data.recepcion.dia || '—'}</Text><Text style={s.fechaSub}>DÍA</Text></View>
              <View style={s.fechaCell}><Text style={s.fechaVal}>{data.recepcion.mes || '—'}</Text><Text style={s.fechaSub}>MES</Text></View>
              <View style={s.fechaCell}><Text style={s.fechaVal}>{data.recepcion.anio || '—'}</Text><Text style={s.fechaSub}>AÑO</Text></View>
            </View>
          </View>
        </View>

        {/* Datos de la venta */}
        <View style={[s.card, { marginTop: 16 }]}>
          <View style={s.cardHead}><Text style={s.cardHeadTxt}>DATOS DE LA VENTA</Text></View>
          <View style={s.row2}><Text style={s.k2}>CLIENTE</Text><Text style={s.v2}>{data.cliente || '—'}</Text></View>
          <View style={s.row2}><Text style={s.k2}>VENDEDOR</Text><Text style={s.v2}>{data.vendedor || '—'}</Text></View>
          <View style={[s.row2, { borderBottomWidth: 0 }]}><Text style={s.k2}>FECHA DE VENTA</Text><Text style={s.v2}>{data.fechaVenta || '—'}</Text></View>
        </View>

        <Text style={s.footer}>{data.empresa}{data.rif ? `  ·  RIF ${data.rif}` : ''}  ·  Documento de control interno</Text>
      </Page>
    </Document>
  )
}
