import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { PdfMembrete, MembreteData } from './pdf-membrete'

const DARK = '#111827'
const GRAY = '#6b7280'
const LINE = '#e5e7eb'

export interface TablaColumna { label: string; flex?: number; width?: number; align?: 'left' | 'right' | 'center' }
export interface TablaPDFData {
  titulo: string
  subtitulo: string
  membrete: MembreteData
  columnas: TablaColumna[]
  filas: string[][]
}

// Tabla genérica con membrete de marca, reutilizable para cualquier
// exportación de listado (bitácora de aliados, de redes, clientes, etc.).
export function TablaPDF({ data }: { data: TablaPDFData }) {
  const primario = data.membrete.colorPrimario || '#C41E3A'
  const s = StyleSheet.create({
    page: { paddingTop: 24, paddingHorizontal: 28, paddingBottom: 34, fontFamily: 'Helvetica', fontSize: 8, color: DARK },
    title: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: primario, marginTop: 8, textAlign: 'center' },
    sub: { fontSize: 7.5, color: GRAY, textAlign: 'center', marginBottom: 12 },
    th: { flexDirection: 'row', backgroundColor: DARK, padding: '4pt 5pt' },
    thTxt: { fontSize: 6.8, fontFamily: 'Helvetica-Bold', color: '#fff', textTransform: 'uppercase' },
    tr: { flexDirection: 'row', borderBottom: `0.5pt solid ${LINE}`, padding: '3pt 5pt' },
    trAlt: { backgroundColor: '#f9fafb' },
    td: { fontSize: 7.4 },
  })

  const colStyle = (c: TablaColumna) => ({
    flex: c.width ? undefined : (c.flex ?? 1),
    width: c.width,
    textAlign: c.align ?? 'left',
  } as const)

  return (
    <Document title={data.titulo} author={data.membrete.nombre}>
      <Page size="A4" orientation="landscape" style={s.page}>
        <PdfMembrete data={data.membrete} />
        <Text style={s.title}>{data.titulo.toUpperCase()}</Text>
        <Text style={s.sub}>{data.subtitulo ? `${data.subtitulo} · ` : ''}{data.filas.length} registro{data.filas.length === 1 ? '' : 's'}</Text>

        <View style={s.th} fixed>
          {data.columnas.map((c, i) => (
            <Text key={i} style={[s.thTxt, colStyle(c)]}>{c.label}</Text>
          ))}
        </View>
        {data.filas.map((fila, i) => (
          <View key={i} style={i % 2 === 1 ? [s.tr, s.trAlt] : s.tr} wrap={false}>
            {fila.map((val, j) => (
              <Text key={j} style={[s.td, colStyle(data.columnas[j] ?? {})]}>{val || '—'}</Text>
            ))}
          </View>
        ))}
        {data.filas.length === 0 && (
          <Text style={{ fontSize: 9, color: GRAY, textAlign: 'center', marginTop: 20 }}>Sin registros en este período.</Text>
        )}

        <Text style={{ position: 'absolute', bottom: 16, left: 28, right: 28, fontSize: 6.5, color: '#9ca3af', textAlign: 'center' }} fixed
          render={({ pageNumber, totalPages }) => `${data.membrete.nombre} · ${data.titulo} · Página ${pageNumber} de ${totalPages}`} />
      </Page>
    </Document>
  )
}
