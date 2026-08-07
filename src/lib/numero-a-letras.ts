// Convierte números a letras en español (para letras de cambio / giros y contratos).

const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve']
const ESPECIALES: Record<number, string> = {
  10: 'diez', 11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince',
  16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve',
  20: 'veinte', 21: 'veintiuno', 22: 'veintidós', 23: 'veintitrés', 24: 'veinticuatro',
  25: 'veinticinco', 26: 'veintiséis', 27: 'veintisiete', 28: 'veintiocho', 29: 'veintinueve',
}
const DECENAS = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos']

function decenasALetras(n: number): string {
  if (n < 10) return UNIDADES[n]
  if (ESPECIALES[n]) return ESPECIALES[n]
  const d = Math.floor(n / 10)
  const u = n % 10
  return u === 0 ? DECENAS[d] : `${DECENAS[d]} y ${UNIDADES[u]}`
}

function centenasALetras(n: number): string {
  if (n === 0) return ''
  if (n === 100) return 'cien'
  const c = Math.floor(n / 100)
  const resto = n % 100
  const pref = CENTENAS[c]
  const suf = resto ? ` ${decenasALetras(resto)}` : ''
  return `${pref}${suf}`.trim()
}

// Enteros 0 .. 999.999.999
export function numeroALetras(num: number): string {
  const n = Math.floor(Math.abs(num))
  if (n === 0) return 'cero'

  const millones = Math.floor(n / 1_000_000)
  const miles = Math.floor((n % 1_000_000) / 1000)
  const resto = n % 1000

  const partes: string[] = []

  if (millones > 0) {
    partes.push(millones === 1 ? 'un millón' : `${grupoMiles(millones)} millones`)
  }
  if (miles > 0) {
    partes.push(miles === 1 ? 'mil' : `${grupoMiles(miles)} mil`)
  }
  if (resto > 0) {
    partes.push(centenasALetras(resto))
  }
  return partes.join(' ').replace(/\s+/g, ' ').trim()
}

// "un/veintiún/..." se ajustan cuando preceden a "mil"/"millones".
function grupoMiles(n: number): string {
  let t = numeroALetras(n)
  // "veintiuno mil" → "veintiún mil"; "uno mil" no aplica (usamos "mil").
  t = t.replace(/veintiuno$/, 'veintiún').replace(/\buno$/, 'un')
  return t
}

// Capitaliza cada palabra (formato usado en las letras de cambio).
function capitalizarPalabras(s: string): string {
  return s.split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' ')
}

// Monto en USD como en las letras de cambio: "Setecientos Veintinueve con 30/100 cts. USD $"
export function montoUsdEnLetras(monto: number): string {
  const entero = Math.floor(Math.abs(monto))
  const centavos = Math.round((Math.abs(monto) - entero) * 100)
  const letras = capitalizarPalabras(numeroALetras(entero))
  const cc = String(centavos).padStart(2, '0')
  return `${letras} con ${cc}/100 cts. USD $`
}

// Monto en bolívares en mayúsculas (para el contravalor del contrato):
// "DIEZ MILLONES ... BOLÍVARES CON NOVENTA Y OCHO CÉNTIMOS (Bs. 10.426.885,98)"
export function montoBsEnLetras(monto: number): string {
  const entero = Math.floor(Math.abs(monto))
  const centimos = Math.round((Math.abs(monto) - entero) * 100)
  const letras = numeroALetras(entero).toUpperCase()
  const cent = centimos > 0 ? ` CON ${numeroALetras(centimos).toUpperCase()} CÉNTIMOS` : ''
  return `${letras} BOLÍVARES${cent}`
}
