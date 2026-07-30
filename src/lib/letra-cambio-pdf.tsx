import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { montoUsdALetras, mesEnLetras, diaEnLetras } from './monto-a-letras'
import { PdfMembrete, type MembreteData } from './pdf-membrete'

const BLACK = '#000000'
const GRAY = '#4b5563'
const BORDER = '#111111'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 10.5,
    color: BLACK,
    padding: '2cm 2.2cm 1.6cm',
    backgroundColor: '#fff',
    lineHeight: 1.35,
  },
  letraBox: {
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'solid',
    padding: '14 16 12',
    height: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'Times-Bold',
    fontSize: 14,
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  emitida: { fontSize: 10, marginBottom: 3 },
  fechaLine: { fontSize: 10, marginBottom: 8 },
  monto: {
    fontFamily: 'Times-Bold',
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 8,
  },
  paragraph: { textAlign: 'justify', marginBottom: 6 },
  bold: { fontFamily: 'Times-Bold' },
  divider: { borderBottom: '1px solid #6b7280', marginTop: 10, marginBottom: 8 },

  footerBlock: { marginTop: 6 },
  aceptacion: { fontSize: 9.5, marginBottom: 6, textAlign: 'justify' },
  firmaLine: {
    borderBottom: '1px solid #111',
    marginTop: 10,
    marginBottom: 2,
    height: 18,
  },
  smallLabel: { fontSize: 8.5, color: GRAY },

  contadorPagina: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    fontSize: 8,
    color: GRAY,
  },
})

export interface LetraCambioData {
  ciudad: string
  fechaEmision: string          // ISO date de emision (fecha_inicio o hoy)
  fechaCreditoInicio?: string   // fecha_inicio del credito (referencia)
  deudorNombre: string
  deudorCedula: string
  deudorDireccion: string
  deudorTelefono: string
  deudorCorreo: string
  deudorEsJuridica?: boolean            // cliente = persona jurídica (empresa)
  deudorIdentJuridica?: string | null   // "inscrita por ante el Registro Mercantil…, bajo el Nº…, Tomo…"
  fiadorNombre?: string | null
  fiadorCedula?: string | null
  membrete?: MembreteData
  letras: Array<{
    monto: number
    fechaVencimiento: string  // ISO date
  }>
}

function fmtFechaLarga(iso: string): { dia: number; diaLetras: string; mes: string; anio: number } {
  const d = new Date(iso + (iso.includes('T') ? '' : 'T12:00:00'))
  const dia = d.getDate()
  return {
    dia,
    diaLetras: diaEnLetras(dia),
    mes: mesEnLetras(d.getMonth()),
    anio: d.getFullYear(),
  }
}

