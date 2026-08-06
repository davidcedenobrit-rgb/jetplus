import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { PdfMembrete, MembreteData } from './pdf-membrete'

const DARK = '#111827'
const GRAY = '#6b7280'
const LINE = '#e5e7eb'
const GREEN = '#15803d'
const RED = '#C41E3A'

export interface CobranzaFila {
  cliente: string; cedula: string; placa: string; planLbl: string
  total: number; cobrado: number; porCobrar: number; vencido: number; cuotasPend: number; pct: number
}
export interface CobranzaPDFData {
  fecha: string
  subtitulo: string
  membrete: MembreteData
  tot: { total: number; cobrado: number; porCobrar: number; vencido: number }
  split: { orientalPC: number; vehPC: number; orientalV: number; vehV: number }
  filas: CobranzaFila[]
}

const fmt = (n: number | null | undefined) => (n == null ? '0,00' : n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

export function CobranzaPDF({ data }: { data: CobranzaPDFData }) {
  const primario = data.membrete.colorPrimario || RED
  const t = data.tot
  const sp = data.split
  const s = StyleSheet.create({
    page: { paddingTop: 24, paddingHorizontal: 28, paddingBottom: 34, fontFamily: 'Helvetica', fontSize: 8, color: DARK },
    title: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: primario, marginTop: 8, textAlign: 'center' },
    sub: { fontSize: 7.5, color: GRAY, textAlign: 'center', marginBottom: 8 },
    kpis: { flexDirection: 'row', gap: 6, marginBottom: 10 },
    kpi: { flex: 1, border: `0.5pt solid ${LINE}`, borderRadius: 4, padding: '5pt 7pt' },
    kpiLbl: { fontSize: 6, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.4 },
    kpiVal: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 1 },
    kpiSm: { fontSize: 8, fontFamily: 'Helvetica-Bold', marginTop: 1 },
    th: { flexDirection: 'row', backgroundColor: DARK, padding: '4pt 5pt' },
    thTxt: { fontSize: 6.8, fontFamily: 'Helvetica-Bold', color: '#fff', textTransform: 'uppercase' },
    tr: { flexDirection: 'row', borderBottom: `0.5pt solid ${LINE}`, padding: '3pt 5pt' },
    trAlt: { backgroundColor: '#f9fafb' },
    td: { fontSize: 7.4 },
    cCli: { flex: 1 },
    cPlaca: { width: 48 },
    cNum: { width: 60, textAlign: 'right' },
    cPct: { width: 34, textAlign: 'center' },
    totalRow: { flexDirection: 'row', padding: '5pt 5pt', backgroundColor: '#fef3c7', borderTop: `1pt solid ${primario}` },
  })

  const kpis: [string, React.ReactNode][] = [
    ['Cartera (financiado)', <Text style={s.kpiVal}>${fmt(t.total)}</Text>],
    ['Cobrado', <Text style={s.kpiVal}>${fmt(t.cobrado)}</Text>],
    ['Por cobrar', <><Text style={[s.kpiSm, { color: GREEN }]}>LO ${fmt(sp.orientalPC)}</Text><Text style={[s.kpiSm, { color: '#b45309' }]}>VM ${fmt(sp.vehPC)}</Text></>],
    ['Vencido', <><Text style={[s.kpiSm, { color: RED }]}>LO ${fmt(sp.orientalV)}</Text><Text style={[s.kpiSm, { color: '#b45309' }]}>VM ${fmt(sp.vehV)}</Text></>],
  ]

  return (
    <Document title="Cartera de cobranza" author={data.membrete.nombre}>
      <Page size="A4" orientation="landscape" style={s.page}>
        <PdfMembrete data={data.membrete} />
        <Text style={s.title}>CARTERA DE COBRANZA</Text>
        <Text style={s.sub}>{data.subtitulo ? `${data.subtitulo} · ` : ''}Generado {data.fecha} · {data.filas.length} crédito{data.filas.length === 1 ? '' : 's'}</Text>

        <View style={s.kpis}>
          {kpis.map(([lbl, node], i) => (
            <View key={i} style={s.kpi}><Text style={s.kpiLbl}>{lbl}</Text>{node}</View>
          ))}
        </View>

        <View style={s.th} fixed>
          <Text style={[s.thTxt, s.cCli]}>CLIENTE</Text>
          <Text style={[s.thTxt, s.cPlaca]}>PLACA</Text>
          <Text style={[s.thTxt, s.cNum]}>FINANCIADO</Text>
          <Text style={[s.thTxt, s.cNum]}>COBRADO</Text>
          <Text style={[s.thTxt, s.cNum]}>POR COBRAR</Text>
          <Text style={[s.thTxt, s.cNum]}>VENCIDO</Text>
          <Text style={[s.thTxt, s.cPct]}>AVANCE</Text>
        </View>
        {data.filas.map((f, i) => (
          <View key={i} style={i % 2 === 1 ? [s.tr, s.trAlt] : s.tr} wrap={false}>
            <View style={s.cCli}>
              <Text style={[s.td, { fontFamily: 'Helvetica-Bold' }]}>{f.cliente}</Text>
              <Text style={{ fontSize: 6, color: GRAY }}>{f.planLbl}{f.cuotasPend > 0 ? ` · ${f.cuotasPend} cuota${f.cuotasPend !== 1 ? 's' : ''} pend.` : ''}{f.cedula ? ` · ${f.cedula}` : ''}</Text>
            </View>
            <Text style={[s.td, s.cPlaca, { color: GRAY }]}>{f.placa || '—'}</Text>
            <Text style={[s.td, s.cNum, { color: GRAY }]}>${fmt(f.total)}</Text>
            <Text style={[s.td, s.cNum, { color: GREEN }]}>${fmt(f.cobrado)}</Text>
            <Text style={[s.td, s.cNum, { fontFamily: 'Helvetica-Bold' }]}>${fmt(f.porCobrar)}</Text>
            <Text style={[s.td, s.cNum, { fontFamily: 'Helvetica-Bold', color: f.vencido > 0 ? RED : GRAY }]}>{f.vencido > 0 ? `$${fmt(f.vencido)}` : '—'}</Text>
            <Text style={[s.td, s.cPct]}>{f.pct}%</Text>
          </View>
        ))}
        <View style={s.totalRow}>
          <Text style={[s.td, s.cCli, { fontFamily: 'Helvetica-Bold', color: '#92400e' }]}>TOTALES ({data.filas.length})</Text>
          <Text style={[s.td, s.cPlaca]}> </Text>
          <Text style={[s.td, s.cNum, { fontFamily: 'Helvetica-Bold', color: '#92400e' }]}>${fmt(t.total)}</Text>
          <Text style={[s.td, s.cNum, { fontFamily: 'Helvetica-Bold', color: '#92400e' }]}>${fmt(t.cobrado)}</Text>
          <Text style={[s.td, s.cNum, { fontFamily: 'Helvetica-Bold', color: '#92400e' }]}>${fmt(t.porCobrar)}</Text>
          <Text style={[s.td, s.cNum, { fontFamily: 'Helvetica-Bold', color: '#92400e' }]}>${fmt(t.vencido)}</Text>
          <Text style={[s.td, s.cPct]}> </Text>
        </View>

        <Text style={{ position: 'absolute', bottom: 16, left: 28, right: 28, fontSize: 6.5, color: '#9ca3af', textAlign: 'center' }} fixed
          render={({ pageNumber, totalPages }) => `${data.membrete.nombre} · Cartera de cobranza · Página ${pageNumber} de ${totalPages}`} />
      </Page>
    </Document>
  )
}
