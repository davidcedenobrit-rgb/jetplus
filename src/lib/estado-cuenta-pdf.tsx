import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { PdfMembrete, MembreteData } from './pdf-membrete'

const DARK = '#111827'
const GRAY = '#6b7280'
const LINE = '#e5e7eb'

export interface EstadoCuentaCuota {
  numero: number
  vencimiento: string        // dd/mm/aaaa
  monto: number
  pagado: number
  estado: 'pagada' | 'pendiente' | 'vencida' | 'abono_parcial'
}

export interface EstadoCuentaData {
  fecha: string
  membrete: MembreteData
  numeroCredito: string
  cliente: { nombre: string; ciRif: string }
  vehiculo: { marca: string; modelo: string; placa: string; color?: string | null; anio?: string | number | null }
  resumen: {
    montoFinanciado: number
    inicial: number
    numCuotas: number
    cuota: number
    fechaInicio: string
    estado: string
    totalPagado: number
    saldoPendiente: number
  }
  cuotas: EstadoCuentaCuota[]
}

const ESTADO_LBL: Record<string, string> = { pagada: 'Pagada', pendiente: 'Pendiente', vencida: 'Vencida', abono_parcial: 'Abono parcial' }
const ESTADO_COLOR: Record<string, string> = { pagada: '#15803d', pendiente: '#92400e', vencida: '#b91c1c', abono_parcial: '#c2410c' }

const fmt = (n: number | null | undefined) => (n == null ? '0,00' : n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

export function EstadoCuentaPDF({ data }: { data: EstadoCuentaData }) {
  const primario = data.membrete.colorPrimario || '#C41E3A'
  const v = data.vehiculo
  const r = data.resumen
  const s = StyleSheet.create({
    page: { paddingTop: 26, paddingHorizontal: 34, paddingBottom: 40, fontFamily: 'Helvetica', fontSize: 9, color: DARK },
    title: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: primario, marginTop: 10, textAlign: 'center' },
    sub: { fontSize: 7.5, color: GRAY, textAlign: 'center', marginBottom: 8 },
    secTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#fff', backgroundColor: DARK, paddingVertical: 3, paddingHorizontal: 6, marginTop: 8, marginBottom: 4 },
    row: { flexDirection: 'row' },
    infoCell: { flex: 1, paddingVertical: 1 },
    lbl: { fontSize: 6.5, color: GRAY, textTransform: 'uppercase' },
    val: { fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
    // Resumen en tarjetas
    cards: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
    card: { width: '25%', padding: '5pt 4pt', borderRight: `0.5pt solid ${LINE}`, borderBottom: `0.5pt solid ${LINE}` },
    cardLbl: { fontSize: 6.2, color: GRAY, textTransform: 'uppercase' },
    cardVal: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', marginTop: 1 },
    // Tabla cuotas
    th: { flexDirection: 'row', backgroundColor: '#374151', padding: '4pt 6pt' },
    thTxt: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#fff', textTransform: 'uppercase' },
    tr: { flexDirection: 'row', borderBottom: `0.5pt solid ${LINE}`, padding: '3.5pt 6pt' },
    trAlt: { backgroundColor: '#f9fafb' },
    td: { fontSize: 7.6 },
    cNum: { width: 34, textAlign: 'center' },
    cFecha: { width: 78 },
    cMonto: { width: 78, textAlign: 'right' },
    cPagado: { width: 78, textAlign: 'right' },
    cEstado: { flex: 1, textAlign: 'right' },
    totalRow: { flexDirection: 'row', padding: '5pt 6pt', backgroundColor: '#fef3c7', borderTop: `1pt solid ${primario}` },
  })

  return (
    <Document title={`Estado de cuenta ${data.numeroCredito}`} author={data.membrete.nombre}>
      <Page size="A4" style={s.page}>
        <PdfMembrete data={data.membrete} />
        <Text style={s.title}>ESTADO DE CUENTA — CRÉDITO</Text>
        <Text style={s.sub}>Crédito {data.numeroCredito} · Emitido {data.fecha}</Text>

        <View style={[s.row, { marginTop: 4 }]}>
          <View style={s.infoCell}><Text style={s.lbl}>Cliente</Text><Text style={s.val}>{data.cliente.nombre}</Text></View>
          <View style={s.infoCell}><Text style={s.lbl}>C.I./RIF</Text><Text style={s.val}>{data.cliente.ciRif || '—'}</Text></View>
          <View style={s.infoCell}><Text style={s.lbl}>Vehículo</Text><Text style={s.val}>{v.marca} {v.modelo}</Text></View>
          <View style={s.infoCell}><Text style={s.lbl}>Placa</Text><Text style={s.val}>{v.placa || '—'}</Text></View>
        </View>

        <Text style={s.secTitle}>RESUMEN DEL CRÉDITO</Text>
        <View style={s.cards}>
          {[
            ['Monto financiado', `$${fmt(r.montoFinanciado)}`],
            ['Inicial', `$${fmt(r.inicial)}`],
            ['N.° de cuotas', String(r.numCuotas)],
            ['Cuota', `$${fmt(r.cuota)}`],
            ['Fecha de inicio', r.fechaInicio],
            ['Estado', r.estado],
            ['Total pagado', `$${fmt(r.totalPagado)}`],
            ['Saldo pendiente', `$${fmt(r.saldoPendiente)}`],
          ].map(([l, val], i) => (
            <View key={i} style={s.card}>
              <Text style={s.cardLbl}>{l}</Text>
              <Text style={[s.cardVal, i === 7 ? { color: primario } : {}]}>{val}</Text>
            </View>
          ))}
        </View>

        <Text style={s.secTitle}>CRONOGRAMA DE CUOTAS</Text>
        <View style={s.th}>
          <Text style={[s.thTxt, s.cNum]}>N°</Text>
          <Text style={[s.thTxt, s.cFecha]}>VENCIMIENTO</Text>
          <Text style={[s.thTxt, s.cMonto]}>MONTO</Text>
          <Text style={[s.thTxt, s.cPagado]}>PAGADO</Text>
          <Text style={[s.thTxt, s.cEstado]}>ESTADO</Text>
        </View>
        {data.cuotas.map((c, i) => (
          <View key={i} style={i % 2 === 1 ? [s.tr, s.trAlt] : s.tr}>
            <Text style={[s.td, s.cNum]}>{c.numero}</Text>
            <Text style={[s.td, s.cFecha]}>{c.vencimiento}</Text>
            <Text style={[s.td, s.cMonto]}>${fmt(c.monto)}</Text>
            <Text style={[s.td, s.cPagado]}>${fmt(c.pagado)}</Text>
            <Text style={[s.td, s.cEstado, { fontFamily: 'Helvetica-Bold', color: ESTADO_COLOR[c.estado] ?? DARK }]}>{ESTADO_LBL[c.estado] ?? c.estado}</Text>
          </View>
        ))}
        <View style={s.totalRow}>
          <Text style={[s.td, { flex: 1, fontFamily: 'Helvetica-Bold', color: '#92400e' }]}>TOTALES</Text>
          <Text style={[s.td, s.cMonto, { fontFamily: 'Helvetica-Bold', color: '#92400e' }]}>${fmt(data.cuotas.reduce((a, c) => a + c.monto, 0))}</Text>
          <Text style={[s.td, s.cPagado, { fontFamily: 'Helvetica-Bold', color: '#92400e' }]}>${fmt(data.cuotas.reduce((a, c) => a + c.pagado, 0))}</Text>
          <Text style={[s.td, s.cEstado]}> </Text>
        </View>
      </Page>
    </Document>
  )
}
