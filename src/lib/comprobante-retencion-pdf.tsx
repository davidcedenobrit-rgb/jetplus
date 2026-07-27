import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const BORDER = '#333333'
const GRAY = '#555555'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 7.5, color: '#111', padding: '1.2cm 1cm', lineHeight: 1.3 },
  title: { fontFamily: 'Helvetica-Bold', fontSize: 11, textAlign: 'center', marginBottom: 4 },
  ley: { fontSize: 6.5, color: GRAY, textAlign: 'justify', marginBottom: 8, fontStyle: 'italic' },
  box: { borderWidth: 1, borderColor: BORDER, borderStyle: 'solid' },
  row: { flexDirection: 'row' },
  cell: { borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER, borderStyle: 'solid', padding: 3 },
  cellLast: { borderBottomWidth: 1, borderColor: BORDER, borderStyle: 'solid', padding: 3 },
  lbl: { fontSize: 6, color: GRAY, textTransform: 'uppercase' },
  val: { fontFamily: 'Helvetica-Bold', fontSize: 8 },
  th: { backgroundColor: '#f0f0f0', fontFamily: 'Helvetica-Bold', fontSize: 6, textAlign: 'center', padding: 3, borderRightWidth: 1, borderColor: BORDER, borderStyle: 'solid' },
  td: { fontSize: 7, textAlign: 'center', padding: 3, borderRightWidth: 1, borderTopWidth: 1, borderColor: BORDER, borderStyle: 'solid' },
  tdRight: { fontSize: 7, textAlign: 'right', padding: 3, borderRightWidth: 1, borderTopWidth: 1, borderColor: BORDER, borderStyle: 'solid' },
  legal: { fontSize: 6, color: GRAY, marginTop: 10, textAlign: 'justify' },
  firmaWrap: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 34 },
  firmaBox: { width: '45%', borderTopWidth: 1, borderColor: '#111', borderStyle: 'solid', paddingTop: 3, alignItems: 'center' },
  small: { fontSize: 6.5, color: GRAY },
})

export interface ComprobanteRetencionData {
  numeroComprobante: string
  fechaEmision: string        // YYYY-MM-DD
  periodoAnio: string
  periodoMes: string
  agenteNombre: string
  agenteRif: string
  agenteDireccion: string
  sujetoNombre: string
  sujetoRif: string
  sujetoDireccion: string
  fechaFactura: string
  numeroFactura: string
  numeroControl: string
  totalConIva: number
  baseImponible: number
  alicuota: number
  impuestoIva: number
  ivaRetenido: number
  moneda: string
}

