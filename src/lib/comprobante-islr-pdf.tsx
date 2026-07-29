import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'

const LOGO = 'https://assets.cdn.filesafe.space/XZDJ4aSOAL1crWRCXyY6/media/698367bc1dfc0253b24abd7a.png'
const RED = '#C41E3A'
const DARK = '#111827'
const GRAY = '#6b7280'
const BORDER = '#111827'
const SOFT = '#f3f4f6'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 8, color: DARK, padding: '1cm 1.1cm', lineHeight: 1.25 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logo: { width: 200, height: 40, objectFit: 'contain' },
  periodo: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: DARK },
  title: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: DARK, marginTop: 10 },
  ley: { fontSize: 7, color: GRAY, marginTop: 3 },

  // Caja fecha / n° comprobante
  fcWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 },
  fcBox: { borderWidth: 1, borderColor: BORDER, borderStyle: 'solid', width: '55%' },
  fcRow: { flexDirection: 'row' },
  fcCellH: { flex: 1, backgroundColor: SOFT, padding: '3pt 6pt', fontFamily: 'Helvetica-Bold', fontSize: 8, textAlign: 'center', borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER, borderStyle: 'solid' },
  fcCellHlast: { flex: 1, backgroundColor: SOFT, padding: '3pt 6pt', fontFamily: 'Helvetica-Bold', fontSize: 8, textAlign: 'center', borderBottomWidth: 1, borderColor: BORDER, borderStyle: 'solid' },
  fcCell: { flex: 1, padding: '3pt 6pt', fontSize: 8, textAlign: 'center', borderRightWidth: 1, borderColor: BORDER, borderStyle: 'solid' },
  fcCellLast: { flex: 1, padding: '3pt 6pt', fontSize: 8, textAlign: 'center' },

  // Bloques de datos con título centrado
  block: { borderWidth: 1, borderColor: BORDER, borderStyle: 'solid', marginTop: 8 },
  blockTitle: { backgroundColor: SOFT, textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 8, padding: '3pt', borderBottomWidth: 1, borderColor: BORDER, borderStyle: 'solid' },
  dataRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: BORDER, borderStyle: 'solid' },
  dataRowLast: { flexDirection: 'row' },
  dataLbl: { width: '28%', fontFamily: 'Helvetica-Bold', fontSize: 7.5, padding: '3pt 6pt', borderRightWidth: 1, borderColor: BORDER, borderStyle: 'solid' },
  dataVal: { flex: 1, fontSize: 7.5, padding: '3pt 6pt' },

  // Concepto
  concWrap: { flexDirection: 'row', borderWidth: 1, borderColor: BORDER, borderStyle: 'solid', marginTop: 8 },
  concLeft: { flex: 1, borderRightWidth: 1, borderColor: BORDER, borderStyle: 'solid' },
  concRight: { width: '28%' },
  concHead: { backgroundColor: SOFT, textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 7.5, padding: '3pt', borderBottomWidth: 1, borderColor: BORDER, borderStyle: 'solid' },
  concVal: { textAlign: 'center', fontSize: 8, padding: '4pt' },

  // Tabla
  table: { borderWidth: 1, borderColor: BORDER, borderStyle: 'solid', marginTop: 8 },
  th: { fontFamily: 'Helvetica-Bold', fontSize: 6.5, textAlign: 'center', padding: 3, borderRightWidth: 1, borderColor: BORDER, borderStyle: 'solid' },
  td: { fontSize: 7, textAlign: 'center', padding: 4, borderRightWidth: 1, borderTopWidth: 1, borderColor: BORDER, borderStyle: 'solid' },
  tdEmpty: { padding: 7, borderRightWidth: 1, borderTopWidth: 1, borderColor: BORDER, borderStyle: 'solid' },

  totalsWrap: { alignItems: 'flex-end', marginTop: 8 },
  totalBox: { flexDirection: 'row', borderWidth: 1, borderColor: BORDER, borderStyle: 'solid', width: '55%', marginTop: -1 },
  totalLbl: { flex: 1, backgroundColor: SOFT, fontFamily: 'Helvetica-Bold', fontSize: 8.5, padding: '4pt 6pt', borderRightWidth: 1, borderColor: BORDER, borderStyle: 'solid' },
  totalVal: { width: '35%', fontFamily: 'Helvetica-Bold', fontSize: 8.5, padding: '4pt 6pt', textAlign: 'right' },

  firmaWrap: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40 },
  firmaBox: { width: '45%', alignItems: 'center' },
  firmaLine: { width: '100%', borderTopWidth: 1, borderColor: DARK, borderStyle: 'solid', paddingTop: 3, alignItems: 'center' },
  firmaLbl: { fontSize: 7, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  selloImg: { width: 120, height: 60, objectFit: 'contain', marginBottom: 2 },
})

