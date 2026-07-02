import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const LOGO = 'https://assets.cdn.filesafe.space/XZDJ4aSOAL1crWRCXyY6/media/698367bc1dfc0253b24abd7a.png'
const RED = '#C41E3A'
const GOLD = '#ca8a04'
const DARK = '#111827'
const GRAY = '#6b7280'
const LIGHT = '#f9fafb'
const BORDER = '#e5e7eb'
const GREEN_DARK = '#065f46'
const AMBER_LIGHT = '#fef3c7'
const AMBER_DARK = '#92400e'

const s = StyleSheet.create({
  page: { fontSize: 9, fontFamily: 'Helvetica', color: DARK, paddingBottom: 40 },

  header: { backgroundColor: '#fff', borderBottom: `1pt solid ${BORDER}`, padding: '12pt 28pt 10pt', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoWrap: { flexShrink: 0 },
  logo: { width: 240, height: 48, objectFit: 'contain' },
  companyBlock: { alignItems: 'flex-end' },
  companyName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 2 },
  companyRif: { fontSize: 8, color: RED, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  companyLine: { fontSize: 7.5, color: GRAY },

  body: { padding: '14pt 28pt' },

  documentTitleWrap: { alignItems: 'center', marginBottom: 10 },
  documentTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: RED, letterSpacing: 2 },
  documentSubtitle: { fontSize: 8, color: GRAY, letterSpacing: 1, marginTop: 2 },

  twoCol: { flexDirection: 'row', marginBottom: 12 },
  clientBlock: { flex: 1, paddingRight: 16 },
  proBlock: { width: 190, backgroundColor: '#fafafa', border: `1pt solid ${BORDER}`, borderRadius: 6, padding: '10pt 12pt' },

  sectionLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: GRAY, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  clientRow: { flexDirection: 'row', marginBottom: 3 },
  clientKey: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: DARK, width: 80 },
  clientVal: { fontSize: 8, color: GRAY, flex: 1 },

  proNumero: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: RED, marginBottom: 4 },
  proRow: { flexDirection: 'row', marginBottom: 2 },
  proKey: { fontSize: 7.5, color: GRAY, width: 75 },
  proVal: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: DARK, flex: 1 },

  divider: { height: 1, backgroundColor: BORDER, marginBottom: 10 },

  tableHeader: { flexDirection: 'row', backgroundColor: DARK, borderRadius: 4, padding: '5pt 8pt', marginBottom: 1 },
  tableHeaderText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#fff' },
  tableRow: { flexDirection: 'row', borderBottom: `0.5pt solid ${BORDER}`, padding: '5pt 8pt' },
  tableCell: { fontSize: 8.5, color: DARK },
  colMarca: { width: 55 },
  colModelo: { flex: 1 },
  colPlaca: { width: 60, textAlign: 'center' },
  colPrecio: { width: 80, textAlign: 'right' },

  montosRow: { flexDirection: 'row', marginTop: 12, gap: 12 },
  montosBox: { flex: 1, border: `1pt solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' },
  montosHeader: { backgroundColor: DARK, padding: '5pt 10pt' },
  montosHeaderText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
  montosRow2: { flexDirection: 'row', justifyContent: 'space-between', padding: '4pt 10pt', borderBottom: `0.5pt solid ${BORDER}` },
  montosLabel: { fontSize: 7.5, color: GRAY },
  montosVal: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: DARK },
  montosTotalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: '6pt 10pt', backgroundColor: '#fef9c3' },
  montosTotalLabel: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: GOLD },
  montosTotalVal: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: AMBER_DARK },

  // Compromiso formal (texto entre montos y crédito)
  compromisoBox: { marginTop: 12, backgroundColor: '#fef3c7', border: `1pt solid ${GOLD}`, borderRadius: 6, padding: '10pt 14pt' },
  compromisoText: { fontSize: 8.5, color: '#78350f', lineHeight: 1.55 },
  compromisoBold: { fontFamily: 'Helvetica-Bold', color: '#78350f' },

  // Bloque crédito
  creditoWrap: { marginTop: 14 },
  creditoBox: { border: `1pt solid ${GOLD}`, borderRadius: 6, overflow: 'hidden' },
  creditoHeader: { backgroundColor: GOLD, padding: '7pt 10pt' },
  creditoHeaderTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#fff' },
  creditoHeaderSub: { fontSize: 7.5, color: '#fef3c7', marginTop: 2 },
  creditoAvisoBox: { backgroundColor: AMBER_LIGHT, padding: '6pt 10pt', borderBottom: `0.5pt solid ${BORDER}` },
  creditoAvisoText: { fontSize: 7.5, color: AMBER_DARK, lineHeight: 1.5 },
  creditoAvisoBold: { fontFamily: 'Helvetica-Bold' },
  creditoResumen: { flexDirection: 'row', padding: '8pt 10pt', borderBottom: `0.5pt solid ${BORDER}`, backgroundColor: '#fafafa' },
  creditoResumenItem: { flex: 1, alignItems: 'center' },
  creditoResumenLabel: { fontSize: 6.5, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  creditoResumenVal: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: DARK },

  // Tabla cronograma
  cronoHeader: { flexDirection: 'row', backgroundColor: '#374151', padding: '4pt 8pt' },
  cronoHeaderText: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.4 },
  cronoRow: { flexDirection: 'row', borderBottom: `0.5pt solid ${BORDER}`, padding: '3.5pt 8pt' },
  cronoRowAlt: { backgroundColor: '#f9fafb' },
  cronoCell: { fontSize: 7.5, color: DARK },
  colCuota: { width: 40, textAlign: 'center' },
  colFecha: { width: 75 },
  colMonto: { width: 65, textAlign: 'right' },
  colEstado: { flex: 1, textAlign: 'right' },
  cronoTotalRow: { flexDirection: 'row', padding: '6pt 8pt', backgroundColor: '#fef3c7', borderTop: `1pt solid ${GOLD}` },
  cronoTotalLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: AMBER_DARK, flex: 1 },
  cronoTotalVal: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: AMBER_DARK, textAlign: 'right' },

  legalBox: { marginTop: 12, backgroundColor: LIGHT, border: `1pt solid ${BORDER}`, borderRadius: 6, padding: '8pt 12pt' },
  legalText: { fontSize: 7.5, color: GRAY, lineHeight: 1.5 },
  legalBold: { fontFamily: 'Helvetica-Bold', color: DARK },

  sigRow: { flexDirection: 'row', marginTop: 18, marginBottom: 10, gap: 20 },
  sigBlock: { flex: 1, alignItems: 'center' },
  sigSpaceBox: { height: 70, width: 200, borderBottom: `1pt solid ${DARK}`, marginBottom: 6 },
  sigLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: DARK },
  sigSub: { fontSize: 7.5, color: GRAY, marginTop: 2 },

  selloBox: { width: 100, height: 100, border: `1.5pt dashed ${GRAY}`, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  selloInner: { alignItems: 'center' },
  selloText: { fontSize: 8, color: GRAY, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  selloSubText: { fontSize: 7, color: '#9ca3af', textAlign: 'center', marginTop: 2 },
  sigLineOnly: { width: 200, height: 1, backgroundColor: DARK, marginBottom: 6 },

  condTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 4, marginTop: 6 },
  condText: { fontSize: 7.5, color: GRAY, lineHeight: 1.55 },
  footer: { position: 'absolute', bottom: 20, left: 28, right: 28, flexDirection: 'row', justifyContent: 'space-between', borderTop: `0.5pt solid ${BORDER}`, paddingTop: 6 },
  footerText: { fontSize: 7, color: '#9ca3af' },

  badge: { padding: '2pt 5pt', borderRadius: 3, alignSelf: 'flex-end' },
  badgePagada: { backgroundColor: '#dcfce7' },
  badgePendiente: { backgroundColor: '#fef9c3' },
  badgeVencida: { backgroundColor: '#fee2e2' },
  badgeAbono: { backgroundColor: '#ffedd5' },
  badgeText: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.4 },
  badgeTextPagada: { color: '#15803d' },
  badgeTextPendiente: { color: '#92400e' },
  badgeTextVencida: { color: '#b91c1c' },
  badgeTextAbono: { color: '#c2410c' },
})

function fmt(n: number | null | undefined) {
  if (n == null) return '0,00'
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(s: string | null | undefined) {
  if (!s) return '—'
  try { return new Date(s + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return s }
}

const estadoLabel: Record<string, string> = {
  pagada: 'Pagada',
  pendiente: 'Pendiente',
  vencida: 'Vencida',
  abono_parcial: 'Abono parcial',
}

export interface CuotaCronogramaItem {
  numero: number
  fecha_vencimiento: string
  monto: number
  estado: 'pagada' | 'pendiente' | 'vencida' | 'abono_parcial'
  monto_pagado?: number
}

export interface AcuerdoInicialInfo {
  monto_acordado: number
  monto_pagado: number
  saldo_por_pagar: number
  fecha_limite: string | null
  observaciones?: string | null
}

export interface ProformaPDFData {
  logoSrc?: string
  numero: string
  fecha: string
  clienteNombre: string
  clienteCiRif: string
  clienteDireccion: string | null
  clienteCorreo: string | null
  clienteTelefono: string | null
  marca: string
  modelo: string
  placa: string | null
  anio: number | null
  color: string | null
  precioBase: number
  totalVehiculo: number
  inicialPagada: number
  saldoFinanciado: number
  cuotaMensual: number
  numeroCuotas: number
  planTipo: string
  planLabel: string
  cronograma: CuotaCronogramaItem[]
  vendedor?: string | null
  acuerdoInicial?: AcuerdoInicialInfo | null
}

export function ProformaPDF({ data }: { data: ProformaPDFData }) {
  const totalCronograma = data.cronograma.reduce((s, c) => s + Number(c.monto), 0)

  return (
    <Document title={`Proforma ${data.numero}`} author="La Oriental Automotors">
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.logoWrap}>
            <Image src={data.logoSrc ?? LOGO} style={s.logo} />
          </View>
          <View style={s.companyBlock}>
            <Text style={s.companyName}>LA ORIENTAL AUTOMOTORS, C.A.</Text>
            <Text style={s.companyRif}>RIF: J-505692143</Text>
            <Text style={s.companyLine}>AV. UGARTE ALIRIO PELYO · CENTRO PROFESIONAL DAVID</Text>
            <Text style={s.companyLine}>MATURÍN - MONAGAS - VENEZUELA</Text>
            <Text style={s.companyLine}>TEL: 0414-9989010 · laorientalautomotorsc@gmail.com</Text>
          </View>
        </View>

        <View style={s.body}>

          <View style={s.documentTitleWrap}>
            <Text style={s.documentTitle}>PROFORMA</Text>
            <Text style={s.documentSubtitle}>DOCUMENTO DE VENTA CON FINANCIAMIENTO OTORGADO</Text>
          </View>

          {/* Cliente + Número Proforma */}
          <View style={s.twoCol}>
            <View style={s.clientBlock}>
              <Text style={s.sectionLabel}>Datos del cliente</Text>
              {[
                ['CLIENTE', data.clienteNombre],
                ['C.I./RIF', data.clienteCiRif],
                ['DIRECCIÓN', data.clienteDireccion || '—'],
                ['CORREO', data.clienteCorreo || '—'],
                ['TELÉFONO', data.clienteTelefono || '—'],
              ].map(([k, v]) => (
                <View key={k} style={s.clientRow}>
                  <Text style={s.clientKey}>{k}:</Text>
                  <Text style={s.clientVal}>{v}</Text>
                </View>
              ))}
            </View>

            <View style={s.proBlock}>
              <Text style={s.sectionLabel}>Número de proforma</Text>
              <Text style={s.proNumero}>{data.numero}</Text>
              <View style={s.proRow}>
                <Text style={s.proKey}>Fecha emisión:</Text>
                <Text style={s.proVal}>{data.fecha}</Text>
              </View>
              <View style={s.proRow}>
                <Text style={s.proKey}>Modalidad:</Text>
                <Text style={s.proVal}>{data.planLabel}</Text>
              </View>
              {data.vendedor && (
                <View style={s.proRow}>
                  <Text style={s.proKey}>Vendedor:</Text>
                  <Text style={s.proVal}>{data.vendedor}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={s.divider} />

          {/* Tabla vehículo */}
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderText, s.colMarca]}>MARCA</Text>
            <Text style={[s.tableHeaderText, s.colModelo]}>MODELO {data.anio ? `· ${data.anio}` : ''}{data.color ? ` · ${data.color}` : ''}</Text>
            <Text style={[s.tableHeaderText, s.colPlaca]}>PLACA</Text>
            <Text style={[s.tableHeaderText, s.colPrecio]}>PRECIO ($)</Text>
          </View>
          <View style={s.tableRow}>
            <Text style={[s.tableCell, s.colMarca]}>{data.marca}</Text>
            <Text style={[s.tableCell, s.colModelo]}>{data.modelo}</Text>
            <Text style={[s.tableCell, s.colPlaca]}>{data.placa || '—'}</Text>
            <Text style={[s.tableCell, s.colPrecio, { fontFamily: 'Helvetica-Bold' }]}>{fmt(data.totalVehiculo)}</Text>
          </View>

          {/* Bloque de montos */}
          <View style={s.montosRow}>
            <View style={s.montosBox}>
              <View style={s.montosHeader}>
                <Text style={s.montosHeaderText}>Resumen de la operación</Text>
              </View>
              <View style={s.montosRow2}>
                <Text style={s.montosLabel}>Precio del vehículo</Text>
                <Text style={s.montosVal}>${fmt(data.totalVehiculo)}</Text>
              </View>
              <View style={s.montosRow2}>
                <Text style={s.montosLabel}>Inicial pagada</Text>
                <Text style={s.montosVal}>${fmt(data.inicialPagada)}</Text>
              </View>
              <View style={s.montosRow2}>
                <Text style={s.montosLabel}>Saldo financiado</Text>
                <Text style={s.montosVal}>${fmt(data.saldoFinanciado)}</Text>
              </View>
              <View style={s.montosTotalRow}>
                <Text style={s.montosTotalLabel}>CUOTA MENSUAL:</Text>
                <Text style={s.montosTotalVal}>${fmt(data.cuotaMensual)}</Text>
              </View>
            </View>
          </View>

          {/* Bloque de compromiso formal */}
          <View style={s.compromisoBox}>
            <Text style={s.compromisoText}>
              <Text style={s.compromisoBold}>COMPROMISO DEL CLIENTE: </Text>
              El cliente <Text style={s.compromisoBold}>{data.clienteNombre}</Text>, C.I./RIF: <Text style={s.compromisoBold}>{data.clienteCiRif}</Text>,{' '}
              {data.acuerdoInicial && data.acuerdoInicial.saldo_por_pagar > 0.01 ? (
                <>
                  se compromete a completar el pago de la <Text style={s.compromisoBold}>inicial</Text> por un monto de{' '}
                  <Text style={s.compromisoBold}>${fmt(data.acuerdoInicial.saldo_por_pagar)}</Text>
                  {data.acuerdoInicial.fecha_limite ? <> antes del <Text style={s.compromisoBold}>{fmtDate(data.acuerdoInicial.fecha_limite)}</Text></> : null}
                  {' '}(ya pagado ${fmt(data.acuerdoInicial.monto_pagado)} de ${fmt(data.acuerdoInicial.monto_acordado)}), y adicionalmente asume el <Text style={s.compromisoBold}>compromiso de financiamiento</Text> de{' '}
                  <Text style={s.compromisoBold}>{data.numeroCuotas} cuotas mensuales de ${fmt(data.cuotaMensual)}</Text> por un total financiado de <Text style={s.compromisoBold}>${fmt(data.saldoFinanciado)}</Text>.
                </>
              ) : (
                <>
                  ha pagado la <Text style={s.compromisoBold}>inicial</Text> de <Text style={s.compromisoBold}>${fmt(data.inicialPagada)}</Text> y asume el <Text style={s.compromisoBold}>compromiso de financiamiento</Text> de{' '}
                  <Text style={s.compromisoBold}>{data.numeroCuotas} cuotas mensuales de ${fmt(data.cuotaMensual)}</Text> por un total financiado de <Text style={s.compromisoBold}>${fmt(data.saldoFinanciado)}</Text>.
                </>
              )}
            </Text>
          </View>

          {/* Bloque de crédito otorgado */}
          <View style={s.creditoWrap}>
            <View style={s.creditoBox}>
              <View style={s.creditoHeader}>
                <Text style={s.creditoHeaderTitle}>COMPROMISO DE PAGO — CRÉDITO OTORGADO</Text>
                <Text style={s.creditoHeaderSub}>Plan: {data.planLabel}</Text>
              </View>

              <View style={s.creditoAvisoBox}>
                <Text style={s.creditoAvisoText}>
                  <Text style={s.creditoAvisoBold}>⚠ AVISO IMPORTANTE: </Text>
                  Este vehículo <Text style={s.creditoAvisoBold}>NO ha sido pagado en su totalidad</Text>. El cliente {data.clienteNombre}, C.I./RIF: {data.clienteCiRif}, ha recibido el vehículo bajo compromiso de pago financiado según el cronograma que se detalla a continuación.
                </Text>
              </View>

              <View style={s.creditoResumen}>
                <View style={s.creditoResumenItem}>
                  <Text style={s.creditoResumenLabel}>Inicial pagada</Text>
                  <Text style={s.creditoResumenVal}>${fmt(data.inicialPagada)}</Text>
                </View>
                <View style={s.creditoResumenItem}>
                  <Text style={s.creditoResumenLabel}>Saldo financiado</Text>
                  <Text style={s.creditoResumenVal}>${fmt(data.saldoFinanciado)}</Text>
                </View>
                <View style={s.creditoResumenItem}>
                  <Text style={s.creditoResumenLabel}>N.° de cuotas</Text>
                  <Text style={s.creditoResumenVal}>{data.numeroCuotas}</Text>
                </View>
                <View style={s.creditoResumenItem}>
                  <Text style={s.creditoResumenLabel}>Cuota mensual</Text>
                  <Text style={s.creditoResumenVal}>${fmt(data.cuotaMensual)}</Text>
                </View>
              </View>

              {/* Tabla cronograma */}
              <View style={s.cronoHeader}>
                <Text style={[s.cronoHeaderText, s.colCuota]}>N°</Text>
                <Text style={[s.cronoHeaderText, s.colFecha]}>VENCIMIENTO</Text>
                <Text style={[s.cronoHeaderText, s.colMonto]}>MONTO</Text>
                <Text style={[s.cronoHeaderText, s.colEstado]}>ESTADO</Text>
              </View>
              {data.cronograma.map((c, i) => (
                <View key={i} style={i % 2 === 1 ? [s.cronoRow, s.cronoRowAlt] : s.cronoRow}>
                  <Text style={[s.cronoCell, s.colCuota]}>{c.numero}</Text>
                  <Text style={[s.cronoCell, s.colFecha]}>{fmtDate(c.fecha_vencimiento)}</Text>
                  <Text style={[s.cronoCell, s.colMonto]}>${fmt(c.monto)}</Text>
                  <View style={[s.colEstado, { flexDirection: 'row', justifyContent: 'flex-end' }]}>
                    <View style={
                      c.estado === 'pagada' ? [s.badge, s.badgePagada] :
                      c.estado === 'vencida' ? [s.badge, s.badgeVencida] :
                      c.estado === 'abono_parcial' ? [s.badge, s.badgeAbono] :
                      [s.badge, s.badgePendiente]
                    }>
                      <Text style={
                        c.estado === 'pagada' ? [s.badgeText, s.badgeTextPagada] :
                        c.estado === 'vencida' ? [s.badgeText, s.badgeTextVencida] :
                        c.estado === 'abono_parcial' ? [s.badgeText, s.badgeTextAbono] :
                        [s.badgeText, s.badgeTextPendiente]
                      }>
                        {estadoLabel[c.estado] ?? c.estado}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
              <View style={s.cronoTotalRow}>
                <Text style={s.cronoTotalLabel}>TOTAL FINANCIADO ({data.numeroCuotas} cuotas)</Text>
                <Text style={s.cronoTotalVal}>${fmt(totalCronograma)}</Text>
              </View>
            </View>
          </View>

          {/* Texto legal */}
          <View style={s.legalBox}>
            <Text style={s.legalText}>
              <Text style={s.legalBold}>VEHÍCULO NO HA SIDO PAGADO EN SU TOTALIDAD POR PARTE DEL CLIENTE: </Text>
              {data.clienteNombre}, C.I./RIF: {data.clienteCiRif}, SIN EMBARGO SE PROCEDE A ENTREGAR EL VEHÍCULO MARCA: {data.marca}, MODELO: {data.modelo}{data.placa ? `, PLACA: ${data.placa}` : ''}, CON SU RESPECTIVA PÓLIZA DE SEGURO VEHICULAR, PREVIA APROBACIÓN DE LA EMPRESA: LA ORIENTAL AUTOMOTORS, C.A.; RIF: J-505692143.{'\n\n'}
              <Text style={s.legalBold}>DE LOS PAGOS RESTANTES, EL CLIENTE: </Text>
              {data.clienteNombre}, SE COMPROMETE A REALIZAR LOS MISMOS SEGÚN EL CRONOGRAMA DE CUOTAS DETALLADO EN ESTE DOCUMENTO. EL INCUMPLIMIENTO DE DOS (2) O MÁS CUOTAS CONSECUTIVAS FACULTA A LA ORIENTAL AUTOMOTORS, C.A. A INICIAR LAS ACCIONES LEGALES QUE CORRESPONDAN PARA LA RECUPERACIÓN DEL BIEN Y/O DEL SALDO ADEUDADO.{'\n\n'}
              <Text style={s.legalBold}>"SE ESTABLECE DOMICILIO ESPECIAL, LA CIUDAD DE MATURÍN, ESTADO MONAGAS"</Text>{'\n'}
              FIRMÓ, ACEPTÓ, ESTOY DE ACUERDO Y ASUMO EL COMPROMISO EN LO DESCRITO ANTERIORMENTE.
            </Text>
          </View>

          {/* Firmas */}
          <View style={s.sigRow}>
            <View style={s.sigBlock}>
              <View style={s.sigSpaceBox} />
              <Text style={s.sigLabel}>COMPRADOR / CLIENTE</Text>
              <Text style={s.sigSub}>{data.clienteNombre}</Text>
              <Text style={s.sigSub}>C.I./RIF: {data.clienteCiRif}</Text>
            </View>

            <View style={s.sigBlock}>
              <View style={s.selloBox}>
                <View style={s.selloInner}>
                  <Text style={s.selloText}>SELLO</Text>
                  <Text style={s.selloSubText}>LA ORIENTAL{'\n'}AUTOMOTORS</Text>
                </View>
              </View>
              <View style={s.sigLineOnly} />
              <Text style={s.sigLabel}>REPRESENTANTE LA ORIENTAL</Text>
              <Text style={s.sigSub}>LA ORIENTAL AUTOMOTORS, C.A.</Text>
            </View>
          </View>

          <Text style={s.condTitle}>CONDICIONES:</Text>
          <Text style={s.condText}>
            El comprador acepta y reconoce que el vehículo objeto de esta proforma es entregado bajo un compromiso de pago con financiamiento aprobado. Los pagos deberán realizarse entre el primero (1°) y el quinto (5°) día de cada mes a la cuenta que La Oriental Automotors, C.A. indique. Esta proforma constituye documento formal de compromiso y podrá ser presentada ante autoridades competentes en caso de incumplimiento.
          </Text>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>La Oriental Automotors · MG &amp; MAXUS · Maturín, Venezuela</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
