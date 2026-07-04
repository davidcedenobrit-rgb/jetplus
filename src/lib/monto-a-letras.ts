// Convierte un monto en USD a su representación en palabras en español.
// Ej: 1112.47 -> "MIL CIENTO DOCE DÓLARES AMERICANOS CON CUARENTA Y SIETE CENTAVOS"

const UNIDADES = [
  '', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
  'VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE',
]

const DECENAS = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']

const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

function seccionEnLetras(n: number): string {
  if (n === 0) return ''
  if (n < 30) return UNIDADES[n]
  if (n < 100) {
    const d = Math.floor(n / 10)
    const u = n % 10
    return u === 0 ? DECENAS[d] : `${DECENAS[d]} Y ${UNIDADES[u]}`
  }
  if (n === 100) return 'CIEN'
  const c = Math.floor(n / 100)
  const resto = n % 100
  return resto === 0 ? CENTENAS[c] : `${CENTENAS[c]} ${seccionEnLetras(resto)}`
}

function enterosALetras(n: number): string {
  if (n === 0) return 'CERO'
  if (n < 1000) return seccionEnLetras(n)
  if (n < 1_000_000) {
    const miles = Math.floor(n / 1000)
    const resto = n % 1000
    const parteMiles = miles === 1 ? 'MIL' : `${seccionEnLetras(miles)} MIL`
    return resto === 0 ? parteMiles : `${parteMiles} ${seccionEnLetras(resto)}`
  }
  if (n < 1_000_000_000) {
    const millones = Math.floor(n / 1_000_000)
    const resto = n % 1_000_000
    const parteMillones = millones === 1 ? 'UN MILLÓN' : `${enterosALetras(millones)} MILLONES`
    return resto === 0 ? parteMillones : `${parteMillones} ${enterosALetras(resto)}`
  }
  return String(n)
}

export function montoUsdALetras(monto: number): string {
  const abs = Math.max(0, monto)
  const enteros = Math.floor(abs)
  const centavos = Math.round((abs - enteros) * 100)
  const parteEnteros = enterosALetras(enteros)
  const centavosStr = centavos === 0
    ? 'CON CERO CENTAVOS'
    : `CON ${seccionEnLetras(centavos)} CENTAVO${centavos === 1 ? '' : 'S'}`
  return `${parteEnteros} DÓLARES AMERICANOS ${centavosStr}`
}

const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']

export function mesEnLetras(mes0Indexed: number): string {
  return MESES[Math.max(0, Math.min(11, mes0Indexed))]
}

const DIAS_LETRAS = [
  '', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
  'VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE',
  'TREINTA', 'TREINTA Y UNO',
]

export function diaEnLetras(dia: number): string {
  return DIAS_LETRAS[Math.max(1, Math.min(31, dia))] ?? String(dia)
}
