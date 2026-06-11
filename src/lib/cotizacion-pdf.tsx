import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const LOGO = 'https://assets.cdn.filesafe.space/XZDJ4aSOAL1crWRCXyY6/media/698367bc1dfc0253b24abd7a.png'
const RED = '#C41E3A'
const GOLD = '#ca8a04'
const DARK = '#111827'
const GRAY = '#6b7280'
const LIGHT = '#f9fafb'
const BORDER = '#e5e7eb'

const s = StyleSheet.create({
  page: { fontSize: 9, fontFamily: 'Helvetica', color: DARK, paddingBottom: 40 },
  header: { backgroundColor: '#fff', borderBottom: `1pt solid ${BORDER}`, padding: '20pt 28pt 14pt', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logo: { width: 90, height: 26, objectFit: 'contain' },
  companyBlock: { alignItems: 'flex-end' },
  companyName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 2 },
  companyRif: { fontSize: 8, color: RED, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  companyLine: { fontSize: 7.5, color: GRAY },

  body: { padding: '16pt 28pt' },

  twoCol: { flexDirection: 'row', marginBottom: 14 },
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

  divider: { height: 1, backgroundColor: BORDER, marginBottom: 12 },

  tableHeader: { flexDirection: 'row', backgroundColor: DARK, borderRadius: 4, padding: '5pt 8pt', marginBottom: 1 },
  tableHeaderText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#fff' },
  tableRow: { flexDirection: 'row', borderBottom: `0.5pt solid ${BORDER}`, padding: '5pt 8pt' },
  tableCell: { fontSize: 8.5, color: DARK },
  colMarca: { width: 55 },
  colModelo: { flex: 1 },
  colCant: { width: 30, textAlign: 'center' },
  colPrecio: { width: 75, textAlign: 'right' },
  colImporte: { width: 75, textAlign: 'right' },

  modalidadBlock: { marginTop: 14, flexDirection: 'row', alignItems: 'flex-start' },
  noteBox: { flex: 1, paddingRight: 16 },
  noteText: { fontSize: 7.5, color: GRAY, lineHeight: 1.5, fontStyle: 'italic' },

  calcBox: { width: 240, border: `1pt solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' },
  calcHeader: { backgroundColor: DARK, padding: '6pt 10pt', flexDirection: 'row', justifyContent: 'space-between' },
  calcHeaderLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fff' },
  calcHeaderVal: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fbbf24' },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', padding: '4pt 10pt', borderBottom: `0.5pt solid ${BORDER}` },
  calcLabel: { fontSize: 7.5, color: GRAY },
  calcVal: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: DARK },
  calcTotalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: '6pt 10pt', backgroundColor: '#fef9c3' },
  calcTotalLabel: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: GOLD },
  calcTotalVal: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#92400e' },

  finBox: { marginTop: 8, border: `1pt solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' },
  finHeader: { backgroundColor: GOLD, padding: '5pt 10pt' },
  finHeaderText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fff' },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', padding: '4pt 10pt', borderBottom: `0.5pt solid ${BORDER}` },
  finLabel: { fontSize: 7.5, color: GRAY },
  finVal: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: DARK },
  finTotalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: '6pt 10pt', backgroundColor: LIGHT },
  finTotalLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: GRAY, textTransform: 'uppercase' },
  finTotalVal: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#15803d' },

  legalBox: { marginTop: 20, backgroundColor: LIGHT, border: `1pt solid ${BORDER}`, borderRadius: 6, padding: '10pt 12pt' },
  legalText: { fontSize: 7.5, color: GRAY, lineHeight: 1.55 },
  legalBold: { fontFamily: 'Helvetica-Bold', color: DARK },

  page2: { padding: '28pt', fontSize: 9 },
  sigRow: { flexDirection: 'row', marginTop: 60, marginBottom: 48 },
  sigBlock: { flex: 1, alignItems: 'center' },
  sigLine: { width: 160, height: 1, backgroundColor: DARK, marginBottom: 6 },
  sigLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: DARK },
  sigSub: { fontSize: 7.5, color: GRAY },
  condTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 5 },
  condText: { fontSize: 8, color: GRAY, lineHeight: 1.6 },
  footer: { position: 'absolute', bottom: 20, left: 28, right: 28, flexDirection: 'row', justifyContent: 'space-between', borderTop: `0.5pt solid ${BORDER}`, paddingTop: 6 },
  footerText: { fontSize: 7, color: '#9ca3af' },
})

