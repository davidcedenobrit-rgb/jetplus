import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

// Anexo "A" del Plan Asegúrate con $500 — diseño TOP con membrete del concesionario.
// Dos variantes:
//   · 'oriental'    → montos idénticos a la proforma (cuota 1 incluye los $500).
//   · 'vehimotors'  → cuota 1 = cuota 1 base − $500 (lo que se solicita a Vehimotors).

const RED = '#C41E3A'
const DARK = '#111827'
const GRAY = '#6b7280'
const LIGHT = '#f9fafb'
const BORDER = '#e5e7eb'

export interface AnexoACuota { label: string; monto: number }

export interface AnexoAData {
  // Membrete / concesionario
  logoSrc?: string
  selloSrc?: string
  empresaNombre?: string
  empresaRif?: string | null
  empresaDireccion?: string | null
  empresaTelefono?: string | null
  empresaCorreo?: string | null
  colorPrimario?: string | null
  colorSecundario?: string | null
  // Meta
  variante: 'oriental' | 'vehimotors'
  ciclo?: string | number | null
  fecha: string
  // Cliente
  clienteNombre: string
  estadoCivil?: string | null
  conyuge?: { nombre?: string | null; cedula?: string | null; rif?: string | null } | null
  clienteCedula?: string | null
  clienteRif?: string | null
  clienteDireccion?: string | null
  clienteTelefono?: string | null
  clienteCorreo?: string | null
  // Plan
  unidad: string
  colores?: string | null
  gastosAsociados: number      // = cuota 6
  valorVentaUnidad: number     // = reserva + cuotas 1..5
  reserva: number
  cuotas: AnexoACuota[]        // cuotas 1..5 (ya ajustadas según variante)
  totalPagar: number
  serieCobertura?: string | null  // fila de garantía resaltada según modelo
}

const fmt = (n: number) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const COBERTURAS: { marca: string; cobertura: string }[] = [
  { marca: 'Maxus Series T, V, S, C, G', cobertura: '3 años / 100.000 km' },
  { marca: 'Maxus Series D', cobertura: '5 años / 120.000 km' },
  { marca: 'Maxus Series H, K', cobertura: '2 años / 240.000 km' },
  { marca: 'MG (VIN > 2025)', cobertura: '6 años / 120.000 km' },
  { marca: 'Baterías eléctricas / híbridas', cobertura: '8 años / 150.000 km' },
]

const NO_CUBRE = [
  'Fallas por almacenamiento inadecuado (motor o sistema de combustible por aceites/combustibles contaminados).',
  'Descarga de batería o daño en pintura por acción del medioambiente.',
  'Piezas de desgaste normal: neumáticos, pastillas de freno, disco de embrague, bombillos, limpiaparabrisas, bombas e inyectores.',
  'Falta de mantenimiento periódico o no seguir el manual del usuario.',
  'Daños por sustancias, piedras, granizo, rayos, terremotos, inundaciones, humedad, etc.',
  'Uso de productos no autorizados, uso inadecuado, carreras, exhibiciones o pruebas no autorizadas.',
  'Modificaciones al vehículo (carrocería, chasis, tren motriz, sistemas electrónicos).',
  'Odómetro desconectado o alterado por terceros no autorizados.',
  'Gastos fuera del alcance: pérdida de uso, salarios, almacenamiento, alquiler, hospedaje, grúas, gastos legales, etc.',
]

