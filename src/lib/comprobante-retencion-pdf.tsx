import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'

const LOGO = 'https://assets.cdn.filesafe.space/XZDJ4aSOAL1crWRCXyY6/media/698367bc1dfc0253b24abd7a.png'
const RED = '#C41E3A'
const DARK = '#111827'
const GRAY = '#6b7280'
const BORDER = '#d1d5db'
const SOFT = '#f9fafb'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 7.5, color: DARK, padding: '1cm 1cm 1.1cm', lineHeight: 1.3 },

  // Membrete
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: `1.5pt solid ${RED}` },
  logo: { width: 210, height: 42, objectFit: 'contain' },
  companyBlock: { alignItems: 'flex-end' },
  companyName: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: DARK },
  companyRif: { fontSize: 8, color: RED, fontFamily: 'Helvetica-Bold', marginTop: 1 },
  companyLine: { fontSize: 7, color: GRAY, marginTop: 0.5 },

  // Título
  titleBand: { backgroundColor: DARK, borderRadius: 4, padding: '7pt 12pt', marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleText: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: '#fff', letterSpacing: 0.5 },
  titleNumWrap: { alignItems: 'flex-end' },
  titleNumLbl: { fontSize: 6, color: '#d1d5db', textTransform: 'uppercase', letterSpacing: 0.5 },
  titleNum: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: '#fff' },

  ley: { fontSize: 6.5, color: GRAY, textAlign: 'justify', marginTop: 6, marginBottom: 8, fontStyle: 'italic' },

  // Bloques de datos
  block: { borderWidth: 1, borderColor: BORDER, borderStyle: 'solid', borderRadius: 4, marginBottom: 6, overflow: 'hidden' },
  blockHead: { backgroundColor: SOFT, borderBottom: `1pt solid ${BORDER}`, padding: '3pt 7pt' },
  blockHeadText: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: RED, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row' },
  cell: { padding: '4pt 7pt', borderRightWidth: 1, borderColor: BORDER, borderStyle: 'solid' },
  cellLast: { padding: '4pt 7pt' },
  lbl: { fontSize: 6, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.3 },
  val: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: DARK, marginTop: 1 },
  small: { fontSize: 7, color: DARK, marginTop: 1 },

  // Dos columnas (agente / sujeto)
  twoCol: { flexDirection: 'row', gap: 6 },
  colBox: { flex: 1, borderWidth: 1, borderColor: BORDER, borderStyle: 'solid', borderRadius: 4, marginBottom: 8, overflow: 'hidden' },

  // Tabla operación
  table: { borderWidth: 1, borderColor: BORDER, borderStyle: 'solid', borderRadius: 4, overflow: 'hidden' },
  th: { backgroundColor: DARK, color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 6, textAlign: 'center', padding: 4, borderRightWidth: 1, borderColor: '#374151', borderStyle: 'solid' },
  td: { fontSize: 7, textAlign: 'center', padding: 4, borderRightWidth: 1, borderTopWidth: 1, borderColor: BORDER, borderStyle: 'solid' },
  tdRight: { fontSize: 7, textAlign: 'right', padding: 4, borderRightWidth: 1, borderTopWidth: 1, borderColor: BORDER, borderStyle: 'solid' },
  totalRow: { backgroundColor: SOFT },

  legal: { fontSize: 6, color: GRAY, marginTop: 10, textAlign: 'justify' },

  firmaWrap: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
  firmaBox: { width: '45%', alignItems: 'center' },
  firmaLine: { width: '100%', borderTopWidth: 1, borderColor: DARK, borderStyle: 'solid', paddingTop: 3, alignItems: 'center' },
  firmaLbl: { fontSize: 6.5, color: GRAY, textAlign: 'center' },
  selloImg: { width: 90, height: 46, objectFit: 'contain', marginBottom: 2 },
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
  logoSrc?: string
  selloSrc?: string
}

