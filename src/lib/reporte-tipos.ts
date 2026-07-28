// Estructura genérica de un reporte exportable (a Excel y PDF con membrete).
export type ReporteKpi = { label: string; value: string }
export type ReporteSeccion = {
  titulo: string
  headers: string[]
  rows: (string | number)[][]
  // índices de columnas alineadas a la derecha (montos). Por defecto todas menos la primera.
  right?: number[]
}
export type ReportePayload = {
  titulo: string
  subtitulo?: string
  periodo?: string
  kpis?: ReporteKpi[]
  secciones: ReporteSeccion[]
}