export function AnexoADocument({ data }: { data: AnexoAData }) {
  const primario = data.colorPrimario || RED
  const secundario = data.colorSecundario || DARK
  const esVehimotors = data.variante === 'vehimotors'
  // El anexo que se envía a Vehimotors lleva el membrete de Vehimotors, C.A.
  const emp = esVehimotors ? {
    nombre: 'VEHIMOTORS, C.A.',
    rif: 'J-50091794-5',
    dir: 'Avenida Blandin, La Castellana\nCaracas 1080 - Venezuela',
    tel: null as string | null,
    correo: null as string | null,
    logo: undefined as string | undefined,
  } : {
    nombre: data.empresaNombre,
    rif: data.empresaRif ?? null,
    dir: data.empresaDireccion ?? null,
    tel: data.empresaTelefono ?? null,
    correo: data.empresaCorreo ?? null,
    logo: data.logoSrc,
  }
  const empDir = (emp.dir || '').split('\n').filter(Boolean)

  const s = StyleSheet.create({
    page: { fontSize: 9, fontFamily: 'Helvetica', color: DARK, paddingBottom: 46 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '14pt 30pt 12pt', borderBottom: `2pt solid ${primario}` },
    logoWrap: { flexShrink: 0, width: 180 },
    logo: { width: 180, height: 42, objectFit: 'contain', objectPositionX: 0 },
    company: { flex: 1, alignItems: 'flex-end', paddingLeft: 18 },
    companyName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: secundario, textAlign: 'right' },
    companyRif: { fontSize: 8, color: primario, fontFamily: 'Helvetica-Bold', marginTop: 1, textAlign: 'right' },
    companyLine: { fontSize: 7.5, color: GRAY, textAlign: 'right' },

    body: { padding: '14pt 30pt' },

    // Título
    titleBand: { backgroundColor: secundario, borderRadius: 8, padding: '12pt 16pt', marginBottom: 14, position: 'relative', overflow: 'hidden' },
    titleAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: primario },
    titleMain: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#fff', letterSpacing: 1 },
    titleSub: { fontSize: 8, color: '#d1d5db', marginTop: 2, letterSpacing: 0.5, textTransform: 'uppercase' },
    pill: { position: 'absolute', right: 14, top: 14, backgroundColor: primario, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12 },
    pillText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fff' },

    sectionLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: primario, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, marginTop: 4 },

    card: { backgroundColor: LIGHT, border: `1pt solid ${BORDER}`, borderRadius: 8, padding: '10pt 12pt', marginBottom: 12 },
    row: { flexDirection: 'row', marginBottom: 3 },
    key: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: DARK, width: 130 },
    val: { fontSize: 8.5, color: '#374151', flex: 1 },

    grid2: { flexDirection: 'row', gap: 12 },
    col: { flex: 1 },

    planRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
    planKey: { fontSize: 8.5, color: GRAY },
    planVal: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: DARK },
    nota: { fontSize: 7, color: primario, fontStyle: 'italic', marginTop: 4, lineHeight: 1.3 },

    // Cronograma
    tHead: { flexDirection: 'row', backgroundColor: secundario, borderRadius: 4, padding: '6pt 10pt' },
    tHeadCell: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fff' },
    tRow: { flexDirection: 'row', padding: '6pt 10pt', borderBottom: `0.5pt solid ${BORDER}` },
    tRowAlt: { backgroundColor: LIGHT },
    tConcepto: { flex: 1, fontSize: 8.5, color: DARK },
    tMonto: { width: 90, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: DARK, textAlign: 'right' },

    valorBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: LIGHT, border: `1pt solid ${BORDER}`, borderRadius: 6, padding: '8pt 12pt', marginTop: 8 },
    valorLbl: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: DARK },
    valorVal: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK },
    totalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: primario, borderRadius: 6, padding: '10pt 14pt', marginTop: 6 },
    totalLbl: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#fff', letterSpacing: 0.5 },
    totalVal: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#fff' },

    // Garantía
    gTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: secundario, marginBottom: 4, marginTop: 6 },
    gItem: { fontSize: 7.2, color: '#4b5563', marginBottom: 1.5, lineHeight: 1.25, flexDirection: 'row' },
    gBullet: { width: 8, color: primario },
    covRow: { flexDirection: 'row', borderBottom: `0.5pt solid ${BORDER}`, paddingVertical: 3 },
    covMarca: { flex: 1, fontSize: 7.5, color: DARK },
    covCob: { width: 130, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: DARK, textAlign: 'right' },
    covOn: { backgroundColor: '#fef2f2' },

    // Firmas
    firmas: { flexDirection: 'row', gap: 20, marginTop: 26 },
    firmaBox: { flex: 1, alignItems: 'center' },
    firmaLine: { borderTop: `1pt solid ${DARK}`, width: '100%', marginBottom: 4 },
    firmaNom: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: DARK, textAlign: 'center' },
    firmaRol: { fontSize: 7.5, color: GRAY },
    sello: { position: 'absolute', right: 40, bottom: 60, width: 110, height: 110, objectFit: 'contain', opacity: 0.9 },

    footer: { position: 'absolute', bottom: 18, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between', borderTop: `0.5pt solid ${BORDER}`, paddingTop: 6 },
    footerText: { fontSize: 7, color: GRAY },
  })

  const Bullet = ({ children }: { children: React.ReactNode }) => (
    <View style={s.gItem}><Text style={s.gBullet}>•</Text><Text style={{ flex: 1 }}>{children}</Text></View>
  )

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header / membrete */}
        <View style={s.header} fixed>
          <View style={s.logoWrap}>
            {emp.logo ? <Image src={emp.logo} style={s.logo} /> : <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: secundario }}>{emp.nombre}</Text>}
          </View>
          <View style={s.company}>
            <Text style={s.companyName}>{emp.nombre}</Text>
            {emp.rif ? <Text style={s.companyRif}>RIF: {emp.rif}</Text> : null}
            {empDir.map((l, i) => <Text key={i} style={s.companyLine}>{l}</Text>)}
            {emp.tel ? <Text style={s.companyLine}>{emp.tel}{emp.correo ? ` · ${emp.correo}` : ''}</Text> : null}
          </View>
        </View>

        <View style={s.body}>
          {/* Título */}
          <View style={s.titleBand}>
            <View style={s.titleAccent} />
            <Text style={s.titleMain}>ANEXO «A»</Text>
            <Text style={s.titleSub}>Precio de venta, condiciones y cronograma de pago</Text>
            <View style={s.pill}><Text style={s.pillText}>ASEGÚRATE CON $500{data.ciclo ? `  ·  CICLO #${data.ciclo}` : ''}</Text></View>
          </View>

          {/* Cliente */}
          <Text style={s.sectionLabel}>Datos del cliente</Text>
          <View style={s.card}>
            <View style={s.row}><Text style={s.key}>Cliente:</Text><Text style={s.val}>{data.clienteNombre}</Text></View>
            {data.estadoCivil ? <View style={s.row}><Text style={s.key}>Estado civil:</Text><Text style={s.val}>{data.estadoCivil}</Text></View> : null}
            {data.conyuge?.nombre ? <View style={s.row}><Text style={s.key}>Cónyuge:</Text><Text style={s.val}>{data.conyuge.nombre}{data.conyuge.cedula ? ` · C.I. ${data.conyuge.cedula}` : ''}{data.conyuge.rif ? ` · RIF ${data.conyuge.rif}` : ''}</Text></View> : null}
            <View style={s.row}><Text style={s.key}>Cédula de identidad:</Text><Text style={s.val}>{data.clienteCedula || '—'}</Text></View>
            <View style={s.row}><Text style={s.key}>RIF:</Text><Text style={s.val}>{data.clienteRif || '—'}</Text></View>
            <View style={s.row}><Text style={s.key}>Dirección:</Text><Text style={s.val}>{data.clienteDireccion || '—'}</Text></View>
            <View style={s.row}><Text style={s.key}>Teléfono:</Text><Text style={s.val}>{data.clienteTelefono || '—'}</Text></View>
            <View style={s.row}><Text style={s.key}>Correo electrónico:</Text><Text style={s.val}>{data.clienteCorreo || '—'}</Text></View>
          </View>

          <Text style={{ fontSize: 8.5, color: '#374151', marginBottom: 8 }}>
            A continuación, le presentamos un resumen de los acuerdos de nuestro plan de compra programada:
          </Text>

          {/* Plan */}
          <View style={s.grid2}>
            <View style={s.col}>
              <View style={s.planRow}><Text style={s.planKey}>Fecha</Text><Text style={s.planVal}>{data.fecha}</Text></View>
              <View style={s.planRow}><Text style={s.planKey}>Unidad</Text><Text style={s.planVal}>{data.unidad}</Text></View>
              <View style={s.planRow}><Text style={s.planKey}>Color(es) de preferencia</Text><Text style={s.planVal}>{data.colores || '—'}</Text></View>
            </View>
            <View style={s.col}>
              <View style={s.planRow}><Text style={s.planKey}>Gastos asociados (IVA, IGTF y matriculación)</Text><Text style={s.planVal}>${fmt(data.gastosAsociados)}</Text></View>
            </View>
          </View>
          <Text style={s.nota}>Nota: estos valores son estimados a esta fecha y están sujetos a variación por orden o datos suministrados por los entes gubernamentales; se recotizarán al momento de ejecutar el pago final.</Text>

          {/* Cronograma */}
          <Text style={s.sectionLabel}>Cronograma de pagos convenido</Text>
          <View style={s.tHead}>
            <Text style={[s.tHeadCell, { flex: 1 }]}>CONCEPTO</Text>
            <Text style={[s.tHeadCell, { width: 90, textAlign: 'right' }]}>MONTO ($)</Text>
          </View>
          <View style={[s.tRow, s.tRowAlt]}><Text style={s.tConcepto}>Reserva</Text><Text style={s.tMonto}>{fmt(data.reserva)}</Text></View>
          {data.cuotas.map((c, i) => (
            <View key={i} style={i % 2 === 0 ? s.tRow : [s.tRow, s.tRowAlt]}>
              <Text style={s.tConcepto}>{c.label}</Text><Text style={s.tMonto}>{fmt(c.monto)}</Text>
            </View>
          ))}
          <View style={data.cuotas.length % 2 === 0 ? s.tRow : [s.tRow, s.tRowAlt]}>
            <Text style={s.tConcepto}>Al momento de la entrega del vehículo, cuota final (incluye IVA, IGTF y gastos de matriculación)</Text>
            <Text style={s.tMonto}>{fmt(data.gastosAsociados)}</Text>
          </View>

          <View style={s.valorBox}>
            <Text style={s.valorLbl}>Valor (venta) de la unidad</Text>
            <Text style={s.valorVal}>${fmt(data.valorVentaUnidad)}</Text>
          </View>
          <View style={s.totalBox}>
            <Text style={s.totalLbl}>TOTAL A PAGAR</Text>
            <Text style={s.totalVal}>${fmt(data.totalPagar)}</Text>
          </View>

          {/* Página 2: nota de color, garantía, coberturas y firmas */}
          <View break />
          <Text style={s.nota}>
            Nota *1: la selección de color(es) es referencial; su disponibilidad depende del proceso interno de la fábrica SAIC MOTORS
            (República Popular China) al momento de la orden y ensamblaje, por lo que no constituye obligación de entrega del color indicado.
            {esVehimotors ? ' Ciertas condiciones podrán aplicar por fletes, regulaciones marítimas e impuestos de nacionalización (detalladas en el contrato final).' : ''}
          </Text>

          {/* Garantía */}
          <Text style={s.gTitle}>Condiciones y alcance de la garantía</Text>
          <Bullet>Reclamos notificados y gestionados por el concesionario o distribuidor autorizado durante el período de garantía.</Bullet>
          <Bullet>Reparaciones, mantenimiento y montaje de repuestos/accesorios realizados por el concesionario autorizado, con repuestos originales.</Bullet>
          <Bullet>Registro de mantenimiento según el fabricante (cada 5.000 km) y conforme al Plan de Mantenimiento oficial.</Bullet>

          <Text style={[s.sectionLabel, { marginTop: 8 }]}>Tiempo y kilometraje por marca y serie</Text>
          {COBERTURAS.map((c, i) => {
            const on = data.serieCobertura && c.marca === data.serieCobertura
            return (
              <View key={i} style={on ? [s.covRow, s.covOn] : s.covRow}>
                <Text style={s.covMarca}>{c.marca}</Text>
                <Text style={s.covCob}>{c.cobertura}</Text>
              </View>
            )
          })}

          <Text style={[s.gTitle, { fontSize: 9 }]}>La garantía no cubre</Text>
          {NO_CUBRE.map((t, i) => <Bullet key={i}>{t}</Bullet>)}

          {/* Firmas */}
          <View style={s.firmas}>
            <View style={s.firmaBox}>
              <View style={s.firmaLine} />
              <Text style={s.firmaNom}>Por: {data.clienteNombre}</Text>
              <Text style={s.firmaRol}>Firma del comprador</Text>
            </View>
            <View style={s.firmaBox}>
              <View style={s.firmaLine} />
              <Text style={s.firmaNom}>Por: {esVehimotors ? 'VEHIMOTORS, C.A.' : (data.empresaNombre || 'La Oriental Automotors, C.A.')}</Text>
              <Text style={s.firmaRol}>Firma autorizada</Text>
            </View>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>{emp.nombre}{emp.rif ? ` · RIF ${emp.rif}` : ''}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

