import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { PdfMembrete, MembreteData } from './pdf-membrete'
import { montoUsdEnLetras } from './numero-a-letras'

export interface GiroItem {
  nro: number            // 1..total
  vencimiento: string    // fecha larga "6 de septiembre de 2026"
  monto: number
}

export interface GirosData {
  membrete: MembreteData
  empresa: string          // "JETPLUS"
  fechaEmision: string     // fecha larga
  cliente: string
  clienteCiRif: string
  clienteDireccion: string
  clienteTelefono: string
  clienteCorreo: string
  numeroExpediente: string
  total: number            // total de giros
  giros: GiroItem[]
}

const DARK = '#111827'
const GRAY = '#6b7280'
const LINE = '#e5e7eb'

const fmt = (n: number) => Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function GirosPDF({ data }: { data: GirosData }) {
  const primario = data.membrete.colorPrimario || '#C41E3A'
  const s = StyleSheet.create({
    page: { paddingTop: 26, paddingBottom: 34, paddingHorizontal: 40, fontFamily: 'Helvetica', color: DARK, fontSize: 9.5 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 6 },
    nro: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
    fecha: { fontSize: 9.5 },
    montoBox: { alignSelf: 'flex-start', borderWidth: 1.2, borderColor: DARK, borderRadius: 4, paddingVertical: 5, paddingHorizontal: 12, marginBottom: 10 },
    montoLbl: { fontSize: 8, color: GRAY, fontFamily: 'Helvetica-Bold' },
    montoVal: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: primario },
    kv: { flexDirection: 'row', marginBottom: 2 },
    k: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', width: 96, color: GRAY },
    v: { fontSize: 8.5, flex: 1 },
    servidor: { marginTop: 10, fontSize: 9, textAlign: 'right', color: GRAY },
    empresaTop: { fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'right', color: DARK, marginBottom: 6 },
    body: { fontSize: 9.5, lineHeight: 1.5, marginTop: 6, textAlign: 'justify' },
    bold: { fontFamily: 'Helvetica-Bold' },
    legal: { fontSize: 7.5, lineHeight: 1.45, color: GRAY, marginTop: 10, textAlign: 'justify' },
    aceptada: { marginTop: 14, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 10 },
    aceptaTit: { fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
    aceptaSub: { fontSize: 8.5, textAlign: 'center', color: GRAY, marginBottom: 8 },
    aceptaNombre: { fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
    aceptaCi: { fontSize: 9, textAlign: 'center', marginBottom: 12 },
    aval: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 10 },
    firmaLine: { fontSize: 8.5, marginTop: 10 },
  })

  const legal =
    'En todo conforme al artículo 128 del Decreto con Rango, Valor y Fuerza de Ley Orgánica de Reforma de la Ley del Banco Central de Venezuela, publicado en la Gaceta Oficial de la República Bolivariana de Venezuela N° 6.211 Extraordinario de fecha treinta (30) de diciembre de 2015; en concordancia con el Artículo 2 del Decreto Constituyente Derogatorio del Régimen Cambiario y sus Ilícitos, publicado en la Gaceta Oficial de la República Bolivariana de Venezuela N° 41.452 de fecha dos (02) de agosto de 2018 y conforme con lo establecido en el Artículo 8 del Convenio Cambiario N° 1, publicado en la Gaceta Oficial de la República Bolivariana de Venezuela N° 6.405 Extraordinario, de fecha siete (07) de septiembre de 2018.'

  return (
    <Document title={`Giros ${data.numeroExpediente || data.cliente}`} author={data.empresa}>
      {data.giros.map((g) => (
        <Page key={g.nro} size="A4" style={s.page}>
          <PdfMembrete data={data.membrete} />

          <View style={s.topRow}>
            <Text style={s.nro}>Nro. {g.nro}/{data.total}</Text>
            <Text style={s.fecha}>Fecha: {data.fechaEmision}</Text>
          </View>

          <View style={s.montoBox}>
            <Text style={s.montoLbl}>Por USD ($)</Text>
            <Text style={s.montoVal}>{fmt(g.monto)}</Text>
          </View>

          <View style={s.kv}><Text style={s.k}>Dirección:</Text><Text style={s.v}>{data.clienteDireccion || '—'}</Text></View>
          <View style={s.kv}><Text style={s.k}>Teléfono:</Text><Text style={s.v}>{data.clienteTelefono || '—'}</Text></View>
          <View style={s.kv}><Text style={s.k}>Correo:</Text><Text style={s.v}>{data.clienteCorreo || '—'}</Text></View>
          <View style={s.kv}><Text style={s.k}>Nro de expediente:</Text><Text style={s.v}>{data.numeroExpediente || '—'}</Text></View>

          <Text style={s.servidor}>Atento su seguro servidor</Text>
          <Text style={s.empresaTop}>{data.empresa}</Text>

          <Text style={s.body}>
            A <Text style={s.bold}>{data.cliente}</Text> Se servirán Uds., mandar pagar incondicionalmente el{' '}
            <Text style={s.bold}>{g.vencimiento}</Text> por esta ÚNICA LETRA DE CAMBIO, SIN AVISO Y SIN PROTESTO a la
            orden de <Text style={s.bold}>{data.empresa}</Text>, la cantidad de{' '}
            <Text style={s.bold}>{montoUsdEnLetras(g.monto)}</Text>, VALOR: ENTENDIDO que cargarán en cuenta.
          </Text>

          <Text style={s.legal}>{legal}</Text>

          <View style={s.aceptada}>
            <Text style={s.aceptaTit}>A {data.cliente} — ACEPTADA PARA SER PAGADA</Text>
            <Text style={s.aceptaSub}>A SU VENCIMIENTO SIN AVISO Y SIN PROTESTO</Text>
            <Text style={s.aceptaNombre}>{data.cliente}</Text>
            <Text style={s.aceptaCi}>{data.clienteCiRif}</Text>
            <Text style={s.aval}>BUENO POR AVAL PARA GARANTIZAR LAS OBLIGACIONES DEL ACEPTANTE</Text>
            <Text style={s.firmaLine}>FECHA: _______________________________</Text>
            <Text style={s.firmaLine}>NOMBRE(s): ___________________________</Text>
            <Text style={s.firmaLine}>C.I./RIF: ______________________________</Text>
            <Text style={s.firmaLine}>FIRMA(s): _____________________________</Text>
          </View>
        </Page>
      ))}
    </Document>
  )
}
