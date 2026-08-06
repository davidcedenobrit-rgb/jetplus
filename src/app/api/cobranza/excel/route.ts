export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'
import { BRANDING } from '@/lib/branding'

const ROJO = 'FFC41E3A'
const NEGRO = 'FF111827'
const GRIS_CLARO = 'FFF6F7F9'
const GRIS_LINEA = 'FFE5E7EB'
const BLANCO = 'FFFFFFFF'
const VERDE = 'FF15803D'

type Fila = { cliente: string; cedula: string; placa: string; planLbl: string; total: number; cobrado: number; porCobrar: number; vencido: number; cuotasPend: number; pct: number }

export async function POST(req: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const filas: Fila[] = Array.isArray(body?.filas) ? body.filas : []
  const tot = body?.tot ?? { total: 0, cobrado: 0, porCobrar: 0, vencido: 0 }
  const split = body?.split ?? { orientalPC: 0, vehPC: 0, orientalV: 0, vehV: 0 }
  const subtitulo = String(body?.subtitulo ?? '')

  const marca = (BRANDING.nombre + (BRANDING.sub ? ' ' + BRANDING.sub : '')).trim().toUpperCase()
  const wb = new ExcelJS.Workbook()
  wb.creator = BRANDING.empresa
  const ws = wb.addWorksheet('Cartera de cobranza', {
    views: [{ state: 'frozen', ySplit: 8 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  ws.columns = [
    { width: 30 }, { width: 16 }, { width: 12 }, { width: 16 },
    { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 11 }, { width: 12 },
  ]
  const LAST = 'J'
  const band = (color: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: color } })
  const money = '"$"#,##0.00'

  // Cabecera de marca
  ws.mergeCells(`A1:${LAST}1`)
  const h1 = ws.getCell('A1'); h1.value = marca
  h1.font = { name: 'Calibri', size: 20, bold: true, color: { argb: BLANCO } }
  h1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }; h1.fill = band(ROJO); ws.getRow(1).height = 40

  ws.mergeCells(`A2:${LAST}2`)
  const h2 = ws.getCell('A2'); h2.value = 'CARTERA DE COBRANZA' + (subtitulo ? `  ·  ${subtitulo}` : '')
  h2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: BLANCO } }
  h2.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }; h2.fill = band(NEGRO); ws.getRow(2).height = 22

  ws.mergeCells(`A3:${LAST}3`)
  const hoy = new Date().toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Caracas' })
  const h3 = ws.getCell('A3'); h3.value = `Generado el ${hoy}  ·  ${filas.length} crédito${filas.length === 1 ? '' : 's'}`
  h3.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF6B7280' } }
  h3.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }; ws.getRow(3).height = 16

  // Resumen (KPIs)
  const kpi = ws.getRow(4)
  const kpiPairs: [string, string][] = [
    ['Cartera (financiado)', `$${tot.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ['Cobrado', `$${tot.cobrado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ['Por cobrar · LO / VM', `$${split.orientalPC.toLocaleString('en-US', { minimumFractionDigits: 2 })} / $${split.vehPC.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
    ['Vencido · LO / VM', `$${split.orientalV.toLocaleString('en-US', { minimumFractionDigits: 2 })} / $${split.vehV.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
  ]
  ws.mergeCells('A4:B4'); ws.mergeCells('C4:D4'); ws.mergeCells('E4:G4'); ws.mergeCells('H4:J4')
  kpiPairs.forEach(([lbl, val], i) => {
    const cell = kpi.getCell(i === 0 ? 1 : i === 1 ? 3 : i === 2 ? 5 : 8)
    cell.value = `${lbl}:  ${val}`
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: i === 3 ? ROJO : NEGRO } }
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    cell.fill = band(GRIS_CLARO)
  })
  kpi.height = 22
  ws.getRow(5).height = 6

  // Encabezado de tabla (fila 6)
  const headers = ['Cliente', 'Cédula/RIF', 'Placa', 'Plan', 'Financiado', 'Cobrado', 'Por cobrar', 'Vencido', '% Avance', 'Cuotas pend.']
  const headRow = ws.getRow(6)
  headers.forEach((t, i) => {
    const c = headRow.getCell(i + 1)
    c.value = t
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: BLANCO } }
    c.fill = band(NEGRO)
    c.alignment = { vertical: 'middle', horizontal: i >= 4 && i <= 7 ? 'right' : i === 8 || i === 9 ? 'center' : 'left', indent: 1 }
    c.border = { bottom: { style: 'thin', color: { argb: ROJO } } }
  })
  headRow.height = 22

  // Filas
  filas.forEach((f, idx) => {
    const r = ws.addRow([f.cliente, f.cedula || '—', f.placa || '—', f.planLbl, f.total, f.cobrado, f.porCobrar, f.vencido, f.pct / 100, f.cuotasPend])
    r.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = { name: 'Calibri', size: 10, color: { argb: col === 8 && f.vencido > 0 ? ROJO : col === 6 ? VERDE : NEGRO } }
      cell.alignment = { vertical: 'middle', horizontal: col >= 5 && col <= 8 ? 'right' : col === 9 || col === 10 ? 'center' : 'left', indent: 1 }
      cell.border = { bottom: { style: 'hair', color: { argb: GRIS_LINEA } } }
      if (col >= 5 && col <= 8) cell.numFmt = money
      if (col === 9) cell.numFmt = '0%'
      if (idx % 2 === 1) cell.fill = band(GRIS_CLARO)
    })
    r.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: NEGRO } }
    r.height = 18
  })

  // Totales
  const tr = ws.addRow(['TOTALES', '', '', '', tot.total, tot.cobrado, tot.porCobrar, tot.vencido, '', ''])
  ws.mergeCells(`A${tr.number}:D${tr.number}`)
  tr.eachCell({ includeEmpty: true }, (cell, col) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: col === 8 ? ROJO : NEGRO } }
    cell.fill = band('FFFEF3C7')
    cell.alignment = { vertical: 'middle', horizontal: col >= 5 && col <= 8 ? 'right' : 'left', indent: 1 }
    if (col >= 5 && col <= 8) cell.numFmt = money
    cell.border = { top: { style: 'thin', color: { argb: ROJO } } }
  })
  tr.height = 20

  const buffer = await wb.xlsx.writeBuffer()
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="cartera-cobranza.xlsx"`,
    },
  })
}
