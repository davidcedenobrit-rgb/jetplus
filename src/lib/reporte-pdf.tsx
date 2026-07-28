import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { PdfMembrete, type MembreteData } from './pdf-membrete'
import type { ReportePayload } from './reporte-tipos'

const DARK = '#111827'
const GRAY = '#6b7280'
const BORDER = '#d1d5db'
const SOFT = '#f3f4f6'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 8, color: DARK, padding: '1cm 1.1cm 1.3cm', lineHeight: 1.3 },
  titleBand: { borderRadius: 4, padding: '7pt 12pt', marginTop: 10, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleText: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: '#fff' },
  titleSub: { fontSize: 8, color: '#f3f4f6' },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  kpi: { borderWidth: 1, borderColor: BORDER, borderRadius: 4, padding: '5pt 8pt', minWidth: 120 },
  kpiLbl: { fontSize: 6, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.3 },
  kpiVal: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 1 },
  secTit: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: '#fff', padding: '3pt 7pt', marginTop: 8, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  table: { borderWidth: 1, borderColor: BORDER, borderTopWidth: 0 },
  th: { backgroundColor: SOFT, fontFamily: 'Helvetica-Bold', fontSize: 6.5, color: GRAY, padding: 4, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER },
  td: { fontSize: 7, padding: 4, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER },
  foot: { position: 'absolute', bottom: '0.7cm', left: '1.1cm', right: '1.1cm', flexDirection: 'row', justifyContent: 'space-between', borderTop: `1pt solid ${BORDER}`, paddingTop: 4 },
  footTxt: { fontSize: 6.5, color: GRAY },
})

export function ReportePDF({ data, membrete, generado }: { data: ReportePayload; membrete: MembreteData; generado: string }) {
  const primario = membrete.colorPrimario || '#C41E3A'
  return (
    <Document title={data.titulo} author={membrete.nombre}>
      <Page size="A4" style={s.page}>
        <PdfMembrete data={membrete} />

        <View style={[s.titleBand, { backgroundColor: primario }]}>
          <Text style={s.titleText}>{data.titulo.toUpperCase()}</Text>
          {(data.periodo || data.subtitulo) ? <Text style={s.titleSub}>{[data.subtitulo, data.periodo].filter(Boolean).join(' · ')}</Text> : null}
        </View>

        {data.kpis && data.kpis.length > 0 && (
          <View style={s.kpiRow}>
            {data.kpis.map((k, i) => (
              <View key={i} style={s.kpi}><Text style={s.kpiLbl}>{k.label}</Text><Text style={s.kpiVal}>{k.value}</Text></View>
            ))}
          </View>
        )}

        {data.secciones.map((sec, si) => {
          const cols = sec.headers.length
          const right = new Set(sec.right ?? Array.from({ length: cols }, (_, i) => i).filter(i => i > 0))
          const w = `${(100 / cols).toFixed(4)}%`
          return (
            <View key={si} wrap={false}>
              <Text style={[s.secTit, { backgroundColor: DARK }]}>{sec.titulo}</Text>
              <View style={s.table}>
                <View style={{ flexDirection: 'row' }}>
                  {sec.headers.map((h, i) => (
                    <Text key={i} style={[s.th, { width: w, textAlign: right.has(i) ? 'right' : 'left', borderRightWidth: i === cols - 1 ? 0 : 1 }]}>{h}</Text>
                  ))}
                </View>
                {sec.rows.length === 0 ? (
                  <Text style={[s.td, { width: '100%', textAlign: 'center', color: GRAY, borderRightWidth: 0 }]}>Sin datos.</Text>
                ) : sec.rows.map((row, ri) => (
                  <View key={ri} style={{ flexDirection: 'row' }}>
                    {row.map((cell, ci) => (
                      <Text key={ci} style={[s.td, { width: w, textAlign: right.has(ci) ? 'right' : 'left', borderRightWidth: ci === cols - 1 ? 0 : 1 }]}>{String(cell)}</Text>
                    ))}
                  </View>
                ))}
              </View>
            </View>
          )
        })}

        <View style={s.foot} fixed>
          <Text style={s.footTxt}>{membrete.nombre}</Text>
          <Text style={s.footTxt}>Generado {generado}</Text>
        </View>
      </Page>
    </Document>
  )
}