function fmt(n: number | null | undefined) {
  if (n == null) return '0,00'
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export interface CotizacionPDFData {
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
  precioBase: number
  modalidad: 'contado' | 'credito_24'
  ivaMonto: number
  gastosMonto: number
  totalInicial: number
  financiamientoMonto: number | null
  cuotaMensual: number | null
  costoTotal: number
}

export function CotizacionPDF({ data }: { data: CotizacionPDFData }) {
  const es24 = data.modalidad === 'credito_24'
  const modalidadLabel = es24 ? 'CRÉDITO 24 MESES (40% INICIAL)' : 'CONTADO'

  return (
    <Document title={`Cotización ${data.numero}`} author="La Oriental Automotors">

      {/* ── Página 1 ── */}
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <Image src={LOGO} style={s.logo} />
          <View style={s.companyBlock}>
            <Text style={s.companyName}>LA ORIENTAL AUTOMOTORS, C.A.</Text>
            <Text style={s.companyRif}>RIF: J-505692143</Text>
            <Text style={s.companyLine}>AV. UGARTE ALIRIO PELYO · CENTRO PROFESIONAL DAVID</Text>
            <Text style={s.companyLine}>MATURÍN - MONAGAS - VENEZUELA</Text>
            <Text style={s.companyLine}>TEL: 0414-9989010 · laorientalautomotorsc@gmail.com</Text>
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
            <Text style={[s.tableHeaderText, s.colPrecio]}>PRECIO UNIT. ($)</Text>
            <Text style={[s.tableHeaderText, s.colImporte]}>IMPORTE ($)</Text>
          </View>
          <View style={s.tableRow}>
            <Text style={[s.tableCell, s.colMarca]}>{data.marca}</Text>
            <Text style={[s.tableCell, s.colModelo]}>{data.modelo}</Text>
            <Text style={[s.tableCell, s.colCant, { textAlign: 'center' }]}>1</Text>
            <Text style={[s.tableCell, s.colPrecio, { textAlign: 'right' }]}>{fmt(data.precioBase)}</Text>
            <Text style={[s.tableCell, s.colImporte, { textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>{fmt(data.precioBase)}</Text>
          </View>

          {/* Modalidad + cálculos */}
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

              {es24 ? (
                <>
                  <View style={s.calcRow}>
                    <Text style={s.calcLabel}>40% Precio Base</Text>
                    <Text style={s.calcVal}>{fmt(data.precioBase * 0.4)}</Text>
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

          {/* Plan de financiamiento (solo crédito) */}
          {es24 && data.financiamientoMonto != null && (
            <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
              <View style={[s.finBox, { width: 240 }]}>
                <View style={s.finHeader}>
                  <Text style={s.finHeaderText}>PLAN DE FINANCIAMIENTO</Text>
                </View>
                <View style={s.finRow}>
                  <Text style={s.finLabel}>Financiamiento 60%</Text>
                  <Text style={s.finVal}>${fmt(data.financiamientoMonto)}</Text>
                </View>
                <View style={s.finRow}>
                  <Text style={s.finLabel}>Cuotas mensuales</Text>
                  <Text style={s.finVal}>24   ${fmt(data.cuotaMensual)}</Text>
                </View>
                <View style={s.finTotalRow}>
                  <Text style={s.finTotalLabel}>COSTO TOTAL:</Text>
                  <Text style={s.finTotalVal}>${fmt(data.costoTotal)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Texto legal */}
          {es24 ? (
            <View style={s.legalBox}>
              <Text style={s.legalText}>
                <Text style={s.legalBold}>VEHÍCULO NO HA SIDO PAGADO EN SU TOTALIDAD POR PARTE DEL CLIENTE: </Text>
                {data.clienteNombre}, R.I.F.: {data.clienteCiRif}, SIN EMBARGO SE PROCEDE A ENTREGAR EL VEHÍCULO, MARCA: {data.marca}, MODELO: {data.modelo}, CON SU RESPECTIVA PÓLIZA DE SEGURO VEHICULAR, PREVIA APROBACIÓN DE LA EMPRESA: LA ORIENTAL AUTOMOTORS, C.A.; RIF: J-505692143.{'\n\n'}
                <Text style={s.legalBold}>DE LOS PAGOS RESTANTES, EL CLIENTE: </Text>
                {data.clienteNombre}, R.I.F.: {data.clienteCiRif}, SE COMPROMETE A REALIZAR LOS MISMOS DE LA SIGUIENTE MANERA:{'\n'}
                • 24 CUOTAS MENSUALES DE: ${fmt(data.cuotaMensual)} C/U PAGADERAS LOS DÍAS 30 DE CADA MES.{'\n\n'}
                <Text style={s.legalBold}>"SE ESTABLECE DOMICILIO ESPECIAL, LA CIUDAD DE MATURÍN, ESTADO MONAGAS"</Text>{'\n'}
                FIRMÓ, ACEPTÓ, ESTOY DE ACUERDO Y ASUMO EL COMPROMISO EN LO DESCRITO ANTERIORMENTE
              </Text>
            </View>
          ) : (
            <View style={s.legalBox}>
              <Text style={s.legalText}>
                <Text style={s.legalBold}>"SE ESTABLECE DOMICILIO ESPECIAL, LA CIUDAD DE MATURÍN, ESTADO MONAGAS"</Text>{'\n'}
                Los precios indicados son referenciales y están sujetos a disponibilidad de stock al momento de la compra. Esta cotización tiene una validez de 30 días a partir de la fecha de emisión. Para confirmar disponibilidad y precio final, contacte a su asesor.
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>La Oriental Automotors · MG &amp; MAXUS · Maturín, Venezuela</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>

      {/* ── Página 2: Firmas + Condiciones ── */}
      <Page size="A4" style={s.page}>
        <View style={s.page2}>
          <View style={s.sigRow}>
            <View style={s.sigBlock}>
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>COMPRADOR / CLIENTE</Text>
              <Text style={s.sigSub}>{data.clienteNombre}</Text>
            </View>
            <View style={s.sigBlock}>
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>REPRESENTANTE LA ORIENTAL</Text>
              <Text style={s.sigSub}>LA ORIENTAL AUTOMOTORS, C.A.</Text>
            </View>
          </View>

          <Text style={s.condTitle}>CONDICIONES:</Text>
          <Text style={s.condText}>
            Los Planes de Venta no pueden ser modificados luego de su aprobación y representan un compromiso de pago por parte del comprador. Es responsabilidad única del comprador y el Banco la aprobación del crédito bancario, entendiendo que debe ser aprobado y firmado dentro del plazo establecido. En caso de ser financiado, el comprador deberá pagar sus cuotas entre el primero (1°) y el quinto (5°) día de cada mes.
          </Text>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>La Oriental Automotors · MG &amp; MAXUS · Maturín, Venezuela</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>

    </Document>
  )
}
