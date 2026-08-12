import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { calcularPresupuestoJetplus } from './cotizacion-calc'

// PDF compacto del "rapidito" (resumen de cotización) que el vendedor comparte.
// Reemplaza la captura de imagen (html2canvas) que se quedaba pegada.

export interface RapidaAc500Row { label: string; val: number | null; delivery?: boolean; highlight?: boolean }

export interface CotizacionRapidaData {
  brandNombre: string
  brandLogo?: string
  colorPrimario: string
  colorSecundario: string
  marca: string
  modelo: string
  planNota?: string
  fecha: string
  // Desglose de precios (vehículos de piso / promociones)
  financiamiento?: boolean
  precio?: number
  gastosContado?: number  // Gastos Administrativos, modalidad contado
  gastosCredito?: number  // Gastos Administrativos, modalidad crédito
  placaMonto?: number
  cuota?: number
  // Plan Asegúrate $500
  ac500?: { meses: string; color?: string; rows: RapidaAc500Row[]; total: number | null } | null
}

const fmt = (n: number | null | undefined) => {
  const v = Number(n || 0)
  return v.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(v) * 100) % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })
}

export function CotizacionRapidaPDF({ data }: { data: CotizacionRapidaData }) {
  const primario = data.colorPrimario || '#C41E3A'
  const secundario = data.colorSecundario || '#111827'
  const precio = Number(data.precio) || 0
  const cuota = Number(data.cuota) || 0
  // Jetplus: IVA exonerado (Puerto Libre), IGTF 3% sobre el precio del vehículo,
  // cargos de Gastos Administrativos + Placa.
  const contado = calcularPresupuestoJetplus({
    precioLista: precio, inicialPct: 100, cargoGastosAdmin: true, cargoPlaca: true,
    gastosAdminMonto: data.gastosContado, placaMonto: data.placaMonto,
  })
  const credito = calcularPresupuestoJetplus({
    precioLista: precio, inicialPct: 40, cargoGastosAdmin: true, cargoPlaca: true,
    gastosAdminMonto: data.gastosCredito, placaMonto: data.placaMonto,
  })

  const s = StyleSheet.create({
    page: { fontFamily: 'Helvetica', color: '#111827', fontSize: 10 },
    membrete: { backgroundColor: primario, paddingVertical: 10, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8 },
    logo: { height: 22, maxWidth: 120, objectFit: 'contain', backgroundColor: '#fff', borderRadius: 3, padding: 2 },
    brandName: { color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 13 },
    vehBand: { backgroundColor: secundario, paddingVertical: 12, paddingHorizontal: 18 },
    vehSup: { fontSize: 8, color: 'rgba(255,255,255,0.7)', fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
    vehModel: { fontSize: 16, color: '#fff', fontFamily: 'Helvetica-Bold', marginTop: 3 },
    nota: { backgroundColor: '#fffbeb', borderBottomWidth: 1, borderBottomColor: '#fde68a', paddingVertical: 8, paddingHorizontal: 18, fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#92400e' },
    secHdr: { paddingVertical: 6, paddingHorizontal: 18, fontSize: 9, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    lbl: { fontSize: 10, color: '#374151', flex: 1 },
    val: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 18 },
    footer: { paddingVertical: 10, paddingHorizontal: 18 },
    footerTxt: { fontSize: 8, color: '#9ca3af', textAlign: 'center' },
  })

  return (
    <Document title={`Cotización ${data.marca} ${data.modelo}`} author={data.brandNombre}>
      <Page size="A5" style={s.page}>
        <View style={s.membrete}>
          {data.brandLogo ? <Image src={data.brandLogo} style={s.logo} /> : null}
          <Text style={s.brandName}>{data.brandNombre}</Text>
        </View>

        <View style={s.vehBand}>
          <Text style={s.vehSup}>VEHÍCULO · {data.marca}</Text>
          <Text style={s.vehModel}>{data.modelo}</Text>
        </View>

        {data.planNota ? <Text style={s.nota}>🛡 {data.planNota}</Text> : null}

        {/* Plan Asegúrate $500 */}
        {data.ac500 ? (
          <View>
            <Text style={[s.secHdr, { backgroundColor: '#7c2d12', color: '#fde68a' }]}>PLAN ASEGÚRATE $500 · ENTREGA MES {data.ac500.meses}</Text>
            {data.ac500.rows.map((r, i) => (
              <View key={i} style={[s.row, r.highlight ? { backgroundColor: '#fffbeb' } : {}]}>
                <Text style={s.lbl}>{r.label}{r.delivery ? '  (Entrega)' : ''}</Text>
                <Text style={s.val}>${fmt(r.val)}</Text>
              </View>
            ))}
            <View style={[s.totalRow, { backgroundColor: '#fef9c3' }]}>
              <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#92400e' }}>TOTAL DEL PLAN:</Text>
              <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#92400e' }}>${fmt(data.ac500.total)}</Text>
            </View>
            {data.ac500.color ? (
              <View style={s.row}><Text style={s.lbl}>Color seleccionado:</Text><Text style={s.val}>{data.ac500.color}</Text></View>
            ) : null}
          </View>
        ) : null}

        {/* Desglose contado + crédito */}
        {data.financiamiento ? (
          <View>
            <Text style={[s.secHdr, { backgroundColor: '#7c2d12', color: '#fde68a' }]}>MODALIDAD DE CONTADO</Text>
            <View style={s.row}><Text style={s.lbl}>100% Precio Base:</Text><Text style={s.val}>${fmt(contado.precioVehiculo)}</Text></View>
            <View style={s.row}><Text style={s.lbl}>I.V.A. (exonerado):</Text><Text style={s.val}>$0</Text></View>
            <View style={s.row}><Text style={s.lbl}>IGTF 3%:</Text><Text style={s.val}>${fmt(contado.igtf)}</Text></View>
            <View style={s.row}><Text style={s.lbl}>Gastos Administrativos:</Text><Text style={s.val}>${fmt(data.gastosContado ?? 500)}</Text></View>
            <View style={s.row}><Text style={s.lbl}>Placa:</Text><Text style={s.val}>${fmt(data.placaMonto ?? 390)}</Text></View>
            <View style={[s.totalRow, { backgroundColor: '#fef9c3' }]}>
              <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#92400e' }}>TOTAL A PAGAR:</Text>
              <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#92400e' }}>${fmt(contado.totalInicialAPagar)}</Text>
            </View>

            <Text style={[s.secHdr, { backgroundColor: '#064e3b', color: '#6ee7b7', marginTop: 4 }]}>CRÉDITO 24 MESES (40% INICIAL)</Text>
            <View style={s.row}><Text style={s.lbl}>40% Precio Base:</Text><Text style={s.val}>${fmt(credito.inicialVehiculo)}</Text></View>
            <View style={s.row}><Text style={s.lbl}>I.V.A. (exonerado):</Text><Text style={s.val}>$0</Text></View>
            <View style={s.row}><Text style={s.lbl}>IGTF 3% (sobre precio base):</Text><Text style={s.val}>${fmt(credito.igtf)}</Text></View>
            <View style={s.row}><Text style={s.lbl}>Gastos Administrativos:</Text><Text style={s.val}>${fmt(data.gastosCredito ?? 500)}</Text></View>
            <View style={s.row}><Text style={s.lbl}>Placa:</Text><Text style={s.val}>${fmt(data.placaMonto ?? 390)}</Text></View>
            <View style={[s.totalRow, { backgroundColor: '#dcfce7' }]}>
              <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#065f46' }}>TOTAL INICIAL A PAGAR:</Text>
              <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#065f46' }}>${fmt(credito.totalInicialAPagar)}</Text>
            </View>
            <View style={[s.row, { backgroundColor: '#f0fdf4' }]}><Text style={s.lbl}>Financiamiento 60%:</Text><Text style={s.val}>${fmt(credito.saldoFinanciar)}</Text></View>
            {cuota > 0 ? (
              <View style={[s.totalRow, { backgroundColor: '#fff1f2' }]}>
                <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: primario }}>24 Cuotas Mensuales:</Text>
                <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: primario }}>${fmt(cuota)}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={s.footer}>
          <Text style={s.footerTxt}>{data.fecha}  ·  Precios referenciales sujetos a disponibilidad y cambios sin previo aviso.</Text>
        </View>
      </Page>
    </Document>
  )
}
