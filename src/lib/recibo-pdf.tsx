import React from 'react'
import {
  Document, Page, View, Text, Image, StyleSheet,
} from '@react-pdf/renderer'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrodemando.laoriental.co'

const RED = '#C41E3A'
const BLACK = '#111111'
const GRAY = '#6b7280'
const LIGHT = '#f9fafb'
const BORDER = '#e5e7eb'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: BLACK, padding: '1.5cm 1.8cm', backgroundColor: '#fff' },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, borderBottom: `2px solid ${RED}`, paddingBottom: 14 },
  logo: { width: 130, height: 'auto' },
  companySmall: { fontSize: 7.5, color: GRAY, marginTop: 3, lineHeight: 1.5 },
  receiptLabel: { fontSize: 8, color: GRAY, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
  receiptNumber: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: RED, letterSpacing: 0.5 },
  statusBadge: { fontSize: 8, color: '#065f46', backgroundColor: '#d1fae5', borderRadius: 20, padding: '3 8', marginTop: 4, alignSelf: 'flex-end' },

  // Section labels
  sectionLabel: { fontSize: 7.5, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4, fontFamily: 'Helvetica-Bold' },

  // Grid
  row2: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  col: { flex: 1 },
  fieldLabel: { fontSize: 7.5, color: GRAY, marginBottom: 2 },
  fieldValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BLACK },
  fieldValueLight: { fontSize: 10, color: BLACK },

  divider: { borderBottom: `1px solid ${BORDER}`, marginVertical: 10 },

  // Table
  table: { marginBottom: 14 },
  tableHeader: { flexDirection: 'row', backgroundColor: LIGHT, borderBottom: `1px solid ${BORDER}`, padding: '5 8' },
  tableRow: { flexDirection: 'row', borderBottom: `1px solid ${BORDER}`, padding: '5 8' },
  tableCell: { flex: 1, fontSize: 8.5 },
  tableCellRight: { flex: 1, fontSize: 8.5, textAlign: 'right' },
  tableHeaderText: { fontSize: 7.5, color: GRAY, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },

  // Monto box
  montoBox: { backgroundColor: LIGHT, borderRadius: 8, padding: '12 16', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  montoLabel: { fontSize: 8, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.5 },
  montoValue: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: BLACK },

  // Firma
  firmaRow: { flexDirection: 'row', gap: 24, marginTop: 24 },
  firmaBox: { flex: 1, alignItems: 'center' },
  firmaLine: { borderBottom: `1.5px solid #d1d5db`, width: '100%', marginBottom: 5 },
  firmaLabel: { fontSize: 7.5, color: GRAY, textTransform: 'uppercase', textAlign: 'center' },
  firmaSpace: { height: 50 },

  // Footer
  footer: { position: 'absolute', bottom: '1cm', left: '1.8cm', right: '1.8cm', flexDirection: 'row', justifyContent: 'space-between', borderTop: `1px solid ${BORDER}`, paddingTop: 6 },
  footerText: { fontSize: 7.5, color: GRAY },

  // Sello
  sello: { width: 70, height: 70, marginBottom: 4 },
})

export interface ReciboPDFData {
  numeroRecibo: string
  fechaRegistro?: string
  fechaPago: string
  estado?: string
  // Cliente
  clienteNombre: string
  clienteCedula?: string | null
  clienteTelefono?: string | null
  clienteCorreo?: string | null
  clienteCiudad?: string | null
  // Vehículo
  vehiculoMarca?: string | null
  vehiculoModelo?: string | null
  vehiculoVersion?: string | null
  vehiculoAnio?: number | null
  placa?: string | null
  // Pago
  concepto: string
  monto: number
  moneda: string
  tasaCambio?: number | null
  metodoPago: string
  referencia?: string | null
  bancoEmisor?: string | null
  bancoReceptor?: string | null
  observaciones?: string | null
  // Firma
  fechaAprobacion?: string | null
}

