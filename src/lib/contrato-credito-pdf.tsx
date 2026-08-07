import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { PdfMembrete, MembreteData } from './pdf-membrete'

export interface AmortRow {
  nro: number
  cuota: number
  interes: number
  cuotaEspecial: number
  amortizacion: number
  saldo: number
  fecha: string
}

export interface ContratoCreditoData {
  membrete: MembreteData
  ciudad: string
  // Vendedor (concesionario de turno)
  vendedorNombre: string
  vendedorRif: string
  vendedorRegistro: string
  vendedorRegistroFecha: string
  vendedorRegistroNro: string
  vendedorRegistroTomo: string
  vendedorRepresentante: string
  vendedorRepresentanteCedula: string
  vendedorRepresentanteCargo: string
  vendedorDireccion: string
  vendedorTelefono: string
  vendedorCorreo: string
  domicilioEspecial: string
  // Comprador
  compradorNombre: string
  compradorCedula: string
  compradorDireccion: string
  compradorTelefono: string
  compradorCorreo: string
  // Vehículo
  vehMarca: string
  vehModelo: string
  vehVersion: string
  vehAnio: string
  vehColor: string
  vehVin: string
  vehSerialMotor: string
  vehPlaca: string
  certificadoOrigenNro: string
  certificadoOrigenFecha: string
  // Financiero
  precioTotalVenta: number
  placaMonto: number
  iva: number
  financiamiento: number
  plazoMeses: number
  cuota: number
  cuotasEspeciales: number
  primeraCuotaFecha: string
  saldoInicial: number
  contravalorBs: string     // en letras + "(Bs. ...)"
  tasaBcv: string
  tasaBcvFecha: string
  amortizacion: AmortRow[]
}

const DARK = '#111827'
const GRAY = '#6b7280'
const LINE = '#d1d5db'
const SOFT = '#f3f4f6'

const fmt = (n: number) => Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const B = { fontFamily: 'Helvetica-Bold' }