export function LetraCambioPDF({ data }: { data: LetraCambioData }) {
  const emision = fmtFechaLarga(data.fechaEmision)
  const totalLetras = data.letras.length
  // Cliente jurídico: por bandera explícita o porque el RIF empieza en J/G.
  const esJuridica = data.deudorEsJuridica === true || /^\s*[JGjg]-?\d/.test(data.deudorCedula || '')

  return (
    <Document
      title={`Letras de cambio — ${data.deudorNombre}`}
      author="La Oriental Automotors"
    >
      {data.letras.map((letra, idx) => {
        const venc = fmtFechaLarga(letra.fechaVencimiento)
        const montoStr = letra.monto.toLocaleString('es-VE', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
        const montoPalabras = montoUsdALetras(letra.monto)

        return (
          <Page key={idx} size="A4" style={s.page}>
            <View style={s.letraBox}>
              {data.membrete ? (
                <View style={{ marginBottom: 8 }}><PdfMembrete data={data.membrete} /></View>
              ) : null}
              <Text style={s.title}>LETRA DE CAMBIO</Text>

              <View style={s.headerRow}>
                <View style={{ flex: 3 }}>
                  <Text style={s.emitida}>
                    Emitida en la ciudad de {data.ciudad}, Estado Monagas, República Bolivariana de Venezuela,
                  </Text>
                  <Text style={s.fechaLine}>
                    {data.ciudad}, en fecha {emision.dia.toString().padStart(2, '0')} de {emision.mes} de {emision.anio}.
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={s.monto}>POR ${montoStr} USD</Text>
                  <Text style={{ fontSize: 8, color: GRAY }}>{idx + 1} / {totalLetras}</Text>
                </View>
              </View>

              <Text style={s.paragraph}>
                {esJuridica ? (
                  <>
                    Por esta Letra de Cambio, la Sociedad Mercantil <Text style={s.bold}>{data.deudorNombre}</Text>,{' '}
                    {data.deudorIdentJuridica?.trim()
                      ? `${data.deudorIdentJuridica.trim()}, `
                      : 'inscrita por ante el Registro Mercantil de la Circunscripción Judicial del Estado ____________, en fecha ____________, bajo el Nº ____, Tomo ____, '}
                    con Registro Único de Información Fiscal RIF Nº <Text style={s.bold}>{data.deudorCedula}</Text>,
                  </>
                ) : (
                  <>
                    Por esta Letra de Cambio, <Text style={s.bold}>{data.deudorNombre}</Text>, venezolano(a),
                    mayor de edad, titular de la cédula de identidad Nº <Text style={s.bold}>V- {data.deudorCedula}</Text>,
                  </>
                )}
                {' '}de este domicilio: {data.deudorDireccion || '____________________________________________'},
                Teléfono {data.deudorTelefono || '_______________'}, correo: {data.deudorCorreo || '_______________'},
                se servirá mandar a pagar <Text style={s.bold}>SIN AVISO Y SIN PROTESTO</Text>, en la ciudad de {data.ciudad},
                Estado Monagas, República Bolivariana de Venezuela, el día{' '}
                <Text style={s.bold}>
                  {venc.diaLetras} ({venc.dia.toString().padStart(2, '0')}) de {venc.mes} de {venc.anio}
                </Text>
                , a la ORDEN de la Sociedad Mercantil, <Text style={s.bold}>LA ORIENTAL AUTOMOTORS, C.A.</Text>,
                inscrita por ante el Registro Mercantil de la Circunscripción Judicial del Estado Monagas,
                en fecha cuatro (04) de julio de 2.024, bajo el Nº 24, Tomo 34-A, RM MAT, con Registro Único
                de Información Fiscal RIF Nº <Text style={s.bold}>J-505692143</Text>, la cantidad de{' '}
                <Text style={s.bold}>{montoPalabras} (${montoStr} USD)</Text>, en efectivo en su domicilio el cual
                declara conocer; suma esta que devengará, a partir de su vencimiento intereses moratorios a la
                tasa del 1% mensual, así como exigibilidad inmediata.
              </Text>

              <Text style={s.paragraph}>
                <Text style={s.bold}>VALOR ENTENDIDO</Text> que se cargará en cuenta a:{' '}
                <Text style={s.bold}>{data.deudorNombre}</Text>, {esJuridica ? 'RIF Nº' : 'C.I. Nº V-'} {data.deudorCedula}, de este domicilio:{' '}
                {data.deudorDireccion || '____________________________________________'}, Teléfono {data.deudorTelefono || '_______________'},
                correo: {data.deudorCorreo || '_______________'}.
              </Text>

              <Text style={{ textAlign: 'right', marginTop: 4, fontStyle: 'italic' }}>
                Attos. Ss y amigos
              </Text>

              <View style={s.divider} />

              <View style={s.footerBlock}>
                <Text style={s.aceptacion}>
                  <Text style={s.bold}>Aceptado para ser pagado a su vencimiento SIN AVISO Y SIN PROTESTO</Text>
                </Text>
                <Text style={{ fontSize: 9.5, marginBottom: 2 }}>
                  Nombre: <Text style={s.bold}>{data.deudorNombre}</Text> — C.I. Nº V- {data.deudorCedula}
                  {data.deudorTelefono ? ` — Tlf: ${data.deudorTelefono}` : ''}
                </Text>
                <View style={s.firmaLine} />
                <Text style={s.smallLabel}>Firma del aceptante · Huellas dactilares</Text>

                <View style={{ marginTop: 12 }}>
                  <Text style={{ fontSize: 9.5, marginBottom: 2 }}>
                    <Text style={s.bold}>Bueno por aval a favor del aceptante (FIADOR)</Text>
                  </Text>
                  <Text style={{ fontSize: 9.5 }}>
                    Nombre: {data.fiadorNombre ? <Text style={s.bold}>{data.fiadorNombre}</Text> : '________________________________'}
                    {'   '}
                    C.I. V- {data.fiadorCedula ? <Text style={s.bold}>{data.fiadorCedula}</Text> : '__________________'}
                  </Text>
                  <View style={s.firmaLine} />
                  <Text style={s.smallLabel}>Firma del fiador · Bueno por aval a favor del aceptante</Text>
                </View>
              </View>
            </View>

            {data.fechaCreditoInicio && (
              <Text style={s.contadorPagina}>
                Correspondiente al crédito de fecha {fmtFechaLarga(data.fechaCreditoInicio).dia.toString().padStart(2, '0')}/
                {(new Date(data.fechaCreditoInicio + 'T12:00:00').getMonth() + 1).toString().padStart(2, '0')}/
                {fmtFechaLarga(data.fechaCreditoInicio).anio}
              </Text>
            )}
          </Page>
        )
      })}
    </Document>
  )
}