function fmtDate(d?: string | null) {
  if (!d) return '—'
  try {
    return new Date(d + (d.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('es-VE', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch { return d }
}

function fmtMonto(m: number, moneda: string) {
  const prefix = moneda === 'VES' ? 'Bs.' : moneda
  return `${prefix} ${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(m)}`
}

export function ReciboPDF({ data }: { data: ReciboPDFData }) {
  const logoUrl = `${APP_URL}/logo-la-oriental.jpg`
  const selloUrl = `${APP_URL}/sello-la-oriental.jpeg`

  return (
    <Document title={`Recibo ${data.numeroRecibo}`} author="La Oriental Automotors">
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Image style={s.logo} src={logoUrl} />
            <Text style={s.companySmall}>RIF: J-50569214-3</Text>
            <Text style={s.companySmall}>Av. Ugarte Pelayo, Centro Profesional David</Text>
            <Text style={s.companySmall}>Sector Centro, Maturín, Monagas</Text>
            <Text style={s.companySmall}>Concesionario Oficial MG & MAXUS</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.receiptLabel}>N° de Recibo</Text>
            <Text style={s.receiptNumber}>{data.numeroRecibo}</Text>
            <Text style={[s.companySmall, { marginTop: 6 }]}>{fmtDate(data.fechaPago)}</Text>
          </View>
        </View>

        {/* ── Cliente + Contacto ── */}
        <View style={s.row2}>
          <View style={s.col}>
            <Text style={s.sectionLabel}>Cliente</Text>
            <Text style={s.fieldValue}>{data.clienteNombre}</Text>
            {data.clienteCedula && <Text style={s.fieldValueLight}>{data.clienteCedula}</Text>}
            {data.clienteCiudad && <Text style={[s.fieldValueLight, { color: GRAY }]}>{data.clienteCiudad}</Text>}
          </View>
          <View style={s.col}>
            <Text style={s.sectionLabel}>Contacto</Text>
            {data.clienteTelefono && <Text style={s.fieldValueLight}>{data.clienteTelefono}</Text>}
            {data.clienteCorreo && <Text style={[s.fieldValueLight, { color: GRAY }]}>{data.clienteCorreo}</Text>}
          </View>
        </View>

        <View style={s.divider} />

        {/* ── Vehículo + Placa ── */}
        <View style={s.row2}>
          <View style={{ flex: 2 }}>
            <Text style={s.sectionLabel}>Vehículo</Text>
            {(data.vehiculoMarca || data.vehiculoModelo) ? (
              <>
                <Text style={s.fieldValue}>
                  {[data.vehiculoMarca, data.vehiculoModelo, data.vehiculoAnio?.toString()].filter(Boolean).join(' ')}
                </Text>
                {data.vehiculoVersion && <Text style={[s.fieldValueLight, { color: GRAY }]}>{data.vehiculoVersion}</Text>}
              </>
            ) : <Text style={s.fieldValueLight}>—</Text>}
          </View>
          <View style={s.col}>
            <Text style={s.sectionLabel}>Placa</Text>
            <Text style={[s.fieldValue, { fontSize: 14, letterSpacing: 2 }]}>{data.placa ?? '—'}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── Concepto + Fecha ── */}
        <View style={s.row2}>
          <View style={s.col}>
            <Text style={s.sectionLabel}>Concepto</Text>
            <Text style={s.fieldValue}>{data.concepto}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.sectionLabel}>Fecha de pago</Text>
            <Text style={s.fieldValue}>{fmtDate(data.fechaPago)}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── Monto ── */}
        <View style={s.montoBox}>
          <View>
            <Text style={s.montoLabel}>Monto recibido</Text>
            <Text style={[s.fieldValueLight, { color: GRAY, fontSize: 8, marginTop: 2 }]}>
              {data.moneda === 'VES' ? 'Bolívares' : data.moneda === 'USDT' ? 'Tether USD' : 'Dólares americanos'}
            </Text>
          </View>
          <Text style={s.montoValue}>{fmtMonto(data.monto, data.moneda)}</Text>
        </View>

        {/* Tasa de cambio (solo VES) */}
        {data.moneda === 'VES' && data.tasaCambio && (
          <View style={{ backgroundColor: '#eff6ff', borderRadius: 6, padding: '6 10', marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 8, color: '#1d4ed8' }}>Equivalente en USD: ~{fmtMonto(data.monto / data.tasaCambio, 'USD')}</Text>
            <Text style={{ fontSize: 8, color: '#1d4ed8', fontFamily: 'Helvetica-Bold' }}>{data.tasaCambio.toFixed(2)} Bs/$</Text>
          </View>
        )}

        <View style={s.divider} />

        {/* ── Forma de pago ── */}
        <View style={s.row2}>
          <View style={s.col}>
            <Text style={s.sectionLabel}>Forma de pago</Text>
            <Text style={s.fieldValue}>{data.metodoPago}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.sectionLabel}>N° Referencia</Text>
            <Text style={[s.fieldValue, { fontFamily: 'Courier-Bold', letterSpacing: 0.3 }]}>{data.referencia ?? '—'}</Text>
          </View>
          {data.bancoEmisor && (
            <View style={s.col}>
              <Text style={s.sectionLabel}>Banco emisor</Text>
              <Text style={s.fieldValue}>{data.bancoEmisor}</Text>
            </View>
          )}
          {data.bancoReceptor && (
            <View style={s.col}>
              <Text style={s.sectionLabel}>Banco receptor</Text>
              <Text style={s.fieldValue}>{data.bancoReceptor}</Text>
            </View>
          )}
        </View>

        {/* Observaciones */}
        {data.observaciones && (
          <>
            <View style={s.divider} />
            <View>
              <Text style={s.sectionLabel}>Observaciones</Text>
              <Text style={s.fieldValueLight}>{data.observaciones}</Text>
            </View>
          </>
        )}

        {/* ── Firmas ── */}
        <View style={s.firmaRow}>
          <View style={s.firmaBox}>
            <Image style={s.sello} src={selloUrl} />
            <View style={s.firmaLine} />
            <Text style={s.firmaLabel}>Sello / Firma empresa</Text>
            {data.fechaAprobacion && (
              <Text style={{ fontSize: 7.5, color: '#065f46', marginTop: 3 }}>
                ✓ Aprobado {fmtDate(data.fechaAprobacion)}
              </Text>
            )}
          </View>
          <View style={s.firmaBox}>
            <View style={s.firmaSpace} />
            <View style={s.firmaLine} />
            <Text style={s.firmaLabel}>Firma del cliente</Text>
            {data.clienteCedula && <Text style={{ fontSize: 7.5, color: GRAY, marginTop: 3 }}>{data.clienteCedula}</Text>}
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>La Oriental Automotors C.A. · RIF: J-50569214-3</Text>
          <Text style={s.footerText}>{data.numeroRecibo}</Text>
        </View>

      </Page>
    </Document>
  )
}