export function ContratoCreditoPDF({ data }: { data: ContratoCreditoData }) {
  const primario = data.membrete.colorPrimario || '#C41E3A'
  const V = data.vendedorNombre
  const dash = (s: string) => (s && s.trim() ? s : '________________')

  const s = StyleSheet.create({
    page: { paddingTop: 24, paddingBottom: 40, paddingHorizontal: 44, fontFamily: 'Helvetica', color: DARK, fontSize: 8.6 },
    title: { fontSize: 13, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 12, letterSpacing: 0.5 },
    subtitle: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 12, color: primario },
    p: { fontSize: 8.6, lineHeight: 1.5, textAlign: 'justify', marginBottom: 6 },
    cl: { fontFamily: 'Helvetica-Bold' },
    // Tabla vehículo
    vehTable: { borderWidth: 1, borderColor: LINE, borderRadius: 4, marginVertical: 8 },
    vehRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: LINE },
    vehK: { width: 130, backgroundColor: SOFT, padding: 4, fontSize: 8, fontFamily: 'Helvetica-Bold', color: GRAY },
    vehV: { flex: 1, padding: 4, fontSize: 8.6, fontFamily: 'Helvetica-Bold' },
    // Bloque financiero
    finBox: { backgroundColor: SOFT, borderRadius: 4, padding: 8, marginVertical: 8 },
    finRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
    finK: { fontSize: 8.6, fontFamily: 'Helvetica-Bold' },
    finV: { fontSize: 8.6, fontFamily: 'Helvetica-Bold', color: primario },
    // Cuadro de amortización
    amTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginTop: 8, marginBottom: 4 },
    amHead: { flexDirection: 'row', backgroundColor: data.membrete.colorSecundario || DARK },
    amHeadCell: { color: '#fff', fontSize: 7, fontFamily: 'Helvetica-Bold', padding: 3, textAlign: 'center' },
    amRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: LINE },
    amCell: { fontSize: 7, padding: 3, textAlign: 'center' },
    cNro: { width: '7%' }, cCuota: { width: '16%' }, cInt: { width: '16%' }, cEsp: { width: '15%' }, cAmort: { width: '18%' }, cSaldo: { width: '16%' }, cFecha: { width: '12%' },
    firmaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40 },
    firmaCol: { width: '45%', alignItems: 'center' },
    firmaLinea: { borderTopWidth: 1, borderTopColor: DARK, width: '100%', marginBottom: 4 },
    firmaTxt: { fontSize: 8, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
    firmaSub: { fontSize: 7.5, color: GRAY, textAlign: 'center' },
  })

  const vehData: [string, string][] = [
    ['MARCA', data.vehMarca], ['MODELO', [data.vehModelo, data.vehVersion].filter(Boolean).join(' ')],
    ['AÑO', String(data.vehAnio || '')], ['COLOR', data.vehColor],
    ['SERIAL DE CARROCERÍA (VIN)', data.vehVin], ['SERIAL DE MOTOR', data.vehSerialMotor],
    ['PLACA', data.vehPlaca],
  ]

  return (
    <Document title={`Contrato de venta a crédito — ${data.compradorNombre}`} author={V}>
      <Page size="A4" style={s.page} wrap>
        <PdfMembrete data={data.membrete} />

        <Text style={s.title}>CONTRATO DE VENTA A CRÉDITO</Text>
        <Text style={s.subtitle}>CON RESERVA DE DOMINIO</Text>

        <Text style={s.p}>
          Entre, la Sociedad Mercantil, <Text style={s.cl}>{V}</Text>, inscrita por ante el {dash(data.vendedorRegistro)},
          bajo el No. {dash(data.vendedorRegistroNro)}, Tomo {dash(data.vendedorRegistroTomo)}{data.vendedorRegistroFecha ? `, del año ${data.vendedorRegistroFecha}` : ''},
          representada en este acto por su {data.vendedorRepresentanteCargo || 'Director'} <Text style={s.cl}>{dash(data.vendedorRepresentante)}</Text>,
          venezolano, mayor de edad, comerciante, titular de la cédula de identidad No. {dash(data.vendedorRepresentanteCedula)},
          suficientemente facultado según acta constitutiva antes citada, signada con el RIF: {data.vendedorRif},
          en lo adelante denominado <Text style={s.cl}>EL VENDEDOR</Text>, por una parte, y por la otra{' '}
          <Text style={s.cl}>{data.compradorNombre}</Text>, venezolano(a), mayor de edad, titular de la cédula de identidad
          No. {data.compradorCedula}, en lo adelante denominado <Text style={s.cl}>EL COMPRADOR</Text>, se ha celebrado el
          presente Contrato de Venta a Crédito con Reserva de Dominio, contentivo de las siguientes cláusulas:
        </Text>

        <Text style={s.p}>
          <Text style={s.cl}>PRIMERA:</Text> EL VENDEDOR vende a plazos (a crédito) con reserva de dominio a EL COMPRADOR
          el vehículo que se especifica a continuación:
        </Text>

        <View style={s.vehTable}>
          {vehData.map(([k, v], i) => (
            <View key={k} style={[s.vehRow, i === vehData.length - 1 ? { borderBottomWidth: 0 } : {}]}>
              <Text style={s.vehK}>{k}</Text>
              <Text style={s.vehV}>{v || '—'}</Text>
            </View>
          ))}
        </View>

        <Text style={s.p}>
          El vehículo le pertenece a EL VENDEDOR según se evidencia de Certificado de Origen Nro. {dash(data.certificadoOrigenNro)}
          {' '}de fecha {dash(data.certificadoOrigenFecha)} emitido por {V}. RESERVA DE DOMINIO. Conforme a los efectos de lo
          establecido en el artículo 1.193 del Código Civil vigente, el VEHÍCULO queda bajo la guarda y custodia de EL COMPRADOR,
          reservándose expresamente EL VENDEDOR, o la persona que llegue a sustituirlo con ocasión de cualquier cesión del crédito
          contenido en este documento, el dominio del VEHÍCULO hasta que EL COMPRADOR pague en forma íntegra el precio total de
          venta y sus intereses; por lo tanto, el VEHÍCULO no podrá ser objeto de reventa mientras se mantenga en vigencia este
          contrato. EL COMPRADOR adquirirá la propiedad del VEHÍCULO con el pago de la última cuota del precio y los intereses, y
          asume el riesgo sobre el mismo desde esta misma fecha, reservándose expresamente EL VENDEDOR el dominio del mismo, hasta
          que EL COMPRADOR haya pagado la totalidad del precio e intereses, en las condiciones aquí convenidas, que a continuación
          se especifican:
        </Text>

        <View style={s.finBox}>
          <View style={s.finRow}><Text style={s.finK}>PRECIO TOTAL DE LA VENTA:</Text><Text style={s.finV}>$ {fmt(data.precioTotalVenta)}</Text></View>
          <View style={s.finRow}><Text style={s.finK}>PLACA:</Text><Text style={s.finV}>$ {fmt(data.placaMonto)}</Text></View>
          <View style={s.finRow}><Text style={s.finK}>IVA:</Text><Text style={s.finV}>$ {fmt(data.iva)}</Text></View>
          <View style={s.finRow}><Text style={s.finK}>MONTO DEL FINANCIAMIENTO:</Text><Text style={s.finV}>$ {fmt(data.financiamiento)}</Text></View>
          <View style={s.finRow}><Text style={s.finK}>PLAZO TOTAL DE LA OPERACIÓN:</Text><Text style={s.finV}>{data.plazoMeses} MESES</Text></View>
          <View style={s.finRow}><Text style={s.finK}>MONTO DE LAS CUOTAS:</Text><Text style={s.finV}>$ {fmt(data.cuota)}</Text></View>
          <View style={s.finRow}><Text style={s.finK}>MONTO DE LAS CUOTAS ESPECIALES ({data.cuotasEspeciales > 0 ? data.cuotasEspeciales : 0}):</Text><Text style={s.finV}>$ 0,00 C/U</Text></View>
        </View>

        <Text style={s.p}>
          Los intereses convencionales devengados por el SALDO FINANCIADO serán pagaderos por PERÍODOS MENSUALES VENCIDOS y
          consecutivos contados a partir de la fecha de otorgamiento del presente contrato y estarán comprendidos en las Cuotas
          Financieras Mensuales contentivas de amortización de capital y de pago de intereses convencionales devengados. Los
          intereses serán calculados sobre la base de un año de trescientos sesenta (360) días y por meses iguales de treinta (30)
          días, es decir 360/360. El vencimiento de la primera cuota se acuerda el día {dash(data.primeraCuotaFecha)}, y las demás el
          mismo día de los meses subsiguientes hasta su total cancelación. Cuadro de Financiamiento:
        </Text>

        <Text style={s.amTitle}>CUADRO DE FINANCIAMIENTO</Text>
        <View wrap={false}>
          <View style={s.amHead}>
            <Text style={[s.amHeadCell, s.cNro]}>Nro.</Text>
            <Text style={[s.amHeadCell, s.cCuota]}>Cuota</Text>
            <Text style={[s.amHeadCell, s.cInt]}>Intereses</Text>
            <Text style={[s.amHeadCell, s.cEsp]}>Cuota especial</Text>
            <Text style={[s.amHeadCell, s.cAmort]}>Amortiz. capital</Text>
            <Text style={[s.amHeadCell, s.cSaldo]}>Saldo</Text>
            <Text style={[s.amHeadCell, s.cFecha]}>Fecha</Text>
          </View>
          <View style={s.amRow}>
            <Text style={[s.amCell, s.cNro]}></Text>
            <Text style={[s.amCell, s.cCuota]}></Text>
            <Text style={[s.amCell, s.cInt]}></Text>
            <Text style={[s.amCell, s.cEsp]}></Text>
            <Text style={[s.amCell, s.cAmort]}></Text>
            <Text style={[s.amCell, s.cSaldo, B]}>{fmt(data.saldoInicial)}</Text>
            <Text style={[s.amCell, s.cFecha]}></Text>
          </View>
          {data.amortizacion.map((r) => (
            <View key={r.nro} style={s.amRow}>
              <Text style={[s.amCell, s.cNro]}>{r.nro}</Text>
              <Text style={[s.amCell, s.cCuota]}>{fmt(r.cuota)}</Text>
              <Text style={[s.amCell, s.cInt]}>{fmt(r.interes)}</Text>
              <Text style={[s.amCell, s.cEsp]}>{fmt(r.cuotaEspecial)}</Text>
              <Text style={[s.amCell, s.cAmort]}>{fmt(r.amortizacion)}</Text>
              <Text style={[s.amCell, s.cSaldo]}>{fmt(r.saldo)}</Text>
              <Text style={[s.amCell, s.cFecha]}>{r.fecha}</Text>
            </View>
          ))}
        </View>

        <Text style={[s.p, { marginTop: 10 }]}>
          A los efectos de este contrato, LAS PARTES establecen el Dólar de los Estados Unidos de América como moneda exclusiva de
          cuenta y de pago con respecto de las obligaciones que de él se derivan, incluyendo intereses, obligaciones, asesorías,
          derivados y consecuencias, no pudiendo el deudor liberarse de las mismas mediante el pago de sus obligaciones en cualquier
          otra moneda de curso legal, salvo expresa autorización de EL VENDEDOR o su cesionario según sea el caso. A los fines del
          pago de cualesquiera cantidades derivadas del presente Contrato, EL COMPRADOR declara poseer divisas suficientes para
          pagar las cantidades aquí señaladas en dólares de los Estados Unidos de América y que dichos fondos han sido adquiridos
          mediante operaciones lícitas realizadas en su área de actividad profesional y comercial; todo conforme con el artículo 128
          del Decreto con Rango, Valor y Fuerza de ley Orgánica de Reforma de la Ley del Banco Central de Venezuela, publicado en la
          Gaceta Oficial de la República Bolivariana de Venezuela N° 6.211 Extraordinario de fecha treinta (30) de diciembre de 2015;
          en concordancia con el Artículo 2 del Decreto Constituyente Derogatorio del Régimen Cambiario y sus Ilícitos, publicado en
          la Gaceta Oficial N° 41.452 de fecha dos (02) de agosto de 2018 y conforme con lo establecido en el Artículo 8 del Convenio
          Cambiario N° 1, publicado en la Gaceta Oficial N° 6.405 Extraordinario, de fecha siete (07) de septiembre de 2018. En
          cumplimiento del artículo 128 del Banco Central de Venezuela, para la fecha de la firma del presente Contrato los montos
          aquí expresados en US$ equivalen en su contravalor en bolívares a {data.contravalorBs} de acuerdo a la tasa de cambio
          oficial (Bs x US$ de {dash(data.tasaBcv)}) publicada por el Banco Central de Venezuela en fecha {dash(data.tasaBcvFecha)}.
        </Text>

        <Text style={s.p}>
          <Text style={s.cl}>SEGUNDA:</Text> EL COMPRADOR declara expresamente que ha recibido en esta fecha el vehículo motivo de
          este contrato en perfectas condiciones de mantenimiento y funcionamiento, y declara que ha chequeado, examinado y probado
          todas y cada una de sus partes componentes y accesorios, obligándose a cuidarlo y mantenerlo en el mismo estado que lo
          recibió, salvo el desgaste normal por el buen uso, sin poder modificarlo, transformarlo, enajenarlo, pignorarlo, cederlo o
          arrendarlo, ni traspasar a terceros en forma alguna su posesión o tenencia. RESPONSABILIDADES: EL COMPRADOR es el único
          responsable por cualquier daño que ocasione a terceros y por cualquier infracción de las Leyes, Reglamentos y Ordenanzas,
          particularmente las referentes a la Ley de Tránsito Terrestre. PÓLIZAS DE SEGURO: EL COMPRADOR expresamente declara que
          tiene contratada, a satisfacción de EL VENDEDOR, una Póliza de Seguro de casco de cobertura amplia y una Póliza de Seguro
          de responsabilidad civil, siendo el beneficiario en primer término EL VENDEDOR o su cesionario, hasta tanto haya pagado la
          totalidad de las obligaciones derivadas del SALDO FINANCIADO.
        </Text>

        <Text style={s.p}>
          <Text style={s.cl}>TERCERA:</Text> Las partes convienen que la falta de pago por parte de EL COMPRADOR de dos (02) o más
          de las cuotas convenidas y/o sus intereses, o si dejase de cumplir cualquiera de las cláusulas o condiciones de este
          contrato, dará derecho a EL VENDEDOR al cobro de intereses moratorios permitidos por ley y gastos administrativos del tres
          por ciento (3%), o a exigir el pago de la totalidad de lo adeudado, la cual se considerará exigible y de plazo vencido, o a
          solicitar la resolución del contrato de pleno derecho conforme al Artículo 14 de la Ley vigente sobre Ventas con Reserva de
          Dominio, quedando las cuotas pagadas a beneficio de EL VENDEDOR como justa compensación por el uso del vehículo.
          <Text style={s.cl}> CUARTA:</Text> En el monto de las cuotas pactadas han sido establecidos los intereses con base en la
          tasa de interés convenida entre las partes. Tales cuotas son comprensivas de interés y amortización de capital.
          <Text style={s.cl}> QUINTA:</Text> En aplicación del artículo 1214 del Código Civil, las partes aceptan que el crédito
          concedido se entiende en beneficio de ambos; antes de seis (6) meses no se podrán hacer amortizaciones a la obligación
          contraída; después de este lapso es permitido hacer abonos parciales o pagar totalmente la deuda, pagando el deudor
          adicionalmente el dos por ciento (2%) sobre el saldo por concepto de gastos de administración.
          <Text style={s.cl}> SEXTA:</Text> En caso de mora, EL COMPRADOR pagará intereses moratorios calculados añadiendo tres (3)
          puntos porcentuales anuales.
          <Text style={s.cl}> SÉPTIMA:</Text> El único comprobante válido de pago será el recibo que emita EL VENDEDOR o su
          cesionario, o la Institución Financiera que EL COMPRADOR haya escogido.
        </Text>

        <Text style={s.p}>
          <Text style={s.cl}>OCTAVA:</Text> LETRAS DE CAMBIO: Las partes acuerdan emitir tantas letras de cambio como meses
          correspondan por el crédito concedido. EL VENDEDOR garantiza la existencia en el mercado de los repuestos y los servicios
          técnicos de mantenimiento que requiera el vehículo vendido.
          <Text style={s.cl}> NOVENA:</Text> EL VENDEDOR garantiza el vehículo nuevo vendido bajo los términos y condiciones
          estipulados por la MARCA en la garantía contenida en la póliza de servicio otorgada por el fabricante o distribuidor
          nacional, la cual ha sido entregada a EL COMPRADOR y que este declara conocer y recibir en este acto.
          <Text style={s.cl}> DÉCIMA:</Text> EL VENDEDOR o su cesionario podrán en cualquier oportunidad ceder, traspasar o disponer
          a favor de terceros los derechos que tiene en virtud del presente contrato, sin que requiera autorización de EL COMPRADOR.
          <Text style={s.cl}> DÉCIMA PRIMERA:</Text> EL COMPRADOR deberá realizar los pagos en las oficinas de EL VENDEDOR, al
          término de cada cuota por mes vencido, y/o en la cuenta que a tal efecto le indique EL VENDEDOR, quedando la obligación de
          reportar el pago y enviar el comprobante correspondiente.
          <Text style={s.cl}> DÉCIMA SEGUNDA a DÉCIMA CUARTA:</Text> EL VENDEDOR podrá declarar de plazo vencido el saldo deudor ante
          insolvencia, cesación de pagos, caducidad de pólizas, información falsa o incumplimiento; todos los gastos que ocasione el
          presente contrato son a cargo exclusivo de EL COMPRADOR; cualquier modificación deberá constar por escrito mediante
          Addendum firmado por ambas partes.
        </Text>

        <Text style={s.p}>
          <Text style={s.cl}>DÉCIMA QUINTA:</Text> Red de Concesionarios y Garantías: los servicios de garantía y atención al cliente
          se prestan a través de la red nacional de concesionarios autorizados de la marca. Entrega de los vehículos: una vez recibida
          la inicial, el vehículo será entregado formalmente en {V}, ubicado en {data.vendedorDireccion || dash('')}, o uno de sus
          concesionarios aliados. EL COMPRADOR declara haber recibido el Manual de Servicios y Garantía y acepta el condicionado en
          todos sus términos.
          <Text style={s.cl}> DÉCIMA SEXTA:</Text> Declaración de Patrimonio: EL COMPRADOR manifiesta que los fondos utilizados para
          esta operación provienen de actividades lícitas propias de su actividad comercial y no tienen vinculación con operaciones
          de legitimación de capitales ni financiamiento al terrorismo.
          <Text style={s.cl}> DÉCIMA SÉPTIMA:</Text> Honorarios, Trámites y Gestoría: los gastos por seguro, traslados en grúa,
          registro ante el INTT, solicitud de placas, mantenimientos y servicios de garantía, y honorarios de gestoría y/o abogados,
          corren por cuenta exclusiva de EL COMPRADOR.
          <Text style={s.cl}> DÉCIMA OCTAVA:</Text> Confidencialidad: LAS PARTES convienen en mantener como confidencial toda la
          información de los expedientes legales y documentos de los vehículos.
        </Text>

        <Text style={s.p}>
          <Text style={s.cl}>DÉCIMA NOVENA:</Text> Notificaciones. A los efectos de las notificaciones, las partes establecen sus
          domicilios y correos: De EL VENDEDOR: {V}, en la persona de {dash(data.vendedorRepresentante)}. Dirección:{' '}
          {data.vendedorDireccion || dash('')}. Teléfono: {data.vendedorTelefono || dash('')}. Correo: {data.vendedorCorreo || dash('')}.
          De EL COMPRADOR: en la persona de {data.compradorNombre}. Dirección: {data.compradorDireccion || dash('')}.
          Teléfono: {data.compradorTelefono || dash('')}. Correo: {data.compradorCorreo || dash('')}. Conforme a los Artículos 5 y 8
          de la Ley de Ventas con Reserva de Dominio, EL COMPRADOR declara que el vehículo permanecerá en el domicilio aquí descrito y
          se obliga a notificar por escrito cualquier cambio dentro de los diez (10) días a la fecha en que ocurra.
          <Text style={s.cl}> VIGÉSIMA:</Text> Cesión de Crédito y de Reserva de Dominio: EL COMPRADOR queda notificado y entendido,
          sin que se requiera notificación previa, que EL VENDEDOR podrá ceder y traspasar de forma unilateral sus derechos y
          garantías sobre este crédito, incluida la reserva de dominio sobre el VEHÍCULO, conforme al Artículo 1° de la Ley sobre
          Ventas con Reserva de Dominio.
          <Text style={s.cl}> VIGÉSIMA PRIMERA y VIGÉSIMA SEGUNDA:</Text> La falta de pago a su vencimiento de la(s) cuota(s), o el
          incumplimiento de cualquier obligación, acarreará la caducidad del plazo. EL COMPRADOR declara haber contratado póliza de
          seguro de casco, de vida y de responsabilidad civil, obligándose a mantenerlas vigentes hasta el pago total del crédito.
          <Text style={s.cl}> VIGÉSIMA TERCERA:</Text> En todo lo no previsto rige la Ley de Ventas con Reserva de Dominio, el Código
          de Comercio, el Código Civil y demás leyes aplicables. DOMICILIO ESPECIAL: las partes eligen como domicilio único, especial
          y excluyente a la ciudad de {data.domicilioEspecial || data.ciudad}, a cuya jurisdicción declaran someterse.
        </Text>

        <Text style={s.p}>
          Se hacen tres (3) ejemplares de un mismo tenor y a un solo efecto. En la ciudad de {data.ciudad}, a la fecha de su
          autenticación.
        </Text>

        <View style={s.firmaRow}>
          <View style={s.firmaCol}>
            <View style={s.firmaLinea} />
            <Text style={s.firmaTxt}>Por EL VENDEDOR</Text>
            <Text style={s.firmaSub}>{dash(data.vendedorRepresentante)}</Text>
            <Text style={s.firmaSub}>{V}</Text>
          </View>
          <View style={s.firmaCol}>
            <View style={s.firmaLinea} />
            <Text style={s.firmaTxt}>Por EL COMPRADOR — DEUDOR</Text>
            <Text style={s.firmaSub}>{data.compradorNombre}</Text>
            <Text style={s.firmaSub}>C.I. {data.compradorCedula}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
