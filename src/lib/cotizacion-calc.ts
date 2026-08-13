// cotizacion-calc.ts
// Motor de cálculo ÚNICO de los montos de una cotización. Crear, editar y
// reactivar deben usar esta función para que el mismo caso siempre dé el mismo
// número (el PDF y los correos leen los montos guardados sin recalcular, así que
// la integridad depende 100% de que la fila se escriba con estos valores).
//
// Reglas (idénticas al alta original):
//   · Contado         → total = precio + IVA(16%) + gastos.
//   · Plan 100% Banco → total vehículo = precio + IVA + placa; inicial 30% + gastos;
//                       financiamiento 70%; cuota por amortización (tasa banco, meses).
//   · Crédito Vehimotors → inicial (40% por defecto) + IVA + gastos; financiamiento
//                       resto; cuota mensual ya calculada (tasa_credito); costo con sus meses.
//   · AC500           → inicial = reserva; costo = total del plan.
// `gastos` entra YA resuelto (base por modalidad + diferencial cambiario si aplica).

export type ModalidadCot = 'contado' | 'credito_24'
// 'banca_nacional' se calcula igual que contado (total a pagar); el banco aprueba
// un % y el cliente cubre el resto (eso se define al pasar a proforma).
export type PlanCot = 'vehimotors' | 'banco_100' | 'ac500' | 'personalizado' | 'banca_nacional'

// Jetplus opera bajo el régimen de Puerto Libre de Margarita: la venta del
// vehículo está exonerada de IVA (no aplica el 16% que sí llevaba La Oriental).
export const IVA_TASA = 0

export interface TotalesInput {
  precioBase: number
  modalidad: ModalidadCot
  plan: PlanCot
  gastos: number                        // gastos TOTAL ya resuelto (base + diferencial)
  placaMonto?: number | null            // banco (default 400)
  tasaBancoPct?: number | null          // banco (default 16)
  mesesBanco?: number | null            // banco (default 24)
  cuotaVehimotors?: number | null       // crédito Vehimotors: cuota mensual ya calculada
  inicialPctVehimotors?: number | null  // fracción 0..1 (default 0.4)
  mesesVehimotors?: number | null       // meses para el costo total (default 24)
  ac500?: { reserva: number; total: number } | null
  // Plan Personalizado (crédito con todo libre; la cuota se calcula por amortización)
  personalizadoInicialPct?: number | null  // fracción 0..1 (default 0.4)
  personalizadoMeses?: number | null       // default 24
  personalizadoTasaPct?: number | null     // % anual (default 0 = sin interés)
}

export interface TotalesResult {
  iva: number
  gastos: number
  totalVehiculoBanco: number | null
  totalInicial: number
  financiamientoMonto: number | null
  cuotaMensual: number | null
  costoTotal: number
  mesesBanco: number | null
}

