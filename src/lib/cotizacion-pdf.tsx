import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const LOGO = 'https://assets.cdn.filesafe.space/XZDJ4aSOAL1crWRCXyY6/media/698367bc1dfc0253b24abd7a.png'
// logoSrc se inyecta desde la ruta del servidor para usar el archivo local sin whitespace
const RED = '#C41E3A'
const GOLD = '#ca8a04'
const DARK = '#111827'
const GRAY = '#6b7280'
const LIGHT = '#f9fafb'
const BORDER = '#e5e7eb'
const BLUE_DARK = '#1e3a5f'

const s = StyleSheet.create({
  page: { fontSize: 9, fontFamily: 'Helvetica', color: DARK, paddingBottom: 40 },

  header: { backgroundColor: '#fff', borderBottom: `1pt solid ${BORDER}`, padding: '12pt 28pt 10pt', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoWrap: { flexShrink: 0 },
  logo: { width: 300, height: 60, objectFit: 'contain' },
  companyBlock: { alignItems: 'flex-end' },
  companyName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 2 },
  companyRif: { fontSize: 8, color: RED, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  companyLine: { fontSize: 7.5, color: GRAY },

  body: { padding: '14pt 28pt' },

  twoCol: { flexDirection: 'row', marginBottom: 12 },
  clientBlock: { flex: 1, paddingRight: 16 },
  cotzBlock: { width: 180, backgroundColor: '#fafafa', border: `1pt solid ${BORDER}`, borderRadius: 6, padding: '10pt 12pt' },

  sectionLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: GRAY, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  clientRow: { flexDirection: 'row', marginBottom: 3 },
  clientKey: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: DARK, width: 80 },
  clientVal: { fontSize: 8, color: GRAY, flex: 1 },

  cotzLabel: { fontSize: 8, color: GRAY, marginBottom: 2 },
  cotzNumero: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: RED, marginBottom: 4 },
  cotzRow: { flexDirection: 'row', marginBottom: 2 },
  cotzKey: { fontSize: 7.5, color: GRAY, width: 65 },
  cotzVal: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: DARK },

  retBadge: { marginTop: 6, backgroundColor: '#dcfce7', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  retBadgeText: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#15803d' },
  retBadgeNo: { backgroundColor: '#fef2f2' },
  retBadgeNoText: { color: '#dc2626' },

  divider: { height: 1, backgroundColor: BORDER, marginBottom: 10 },

  tableHeader: { flexDirection: 'row', backgroundColor: DARK, borderRadius: 4, padding: '5pt 8pt', marginBottom: 1 },
  tableHeaderText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#fff' },
  tableRow: { flexDirection: 'row', borderBottom: `0.5pt solid ${BORDER}`, padding: '5pt 8pt' },
  tableCell: { fontSize: 8.5, color: DARK },
  colMarca: { width: 55 },
  colModelo: { flex: 1 },
  colCant: { width: 30, textAlign: 'center' },
  colPrecio: { width: 75, textAlign: 'right' },
  colImporte: { width: 75, textAlign: 'right' },

  modalidadBlock: { marginTop: 12, flexDirection: 'row', alignItems: 'flex-start' },
  noteBox: { flex: 1, paddingRight: 16 },
  noteText: { fontSize: 7.5, color: GRAY, lineHeight: 1.5, fontStyle: 'italic' },

  calcBox: { width: 240, border: `1pt solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' },
  calcHeader: { backgroundColor: DARK, padding: '6pt 10pt', flexDirection: 'column' },
  calcHeaderLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  calcHeaderVal: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#fbbf24' },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', padding: '4pt 10pt', borderBottom: `0.5pt solid ${BORDER}` },
  calcLabel: { fontSize: 7.5, color: GRAY },
  calcVal: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: DARK },
  calcTotalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: '6pt 10pt', backgroundColor: '#fef9c3' },
  calcTotalLabel: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: GOLD },
  calcTotalVal: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#92400e' },

  finBox: { marginTop: 6, border: `1pt solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' },
  finHeader: { backgroundColor: GOLD, padding: '5pt 10pt' },
  finHeaderText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fff' },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', padding: '4pt 10pt', borderBottom: `0.5pt solid ${BORDER}` },
  finLabel: { fontSize: 7.5, color: GRAY },
  finVal: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: DARK },
  finTotalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: '6pt 10pt', backgroundColor: LIGHT },
  finTotalLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: GRAY, textTransform: 'uppercase' },
  finTotalVal: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#15803d' },

  // AC500 schedule table
  ac500Wrap: { marginTop: 12 },
  ac500Box: { border: `1pt solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' },
  ac500Header: { backgroundColor: BLUE_DARK, padding: '7pt 10pt', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ac500HeaderTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#fff' },
  ac500HeaderSub: { fontSize: 7.5, color: '#93c5fd' },
  ac500ReservaRow: { flexDirection: 'row', justifyContent: 'space-between', padding: '5pt 10pt', borderBottom: `0.5pt solid ${BORDER}`, backgroundColor: '#eff6ff' },
  ac500Row: { flexDirection: 'row', justifyContent: 'space-between', padding: '4pt 10pt', borderBottom: `0.5pt solid ${BORDER}` },
  ac500Label: { fontSize: 7.5, color: GRAY },
  ac500ReservaLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: BLUE_DARK },
  ac500Val: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: DARK },
  ac500ReservaVal: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: BLUE_DARK },
  ac500TotalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: '7pt 10pt', backgroundColor: '#dbeafe' },
  ac500TotalLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: BLUE_DARK },
  ac500TotalVal: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: BLUE_DARK },

  legalBox: { marginTop: 8, backgroundColor: LIGHT, border: `1pt solid ${BORDER}`, borderRadius: 6, padding: '7pt 12pt' },
  legalText: { fontSize: 7.5, color: GRAY, lineHeight: 1.5 },
  legalBold: { fontFamily: 'Helvetica-Bold', color: DARK },

  // Firmas
  sigRow: { flexDirection: 'row', marginTop: 18, marginBottom: 10, gap: 20 },
  sigBlock: { flex: 1, alignItems: 'center' },
  sigSpaceBox: { height: 70, width: 200, borderBottom: `1pt solid ${DARK}`, marginBottom: 6 },
  sigLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: DARK },
  sigSub: { fontSize: 7.5, color: GRAY, marginTop: 2 },

  // Sello
  selloBox: { width: 100, height: 100, border: `1.5pt dashed ${GRAY}`, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  selloInner: { alignItems: 'center' },
  selloText: { fontSize: 8, color: GRAY, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  selloSubText: { fontSize: 7, color: '#9ca3af', textAlign: 'center', marginTop: 2 },
  sigLineOnly: { width: 200, height: 1, backgroundColor: DARK, marginBottom: 6 },

  condTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 4 },
  condText: { fontSize: 7.5, color: GRAY, lineHeight: 1.55 },
  footer: { position: 'absolute', bottom: 20, left: 28, right: 28, flexDirection: 'row', justifyContent: 'space-between', borderTop: `0.5pt solid ${BORDER}`, paddingTop: 6 },
  footerText: { fontSize: 7, color: '#9ca3af' },
})

function fmt(n: number | null | undefined) {
  if (n == null) return '0,00'
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export interface AC500CuotaItem {
  label: string
  monto: number
}

export interface AC500ScheduleData {
  reserva: number
  meses: number
  modelo: string
  cuotas: AC500CuotaItem[]
  total: number
}

export interface CotizacionPDFData {
  logoSrc?: string
  empresaNombre?: string
  empresaRif?: string | null
  empresaDireccion?: string | null
  empresaTelefono?: string | null
  empresaCorreo?: string | null
  numero: string
  fecha: string
  vencimiento: string
  clienteNombre: string
  clienteCiRif: string
  clienteDireccion: string | null
  clienteCorreo: string
  clienteTelefono: string | null
  clienteCiudadEstado: string | null
  clienteCodigoPostal: string | null
  agenteRetencion: boolean
  marca: string
  modelo: string
  cantidad?: number
  precioBase: number
  modalidad: 'contado' | 'credito_24'
  plan?: 'vehimotors' | 'banco_100' | 'ac500' | 'personalizado' | 'banca_nacional'
  ivaMonto: number
  gastosMonto: number
  totalVehiculo?: number
  totalInicial: number
  financiamientoMonto: number | null
  cuotaMensual: number | null
  mesesBanco?: number
  costoTotal: number
  ac500Schedule?: AC500ScheduleData
  // Plan Personalizado: inicial en fracción (0..1) y meses del crédito
  inicialPct?: number
  mesesCredito?: number
  // Propuesta de condiciones de pago personalizada (texto libre de Rojas).
  condicionesPersonalizadas?: string | null
  // Banca Nacional — Vehimotors: desglose del cuadro (banco aprueba %, merma del día).
  bnVehimotors?: {
    precio_base: number; iva: number; placa: number; gastos: number
    total_banco: number; aprobado_pct: number; aprobado_banco: number
    merma_pct: number; aprobado_real: number; diferencial: number; inicial_cliente: number
    banco?: string | null
    financ_meses?: number; financ_tasa?: number; financ_cuota?: number
  } | null
}

export function CotizacionPDF({ data }: { data: CotizacionPDFData }) {
  const esAC500 = data.plan === 'ac500'
  const bn = data.bnVehimotors ?? null
  const es24 = data.modalidad === 'credito_24'
  const esBanco = data.plan === 'banco_100'
  const esPersonalizado = data.plan === 'personalizado'
  const esBancaNacional = data.plan === 'banca_nacional'
  const cantidad = Math.max(1, Math.floor(data.cantidad ?? 1))
  const mesesBanco = Math.max(1, Math.round(data.mesesBanco ?? 24))
  // Plan Personalizado: inicial, meses y % financiado dinámicos
  const persIniFrac = data.inicialPct != null ? data.inicialPct : 0.4
  const persIniPctLabel = Math.round(persIniFrac * 100)
  const persFinPctLabel = Math.round((1 - persIniFrac) * 100)
  const persMeses = Math.max(1, Math.round(data.mesesCredito ?? 24))
  const importeUnit = esAC500 ? (data.ac500Schedule?.total ?? 0) : data.precioBase

  // Si el llamador manda empresaNombre, es consciente del concesionario y se
  // respetan SUS valores tal cual (incluidos los nulos: p. ej. Autosurca sin
  // RIF no debe mostrar el RIF de La Oriental). Solo si NO viene nombre se usa
  // el fallback completo de La Oriental (compatibilidad con llamadas antiguas).
  const conoceEmpresa = data.empresaNombre != null
  const empNombre = conoceEmpresa ? data.empresaNombre! : 'LA ORIENTAL AUTOMOTORS, C.A.'
  const empRif = conoceEmpresa ? (data.empresaRif ?? null) : 'J-505692143'
  const empDireccion = conoceEmpresa ? (data.empresaDireccion ?? null) : 'AV. UGARTE ALIRIO PELYO · CENTRO PROFESIONAL DAVID\nMATURÍN - MONAGAS - VENEZUELA'
  const empTelefono = conoceEmpresa ? (data.empresaTelefono ?? null) : '0414-9989010'
  const empCorreo = conoceEmpresa ? (data.empresaCorreo ?? null) : 'laorientalautomotorsc@gmail.com'
  const empDireccionLineas = empDireccion ? String(empDireccion).split('\n').filter(Boolean) : []
  const empContacto = [empTelefono, empCorreo].filter(Boolean).join(' · ')
  const modalidadLabel = esAC500
    ? `ASEGÚRATE CON $500 — ${data.ac500Schedule?.meses ?? ''} MESES`
    : es24
      ? (esBanco
          ? `CRÉDITO BANCARIO ${mesesBanco} MESES (30% INICIAL)`
          : esPersonalizado
            ? `CRÉDITO ${persMeses} MESES (${persIniPctLabel}% INICIAL)`
            : 'CRÉDITO 24 MESES (40% INICIAL)')
      : esBancaNacional ? 'BANCA NACIONAL' : 'CONTADO'

  return (
    <Document title={`Cotización ${data.numero}`} author="La Oriental Automotors">

      {/* ── Página 1 ── */}
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.logoWrap}>
            {data.logoSrc
              ? <Image src={data.logoSrc} style={s.logo} />
              : <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: DARK }}>{empNombre}</Text>}
          </View>
          <View style={s.companyBlock}>
            <Text style={s.companyName}>{empNombre}</Text>
            {empRif ? <Text style={s.companyRif}>RIF: {empRif}</Text> : null}
            {empDireccionLineas.map((linea, i) => (
              <Text key={i} style={s.companyLine}>{linea}</Text>
            ))}
            {empContacto ? <Text style={s.companyLine}>{empContacto}</Text> : null}
          </View>
        </View>

        <View style={s.body}>

          {/* Cliente + Cotización */}
          <View style={s.twoCol}>
            <View style={s.clientBlock}>
              <Text style={s.sectionLabel}>Datos del cliente</Text>
              {[
                ['CLIENTE', data.clienteNombre],
                ['C.I./RIF', data.clienteCiRif],
                ['DIRECCIÓN', data.clienteDireccion || '—'],
                ['CORREO', data.clienteCorreo],
                ['TELÉFONO', data.clienteTelefono || '—'],
                ['CIUDAD/ESTADO', data.clienteCiudadEstado || '—'],
                ['CÓDIGO POSTAL', data.clienteCodigoPostal || '—'],
              ].map(([k, v]) => (
                <View key={k} style={s.clientRow}>
                  <Text style={s.clientKey}>{k}:</Text>
                  <Text style={s.clientVal}>{v}</Text>
                </View>
              ))}
            </View>

            <View style={s.cotzBlock}>
              <Text style={s.sectionLabel}>Número de cotización</Text>
              <Text style={s.cotzNumero}>{data.numero}</Text>
              <View style={s.cotzRow}>
                <Text style={s.cotzKey}>Fecha:</Text>
                <Text style={s.cotzVal}>{data.fecha}</Text>
              </View>
              <View style={s.cotzRow}>
                <Text style={s.cotzKey}>Vencimiento:</Text>
                <Text style={s.cotzVal}>{data.vencimiento}</Text>
              </View>
              <View style={!data.agenteRetencion ? [s.retBadge, s.retBadgeNo] : s.retBadge}>
                <Text style={!data.agenteRetencion ? [s.retBadgeText, s.retBadgeNoText] : s.retBadgeText}>
                  AGENTE DE RETENCIÓN: {data.agenteRetencion ? 'SÍ' : 'NO'}
                </Text>
              </View>
            </View>
          </View>

          <View style={s.divider} />

          {/* Tabla de vehículo */}
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderText, s.colMarca]}>MARCA</Text>
            <Text style={[s.tableHeaderText, s.colModelo]}>MODELO</Text>
            <Text style={[s.tableHeaderText, s.colCant]}>CANT.</Text>
            <Text style={[s.tableHeaderText, s.colPrecio]}>{esAC500 ? 'RESERVA ($)' : 'PRECIO UNIT. ($)'}</Text>
            <Text style={[s.tableHeaderText, s.colImporte]}>{esAC500 ? 'TOTAL PLAN ($)' : 'IMPORTE ($)'}</Text>
          </View>
          <View style={s.tableRow}>
            <Text style={[s.tableCell, s.colMarca]}>{data.marca}</Text>
            <Text style={[s.tableCell, s.colModelo]}>{data.modelo}</Text>
            <Text style={[s.tableCell, s.colCant, { textAlign: 'center' }]}>{cantidad}</Text>
            <Text style={[s.tableCell, s.colPrecio, { textAlign: 'right' }]}>{fmt(esAC500 ? data.ac500Schedule?.reserva : data.precioBase)}</Text>
            <Text style={[s.tableCell, s.colImporte, { textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>{fmt(importeUnit * cantidad)}</Text>
          </View>

          {/* ── AC500 Schedule ── */}
          {esAC500 && data.ac500Schedule && (
            <View style={s.ac500Wrap}>
              <View style={s.ac500Box}>
                <View style={s.ac500Header}>
                  <Text style={s.ac500HeaderTitle}>ASEGÚRATE CON $500 — {data.ac500Schedule.meses} MESES</Text>
                  <Text style={s.ac500HeaderSub}>CRONOGRAMA DE PAGOS</Text>
                </View>
                <View style={s.ac500ReservaRow}>
                  <Text style={s.ac500ReservaLabel}>CUOTA 0 — RESERVA (SEPARACIÓN)</Text>
                  <Text style={s.ac500ReservaVal}>${fmt(data.ac500Schedule.reserva)}</Text>
                </View>
                {data.ac500Schedule.cuotas.map((c, i) => (
                  <View key={i} style={s.ac500Row}>
                    <Text style={s.ac500Label}>{c.label}</Text>
                    <Text style={s.ac500Val}>${fmt(c.monto)}</Text>
                  </View>
                ))}
                <View style={s.ac500TotalRow}>
                  <Text style={s.ac500TotalLabel}>TOTAL A PAGAR:</Text>
                  <Text style={s.ac500TotalVal}>${fmt(data.ac500Schedule.total)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Cuadro Banca Nacional — Vehimotors ── */}
          {bn && (
            <View style={{ marginTop: 12, flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, border: `1pt solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' }}>
                <View style={{ backgroundColor: BLUE_DARK, padding: '6pt 10pt' }}>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fff' }}>BANCA NACIONAL — CRÉDITO BANCARIO{bn.banco ? ` · ${bn.banco}` : ''}</Text>
                </View>
                {[
                  ['Precio base', bn.precio_base + bn.diferencial],
                  ['IVA 16%', bn.iva],
                  ['Placa', bn.placa],
                  ['Gastos (pólizas, notaría, etc.)', bn.gastos],
                  ['Total', bn.total_banco + bn.gastos + bn.diferencial],
                  ['Aporte de su crédito bancario', bn.aprobado_banco],
                ].map(([l, v]) => (
                  <View key={String(l)} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: '4pt 10pt', borderBottom: `0.5pt solid ${BORDER}` }}>
                    <Text style={{ fontSize: 7.5, color: GRAY }}>{l}</Text>
                    <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: DARK }}>{fmt(v as number)}</Text>
                  </View>
                ))}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: '6pt 10pt', backgroundColor: '#fef9c3' }}>
                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: GOLD }}>INICIAL A PAGAR (CLIENTE):</Text>
                  <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#92400e' }}>${fmt(bn.inicial_cliente)}</Text>
                </View>
                {bn.financ_meses && bn.financ_cuota && bn.financ_meses > 0 && bn.financ_cuota > 0 ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: '5pt 10pt', backgroundColor: '#eef2ff', borderTop: `0.5pt solid ${BORDER}` }}>
                    <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#312e81' }}>Financiamiento con su banco: {bn.financ_meses} cuotas de{bn.financ_tasa ? ` (${fmt(bn.financ_tasa)}% anual)` : ''}</Text>
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#312e81' }}>${fmt(bn.financ_cuota)}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}

          {/* ── Standard modalidad + cálculos (non-AC500) ── */}
          {!esAC500 && !bn && (
            <View style={s.modalidadBlock}>
              {es24 && (
                <View style={s.noteBox}>
                  <Text style={s.noteText}>
                    (Nota: si el cliente es agente de retención, deberá presentar retención al momento de ser facturado para que se le reconozca el 75% del IVA.)
                  </Text>
                </View>
              )}
              {!es24 && <View style={s.noteBox} />}

              <View style={s.calcBox}>
                <View style={s.calcHeader}>
                  <Text style={s.calcHeaderLabel}>MODALIDAD DE VENTAS</Text>
                  <Text style={s.calcHeaderVal}>{modalidadLabel}</Text>
                </View>

                {es24 && esBanco ? (
                  <>
                    <View style={s.calcRow}>
                      <Text style={s.calcLabel}>Total Precio Vehículo</Text>
                      <Text style={s.calcVal}>{fmt(data.totalVehiculo ?? 0)}</Text>
                    </View>
                    <View style={s.calcRow}>
                      <Text style={s.calcLabel}>Inicial (30%)</Text>
                      <Text style={s.calcVal}>{fmt((data.totalVehiculo ?? 0) * 0.30)}</Text>
                    </View>
                    <View style={s.calcRow}>
                      <Text style={s.calcLabel}>Póliza Seguro Vehículo, Traslado, INTT, Gastos Notaría</Text>
                      <Text style={s.calcVal}>{fmt(data.gastosMonto)}</Text>
                    </View>
                    <View style={s.calcTotalRow}>
                      <Text style={s.calcTotalLabel}>TOTAL INICIAL A PAGAR:</Text>
                      <Text style={s.calcTotalVal}>${fmt(data.totalInicial)}</Text>
                    </View>
                  </>
                ) : es24 ? (
                  <>
                    <View style={s.calcRow}>
                      <Text style={s.calcLabel}>{esPersonalizado ? `${persIniPctLabel}% Precio Base` : '40% Precio Base'}</Text>
                      <Text style={s.calcVal}>{fmt(data.precioBase * (esPersonalizado ? persIniFrac : 0.4))}</Text>
                    </View>
                    <View style={s.calcRow}>
                      <Text style={s.calcLabel}>I.V.A. 16%</Text>
                      <Text style={s.calcVal}>{fmt(data.ivaMonto)}</Text>
                    </View>
                    <View style={s.calcRow}>
                      <Text style={s.calcLabel}>Póliza Seguro Vehículo, Traslado, INTT, Gastos Notaría</Text>
                      <Text style={s.calcVal}>{fmt(data.gastosMonto)}</Text>
                    </View>
                    <View style={s.calcTotalRow}>
                      <Text style={s.calcTotalLabel}>INICIAL TOTAL A PAGAR:</Text>
                      <Text style={s.calcTotalVal}>${fmt(data.totalInicial)}</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={s.calcRow}>
                      <Text style={s.calcLabel}>100% Precio Base</Text>
                      <Text style={s.calcVal}>{fmt(data.precioBase)}</Text>
                    </View>
                    <View style={s.calcRow}>
                      <Text style={s.calcLabel}>I.V.A. 16%</Text>
                      <Text style={s.calcVal}>{fmt(data.ivaMonto)}</Text>
                    </View>
                    <View style={s.calcRow}>
                      <Text style={s.calcLabel}>Póliza Seguro Vehículo, Traslado, INTT, Gastos Notaría</Text>
                      <Text style={s.calcVal}>{fmt(data.gastosMonto)}</Text>
                    </View>
                    <View style={s.calcTotalRow}>
                      <Text style={s.calcTotalLabel}>TOTAL A PAGAR:</Text>
                      <Text style={s.calcTotalVal}>${fmt(data.totalInicial)}</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          )}

          {/* Plan de financiamiento (solo crédito estándar) */}
          {es24 && !esAC500 && data.financiamientoMonto != null && (
            <View style={{ alignItems: 'flex-end', marginTop: 6 }}>
              <View style={[s.finBox, { width: 240 }]}>
                <View style={s.finHeader}>
                  <Text style={s.finHeaderText}>PLAN DE FINANCIAMIENTO</Text>
                </View>
                <View style={s.finRow}>
                  <Text style={s.finLabel}>{esBanco ? 'Financiamiento 70%' : esPersonalizado ? `Financiamiento ${persFinPctLabel}%` : 'Financiamiento 60%'}</Text>
                  <Text style={s.finVal}>${fmt(data.financiamientoMonto)}</Text>
                </View>
                <View style={s.finRow}>
                  <Text style={s.finLabel}>Cuotas mensuales</Text>
                  <Text style={s.finVal}>{esBanco ? mesesBanco : esPersonalizado ? persMeses : 24}   ${fmt(data.cuotaMensual)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Total por N unidades (solo si cantidad > 1) */}
          {!esAC500 && cantidad > 1 && (
            <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
              <View style={[s.finBox, { width: 240 }]}>
                <View style={[s.finHeader, { backgroundColor: DARK }]}>
                  <Text style={s.finHeaderText}>TOTAL POR {cantidad} UNIDADES</Text>
                </View>
                <View style={s.finRow}>
                  <Text style={s.finLabel}>{es24 ? 'Inicial total' : 'Total a pagar'} (x{cantidad})</Text>
                  <Text style={s.finVal}>${fmt(data.totalInicial * cantidad)}</Text>
                </View>
                {es24 && data.financiamientoMonto != null && (
                  <>
                    <View style={s.finRow}>
                      <Text style={s.finLabel}>Financiamiento (x{cantidad})</Text>
                      <Text style={s.finVal}>${fmt(data.financiamientoMonto * cantidad)}</Text>
                    </View>
                    <View style={s.finRow}>
                      <Text style={s.finLabel}>Cuota mensual total ({esBanco ? mesesBanco : 24} x {cantidad})</Text>
                      <Text style={s.finVal}>${fmt((data.cuotaMensual ?? 0) * cantidad)}</Text>
                    </View>
                  </>
                )}
                <View style={s.finTotalRow}>
                  <Text style={s.finTotalLabel}>COSTO TOTAL ({cantidad} u)</Text>
                  <Text style={s.finTotalVal}>${fmt(data.costoTotal * cantidad)}</Text>
                </View>
              </View>
            </View>
          )}
          {esAC500 && data.ac500Schedule && cantidad > 1 && (
            <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
              <View style={[s.finBox, { width: 240 }]}>
                <View style={[s.finHeader, { backgroundColor: BLUE_DARK }]}>
                  <Text style={s.finHeaderText}>TOTAL POR {cantidad} UNIDADES</Text>
                </View>
                <View style={s.finRow}>
                  <Text style={s.finLabel}>Reserva total (x{cantidad})</Text>
                  <Text style={s.finVal}>${fmt(data.ac500Schedule.reserva * cantidad)}</Text>
                </View>
                <View style={s.finTotalRow}>
                  <Text style={s.finTotalLabel}>TOTAL PLAN ({cantidad} u)</Text>
                  <Text style={s.finTotalVal}>${fmt(data.ac500Schedule.total * cantidad)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Texto legal — solo en el plan Asegúrate $500 (compromiso de separación).
              En cotización de contado y crédito no se muestra texto legal. */}
          {esAC500 && (
            <View style={s.legalBox}>
              <Text style={s.legalText}>
                <Text style={s.legalBold}>PLAN ASEGÚRATE $500 — COMPROMISO DE SEPARACIÓN: </Text>
                El cliente {data.clienteNombre}, R.I.F.: {data.clienteCiRif}, separa el vehículo MARCA: {data.marca}, MODELO: {data.modelo}, bajo el PLAN ASEGÚRATE $500 a {data.ac500Schedule?.meses} meses, comprometiéndose a realizar los pagos según el cronograma indicado anteriormente.{'\n\n'}
                <Text style={s.legalBold}>"SE ESTABLECE DOMICILIO ESPECIAL, LA CIUDAD DE MATURÍN, ESTADO MONAGAS"</Text>{'\n'}
                FIRMÓ, ACEPTÓ, ESTOY DE ACUERDO Y ASUMO EL COMPROMISO EN LO DESCRITO ANTERIORMENTE
              </Text>
            </View>
          )}

          {/* Condiciones de pago personalizadas (propuesta libre de la dirección) */}
          {data.condicionesPersonalizadas ? (
            <View style={{ marginTop: 12, backgroundColor: '#eef2ff', border: '1pt solid #6366f1', borderRadius: 6, padding: '10pt 14pt' }}>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#3730a3', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Condiciones de pago propuestas</Text>
              <Text style={{ fontSize: 8.5, color: '#312e81', lineHeight: 1.55 }}>{data.condicionesPersonalizadas}</Text>
            </View>
          ) : null}

          {/* ── Firmas ── */}
          <View style={s.sigRow}>
            {/* Comprador */}
            <View style={s.sigBlock}>
              <View style={s.sigSpaceBox} />
              <Text style={s.sigLabel}>COMPRADOR / CLIENTE</Text>
              <Text style={s.sigSub}>{data.clienteNombre}</Text>
            </View>

            {/* La Oriental */}
            <View style={s.sigBlock}>
              <View style={s.selloBox}>
                <View style={s.selloInner}>
                  <Text style={s.selloText}>SELLO</Text>
                  <Text style={s.selloSubText}>{empNombre}</Text>
                </View>
              </View>
              <View style={s.sigLineOnly} />
              <Text style={s.sigLabel}>REPRESENTANTE</Text>
              <Text style={s.sigSub}>{empNombre}</Text>
            </View>
          </View>

          {/* Condiciones */}
          <Text style={s.condTitle}>CONDICIONES:</Text>
          <Text style={s.condText}>
            Los Planes de Venta no pueden ser modificados luego de su aprobación y representan un compromiso de pago por parte del comprador. Es responsabilidad única del comprador y el Banco la aprobación del crédito bancario, entendiendo que debe ser aprobado y firmado dentro del plazo establecido. En caso de ser financiado, el comprador deberá pagar sus cuotas entre el primero (1°) y el quinto (5°) día de cada mes.
          </Text>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{empNombre} · MG &amp; MAXUS</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>

    </Document>
  )
}
