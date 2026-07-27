import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'

const LOGO = 'https://assets.cdn.filesafe.space/XZDJ4aSOAL1crWRCXyY6/media/698367bc1dfc0253b24abd7a.png'
const RED = '#C41E3A'
const GOLD = '#ca8a04'
const DARK = '#111827'
const GRAY = '#6b7280'
const LIGHT = '#f9fafb'
const BORDER = '#e5e7eb'
const PURPLE = '#6d28d9'
const PURPLE_LIGHT = '#f5f3ff'

const s = StyleSheet.create({
  page: { fontSize: 9, fontFamily: 'Helvetica', color: DARK, paddingBottom: 96 },

  // Membrete (dinámico por agencia) con barra superior + línea de acento dorado/rojo
  topBar: { height: 6, backgroundColor: RED },
  header: { backgroundColor: '#fff', padding: '13pt 28pt 11pt', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoWrap: { flexShrink: 0 },
  logo: { width: 240, height: 48, objectFit: 'contain' },
  companyBlock: { alignItems: 'flex-end' },
  companyName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 2 },
  companyRif: { fontSize: 8, color: RED, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  companyLine: { fontSize: 7.5, color: GRAY },
  headerAccent: { flexDirection: 'row', height: 3 },
  headerAccentGold: { width: 96, backgroundColor: GOLD },
  headerAccentRed: { flex: 1, backgroundColor: RED },

  body: { padding: '16pt 28pt 14pt' },

  // Banda de título elegante
  titleBand: { alignItems: 'center', marginBottom: 14 },
  titleEyebrow: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: GOLD, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 5 },
  documentTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: PURPLE, letterSpacing: 0.8, textAlign: 'center' },
  documentSubtitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#6b7280', letterSpacing: 1, marginTop: 3, textAlign: 'center' },
  titleRule: { width: 64, height: 2.5, backgroundColor: PURPLE, borderRadius: 2, marginTop: 8 },

  // Datos (dos columnas: cliente + operación)
  metaBox: { border: `1pt solid ${BORDER}`, borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  metaHeader: { backgroundColor: DARK, padding: '5pt 12pt' },
  metaHeaderText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', padding: '4pt 12pt', borderBottom: `0.5pt solid ${BORDER}` },
  metaKey: { fontSize: 8, color: GRAY },
  metaVal: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: DARK, textAlign: 'right', flex: 1, marginLeft: 12 },

  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: PURPLE, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 5 },
  p: { textAlign: 'justify', marginBottom: 6, lineHeight: 1.5, fontSize: 8.5, color: DARK },
  bold: { fontFamily: 'Helvetica-Bold' },

  // Cuadro de montos de la inicial
  montosBox: { border: `1pt solid ${GOLD}`, borderRadius: 6, overflow: 'hidden', marginTop: 4 },
  montosHeader: { backgroundColor: GOLD, padding: '5pt 12pt' },
  montosHeaderText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
  montoRow: { flexDirection: 'row', justifyContent: 'space-between', padding: '4pt 12pt', borderBottom: `0.5pt solid ${BORDER}` },
  montoLabel: { fontSize: 8.5, color: GRAY },
  montoVal: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: DARK },
  montoTotalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: '6pt 12pt', backgroundColor: '#fef9c3' },
  montoTotalLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: GOLD },
  montoTotalVal: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#92400e' },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', padding: '5pt 12pt', backgroundColor: PURPLE_LIGHT, borderTop: `0.5pt solid ${BORDER}` },
  planLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: PURPLE },
  planVal: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#4c1d95', textAlign: 'right', flex: 1, marginLeft: 12 },

  li: { flexDirection: 'row', marginBottom: 5 },
  liDot: { width: 12, fontSize: 8.5, color: PURPLE },
  liText: { flex: 1, textAlign: 'justify', fontSize: 8.5, lineHeight: 1.5 },

  obsBox: { marginTop: 8, backgroundColor: LIGHT, border: `1pt solid ${BORDER}`, borderRadius: 6, padding: '8pt 12pt' },
  obsText: { fontSize: 8, color: GRAY, lineHeight: 1.5 },

  // Firma fija al pie (en todas las páginas)
  firmaFooter: { position: 'absolute', bottom: 34, left: 28, right: 28, alignItems: 'center' },
  firmaLine: { width: 240, borderBottom: `1pt solid ${DARK}`, height: 30, marginBottom: 4 },
  firmaLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: DARK },
  firmaSub: { fontSize: 7, color: GRAY },
  selloImg: { width: 42, height: 42, objectFit: 'contain', marginBottom: 2 },

  footer: { position: 'absolute', bottom: 18, left: 28, right: 28, flexDirection: 'row', justifyContent: 'space-between', borderTop: `0.5pt solid ${BORDER}`, paddingTop: 6 },
  footerText: { fontSize: 7, color: '#9ca3af' },
})

