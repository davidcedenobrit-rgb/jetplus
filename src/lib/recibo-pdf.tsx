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

  // Estado de cuenta
  ecBox: { borderWidth: 1, borderColor: BORDER, borderStyle: 'solid', borderRadius: 6, padding: '10 12', backgroundColor: LIGHT },
  ecRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  ecLabel: { fontSize: 8, color: GRAY },
  ecValue: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
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
  // Cuotas aplicadas
  cuotasAplicadas?: Array<{
    numeroCuota: number
    planNombre: string
    fechaVencimiento?: string | null
    montoTotal: number
    montoAplicado: number
  }>
  // Estado de cuenta
  ecTotalFinanciado?: number
  ecTotalSaldo?: number
  ecPct?: number
  ecPagadas?: number
  ecPendientes?: number
  ecVencidas?: number
  creditosDesglose?: Array<{
    planNombre: string
    saldo: number
    totalCuotas: number
    cuotasPagadas: number
  }>
}

function fmtDate(d?: string | null) {
  if (!d) return '—'
  try {
    return new Date(d + (d.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('es-VE', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch { return d }
}

function fmtNum(n: number) {
  return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(n)
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

        {/* ── Cuotas aplicadas ── */}
        {data.cuotasAplicadas && data.cuotasAplicadas.length > 0 && (
          <>
            <View style={s.table}>
              <Text style={[s.sectionLabel, { marginBottom: 6 }]}>Cuotas aplicadas</Text>
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderText, { flex: 0.5 }]}>Cuota</Text>
                <Text style={[s.tableHeaderText, { flex: 1 }]}>Plan</Text>
                <Text style={[s.tableHeaderText, { flex: 1.2 }]}>Vencimiento</Text>
                <Text style={[s.tableHeaderText, s.tableCellRight, { flex: 1 }]}>Monto total</Text>
                <Text style={[s.tableHeaderText, s.tableCellRight, { flex: 1 }]}>Aplicado</Text>
                <Text style={[s.tableHeaderText, s.tableCellRight, { flex: 1 }]}>Pendiente</Text>
              </View>
              {data.cuotasAplicadas.map((ci, idx) => {
                const pendiente = Math.max(0, ci.montoTotal - ci.montoAplicado)
                return (
                  <View key={idx} style={s.tableRow}>
                    <Text style={[s.tableCell, { flex: 0.5, fontFamily: 'Helvetica-Bold' }]}>#{ci.numeroCuota}</Text>
                    <Text style={[s.tableCell, { flex: 1 }]}>{ci.planNombre}</Text>
                    <Text style={[s.tableCell, { flex: 1.2, fontSize: 8 }]}>{fmtDate(ci.fechaVencimiento)}</Text>
                    <Text style={[s.tableCellRight, { flex: 1 }]}>USD {fmtNum(ci.montoTotal)}</Text>
                    <Text style={[s.tableCellRight, { flex: 1, fontFamily: 'Helvetica-Bold' }]}>USD {fmtNum(ci.montoAplicado)}</Text>
                    <Text style={[s.tableCellRight, { flex: 1, color: pendiente > 0 ? '#dc2626' : '#16a34a' }]}>
                      {pendiente > 0 ? `USD ${fmtNum(pendiente)}` : '—'}
                    </Text>
                  </View>
                )
              })}
            </View>
            <View style={s.divider} />
          </>
        )}

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

        {/* ── Estado de cuenta ── */}
        {data.creditosDesglose && data.creditosDesglose.length > 0 && (
          <>
            <View style={s.divider} />
            <Text style={[s.sectionLabel, { marginBottom: 6 }]}>Estado de cuenta — al día de este recibo</Text>
            <View style={[s.row2, { marginBottom: 14 }]}>

              {/* Resumen */}
              <View style={[s.col, s.ecBox]}>
                <Text style={[s.sectionLabel, { marginBottom: 8 }]}>Resumen total</Text>
                <View style={s.ecRow}>
                  <Text style={s.ecLabel}>Total financiado</Text>
                  <Text style={s.ecValue}>USD {fmtNum(data.ecTotalFinanciado ?? 0)}</Text>
                </View>
                <View style={s.ecRow}>
                  <Text style={s.ecLabel}>Ya pagado</Text>
                  <Text style={[s.ecValue, { color: '#16a34a' }]}>USD {fmtNum((data.ecTotalFinanciado ?? 0) - (data.ecTotalSaldo ?? 0))}</Text>
                </View>
                <View style={[s.ecRow, { marginBottom: 8 }]}>
                  <Text style={s.ecLabel}>Saldo pendiente</Text>
                  <Text style={[s.ecValue, { color: RED }]}>USD {fmtNum(data.ecTotalSaldo ?? 0)}</Text>
                </View>
                {/* Barra de progreso */}
                <View style={{ height: 4, backgroundColor: BORDER, borderRadius: 2, marginBottom: 8 }}>
                  <View style={{ height: 4, backgroundColor: '#22c55e', borderRadius: 2, width: `${data.ecPct ?? 0}%` }} />
                </View>
                {/* Contadores */}
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <View style={{ flex: 1, backgroundColor: '#f0fdf4', borderRadius: 4, padding: '4 2', alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0', borderStyle: 'solid' }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#16a34a' }}>{data.ecPagadas ?? 0}</Text>
                    <Text style={{ fontSize: 7, color: '#16a34a' }}>Pagadas</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#fefce8', borderRadius: 4, padding: '4 2', alignItems: 'center', borderWidth: 1, borderColor: '#fef08a', borderStyle: 'solid' }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#ca8a04' }}>{data.ecPendientes ?? 0}</Text>
                    <Text style={{ fontSize: 7, color: '#ca8a04' }}>Pendientes</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: (data.ecVencidas ?? 0) > 0 ? '#fef2f2' : LIGHT, borderRadius: 4, padding: '4 2', alignItems: 'center', borderWidth: 1, borderColor: (data.ecVencidas ?? 0) > 0 ? '#fecaca' : BORDER, borderStyle: 'solid' }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: (data.ecVencidas ?? 0) > 0 ? '#dc2626' : '#9ca3af' }}>{data.ecVencidas ?? 0}</Text>
                    <Text style={{ fontSize: 7, color: (data.ecVencidas ?? 0) > 0 ? '#dc2626' : '#9ca3af' }}>Vencidas</Text>
                  </View>
                </View>
              </View>

              {/* Desglose */}
              <View style={s.col}>
                <Text style={[s.sectionLabel, { marginBottom: 8 }]}>Desglose por financiamiento</Text>
                <View style={{ gap: 6 }}>
                  {data.creditosDesglose.map((c, idx) => {
                    const isLaOriental = c.planNombre === 'La Oriental'
                    const bg = isLaOriental ? '#faf5ff' : '#eef2ff'
                    const textColor = isLaOriental ? '#7e22ce' : '#4338ca'
                    const bColor = isLaOriental ? '#e9d5ff' : '#c7d2fe'
                    return (
                      <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: bg, borderRadius: 6, padding: '7 9', borderWidth: 1, borderColor: bColor, borderStyle: 'solid' }}>
                        <View>
                          <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: textColor }}>{c.planNombre}</Text>
                          <Text style={{ fontSize: 7.5, color: textColor }}>{c.cuotasPagadas}/{c.totalCuotas} cuotas</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 7.5, color: textColor }}>Saldo</Text>
                          <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: textColor }}>USD {fmtNum(c.saldo)}</Text>
                        </View>
                      </View>
                    )
                  })}
                </View>
              </View>
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