const fmt = (n: number) => Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtFecha = (d: string) => { try { return new Date(d + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return d } }

export function ComprobanteRetencionPDF({ data }: { data: ComprobanteRetencionData }) {
  const cols = ['1', fmtFecha(data.fechaFactura), data.numeroFactura, data.numeroControl, '01-Reg', `${data.moneda} ${fmt(data.totalConIva)}`, `${data.moneda} ${fmt(data.baseImponible)}`, `${data.alicuota}%`, `${data.moneda} ${fmt(data.impuestoIva)}`, `${data.moneda} ${fmt(data.ivaRetenido)}`]
  const heads = ['N° Oper.', 'Fecha factura', 'N° factura', 'N° control', 'Tipo trans.', 'Total c/IVA', 'Base imponible', '% Alíc.', 'Impuesto IVA', 'IVA retenido']
  // Porcentajes (suman 100) para que la tabla ocupe todo el ancho de la hoja.
  const widths = [5, 10, 11, 11, 7, 12, 12, 6, 13, 13]
  const w = (i: number) => `${widths[i]}%`

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* Membrete */}
        <View style={s.header}>
          <Image src={data.logoSrc ?? LOGO} style={s.logo} />
          <View style={s.companyBlock}>
            <Text style={s.companyName}>{data.agenteNombre || 'LA ORIENTAL AUTOMOTORS, C.A.'}</Text>
            <Text style={s.companyRif}>RIF: {data.agenteRif || 'J-505692143'}</Text>
            <Text style={s.companyLine}>{data.agenteDireccion || 'AVENIDA ALIRIO UGARTE PELAYO, CENTRO PROFESIONAL DAVIS, QTA/GALPÓN NRO S/N, SECTOR CENTRO, MATURÍN - MONAGAS, ZONA POSTAL 6201'}</Text>
            <Text style={s.companyLine}>TEL: 0414-9989010 · laorientalautomotorsc@gmail.com</Text>
          </View>
        </View>

        {/* Título */}
        <View style={s.titleBand}>
          <Text style={s.titleText}>COMPROBANTE DE RETENCIÓN DEL IMPUESTO AL VALOR AGREGADO</Text>
          <View style={s.titleNumWrap}>
            <Text style={s.titleNumLbl}>N° Comprobante</Text>
            <Text style={s.titleNum}>{data.numeroComprobante || '—'}</Text>
          </View>
        </View>

        <Text style={s.ley}>
          Ley del IVA, Art. 11: &quot;La Administración Tributaria podrá designar como responsable del pago del impuesto, en calidad de agentes de retención, a
          quienes por sus funciones públicas o por razón de sus actividades privadas, intervengan en operaciones gravadas con el impuesto establecido en esta Ley&quot;.
        </Text>

        {/* Período de imposición */}
        <View style={s.block}>
          <View style={s.blockHead}><Text style={s.blockHeadText}>Período de imposición</Text></View>
          <View style={s.row}>
            <View style={[s.cell, { width: '34%' }]}><Text style={s.lbl}>Fecha de emisión</Text><Text style={s.val}>{fmtFecha(data.fechaEmision)}</Text></View>
            <View style={[s.cell, { width: '33%' }]}><Text style={s.lbl}>Año</Text><Text style={s.val}>{data.periodoAnio}</Text></View>
            <View style={[s.cellLast, { width: '33%' }]}><Text style={s.lbl}>Mes</Text><Text style={s.val}>{data.periodoMes}</Text></View>
          </View>
        </View>

        {/* Agente / Sujeto en dos columnas */}
        <View style={s.twoCol}>
          <View style={s.colBox}>
            <View style={s.blockHead}><Text style={s.blockHeadText}>Agente de retención</Text></View>
            <View style={{ padding: '4pt 7pt' }}><Text style={s.lbl}>Nombre o razón social</Text><Text style={s.val}>{data.agenteNombre}</Text></View>
            <View style={{ padding: '4pt 7pt', borderTop: `1pt solid ${BORDER}` }}><Text style={s.lbl}>RIF</Text><Text style={s.val}>{data.agenteRif}</Text></View>
            <View style={{ padding: '4pt 7pt', borderTop: `1pt solid ${BORDER}` }}><Text style={s.lbl}>Dirección fiscal</Text><Text style={s.small}>{data.agenteDireccion || '—'}</Text></View>
          </View>
          <View style={s.colBox}>
            <View style={s.blockHead}><Text style={s.blockHeadText}>Sujeto retenido</Text></View>
            <View style={{ padding: '4pt 7pt' }}><Text style={s.lbl}>Nombre o razón social</Text><Text style={s.val}>{data.sujetoNombre}</Text></View>
            <View style={{ padding: '4pt 7pt', borderTop: `1pt solid ${BORDER}` }}><Text style={s.lbl}>RIF</Text><Text style={s.val}>{data.sujetoRif}</Text></View>
            <View style={{ padding: '4pt 7pt', borderTop: `1pt solid ${BORDER}` }}><Text style={s.lbl}>Dirección fiscal</Text><Text style={s.small}>{data.sujetoDireccion || '—'}</Text></View>
          </View>
        </View>

        {/* Tabla de la operación */}
        <View style={s.table}>
          <View style={s.row}>
            {heads.map((h, i) => (
              <Text key={i} style={[s.th, { width: w(i), borderRightWidth: i === heads.length - 1 ? 0 : 1 }]}>{h}</Text>
            ))}
          </View>
          <View style={s.row}>
            {cols.map((c, i) => (
              <Text key={i} style={[i >= 5 ? s.tdRight : s.td, { width: w(i), borderTopWidth: 0, borderRightWidth: i === cols.length - 1 ? 0 : 1 }]}>{c}</Text>
            ))}
          </View>
          {/* Totales */}
          <View style={[s.row, s.totalRow]}>
            <Text style={[s.tdRight, { width: `${widths.slice(0, 5).reduce((a, b) => a + b, 0)}%`, fontFamily: 'Helvetica-Bold', color: DARK }]}>TOTALES</Text>
            <Text style={[s.tdRight, { width: w(5) }]}>{`${data.moneda} ${fmt(data.totalConIva)}`}</Text>
            <Text style={[s.tdRight, { width: w(6) }]}>{`${data.moneda} ${fmt(data.baseImponible)}`}</Text>
            <Text style={[s.td, { width: w(7) }]}> </Text>
            <Text style={[s.tdRight, { width: w(8) }]}>{`${data.moneda} ${fmt(data.impuestoIva)}`}</Text>
            <Text style={[s.tdRight, { width: w(9), borderRightWidth: 0, fontFamily: 'Helvetica-Bold', color: RED }]}>{`${data.moneda} ${fmt(data.ivaRetenido)}`}</Text>
          </View>
        </View>

        <Text style={s.legal}>
          Este comprobante se emite según lo establecido en el Art. 16 de la Providencia Administrativa SNAT/2025/000054 de fecha 16/07/2025, publicada en Gaceta Oficial N° 43.171.
        </Text>

        <View style={s.firmaWrap}>
          <View style={s.firmaBox}>
            {data.selloSrc ? <Image src={data.selloSrc} style={s.selloImg} /> : <View style={{ height: 46 }} />}
            <View style={s.firmaLine}><Text style={s.firmaLbl}>Sello y firma del agente de retención</Text></View>
          </View>
          <View style={s.firmaBox}>
            <View style={{ height: 46 }} />
            <View style={s.firmaLine}><Text style={s.firmaLbl}>Sello y firma del beneficiario</Text></View>
          </View>
        </View>
        <Text style={[s.firmaLbl, { marginTop: 14, textAlign: 'left' }]}>Fecha de entrega: ______________________</Text>
      </Page>
    </Document>
  )
}