export interface AcuerdoCobroData {
  fecha: string
  concesionario: string
  // Membrete dinámico según la agencia de la cotización.
  empresaNombre?: string
  empresaRif?: string | null
  empresaDireccion?: string | null
  empresaTelefono?: string | null
  empresaCorreo?: string | null
  logoSrc?: string
  selloSrc?: string
  vendedoras: string
  clienteNombre: string
  clienteCiRif: string
  marca: string
  modelo: string
  vin?: string | null
  inicialTotal?: number | null
  montoContado?: number | null
  montoFinanciado: number
  numCuotas?: number | null
  cuotaMonto?: number | null
  planCuotas?: string | null
  observaciones?: string | null
}

const fmtUsd = (n: number | null | undefined) =>
  n == null ? '____________' : `$ ${Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtFecha = (d: string) => {
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return d }
}

export function AcuerdoCobroPDF({ data }: { data: AcuerdoCobroData }) {
  // El membrete respeta los datos de la agencia; si no vienen, cae en La Oriental.
  const conoceEmpresa = data.empresaNombre != null
  const empNombre = conoceEmpresa ? data.empresaNombre! : 'LA ORIENTAL AUTOMOTORS, C.A.'
  const empRif = conoceEmpresa ? (data.empresaRif ?? null) : 'J-505692143'
  const empDireccion = conoceEmpresa ? (data.empresaDireccion ?? null) : 'AV. UGARTE ALIRIO PELYO · CENTRO PROFESIONAL DAVID\nMATURÍN - MONAGAS - VENEZUELA'
  const empTelefono = conoceEmpresa ? (data.empresaTelefono ?? null) : '0414-9989010'
  const empCorreo = conoceEmpresa ? (data.empresaCorreo ?? null) : 'laorientalautomotorsc@gmail.com'
  const empDireccionLineas = empDireccion ? String(empDireccion).split('\n').filter(Boolean) : []
  const empContacto = [empTelefono, empCorreo].filter(Boolean).join(' · ')
  // Nombre corto de la agencia para los textos del cuerpo (sin "C.A." ni RIF).
  const agencia = empNombre.replace(/,?\s*C\.?A\.?\s*$/i, '').trim() || empNombre

  return (
    <Document title="Acuerdo de gestión de cobro" author={empNombre}>
      <Page size="A4" style={s.page}>

        {/* Membrete con barra superior y línea de acento */}
        <View style={s.topBar} />
        <View style={s.header}>
          <View style={s.logoWrap}>
            {data.logoSrc
              ? <Image src={data.logoSrc} style={s.logo} />
              : <Image src={LOGO} style={s.logo} />}
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
        <View style={s.headerAccent}>
          <View style={s.headerAccentGold} />
          <View style={s.headerAccentRed} />
        </View>

        <View style={s.body}>

          <View style={s.titleBand}>
            <Text style={s.titleEyebrow}>Documento interno · La Oriental</Text>
            <Text style={s.documentTitle}>ACUERDO DE RESPONSABILIDAD DE GESTIÓN DE COBRO</Text>
            <Text style={s.documentSubtitle}>Y CONDICIÓN DE PAGO DE COMISIÓN</Text>
            <View style={s.titleRule} />
          </View>

          {/* Datos de la operación */}
          <View style={s.metaBox}>
            <View style={s.metaHeader}><Text style={s.metaHeaderText}>Datos del acuerdo</Text></View>
            <View style={s.metaRow}><Text style={s.metaKey}>Fecha</Text><Text style={s.metaVal}>{fmtFecha(data.fecha)}</Text></View>
            <View style={s.metaRow}><Text style={s.metaKey}>Concesionario</Text><Text style={s.metaVal}>{agencia}</Text></View>
            <View style={s.metaRow}><Text style={s.metaKey}>Ejecutivo(a) de Ventas</Text><Text style={s.metaVal}>{data.vendedoras || '________________'}</Text></View>
            <View style={s.metaRow}><Text style={s.metaKey}>Cliente</Text><Text style={s.metaVal}>{data.clienteNombre}</Text></View>
            <View style={s.metaRow}><Text style={s.metaKey}>C.I. / R.I.F.</Text><Text style={s.metaVal}>{data.clienteCiRif}</Text></View>
            <View style={data.vin ? s.metaRow : [s.metaRow, { borderBottom: 'none' }]}><Text style={s.metaKey}>Marca / Modelo</Text><Text style={s.metaVal}>{[data.marca, data.modelo].filter(Boolean).join(' — ') || '—'}</Text></View>
            {data.vin ? (
              <View style={[s.metaRow, { borderBottom: 'none' }]}><Text style={s.metaKey}>VIN / N° de Chasis</Text><Text style={s.metaVal}>{data.vin}</Text></View>
            ) : null}
          </View>

          <Text style={s.sectionTitle}>Declaración de Financiamiento de Inicial</Text>
          <Text style={s.p}>
            Por medio del presente documento, el(la) Ejecutivo(a) de Ventas hace constar que la negociación del vehículo antes descrito
            incluye una modalidad de doble financiamiento, donde <Text style={s.bold}>{agencia}</Text> otorga un crédito especial para
            cubrir el saldo pendiente de la inicial del vehículo, de forma paralela al crédito ordinario gestionado vía Vehimotor.
          </Text>

          <View style={s.montosBox}>
            <View style={s.montosHeader}><Text style={s.montosHeaderText}>Detalle de la inicial</Text></View>
            <View style={s.montoRow}><Text style={s.montoLabel}>Monto total de la inicial</Text><Text style={s.montoVal}>{fmtUsd(data.inicialTotal)}</Text></View>
            <View style={s.montoRow}><Text style={s.montoLabel}>Pagado al contado por el cliente</Text><Text style={s.montoVal}>{fmtUsd(data.montoContado)}</Text></View>
            <View style={s.montoTotalRow}><Text style={s.montoTotalLabel}>Financiado por {agencia}</Text><Text style={s.montoTotalVal}>{fmtUsd(data.montoFinanciado)}</Text></View>
            {data.numCuotas || data.cuotaMonto ? (
              <View style={s.montoRow}>
                <Text style={s.montoLabel}>Cuotas</Text>
                <Text style={s.montoVal}>{data.numCuotas ? `${Math.round(Number(data.numCuotas))} cuota(s)` : ''}{data.numCuotas && data.cuotaMonto ? ' × ' : ''}{data.cuotaMonto ? fmtUsd(data.cuotaMonto) : ''}</Text>
              </View>
            ) : null}
            <View style={s.planRow}><Text style={s.planLabel}>Plan de cuotas</Text><Text style={s.planVal}>{data.planCuotas || '________________'}</Text></View>
          </View>

          <Text style={s.sectionTitle}>Compromiso de Gestión y Seguimiento de Cobranza</Text>
          <Text style={s.p}>
            El(la) Ejecutivo(a) de Ventas asume formalmente la responsabilidad operativa y de gestión para hacer el seguimiento directo al
            cliente, garantizando el cobro puntual de cada una de las cuotas pactadas hasta la cancelación total del saldo financiado por {agencia}.
          </Text>

          <Text style={s.sectionTitle}>Condición para la Liberación y Pago de Comisión</Text>
          <Text style={s.p}>El(la) Ejecutivo(a) de Ventas acepta y manifiesta su conformidad con las siguientes condiciones comerciales:</Text>
          <View style={s.li}>
            <Text style={s.liDot}>•</Text>
            <Text style={s.liText}>
              El pago total de la comisión de venta de este vehículo se liquidará únicamente cuando el cliente haya saldado el 100% del monto
              financiado por {agencia} correspondiente a la inicial del vehículo.
            </Text>
          </View>
          <View style={s.li}>
            <Text style={s.liDot}>•</Text>
            <Text style={s.liText}>El reporte de cumplimiento será validado por la Gerencia de Administración previo al desembolso.</Text>
          </View>

          {data.observaciones ? (
            <>
              <Text style={s.sectionTitle}>Observaciones</Text>
              <View style={s.obsBox}><Text style={s.obsText}>{data.observaciones}</Text></View>
            </>
          ) : null}

          <Text style={[s.p, { marginTop: 12 }]}>En señal de conformidad con los términos expresados, se firma la presente acta:</Text>
        </View>

        {/* Firma + sello fijos al pie */}
        <View style={s.firmaFooter} fixed>
          {data.selloSrc ? <Image src={data.selloSrc} style={s.selloImg} /> : null}
          <View style={s.firmaLine} />
          <Text style={s.firmaLabel}>{data.vendedoras || 'Ejecutivo(a) de Ventas'}</Text>
          <Text style={s.firmaSub}>C.I.: ____________________</Text>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>{agencia} · MG &amp; MAXUS · Maturín, Venezuela</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
