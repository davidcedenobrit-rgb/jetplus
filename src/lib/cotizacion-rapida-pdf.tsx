import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'

// PDF compacto del "rapidito" (resumen de cotización) que el vendedor comparte.
// Reemplaza la captura de imagen (html2canvas) que se quedaba pegada.

export interface RapidaAc500Row { label: string; val: number | null; delivery?: boolean; highlight?: boolean }

export interface CotizacionRapidaData {
  brandNombre: string
  brandLogo?: string
  colorPrimario: string
  colorSecundario: string
  marca: string
  modelo: string
  planNota?: string
  fecha: string
  // Desglose de precios (vehículos de piso / promociones)
  financiamiento?: boolean
  precio?: number
  iva?: number
  gastosContado?: number
  gastosCredito?: number
  cuota?: number
  // Plan Asegúrate $500
  ac500?: { meses: string; color?: string; rows: RapidaAc500Row[]; total: number | null } | null
}

const fmt = (n: number | null | undefined) => {
  const v = Number(n || 0)
  return v.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(v) * 100) % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })
}

export function CotizacionRapidaPDF({ data }: { data: CotizacionRapidaData }) {
  const primario = data.colorPrimario || '#C41E3A'
  const secundario = data.colorSecundario || '#111827'
  const precio = Number(data.precio) || 0
  // Jetplus: exonerado de IVA (Puerto Libre de Margarita).
  const iva = data.iva != null ? Number(data.iva) : 0
  const gc = Number(data.gastosContado) || 0
  const gcr = Number(data.gastosCredito) || 0
  const cuota = Number(data.cuota) || 0
  const total = precio + iva + gc
  const ini40 = precio * 0.4
  const totalIni = ini40 + iva + gcr
  const fin60 = precio * 0.6

  const s = StyleSheet.create({
    page: { fontFamily: 'Helvetica', color: '#111827', fontSize: 10 },
    membrete: { backgroundColor: primario, paddingVertical: 10, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8 },
    logo: { height: 22, maxWidth: 120, objectFit: 'contain', backgroundColor: '#fff', borderRadius: 3, padding: 2 },
    brandName: { color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 13 },
    vehBand: { backgroundColor: secundario, paddingVertical: 12, paddingHorizontal: 18 },
    vehSup: { fontSize: 8, color: 'rgba(255,255,255,0.7)', fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
    vehModel: { fontSize: 16, color: '#fff', fontFamily: 'Helvetica-Bold', marginTop: 3 },
    nota: { backgroundColor: '#fffbeb', borderBottomWidth: 1, borderBottomColor: '#fde68a', paddingVertical: 8, paddingHorizontal: 18, fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#92400e' },
    secHdr: { paddingVertical: 6, paddingHorizontal: 18, fontSize: 9, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    lbl: { fontSize: 10, color: '#374151', flex: 1 },
    val: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 18 },
    footer: { paddingVertical: 10, paddingHorizontal: 18 },
    footerTxt: { fontSize: 8, color: '#9ca3af', textAlign: 'center' },
  })

  return (
    <Document title={`Cotización ${data.marca} ${data.modelo}`} author={data.brandNombre}>
      <Page size="A5" style={s.page}>
        <View style={s.membrete}>
          {data.brandLogo ? <Image src={data.brandLogo} style={s.logo} /> : null}
          <Text style={s.brandName}>{data.brandNombre}</Text>
        </View>

        <View style={s.vehBand}>
          <Text style={s.vehSup}>VEHÍCULO · {data.marca}</Text>
          <Text style={s.vehModel}>{data.modelo}</Text>
        </View>

        {data.planNota ? <Text style={s.nota}>🛡 {data.planNota}</Text> : null}

        {/* Plan Asegúrate $500 */}
        {data.ac500 ? (
          <View>
            <Text style={[s.secHdr, { backgroundColor: '#7c2d12', color: '#fde68a' }]}>PLAN ASEGÚRATE $500 · ENTREGA MES {data.ac500.meses}</Text>
            {data.ac500.rows.map((r, i) => (
              <View key={i} style={[s.row, r.highlight ? { backgroundColor: '#fffbeb' } : {}]}>
                <Text style={s.lbl}>{r.label}{r.delivery ? '  (Entrega)' : ''}</Text>
                <Text style={s.val}>${fmt(r.val)}</Text>
              </View>
            ))}
            <View style={[s.totalRow, { backgroundColor: '#fef9c3' }]}>
              <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#92400e' }}>TOTAL DEL PLAN:</Text>
              <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#92400e' }}>${fmt(data.ac500.total)}</Text>
            </View>
            {data.ac500.color ? (
              <View style={s.row}><Text style={s.lbl}>Color seleccionado:</Text><Text style={s.val}>{data.ac500.color}</Text></View>
            ) : null}
          </View>
        ) : null}

        {/* Desglose contado + crédito */}
        {data.financiamiento ? (
          <View>
            <Text style={[s.secHdr, { backgroundColor: '#7c2d12', color: '#fde68a' }]}>MODALIDAD DE CONTADO</Text>
            <View style={s.row}><Text style={s.lbl}>100% Precio Base:</Text><Text style={s.val}>${fmt(precio)}</Text></View>
            <View style={s.row}><Text style={s.lbl}>I.V.A. (16%):</Text><Text style={s.val}>${fmt(iva)}</Text></View>
            <View style={s.row}><Text style={s.lbl}>Póliza auto, Póliza de Vida, Traslado, INTT, Gastos Notaría, IGTF:</Text><Text style={s.val}>${fmt(gc)}</Text></View>
            <View style={[s.totalRow, { backgroundColor: '#fef9c3' }]}>
              <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#92400e' }}>TOTAL A PAGAR:</Text>
              <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#92400e' }}>${fmt(total)}</Text>
            </View>

            <Text style={[s.secHdr, { backgroundColor: '#064e3b', color: '#6ee7b7', marginTop: 4 }]}>CRÉDITO 24 MESES (40% INICIAL)</Text>
            <View style={s.row}><Text style={s.lbl}>40% Precio Base:</Text><Text style={s.val}>${fmt(ini40)}</Text></View>
            <View style={s.row}><Text style={s.lbl}>I.V.A. (16%):</Text><Text style={s.val}>${fmt(iva)}</Text></View>
            <View style={s.row}><Text style={s.lbl}>Póliza auto, Póliza de Vida, Traslado, INTT, Gastos Notaría, IGTF:</Text><Text style={s.val}>${fmt(gcr)}</Text></View>
            <View style={[s.totalRow, { backgroundColor: '#dcfce7' }]}>
              <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#065f46' }}>TOTAL INICIAL A PAGAR:</Text>
              <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#065f46' }}>${fmt(totalIni)}</Text>
            </View>
            <View style={[s.row, { backgroundColor: '#f0fdf4' }]}><Text style={s.lbl}>Financiamiento 60%:</Text><Text style={s.val}>${fmt(fin60)}</Text></View>
            {cuota > 0 ? (
              <View style={[s.totalRow, { backgroundColor: '#fff1f2' }]}>
                <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: primario }}>24 Cuotas Mensuales:</Text>
                <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: primario }}>${fmt(cuota)}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={s.footer}>
          <Text style={s.footerTxt}>{data.fecha}  ·  Precios referenciales sujetos a disponibilidad y cambios sin previo aviso.</Text>
        </View>
      </Page>
    </Document>
  )
}
