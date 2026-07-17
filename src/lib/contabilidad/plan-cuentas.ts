// Lógica de simulación del plan de cuentas. Trabaja 100% en memoria sobre la
// semilla (src/data/plan_cuentas_seed.json), sin tocar la base de datos: es el
// "modo simulación" del importador. La escritura real vive en actions.ts y solo
// se ejecuta tras aprobación contable.
import seedData from '@/data/plan_cuentas_seed.json'

export type CuentaSeed = {
  codigo: string
  codigo_original: string | null
  nombre: string
  clase: string
  nivel: number
  padre: string | null
  naturaleza: 'debe' | 'haber'
  naturaleza_propuesta: 'debe' | 'haber'
  tipo: 'titulo' | 'movimiento'
  acepta_movimientos: boolean
  estado_financiero: string
  requiere_centro_costo: boolean
  requiere_tercero: boolean
  requiere_vehiculo: boolean
  requiere_doc_fiscal: boolean
  origen: 'importado' | 'propuesta' | 'manual'
  estado: string
  observacion: string
}

export type CatalogoSeed = {
  version: string
  fuente: string
  total_importadas: number
  total_propuestas: number
  cuentas: CuentaSeed[]
}

export const CATALOGO = seedData as CatalogoSeed

export type Advertencia = {
  codigo: string
  nombre: string
  tipo: 'huerfana' | 'naturaleza' | 'normalizado' | 'duplicado'
  detalle: string
}

export type Simulacion = {
  version: string
  fuente: string
  total: number
  importadas: number
  propuestas: number
  titulos: number
  movimiento: number
  naturalezaDebe: number
  naturalezaHaber: number
  porClase: { clase: string; nombre: string; n: number }[]
  advertencias: Advertencia[]
}

const CLASES: Record<string, string> = {
  '1': 'Activo', '2': 'Pasivo', '3': 'Patrimonio', '4': 'Ingresos',
  '5': 'Costos', '6': 'Gastos', '7': 'Ingresos (clase 7)', '8': 'Otros gastos', '9': 'Cuentas de orden',
}

export function nombreClase(clase: string): string {
  return CLASES[clase] ?? `Clase ${clase}`
}

export function simularImportacion(cat: CatalogoSeed = CATALOGO): Simulacion {
  const cuentas = cat.cuentas
  const codes = new Set(cuentas.map(c => c.codigo))
  const advertencias: Advertencia[] = []

  for (const c of cuentas) {
    if (c.padre && !codes.has(c.padre)) {
      advertencias.push({ codigo: c.codigo, nombre: c.nombre, tipo: 'huerfana', detalle: `Su cuenta padre "${c.padre}" no está en el catálogo` })
    }
    if (c.naturaleza !== c.naturaleza_propuesta) {
      advertencias.push({ codigo: c.codigo, nombre: c.nombre, tipo: 'naturaleza', detalle: `Naturaleza ${c.naturaleza.toUpperCase()} vs. esperada ${c.naturaleza_propuesta.toUpperCase()} (confirmar si es contra-cuenta)` })
    }
    if (c.codigo_original) {
      advertencias.push({ codigo: c.codigo, nombre: c.nombre, tipo: 'normalizado', detalle: `El código venía como número (${c.codigo_original}); se guarda como texto` })
    }
  }

  const porNombre: Record<string, string[]> = {}
  for (const c of cuentas) {
    const k = c.nombre.trim().toUpperCase()
    if (!k) continue
    ;(porNombre[k] ??= []).push(c.codigo)
  }
  for (const [nombre, cods] of Object.entries(porNombre)) {
    if (cods.length > 1) {
      advertencias.push({ codigo: cods.join(', '), nombre, tipo: 'duplicado', detalle: `Nombre repetido en ${cods.length} cuentas (revisar si es fusión o jerarquía)` })
    }
  }

  const clasesCount: Record<string, number> = {}
  for (const c of cuentas) clasesCount[c.clase] = (clasesCount[c.clase] ?? 0) + 1
  const porClase = Object.entries(clasesCount)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([clase, n]) => ({ clase, nombre: nombreClase(clase), n }))

  return {
    version: cat.version,
    fuente: cat.fuente,
    total: cuentas.length,
    importadas: cuentas.filter(c => c.origen === 'importado').length,
    propuestas: cuentas.filter(c => c.origen === 'propuesta').length,
    titulos: cuentas.filter(c => c.tipo === 'titulo').length,
    movimiento: cuentas.filter(c => c.tipo === 'movimiento').length,
    naturalezaDebe: cuentas.filter(c => c.naturaleza === 'debe').length,
    naturalezaHaber: cuentas.filter(c => c.naturaleza === 'haber').length,
    porClase,
    advertencias,
  }
}
