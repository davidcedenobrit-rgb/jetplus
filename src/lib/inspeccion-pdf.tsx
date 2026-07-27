import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { PdfMembrete, type MembreteData } from './pdf-membrete'

// PDF imprimible de una inspección de vehículo (recepción o PDI), con el
// membrete del concesionario de turno. Reproduce el checklist con columnas
// de estado (OK / NF / NE / R) marcando la opción elegida.

export interface InspeccionPDFData {
  membrete: MembreteData
  titulo: string
  fecha: string
  campos: { label: string; valor: string }[]
  estados: { value: string; label: string }[]
  grupos: { grupo: string; items: { label: string; estado: string; nota?: string }[] }[]
  notas?: string | null
  leyenda?: string
  firmas: string[]
}

const DARK = '#111827'
const GRAY = '#6b7280'
const BORDER = '#d1d5db'
const SOFT = '#f3f4f6'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 8, color: DARK, padding: '1cm 1.1cm 1.4cm', lineHeight: 1.3 },
  titleBand: { marginTop: 10, marginBottom: 8, padding: '6pt 10pt', borderRadius: 4 },
  titleText: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: '#fff', letterSpacing: 0.5 },

  camposWrap: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderColor: BORDER, borderRadius: 4, marginBottom: 10, overflow: 'hidden' },
  campo: { width: '33.33%', padding: '4pt 7pt', borderBottomWidth: 1, borderRightWidth: 1, borderColor: BORDER },
  campoLbl: { fontSize: 6, color: GRAY, textTransform: 'uppercase' },
  campoVal: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', marginTop: 1 },

  grupoTit: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: '#fff', backgroundColor: DARK, padding: '3pt 7pt', marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5 },

  itemRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.5, borderColor: BORDER, paddingVertical: 2.5, paddingHorizontal: 4 },
  itemLabel: { flex: 1, fontSize: 7.5, color: DARK },
  itemNota: { fontSize: 6.5, color: GRAY, fontStyle: 'italic' },
  estCell: { width: 24, textAlign: 'center', fontSize: 6.5, fontFamily: 'Helvetica-Bold', marginLeft: 2, paddingVertical: 1.5, borderRadius: 2, borderWidth: 0.5, borderColor: BORDER },
  estHeadRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 2 },
  estHead: { width: 24, textAlign: 'center', fontSize: 6, color: GRAY, marginLeft: 2, fontFamily: 'Helvetica-Bold' },

  leyenda: { fontSize: 6.5, color: GRAY, marginTop: 8 },
  notas: { fontSize: 7.5, color: DARK, marginTop: 8, padding: 6, backgroundColor: SOFT, borderRadius: 4 },
  firmaWrap: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 26 },
  firmaBox: { width: '45%', alignItems: 'center' },
  firmaLine: { width: '100%', borderTopWidth: 1, borderColor: DARK, paddingTop: 3, alignItems: 'center' },
  firmaLbl: { fontSize: 7, color: GRAY, textAlign: 'center' },
})

export function InspeccionPDF({ data }: { data: InspeccionPDFData }) {
  const primario = data.membrete.colorPrimario || '#C41E3A'
  return (
    <Document title={data.titulo} author={data.membrete.nombre}>
      <Page size="A4" style={s.page}>
        <PdfMembrete data={data.membrete} />

        <View style={[s.titleBand, { backgroundColor: primario }]}>
          <Text style={s.titleText}>{data.titulo.toUpperCase()}</Text>
        </View>

        {/* Datos generales */}
        <View style={s.camposWrap}>
          {data.campos.map((c, i) => (
            <View key={i} style={s.campo}>
              <Text style={s.campoLbl}>{c.label}</Text>
              <Text style={s.campoVal}>{c.valor || '—'}</Text>
            </View>
          ))}
        </View>

        {/* Checklist por secciones */}
        {data.grupos.map((g, gi) => (
          <View key={gi} wrap={false}>
            <Text style={s.grupoTit}>{g.grupo}</Text>
            <View style={s.estHeadRow}>
              <Text style={{ flex: 1 }}> </Text>
              {data.estados.map(e => <Text key={e.value} style={s.estHead}>{e.label}</Text>)}
            </View>
            {g.items.map((it, ii) => (
              <View key={ii} style={s.itemRow}>
                <Text style={s.itemLabel}>{it.label}{it.nota ? <Text style={s.itemNota}>  · {it.nota}</Text> : null}</Text>
                {data.estados.map(e => {
                  const sel = it.estado === e.value
                  return (
                    <Text key={e.value} style={[s.estCell, sel ? { backgroundColor: primario, color: '#fff', borderColor: primario } : { color: '#d1d5db' }]}>
                      {sel ? 'X' : ''}
                    </Text>
                  )
                })}
              </View>
            ))}
          </View>
        ))}

        {data.leyenda ? <Text style={s.leyenda}>{data.leyenda}</Text> : null}
        {data.notas ? <Text style={s.notas}>Observaciones: {data.notas}</Text> : null}

        <View style={s.firmaWrap}>
          {data.firmas.map((f, i) => (
            <View key={i} style={s.firmaBox}>
              <View style={{ height: 28 }} />
              <View style={s.firmaLine}><Text style={s.firmaLbl}>{f}</Text></View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}