export interface ComprobanteIslrData {
  numeroComprobante: string
  fechaEmision: string
  periodoLabel: string       // "05-2026"
  agenteNombre: string
  agenteRif: string
  agenteDireccion: string
  sujetoNombre: string
  sujetoRif: string
  sujetoDireccion: string
  codigo: string             // 055 | 002
  concepto: string
  pctLabel: string           // "2%" | "3%- 107,50"
  fechaFactura: string
  numeroFactura: string
  numeroControl: string
  montoTotal: number
  base: number
  valorRetencion: number
  totalPagar: number
  moneda: string
  logoSrc?: string
  selloSrc?: string
}

const fmt = (n: number) => Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtFecha = (d: string) => { try { return new Date(d + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return d } }

export function ComprobanteIslrPDF({ data }: { data: ComprobanteIslrData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Membrete */}
        <View style={s.header}>
          <Image src={data.logoSrc ?? LOGO} style={s.logo} />
          <Text style={s.periodo}>PERIODO FISCAL: {data.periodoLabel}</Text>
        </View>

        <Text style={s.title}>COMPROBANTE DE RETENCION DE IMPUESTO SOBRE LA RENTA</Text>
        <Text style={s.ley}>DECRETO 1.808 DE FECHA 23 DE ABRIL DE 1997</Text>
        <Text style={s.ley}>GACETA OFICIAL Nº 36.203 DE FECHA 12 DE MAYO DE 1997</Text>

        {/* Fecha / N° comprobante */}
        <View style={s.fcWrap}>
          <View style={s.fcBox}>
            <View style={s.fcRow}>
              <Text style={s.fcCellH}>FECHA</Text>
              <Text style={s.fcCellHlast}>Nº COMPROBANTE</Text>
            </View>
            <View style={s.fcRow}>
              <Text style={s.fcCell}>{fmtFecha(data.fechaEmision)}</Text>
              <Text style={s.fcCellLast}>{data.numeroComprobante || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Agente de retención */}
        <View style={s.block}>
          <Text style={s.blockTitle}>DATOS DEL AGENTE DE RETENCION</Text>
          <View style={s.dataRow}><Text style={s.dataLbl}>NOMBRE O RAZON SOCIAL</Text><Text style={s.dataVal}>{data.agenteNombre}</Text></View>
          <View style={s.dataRow}><Text style={s.dataLbl}>DIRECCION FISCAL</Text><Text style={s.dataVal}>{data.agenteDireccion}</Text></View>
          <View style={s.dataRowLast}><Text style={s.dataLbl}>RIF.</Text><Text style={s.dataVal}>{data.agenteRif}</Text></View>
        </View>

        {/* Beneficiario */}
        <View style={s.block}>
          <Text style={s.blockTitle}>DATOS DEL AGENTE BENEFICIARIO</Text>
          <View style={s.dataRow}><Text style={s.dataLbl}>NOMBRE O RAZON SOCIAL</Text><Text style={s.dataVal}>{data.sujetoNombre}</Text></View>
          <View style={s.dataRow}><Text style={s.dataLbl}>DIRECCION FISCAL</Text><Text style={s.dataVal}>{data.sujetoDireccion || '—'}</Text></View>
          <View style={s.dataRowLast}><Text style={s.dataLbl}>RIF.</Text><Text style={s.dataVal}>{data.sujetoRif}</Text></View>
        </View>

        {/* Concepto + código XML */}
        <View style={s.concWrap}>
          <View style={s.concLeft}>
            <Text style={s.concHead}>DATOS DEL IMPUESTO RETENIDO (CONCEPTO)</Text>
            <Text style={s.concVal}>{data.concepto} {data.pctLabel}</Text>
          </View>
          <View style={s.concRight}>
            <Text style={s.concHead}>CÓD. ARCHIVO XML</Text>
            <Text style={s.concVal}>COD- {data.codigo}</Text>
          </View>
        </View>

        {/* Tabla */}
        <View style={s.table}>
          <View style={{ flexDirection: 'row' }}>
            <Text style={[s.th, { width: '13%' }]}>FECHA{'\n'}EMISION</Text>
            <Text style={[s.th, { width: '13%' }]}>Nº{'\n'}FACTURA</Text>
            <Text style={[s.th, { width: '14%' }]}>Nº{'\n'}CONTROL</Text>
            <Text style={[s.th, { width: '16%' }]}>MONTO{'\n'}TOTAL</Text>
            <Text style={[s.th, { width: '16%' }]}>BASE{'\n'}RETENCION</Text>
            <Text style={[s.th, { width: '13%' }]}>% RETENCION{data.codigo === '002' ? '\n.- SUSTRAENDO' : ''}</Text>
            <Text style={[s.th, { width: '15%', borderRightWidth: 0 }]}>VALOR{'\n'}RETENCION</Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <Text style={[s.td, { width: '13%', borderTopWidth: 1 }]}>{fmtFecha(data.fechaFactura)}</Text>
            <Text style={[s.td, { width: '13%', borderTopWidth: 1 }]}>{data.numeroFactura}</Text>
            <Text style={[s.td, { width: '14%', borderTopWidth: 1 }]}>{data.numeroControl}</Text>
            <Text style={[s.td, { width: '16%', borderTopWidth: 1 }]}>{fmt(data.montoTotal)}</Text>
            <Text style={[s.td, { width: '16%', borderTopWidth: 1 }]}>{fmt(data.base)}</Text>
            <Text style={[s.td, { width: '13%', borderTopWidth: 1 }]}>{data.pctLabel}</Text>
            <Text style={[s.td, { width: '15%', borderTopWidth: 1, borderRightWidth: 0 }]}>{fmt(data.valorRetencion)}</Text>
          </View>
          {/* Filas vacías */}
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={{ flexDirection: 'row' }}>
              <View style={[s.tdEmpty, { width: '13%' }]} /><View style={[s.tdEmpty, { width: '13%' }]} />
              <View style={[s.tdEmpty, { width: '14%' }]} /><View style={[s.tdEmpty, { width: '16%' }]} />
              <View style={[s.tdEmpty, { width: '16%' }]} /><View style={[s.tdEmpty, { width: '13%' }]} />
              <View style={[s.tdEmpty, { width: '15%', borderRightWidth: 0 }]} />
            </View>
          ))}
          {/* Totales */}
          <View style={{ flexDirection: 'row' }}>
            <Text style={[s.td, { width: '40%', borderTopWidth: 1, fontFamily: 'Helvetica-Bold', textAlign: 'right' }]}>TOTAL</Text>
            <Text style={[s.td, { width: '16%', borderTopWidth: 1, fontFamily: 'Helvetica-Bold' }]}>{fmt(data.montoTotal)}</Text>
            <Text style={[s.td, { width: '16%', borderTopWidth: 1, fontFamily: 'Helvetica-Bold' }]}>{fmt(data.base)}</Text>
            <Text style={[s.td, { width: '13%', borderTopWidth: 1, fontFamily: 'Helvetica-Bold' }]}>TOTAL</Text>
            <Text style={[s.td, { width: '15%', borderTopWidth: 1, borderRightWidth: 0, fontFamily: 'Helvetica-Bold' }]}>{fmt(data.valorRetencion)}</Text>
          </View>
        </View>

        {/* Totales resumen */}
        <View style={s.totalsWrap}>
          <View style={s.totalBox}>
            <Text style={s.totalLbl}>TOTAL DEL IMPUESTO RETENIDO</Text>
            <Text style={s.totalVal}>{fmt(data.valorRetencion)}</Text>
          </View>
          <View style={s.totalBox}>
            <Text style={s.totalLbl}>TOTAL A PAGAR</Text>
            <Text style={s.totalVal}>{fmt(data.totalPagar)}</Text>
          </View>
        </View>

        {/* Firmas */}
        <View style={s.firmaWrap}>
          <View style={s.firmaBox}>
            {data.selloSrc ? <Image src={data.selloSrc} style={s.selloImg} /> : <View style={{ height: 60 }} />}
            <View style={s.firmaLine}><Text style={s.firmaLbl}>{data.agenteNombre}</Text></View>
          </View>
          <View style={s.firmaBox}>
            <View style={{ height: 60 }} />
            <View style={s.firmaLine}><Text style={s.firmaLbl}>SELLO Y FIRMA DEL BENEFICIARIO</Text></View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
