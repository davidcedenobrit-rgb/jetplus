import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { PdfMembrete, type MembreteData } from './pdf-membrete'

const RED = '#C41E3A'
const BLACK = '#111111'
const GRAY = '#6b7280'
const LIGHT = '#f3f4f6'
const BORDER = '#e5e7eb'

const ESTADO_LABEL: Record<string, string> = {
  llegada: 'Recibido',
  por_enviar_pdi: 'Por enviar PDI',
  en_taller: 'En taller',
  en_agencia: 'Disponible',
  reservado: 'Reservado',
  vendido: 'Vendido',
}

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 8, color: BLACK, padding: '1.2cm 1cm', backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12, borderBottom: `2px solid ${RED}`, paddingBottom: 8 },
  title: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: BLACK },
  sub: { fontSize: 8, color: GRAY, marginTop: 2 },
  meta: { fontSize: 8, color: GRAY, textAlign: 'right' },
  th: { flexDirection: 'row', backgroundColor: LIGHT, borderBottom: `1px solid ${BORDER}`, paddingVertical: 5, paddingHorizontal: 3 },
  thText: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: GRAY, textTransform: 'uppercase' },
  tr: { flexDirection: 'row', borderBottom: `0.5px solid ${BORDER}`, paddingVertical: 4, paddingHorizontal: 3 },
  cell: { fontSize: 7.5, color: BLACK },
  footer: { position: 'absolute', bottom: '0.7cm', left: '1cm', right: '1cm', flexDirection: 'row', justifyContent: 'space-between', borderTop: `0.5px solid ${BORDER}`, paddingTop: 5 },
  footerText: { fontSize: 7, color: GRAY },
})

// Anchos de columna (proporcionales)
const COLS = [
  { key: 'marca', label: 'Marca', flex: 1 },
  { key: 'modelo', label: 'Modelo', flex: 1.6 },
  { key: 'version', label: 'Versión', flex: 1 },
  { key: 'anio', label: 'Año', flex: 0.5 },
  { key: 'color', label: 'Color', flex: 0.9 },
  { key: 'placa', label: 'Placa', flex: 0.9 },
  { key: 'vin', label: 'VIN / Chasis', flex: 1.8 },
  { key: 'serial', label: 'Serial motor', flex: 1.4 },
  { key: 'estado', label: 'Estado', flex: 1 },
  { key: 'ubicacion', label: 'Ubicación', flex: 1 },
  { key: 'proforma', label: 'Proforma', flex: 1.1 },
]

export interface ShowroomFila {
  marca: string | null
  modelo: string | null
  version: string | null
  anio: number | null
  color: string | null
  placa: string | null
  vin: string | null
  serial_motor: string | null
  estado: string | null
  ubicacion: string | null
  ubicacion_descripcion: string | null
  proforma_vehimotors: string | null
}

export function ShowroomListadoPDF({ filas, titulo, fecha, membrete }: { filas: ShowroomFila[]; titulo: string; fecha: string; membrete?: MembreteData }) {
  return (
    <Document title={`Listado showroom — ${titulo}`} author={membrete?.nombre ?? 'La Oriental Automotors'}>
      <Page size="A4" orientation="landscape" style={s.page}>
        {membrete ? <View style={{ marginBottom: 8 }} fixed><PdfMembrete data={membrete} /></View> : null}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Vehículos en Showroom</Text>
            <Text style={s.sub}>{membrete?.nombre ?? 'La Oriental Automotors'} · {titulo}</Text>
          </View>
          <View>
            <Text style={s.meta}>{filas.length} vehículo{filas.length !== 1 ? 's' : ''}</Text>
            <Text style={s.meta}>{fecha}</Text>
          </View>
        </View>

        {/* Encabezado de tabla */}
        <View style={s.th} fixed>
          {COLS.map(c => (
            <Text key={c.key} style={[s.thText, { flex: c.flex }]}>{c.label}</Text>
          ))}
        </View>

        {/* Filas */}
        {filas.map((f, i) => {
          const ubic = f.ubicacion === 'otro' ? (f.ubicacion_descripcion ?? 'Otro') : (f.ubicacion ?? '—')
          const vals: Record<string, string> = {
            marca: f.marca ?? '—',
            modelo: f.modelo ?? '—',
            version: f.version ?? '—',
            anio: f.anio?.toString() ?? '—',
            color: f.color ?? '—',
            placa: f.placa ?? '—',
            vin: f.vin ?? '—',
            serial: f.serial_motor ?? '—',
            estado: ESTADO_LABEL[f.estado ?? ''] ?? (f.estado ?? '—'),
            ubicacion: ubic,
            proforma: f.proforma_vehimotors ?? '—',
          }
          return (
            <View key={i} style={[s.tr, { backgroundColor: i % 2 === 1 ? '#fafafa' : '#fff' }]} wrap={false}>
              {COLS.map(c => (
                <Text key={c.key} style={[s.cell, { flex: c.flex }]}>{vals[c.key]}</Text>
              ))}
            </View>
          )
        })}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>La Oriental Automotors C.A. · RIF: J-50569214-3</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
