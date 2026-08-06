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
  page: { fontSize: 9, fontFamily: 'Helvetica', color: DARK, paddingBottom: 108 },
  // Firma + sello fijos: aparecen en TODAS las páginas de la proforma.
  firmaFooter: { position: 'absolute', bottom: 30, left: 28, right: 28, flexDirection: 'row', gap: 20 },
  firmaFooterBlock: { flex: 1, alignItems: 'center' },
  firmaFooterLine: { width: '100%', borderBottom: `1pt solid ${DARK}`, height: 34, marginBottom: 4 },
  firmaFooterLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: DARK },
  firmaFooterSub: { fontSize: 6.5, color: GRAY },
  selloImg: { width: 46, height: 46, objectFit: 'contain', marginBottom: 2 },

  header: { backgroundColor: '#fff', borderBottom: `1pt solid ${BORDER}`, padding: '12pt 28pt 10pt', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoWrap: { flexShrink: 0, width: 180 },
  logo: { width: 180, height: 42, objectFit: 'contain', objectPositionX: 0 },
  companyBlock: { flex: 1, alignItems: 'flex-end', paddingLeft: 18 },
  companyName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 2, textAlign: 'right' },
  companyRif: { fontSize: 8, color: RED, fontFamily: 'Helvetica-Bold', marginBottom: 2, textAlign: 'right' },
  companyLine: { fontSize: 7.5, color: GRAY, textAlign: 'right' },

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

  montosRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  montosBox: { width: 270, border: `1pt solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' },
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

  // Condiciones de pago personalizadas (modalidad libre acordada con el cliente)
  condProBox: { marginTop: 12, backgroundColor: '#eef2ff', border: `1pt solid #6366f1`, borderRadius: 6, padding: '10pt 14pt' },
  condProLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#3730a3', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  condProText: { fontSize: 8.5, color: '#312e81', lineHeight: 1.55 },

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
  selloSrc?: string
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
  version?: string | null
  vin?: string | null
  serialMotor?: string | null
  // N° de proforma de Vehimotors que trae el carro (de la unidad física).
  proformaVehimotors?: string | null
  estructura?: { precioBase: number; iva: number; inicialPct: number; iniBase: number; gastos: { label: string; monto: number }[] } | null
  precioBase: number
  totalVehiculo: number
  inicialPagada: number
  saldoFinanciado: number
  cuotaMensual: number
  numeroCuotas: number
  planTipo: string
  planLabel: string
  // Condiciones de pago personalizadas propuestas y aceptadas: se muestran como
  // la modalidad de la proforma y en un bloque destacado.
  condicionesPersonalizadas?: string | null
  // Banca Nacional — Vehimotors: desglose del cuadro (banco aprueba %, merma del día).
  bnVehimotors?: {
    precio_base: number; iva: number; placa: number; gastos: number
    total_banco: number; aprobado_pct: number; aprobado_banco: number
    merma_pct: number; aprobado_real: number; diferencial: number; inicial_cliente: number
    banco?: string | null
    financ_meses?: number; financ_tasa?: number; financ_cuota?: number
  } | null
  cronograma: CuotaCronogramaItem[]
  vendedor?: string | null
  acuerdoInicial?: AcuerdoInicialInfo | null
  // Proforma PREVIA a la venta (nace de una cotización, sin entrega aún). Cambia
  // el texto legal: propuesta de condiciones, no entrega bajo compromiso.
  preVenta?: boolean
  // Crédito de la INICIAL otorgado por La Oriental (acuerdo de gestión de cobro),
  // aparte del crédito Vehimotor. Se muestra como un compromiso de pago propio.
  acuerdoLaOriental?: {
    montoFinanciado: number
    numCuotas: number
    cuotaMonto: number
    tasaInteres?: number | null
    planCuotas?: string | null
    totalAPagar: number
  } | null
}