const fmt = (n: number) => Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtFecha = (d: string) => { try { return new Date(d + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return d } }

export function ComprobanteRetencionPDF({ data }: { data: ComprobanteRetencionData }) {
  const cols = ['1', fmtFecha(data.fechaFactura), data.numeroFactura, data.numeroControl, '01-Reg', `${data.moneda} ${fmt(data.totalConIva)}`, `${data.moneda} ${fmt(data.baseImponible)}`, `${data.alicuota}%`, `${data.moneda} ${fmt(data.impuestoIva)}`, `${data.moneda} ${fmt(data.ivaRetenido)}`]
  const heads = ['N° Oper.', 'Fecha factura', 'N° factura', 'N° control', 'Tipo trans.', 'Total c/IVA', 'Base imponible', '% Alíc.', 'Impuesto IVA', 'IVA retenido']
  const widths = [26, 52, 60, 60, 40, 62, 64, 34, 62, 62]

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <Text style={s.title}>COMPROBANTE DE RETENCIÓN DEL IMPUESTO AL VALOR AGREGADO</Text>
        <Text style={s.ley}>
          Ley IVA, Art. 11: &quot;La Administración Tributaria podrá designar como responsable del pago del impuesto, en calidad de agentes de retención, a
          quienes por sus funciones públicas o por razón de sus actividades privadas, intervengan en operaciones gravadas con el impuesto establecido en esta Ley&quot;.
        </Text>

        {/* Encabezado: comprobante + período */}
        <View style={[s.box, { marginBottom: 6 }]}>
          <View style={s.row}>
            <View style={[s.cell, { width: '34%' }]}><Text style={s.lbl}>N° Comprobante de retención</Text><Text style={s.val}>{data.numeroComprobante}</Text></View>
            <View style={[s.cell, { width: '22%' }]}><Text style={s.lbl}>F. Emisión</Text><Text style={s.val}>{fmtFecha(data.fechaEmision)}</Text></View>
            <View style={[s.cell, { width: '22%' }]}><Text style={s.lbl}>Año</Text><Text style={s.val}>{data.periodoAnio}</Text></View>
            <View style={[s.cellLast, { width: '22%' }]}><Text style={s.lbl}>Mes</Text><Text style={s.val}>{data.periodoMes}</Text></View>
          </View>
        </View>

        {/* Agente de retención */}
        <View style={[s.box, { marginBottom: 6 }]}>
          <View style={s.row}>
            <View style={[s.cell, { width: '55%' }]}><Text style={s.lbl}>Nombre o razón social del agente de retención</Text><Text style={s.val}>{data.agenteNombre}</Text></View>
            <View style={[s.cellLast, { width: '45%' }]}><Text style={s.lbl}>RIF del agente de retención</Text><Text style={s.val}>{data.agenteRif}</Text></View>
          </View>
          <View style={s.row}>
            <View style={[{ padding: 3, width: '100%' }]}><Text style={s.lbl}>Dirección fiscal del agente de retención</Text><Text style={s.small}>{data.agenteDireccion}</Text></View>
          </View>
        </View>

        {/* Sujeto retenido */}
        <View style={[s.box, { marginBottom: 8 }]}>
          <View style={s.row}>
            <View style={[s.cell, { width: '55%' }]}><Text style={s.lbl}>Nombre o razón social del sujeto retenido</Text><Text style={s.val}>{data.sujetoNombre}</Text></View>
            <View style={[s.cellLast, { width: '45%' }]}><Text style={s.lbl}>RIF del sujeto retenido</Text><Text style={s.val}>{data.sujetoRif}</Text></View>
          </View>
          <View style={s.row}>
            <View style={[{ padding: 3, width: '100%' }]}><Text style={s.lbl}>Dirección fiscal del sujeto retenido</Text><Text style={s.small}>{data.sujetoDireccion || '—'}</Text></View>
          </View>
        </View>

        {/* Tabla de la operación */}
        <View style={s.box}>
          <View style={s.row}>
            {heads.map((h, i) => (
              <Text key={i} style={[s.th, { width: widths[i], borderRightWidth: i === heads.length - 1 ? 0 : 1 }]}>{h}</Text>
            ))}
          </View>
          <View style={s.row}>
            {cols.map((c, i) => (
              <Text key={i} style={[i >= 5 ? s.tdRight : s.td, { width: widths[i], borderRightWidth: i === cols.length - 1 ? 0 : 1 }]}>{c}</Text>
            ))}
          </View>
          {/* Totales */}
          <View style={s.row}>
            <Text style={[s.td, { width: widths.slice(0, 5).reduce((a, b) => a + b, 0), textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>TOTALES</Text>
            <Text style={[s.tdRight, { width: widths[5] }]}>{`${data.moneda} ${fmt(data.totalConIva)}`}</Text>
            <Text style={[s.tdRight, { width: widths[6] }]}>{`${data.moneda} ${fmt(data.baseImponible)}`}</Text>
            <Text style={[s.td, { width: widths[7] }]}> </Text>
            <Text style={[s.tdRight, { width: widths[8] }]}>{`${data.moneda} ${fmt(data.impuestoIva)}`}</Text>
            <Text style={[s.tdRight, { width: widths[9], borderRightWidth: 0, fontFamily: 'Helvetica-Bold' }]}>{`${data.moneda} ${fmt(data.ivaRetenido)}`}</Text>
          </View>
        </View>

        <Text style={s.legal}>
          Este comprobante se emite según lo establecido en el Art. 16 de la Providencia Administrativa SNAT/2025/000054 de fecha 16/07/2025, publicada en Gaceta Oficial N° 43.171.
        </Text>

        <View style={s.firmaWrap}>
          <View style={s.firmaBox}><Text style={s.small}>Sello y firma del agente de retención</Text></View>
          <View style={s.firmaBox}><Text style={s.small}>Sello y firma del beneficiario</Text></View>
        </View>
        <Text style={[s.small, { marginTop: 16 }]}>Fecha de entrega: ______________________</Text>
      </Page>
    </Document>
  )
}