/** Cuota mensual por amortización francesa. Si la tasa es 0, reparte parejo. */
export function cuotaAmortizada(capital: number, tasaAnualPct: number, meses: number): number {
  const n = Math.max(1, Math.round(Number(meses) || 1))
  const r = (Number(tasaAnualPct) || 0) / 100 / 12
  if (r <= 0) return capital / n
  return (capital * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

export function calcularTotalesCotizacion(inp: TotalesInput): TotalesResult {
  const precioBase = Number(inp.precioBase) || 0
  const iva = precioBase * IVA_TASA
  const gastos = Number(inp.gastos) || 0

  // AC500: los montos salen del plan, no del precio/gastos.
  if (inp.plan === 'ac500' && inp.ac500) {
    const totalInicial = Number(inp.ac500.reserva) || 0
    const costoTotal = Number(inp.ac500.total) || 0
    return {
      iva, gastos,
      totalVehiculoBanco: null,
      totalInicial,
      financiamientoMonto: costoTotal - totalInicial,
      cuotaMensual: null,
      costoTotal,
      mesesBanco: null,
    }
  }

  if (inp.modalidad === 'contado') {
    const totalInicial = precioBase + iva + gastos
    return {
      iva, gastos,
      totalVehiculoBanco: null,
      totalInicial,
      financiamientoMonto: null,
      cuotaMensual: null,
      costoTotal: totalInicial,
      mesesBanco: null,
    }
  }

  if (inp.plan === 'banco_100') {
    const placaMonto = Number(inp.placaMonto) || 400
    const mesesBanco = Math.max(1, Math.round(Number(inp.mesesBanco) || 24))
    const totalVehiculoBanco = precioBase + iva + placaMonto
    const financiamiento = totalVehiculoBanco * 0.70
    const totalInicial = totalVehiculoBanco * 0.30 + gastos
    const cuotaMensual = cuotaAmortizada(financiamiento, Number(inp.tasaBancoPct) || 16, mesesBanco)
    return {
      iva, gastos,
      totalVehiculoBanco,
      totalInicial,
      financiamientoMonto: financiamiento,
      cuotaMensual,
      costoTotal: totalInicial + cuotaMensual * mesesBanco,
      mesesBanco,
    }
  }

  // Plan Personalizado: crédito con inicial, meses y tasa libres.
  // La cuota se calcula por amortización (a diferencia de Vehimotors que trae
  // la cuota ya fijada). El diferencial, si aplica, ya viene dentro de `gastos`.
  if (inp.plan === 'personalizado') {
    const iniPct = inp.personalizadoInicialPct != null ? Number(inp.personalizadoInicialPct) : 0.4
    const meses = Math.max(1, Math.round(Number(inp.personalizadoMeses) || 24))
    const totalInicial = precioBase * iniPct + iva + gastos
    const financiamiento = precioBase * (1 - iniPct)
    const cuotaMensual = cuotaAmortizada(financiamiento, Number(inp.personalizadoTasaPct) || 0, meses)
    return {
      iva, gastos,
      totalVehiculoBanco: null,
      totalInicial,
      financiamientoMonto: financiamiento,
      cuotaMensual,
      costoTotal: totalInicial + cuotaMensual * meses,
      mesesBanco: meses,
    }
  }

  // Crédito Vehimotors
  const iniPct = inp.inicialPctVehimotors != null ? Number(inp.inicialPctVehimotors) : 0.4
  const mesesVhm = Math.max(1, Math.round(Number(inp.mesesVehimotors) || 24))
  const totalInicial = precioBase * iniPct + iva + gastos
  const financiamiento = precioBase * (1 - iniPct)
  const cuotaMensual = Number(inp.cuotaVehimotors) || 0
  return {
    iva, gastos,
    totalVehiculoBanco: null,
    totalInicial,
    financiamientoMonto: financiamiento,
    cuotaMensual,
    costoTotal: totalInicial + cuotaMensual * mesesVhm,
    mesesBanco: null,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Modelo real de Jetplus Margarita (confirmado contra 3 presupuestos reales,
// agosto 2026): descuento discrecional + IGTF 3% (Puerto Libre no exonera el
// IGTF, solo el IVA) + inicial % (100% = contado puro) + comisión de la
// financiadora sobre la inicial (0 si es contado) + cargos seleccionables.
//   Total Inicial a Pagar = inicial_vehiculo + IGTF + comisión_flat + cargos
// El IGTF se calcula SIEMPRE sobre el precio del vehículo ya con descuento,
// sin importar el % de inicial (así sale en las 3 proformas reales).
// La cuota mensual (si hay financiamiento) la fija la financiadora externa;
// aquí no se recalcula por amortización.

export const IGTF_TASA = 3

export interface PresupuestoInput {
  precioLista: number
  descuentoPct?: number | null       // 0-100, a discreción del dueño
  descuentoMonto?: number | null     // alternativa en USD; si se manda (>0) tiene prioridad sobre descuentoPct
  inicialPct: number                  // 0-100; 100 = contado puro
  financiadoraTasaPct?: number | null // % de comisión de la financiadora sobre la inicial (0 si contado)
  cargoGastosAdmin: boolean
  cargoPlaca: boolean
  gastosAdminMonto?: number | null    // default 500
  placaMonto?: number | null          // default 390
}

export interface PresupuestoResult {
  precioLista: number
  descuentoPct: number
  descuentoMonto: number
  precioVehiculo: number    // precio de lista − descuento
  igtf: number               // 3% de precioVehiculo
  inicialPct: number
  inicialVehiculo: number
  saldoFinanciar: number
  esContado: boolean
  comisionFlat: number
  cargos: number
  totalInicialAPagar: number
}

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100
}

export function calcularPresupuestoJetplus(inp: PresupuestoInput): PresupuestoResult {
  const precioLista = Number(inp.precioLista) || 0
  const descuentoMontoInput = Math.max(0, Number(inp.descuentoMonto) || 0)
  let descuentoPct: number
  let descuentoMonto: number
  if (descuentoMontoInput > 0) {
    descuentoMonto = round2(Math.min(descuentoMontoInput, precioLista))
    descuentoPct = precioLista > 0 ? round2(descuentoMonto / precioLista * 100) : 0
  } else {
    descuentoPct = Math.min(100, Math.max(0, Number(inp.descuentoPct) || 0))
    descuentoMonto = round2(precioLista * descuentoPct / 100)
  }
  const precioVehiculo = round2(precioLista - descuentoMonto)
  const igtf = round2(precioVehiculo * IGTF_TASA / 100)
  const inicialPct = Math.min(100, Math.max(0, Number(inp.inicialPct)))
  const esContado = inicialPct >= 100
  const inicialVehiculo = round2(precioVehiculo * inicialPct / 100)
  const saldoFinanciar = round2(precioVehiculo - inicialVehiculo)
  const comisionFlat = esContado ? 0 : round2(inicialVehiculo * (Number(inp.financiadoraTasaPct) || 0) / 100)
  const gastosAdminMonto = Number(inp.gastosAdminMonto) || 500
  const placaMonto = Number(inp.placaMonto) || 390
  const cargos = (inp.cargoGastosAdmin ? gastosAdminMonto : 0) + (inp.cargoPlaca ? placaMonto : 0)
  const totalInicialAPagar = round2(inicialVehiculo + igtf + comisionFlat + cargos)
  return {
    precioLista, descuentoPct, descuentoMonto, precioVehiculo, igtf,
    inicialPct, inicialVehiculo, saldoFinanciar, esContado, comisionFlat, cargos, totalInicialAPagar,
  }
}