export function ProformaPDF({ data }: { data: ProformaPDFData }) {
  const totalCronograma = data.cronograma.reduce((s, c) => s + Number(c.monto), 0)
  const preVenta = !!data.preVenta
  const tieneFinanciamiento = data.cronograma.length > 0 && data.cuotaMensual > 0
  // Banca Nacional (Vehimotors): su cuadro reemplaza el resumen/compromiso estándar
  // para no contradecirlo (precio maquillado, inicial y cuota van en el cuadro).
  const bnV = data.bnVehimotors ?? null
  const acLO = data.acuerdoLaOriental && data.acuerdoLaOriental.montoFinanciado > 0 ? data.acuerdoLaOriental : null
  // Todos los gastos (placa, pólizas, notaría, IGTF, etc.) van en UNA sola línea
  // con su monto total, igual que en la cotización.
  const gastosTotal = data.estructura ? data.estructura.gastos.reduce((sum, g) => sum + Number(g.monto || 0), 0) : 0

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
            <Text style={s.companyLine}>AVENIDA ALIRIO UGARTE PELAYO · CENTRO PROFESIONAL DAVIS · QTA/GALPÓN S/N</Text>
            <Text style={s.companyLine}>SECTOR CENTRO · MATURÍN - MONAGAS · ZONA POSTAL 6201</Text>
            <Text style={s.companyLine}>TEL: 0414-9989010 · laorientalautomotorsc@gmail.com</Text>
          </View>
        </View>

        <View style={s.body}>

          <View style={s.documentTitleWrap}>
            <Text style={s.documentTitle}>PROFORMA</Text>
            <Text style={s.documentSubtitle}>{preVenta ? 'ACEPTACIÓN DE CONDICIONES DE COMPRA' : 'DOCUMENTO DE VENTA CON FINANCIAMIENTO OTORGADO'}</Text>
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
                <Text style={s.proVal}>{data.condicionesPersonalizadas ? 'Condiciones personalizadas' : data.planLabel}</Text>
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
            <Text style={[s.tableHeaderText, s.colPrecio]}>PRECIO BASE ($)</Text>
          </View>
          <View style={s.tableRow}>
            <Text style={[s.tableCell, s.colMarca]}>{data.marca}</Text>
            <Text style={[s.tableCell, s.colModelo]}>{data.modelo}</Text>
            <Text style={[s.tableCell, s.colPlaca]}>{data.placa || '—'}</Text>
            <Text style={[s.tableCell, s.colPrecio, { fontFamily: 'Helvetica-Bold' }]}>{fmt(bnV ? bnV.precio_base : data.totalVehiculo)}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingTop: 4 }}>
            {data.version ? <Text style={{ fontSize: 6.5, color: GRAY, marginRight: 7, marginBottom: 2 }}>Versión: <Text style={{ fontFamily: 'Helvetica-Bold', color: DARK }}>{data.version}</Text></Text> : null}
            {data.color ? <Text style={{ fontSize: 6.5, color: GRAY, marginRight: 7, marginBottom: 2 }}>Color: <Text style={{ fontFamily: 'Helvetica-Bold', color: DARK }}>{data.color}</Text></Text> : null}
            {data.anio ? <Text style={{ fontSize: 6.5, color: GRAY, marginRight: 7, marginBottom: 2 }}>Año: <Text style={{ fontFamily: 'Helvetica-Bold', color: DARK }}>{data.anio}</Text></Text> : null}
            {data.vin ? <Text style={{ fontSize: 6.5, color: GRAY, marginRight: 7, marginBottom: 2 }}>VIN/Chasis: <Text style={{ fontFamily: 'Helvetica-Bold', color: DARK }}>{data.vin}</Text></Text> : null}
            {data.serialMotor ? <Text style={{ fontSize: 6.5, color: GRAY, marginRight: 7, marginBottom: 2 }}>Serial motor: <Text style={{ fontFamily: 'Helvetica-Bold', color: DARK }}>{data.serialMotor}</Text></Text> : null}
            {data.proformaVehimotors ? <Text style={{ fontSize: 6.5, color: GRAY, marginRight: 7, marginBottom: 2 }}>N° Proforma Vehimotors: <Text style={{ fontFamily: 'Helvetica-Bold', color: DARK }}>{data.proformaVehimotors}</Text></Text> : null}
          </View>

          {/* Bloque de montos (no en Banca Nacional: su cuadro lo reemplaza) */}
          {!bnV && (
          <View style={s.montosRow}>
            <View style={s.montosBox}>
              <View style={s.montosHeader}>
                <Text style={s.montosHeaderText}>Resumen de la operación</Text>
              </View>
              {data.estructura ? (
                <>
                  {data.estructura.iniBase > 0 && (
                    <View style={s.montosRow2}><Text style={s.montosLabel}>{data.estructura.inicialPct}% del precio base (inicial)</Text><Text style={s.montosVal}>${fmt(data.estructura.iniBase)}</Text></View>
                  )}
                  <View style={s.montosRow2}><Text style={s.montosLabel}>IVA 16%</Text><Text style={s.montosVal}>${fmt(data.estructura.iva)}</Text></View>
                  {gastosTotal > 0 && (
                    <View style={s.montosRow2}><Text style={[s.montosLabel, { paddingRight: 6 }]}>Póliza Seguro Vehículo, Traslado, INTT, Gastos Notaría, IGTF</Text><Text style={s.montosVal}>${fmt(gastosTotal)}</Text></View>
                  )}
                  <View style={s.montosTotalRow}>
                    <Text style={s.montosTotalLabel}>{preVenta ? 'INICIAL A PAGAR:' : 'INICIAL PAGADA:'}</Text>
                    <Text style={s.montosTotalVal}>${fmt(data.inicialPagada)}</Text>
                  </View>
                  {data.saldoFinanciado > 0 && (
                    <>
                      <View style={s.montosRow2}><Text style={s.montosLabel}>Financiamiento (Vehimotor)</Text><Text style={s.montosVal}>${fmt(data.saldoFinanciado)}</Text></View>
                      <View style={s.montosRow2}><Text style={s.montosLabel}>{data.numeroCuotas} cuotas de</Text><Text style={[s.montosVal, { color: RED }]}>${fmt(data.cuotaMensual)}</Text></View>
                    </>
                  )}
                </>
              ) : (
                <>
                  <View style={s.montosRow2}>
                    <Text style={s.montosLabel}>Precio del vehículo</Text>
                    <Text style={s.montosVal}>${fmt(data.totalVehiculo)}</Text>
                  </View>
                  <View style={s.montosRow2}>
                    <Text style={s.montosLabel}>{preVenta ? 'Inicial a pagar' : 'Inicial pagada'}</Text>
                    <Text style={s.montosVal}>${fmt(data.inicialPagada)}</Text>
                  </View>
                  {!preVenta && (
                    <View style={s.montosRow2}>
                      <Text style={s.montosLabel}>Saldo financiado</Text>
                      <Text style={s.montosVal}>${fmt(data.saldoFinanciado)}</Text>
                    </View>
                  )}
                  <View style={s.montosTotalRow}>
                    <Text style={s.montosTotalLabel}>CUOTA MENSUAL:</Text>
                    <Text style={s.montosTotalVal}>${fmt(data.cuotaMensual)}</Text>
                  </View>
                </>
              )}
              {acLO && (
                <>
                  <View style={s.montosRow2}><Text style={s.montosLabel}>Financiamiento Concesionario</Text><Text style={s.montosVal}>${fmt(acLO.montoFinanciado)}</Text></View>
                  <View style={s.montosRow2}><Text style={s.montosLabel}>{acLO.numCuotas} cuotas de</Text><Text style={[s.montosVal, { color: '#7c3aed' }]}>${fmt(acLO.cuotaMonto)}</Text></View>
                </>
              )}
            </View>
          </View>
          )}

          {/* Bloque de compromiso formal — en pre-venta el cuadro azul de condiciones lo reemplaza */}
          {!(preVenta && !bnV) && (
          <View style={s.compromisoBox}>
            {bnV ? (
              <Text style={s.compromisoText}>
                <Text style={s.compromisoBold}>CONDICIONES ACEPTADAS: </Text>
                El cliente <Text style={s.compromisoBold}>{data.clienteNombre}</Text>, C.I./RIF: <Text style={s.compromisoBold}>{data.clienteCiRif}</Text>,{' '}
                adquiere el vehículo bajo la modalidad <Text style={s.compromisoBold}>Banca Nacional</Text>, con una <Text style={s.compromisoBold}>inicial a pagar de ${fmt(bnV.inicial_cliente)}</Text>
                {bnV.financ_meses && bnV.financ_cuota ? <> y un financiamiento con su banco de <Text style={s.compromisoBold}>{bnV.financ_meses} cuotas de ${fmt(bnV.financ_cuota)}</Text></> : null}, y acepta las condiciones de compra aquí descritas.
              </Text>
            ) : preVenta ? (
              <Text style={s.compromisoText}>
                <Text style={s.compromisoBold}>CONDICIONES ACEPTADAS: </Text>
                El cliente <Text style={s.compromisoBold}>{data.clienteNombre}</Text>, C.I./RIF: <Text style={s.compromisoBold}>{data.clienteCiRif}</Text>,{' '}
                {tieneFinanciamiento ? (
                  <>
                    adquiere el vehículo bajo la modalidad <Text style={s.compromisoBold}>{data.planLabel}</Text>, con una{' '}
                    <Text style={s.compromisoBold}>inicial a pagar de ${fmt(data.inicialPagada)}</Text> y{' '}
                    <Text style={s.compromisoBold}>{data.numeroCuotas} cuotas mensuales de ${fmt(data.cuotaMensual)}</Text>, y acepta las condiciones de pago aquí descritas.
                  </>
                ) : (
                  <>
                    adquiere el vehículo <Text style={s.compromisoBold}>de contado</Text> por un total de{' '}
                    <Text style={s.compromisoBold}>${fmt(data.totalVehiculo)}</Text>, y acepta las condiciones de compra aquí descritas.
                  </>
                )}
              </Text>
            ) : (
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
            )}
          </View>
          )}

          {/* Cuadro Banca Nacional — Vehimotors */}
          {data.bnVehimotors ? (
            <View style={{ marginTop: 12, border: `1pt solid #1e3a5f`, borderRadius: 6, overflow: 'hidden' }}>
              <View style={{ backgroundColor: '#1e3a5f', padding: '6pt 12pt' }}>
                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#fff' }}>BANCA NACIONAL — CRÉDITO BANCARIO{data.bnVehimotors.banco ? ` · ${data.bnVehimotors.banco}` : ''}</Text>
              </View>
              {[
                ['Precio base', data.bnVehimotors.precio_base],
                ['IVA 16%', data.bnVehimotors.iva],
                ['Gastos (placa, pólizas, notaría, etc.)', data.bnVehimotors.gastos + data.bnVehimotors.placa],
                ['Monto aportado por el banco', data.bnVehimotors.aprobado_real],
              ].map(([l, v]) => (
                <View key={String(l)} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: '4pt 12pt', borderBottom: `0.5pt solid ${BORDER}` }}>
                  <Text style={{ fontSize: 8, color: GRAY }}>{l}</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: DARK }}>${fmt(v as number)}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: '7pt 12pt', backgroundColor: '#fef9c3' }}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: GOLD }}>Inicial a pagar del cliente:</Text>
                <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#92400e' }}>${fmt(data.bnVehimotors.inicial_cliente)}</Text>
              </View>
              {data.bnVehimotors.financ_meses && data.bnVehimotors.financ_cuota && data.bnVehimotors.financ_meses > 0 && data.bnVehimotors.financ_cuota > 0 ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: '6pt 12pt', backgroundColor: '#eef2ff', borderTop: `0.5pt solid ${BORDER}` }}>
                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#312e81' }}>Financiamiento con su banco: {data.bnVehimotors.financ_meses} cuotas de</Text>
                  <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#312e81' }}>${fmt(data.bnVehimotors.financ_cuota)}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Condiciones de pago personalizadas: modalidad libre acordada. */}
          {data.condicionesPersonalizadas ? (
            <View style={s.condProBox}>
              <Text style={s.condProLabel}>Condiciones de pago acordadas</Text>
              <Text style={s.condProText}>{data.condicionesPersonalizadas}</Text>
            </View>
          ) : null}

          {/* Compromiso de pago — Financiamiento de la INICIAL por La Oriental.
              Es un crédito aparte del de Vehimotor; solo se detalla en el
              documento de venta (ya registrada), no en la proforma pre-venta. */}
          {acLO && !preVenta ? (
            <View style={{ marginTop: 14 }}>
              <View style={{ border: '1pt solid #7c3aed', borderRadius: 6, overflow: 'hidden' }}>
                <View style={{ backgroundColor: '#7c3aed', padding: '7pt 10pt' }}>
                  <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#fff' }}>COMPROMISO DE PAGO — FINANCIAMIENTO LA ORIENTAL (INICIAL)</Text>
                  <Text style={{ fontSize: 7.5, color: '#ede9fe', marginTop: 2 }}>Crédito otorgado por La Oriental para la inicial del vehículo</Text>
                </View>
                <View style={{ flexDirection: 'row', padding: '8pt 10pt', backgroundColor: '#faf5ff' }}>
                  {[
                    ['Financiado', `$${fmt(acLO.montoFinanciado)}`],
                    ['N° cuotas', acLO.numCuotas ? String(acLO.numCuotas) : '—'],
                    ['Cuota', `$${fmt(acLO.cuotaMonto)}`],
                    ...(acLO.tasaInteres && acLO.tasaInteres > 0 ? [['Tasa anual', `${acLO.tasaInteres}%`]] : []),
                    ['Total a pagar', `$${fmt(acLO.totalAPagar)}`],
                  ].map(([l, v], i) => (
                    <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontSize: 6.5, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{l}</Text>
                      <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: DARK }}>{v}</Text>
                    </View>
                  ))}
                </View>
                {acLO.planCuotas ? (
                  <View style={{ padding: '5pt 10pt', borderTop: `0.5pt solid ${BORDER}`, backgroundColor: '#fff' }}>
                    <Text style={{ fontSize: 7.5, color: '#5b21b6' }}>{acLO.planCuotas}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Bloque de crédito Vehimotor (cronograma). Solo cuando la venta ya
              está registrada: la proforma pre-venta se queda en las condiciones. */}
          {tieneFinanciamiento && !preVenta && (
          <View style={s.creditoWrap}>
            <View style={s.creditoBox}>
              <View style={s.creditoHeader}>
                <Text style={s.creditoHeaderTitle}>COMPROMISO DE PAGO — CRÉDITO VEHIMOTOR</Text>
                <Text style={s.creditoHeaderSub}>Plan: {data.planLabel}</Text>
              </View>

              <View style={s.creditoAvisoBox}>
                {preVenta ? (
                  <Text style={s.creditoAvisoText}>
                    <Text style={s.creditoAvisoBold}>ⓘ NOTA: </Text>
                    El cliente {data.clienteNombre}, C.I./RIF: {data.clienteCiRif}, <Text style={s.creditoAvisoBold}>acepta las condiciones de financiamiento</Text> aquí descritas y se compromete a pagar según el cronograma que se detalla a continuación.
                  </Text>
                ) : (
                  <Text style={s.creditoAvisoText}>
                    <Text style={s.creditoAvisoBold}>⚠ AVISO IMPORTANTE: </Text>
                    Este vehículo <Text style={s.creditoAvisoBold}>NO ha sido pagado en su totalidad</Text>. El cliente {data.clienteNombre}, C.I./RIF: {data.clienteCiRif}, ha recibido el vehículo bajo compromiso de pago financiado según el cronograma que se detalla a continuación.
                  </Text>
                )}
              </View>

              <View style={s.creditoResumen}>
                <View style={s.creditoResumenItem}>
                  <Text style={s.creditoResumenLabel}>{preVenta ? 'Inicial a pagar' : 'Inicial pagada'}</Text>
                  <Text style={s.creditoResumenVal}>${fmt(data.inicialPagada)}</Text>
                </View>
                {!preVenta && (
                  <View style={s.creditoResumenItem}>
                    <Text style={s.creditoResumenLabel}>Saldo financiado</Text>
                    <Text style={s.creditoResumenVal}>${fmt(data.saldoFinanciado)}</Text>
                  </View>
                )}
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
                <Text style={s.cronoTotalLabel}>{preVenta ? 'TOTAL EN CUOTAS' : 'TOTAL FINANCIADO'} ({data.numeroCuotas} cuotas)</Text>
                <Text style={s.cronoTotalVal}>${fmt(totalCronograma)}</Text>
              </View>
            </View>
          </View>
          )}

          {/* Texto legal */}
          <View style={s.legalBox}>
            {preVenta ? (
              <Text style={s.legalText}>
                <Text style={s.legalBold}>CONDICIONES DE COMPRA ACEPTADAS. </Text>
                El cliente {data.clienteNombre}, C.I./RIF: {data.clienteCiRif}, acepta las condiciones de compra del vehículo MARCA: {data.marca}, MODELO: {data.modelo}, descritas en este documento, y se compromete a cumplir el plan de pago acordado.{'\n\n'}
                <Text style={s.legalBold}>"SE ESTABLECE DOMICILIO ESPECIAL, LA CIUDAD DE MATURÍN, ESTADO MONAGAS"</Text>
              </Text>
            ) : (
            <Text style={s.legalText}>
              <Text style={s.legalBold}>VEHÍCULO NO HA SIDO PAGADO EN SU TOTALIDAD POR PARTE DEL CLIENTE: </Text>
              {data.clienteNombre}, C.I./RIF: {data.clienteCiRif}, SIN EMBARGO SE PROCEDE A ENTREGAR EL VEHÍCULO MARCA: {data.marca}, MODELO: {data.modelo}{data.placa ? `, PLACA: ${data.placa}` : ''}, CON SU RESPECTIVA PÓLIZA DE SEGURO VEHICULAR, PREVIA APROBACIÓN DE LA EMPRESA: LA ORIENTAL AUTOMOTORS, C.A.; RIF: J-505692143.{'\n\n'}
              <Text style={s.legalBold}>DE LOS PAGOS RESTANTES, EL CLIENTE: </Text>
              {data.clienteNombre}, SE COMPROMETE A REALIZAR LOS MISMOS SEGÚN EL CRONOGRAMA DE CUOTAS DETALLADO EN ESTE DOCUMENTO. EL INCUMPLIMIENTO DE DOS (2) O MÁS CUOTAS CONSECUTIVAS FACULTA A LA ORIENTAL AUTOMOTORS, C.A. A INICIAR LAS ACCIONES LEGALES QUE CORRESPONDAN PARA LA RECUPERACIÓN DEL BIEN Y/O DEL SALDO ADEUDADO.{'\n\n'}
              <Text style={s.legalBold}>"SE ESTABLECE DOMICILIO ESPECIAL, LA CIUDAD DE MATURÍN, ESTADO MONAGAS"</Text>{'\n'}
              FIRMÓ, ACEPTÓ, ESTOY DE ACUERDO Y ASUMO EL COMPROMISO EN LO DESCRITO ANTERIORMENTE.
            </Text>
            )}
          </View>

          {/* Bloque CONDICIONES: solo en el documento de venta ya registrada.
              En la proforma pre-venta se omite (pedido de Rojas). */}
          {!preVenta && (
            <>
              <Text style={s.condTitle}>CONDICIONES:</Text>
              <Text style={s.condText}>
                El comprador acepta y reconoce que el vehículo objeto de esta proforma es entregado bajo un compromiso de pago con financiamiento aprobado. Los pagos deberán realizarse entre el primero (1°) y el quinto (5°) día de cada mes a la cuenta que La Oriental Automotors, C.A. indique. Esta proforma constituye documento formal de compromiso y podrá ser presentada ante autoridades competentes en caso de incumplimiento.
              </Text>
            </>
          )}
        </View>

        {/* Firma + sello — fijos en TODAS las páginas de la proforma */}
        <View style={s.firmaFooter} fixed>
          <View style={s.firmaFooterBlock}>
            <View style={s.firmaFooterLine} />
            <Text style={s.firmaFooterLabel}>COMPRADOR / CLIENTE</Text>
            <Text style={s.firmaFooterSub}>{data.clienteNombre}</Text>
            <Text style={s.firmaFooterSub}>C.I./RIF: {data.clienteCiRif}</Text>
          </View>
          <View style={s.firmaFooterBlock}>
            {data.selloSrc ? <Image src={data.selloSrc} style={s.selloImg} /> : <View style={{ height: 46 }} />}
            <View style={{ width: '100%', borderBottom: `1pt solid ${DARK}`, marginBottom: 4 }} />
            <Text style={s.firmaFooterLabel}>REPRESENTANTE LA ORIENTAL</Text>
            <Text style={s.firmaFooterSub}>LA ORIENTAL AUTOMOTORS, C.A.</Text>
          </View>
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