// Construye el cronograma y montos del Anexo según la variante.
// `cuotasBase` = cuotas 1..5 tal como salen del plan (con los $500 en la cuota 1).
// `cuotaFinal` = cuota 6 (gastos asociados: IVA, IGTF, matriculación).
export function buildAnexoMontos(opts: {
  variante: 'oriental' | 'vehimotors'
  reserva: number
  cuotasBase: number[]     // 5 cuotas
  cuotaFinal: number
}): { reserva: number; cuotas: AnexoACuota[]; gastosAsociados: number; valorVentaUnidad: number; totalPagar: number } {
  const r2 = (n: number) => Math.round(n * 100) / 100
  const reserva = opts.reserva
  const cuotasArr = [...opts.cuotasBase]
  // La versión Vehimotors resta los $500 a la cuota 1 (la reserva/gasto admin la retiene La Oriental).
  if (opts.variante === 'vehimotors' && cuotasArr.length > 0) {
    cuotasArr[0] = r2(cuotasArr[0] - 500)
  }
  const cuotas: AnexoACuota[] = cuotasArr.map((m, i) => ({ label: `${i + 1}, pago cuota ${i + 1}`, monto: r2(m) }))
  const gastosAsociados = r2(opts.cuotaFinal)
  const valorVentaUnidad = r2(reserva + cuotasArr.reduce((s, m) => s + m, 0))
  const totalPagar = r2(valorVentaUnidad + gastosAsociados)
  return { reserva, cuotas, gastosAsociados, valorVentaUnidad, totalPagar }
}
