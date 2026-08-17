export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { BRANDING } from '@/lib/branding'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

const ROJO = 'FFC41E3A'
const NEGRO = 'FF111827'
const GRIS_CLARO = 'FFF6F7F9'
const GRIS_LINEA = 'FFE5E7EB'
const BLANCO = 'FFFFFFFF'
const bandFill = (color: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: color } })

const fmtFecha = (s: string) => {
  try { return new Date(s).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Caracas' }) }
  catch { return s }
}

function encabezado(ws: ExcelJS.Worksheet, last: string, titulo: string, subtitulo: string) {
  ws.mergeCells(`A1:${last}1`)
  const h1 = ws.getCell('A1')
  h1.value = BRANDING.nombre
  h1.font = { name: 'Calibri', size: 20, bold: true, color: { argb: BLANCO } }
  h1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  h1.fill = bandFill(ROJO)
  ws.getRow(1).height = 40

  ws.mergeCells(`A2:${last}2`)
  const h2 = ws.getCell('A2')
  h2.value = titulo
  h2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: BLANCO } }
  h2.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  h2.fill = bandFill(NEGRO)
  ws.getRow(2).height = 22

  ws.mergeCells(`A3:${last}3`)
  const h3 = ws.getCell('A3')
  h3.value = subtitulo
  h3.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF6B7280' } }
  h3.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(3).height = 16
  ws.getRow(4).height = 6
}

function filaEncabezadoTabla(ws: ExcelJS.Worksheet, headers: string[]) {
  const row = ws.getRow(5)
  headers.forEach((t, i) => {
    const c = row.getCell(i + 1)
    c.value = t
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: BLANCO } }
    c.fill = bandFill(NEGRO)
    c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true }
    c.border = { bottom: { style: 'thin', color: { argb: ROJO } } }
  })
  row.height = 24
}

export async function GET() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const supabase = await createAdminClient()
  const [{ data: aliados }, { data: leads }] = await Promise.all([
    supabase.from('aliados').select('nombre, codigo, sector, activo, created_at').order('created_at'),
    supabase.from('aliados_leads').select('aliado_nombre, aliado_codigo, cliente_nombre, cliente_telefono, vehiculo_interes, tiene_inicial, inicial_monto, origen_captacion, created_at').order('created_at', { ascending: false }),
  ])

  const wb = new ExcelJS.Workbook()
  wb.creator = BRANDING.empresa
  const hoy = new Date().toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Caracas' })

  // ── Hoja 1: Aliados ──────────────────────────────────────────────
  const wsA = wb.addWorksheet('Aliados', { views: [{ state: 'frozen', ySplit: 5 }], pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } })
  wsA.columns = [{ width: 28 }, { width: 14 }, { width: 16 }, { width: 12 }, { width: 18 }]
  encabezado(wsA, 'E', 'ALIADOS', `Generado el ${hoy}  ·  ${(aliados ?? []).length} aliado${(aliados ?? []).length === 1 ? '' : 's'}`)
  filaEncabezadoTabla(wsA, ['Nombre', 'Código', 'Sector', 'Estado', 'Fecha de alta'])
  ;(aliados ?? []).forEach((a, idx) => {
    const r = wsA.addRow([a.nombre, a.codigo, a.sector === 'inmobiliario' ? 'Inmobiliario' : 'Seguros', a.activo ? 'Activo' : 'Inactivo', fmtFecha(a.created_at)])
    r.eachCell({ includeEmpty: true }, cell => {
      cell.font = { name: 'Calibri', size: 10, color: { argb: NEGRO } }
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      cell.border = { bottom: { style: 'hair', color: { argb: GRIS_LINEA } } }
      if (idx % 2 === 1) cell.fill = bandFill(GRIS_CLARO)
    })
    r.height = 20
  })

  // ── Hoja 2: Bitácora (clientes referidos) ─────────────────────────
  const wsB = wb.addWorksheet('Bitácora', { views: [{ state: 'frozen', ySplit: 5 }], pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } })
  wsB.columns = [{ width: 22 }, { width: 24 }, { width: 16 }, { width: 24 }, { width: 14 }, { width: 20 }, { width: 18 }]
  encabezado(wsB, 'G', 'BITÁCORA DE ALIADOS', `Generado el ${hoy}  ·  ${(leads ?? []).length} cliente${(leads ?? []).length === 1 ? '' : 's'} referido${(leads ?? []).length === 1 ? '' : 's'}`)
  filaEncabezadoTabla(wsB, ['Aliado', 'Cliente', 'Teléfono', 'Vehículo de interés', 'Inicial', 'Dónde se captó', 'Fecha'])
  ;(leads ?? []).forEach((l, idx) => {
    const r = wsB.addRow([
      `${l.aliado_nombre} (${l.aliado_codigo})`,
      l.cliente_nombre,
      l.cliente_telefono,
      l.vehiculo_interes || '—',
      l.tiene_inicial ? (l.inicial_monto ? `$${l.inicial_monto}` : 'Sí') : 'No',
      l.origen_captacion || '—',
      fmtFecha(l.created_at),
    ])
    r.eachCell({ includeEmpty: true }, cell => {
      cell.font = { name: 'Calibri', size: 10, color: { argb: NEGRO } }
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      cell.border = { bottom: { style: 'hair', color: { argb: GRIS_LINEA } } }
      if (idx % 2 === 1) cell.fill = bandFill(GRIS_CLARO)
    })
    r.height = 20
  })

  const buf = await wb.xlsx.writeBuffer()
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return new NextResponse(buf as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="aliados-${stamp}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
