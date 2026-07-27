import React from 'react'
import { Document, Page, View, Text, StyleSheet, Svg, Rect, Line, Circle, Text as SvgText } from '@react-pdf/renderer'
import { PdfMembrete, type MembreteData } from './pdf-membrete'

export type DamageMark = { x: number; y: number; codigo: number }
const DAMAGE_CODES = [
  '1. Rayón leve', '2. Choque leve', '3. Mancha', '4. Roto',
  '5. Rayón fuerte', '6. Choque fuerte', '7. Abollado', '8. Ausente',
]

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
  marks?: DamageMark[]
}

// Diagrama del vehículo (vista superior) con las marcas de daño. Mismo viewBox
// que el componente web (220 x 120).
function CarDiagramPDF({ marks, primario }: { marks: DamageMark[]; primario: string }) {
  return (
    <Svg viewBox="0 0 220 120" style={{ width: 300, height: 164 }}>
      <Rect x={30} y={25} width={160} height={70} rx={18} fill="#ffffff" stroke="#374151" strokeWidth={1.6} />
      <Rect x={78} y={40} width={64} height={40} rx={8} fill="none" stroke="#9ca3af" strokeWidth={1} />
      <Line x1={64} y1={26} x2={64} y2={94} stroke="#d1d5db" strokeWidth={1} />
      <Line x1={156} y1={26} x2={156} y2={94} stroke="#d1d5db" strokeWidth={1} />
      <Rect x={44} y={19} width={16} height={7} rx={2} fill="#374151" />
      <Rect x={160} y={19} width={16} height={7} rx={2} fill="#374151" />
      <Rect x={44} y={94} width={16} height={7} rx={2} fill="#374151" />
      <Rect x={160} y={94} width={16} height={7} rx={2} fill="#374151" />
      <SvgText x={12} y={63} style={{ fontSize: 7, fill: '#9ca3af' }}>Frente</SvgText>
      <SvgText x={193} y={63} style={{ fontSize: 7, fill: '#9ca3af' }}>Cola</SvgText>
      <SvgText x={100} y={13} style={{ fontSize: 7, fill: '#9ca3af' }}>Izquierdo</SvgText>
      <SvgText x={101} y={117} style={{ fontSize: 7, fill: '#9ca3af' }}>Derecho</SvgText>
      {marks.map((m, i) => (
        <React.Fragment key={i}>
          <Circle cx={m.x} cy={m.y} r={7} fill={primario} stroke="#ffffff" strokeWidth={1} />
          <SvgText x={m.x} y={m.y + 2.6} style={{ fontSize: 8, fill: '#ffffff' }} textAnchor="middle">{String(m.codigo)}</SvgText>
        </React.Fragment>
      ))}
    </Svg>
  )
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

        {data.marks && data.marks.length > 0 ? (
          <View wrap={false} style={{ marginTop: 8 }}>
            <Text style={s.grupoTit}>Diagrama de daños</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <CarDiagramPDF marks={data.marks} primario={primario} />
              <View style={{ marginLeft: 12 }}>
                {DAMAGE_CODES.map((c, i) => <Text key={i} style={{ fontSize: 6.8, color: GRAY, marginBottom: 1.5 }}>{c}</Text>)}
              </View>
            </View>
          </View>
        ) : null}

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
