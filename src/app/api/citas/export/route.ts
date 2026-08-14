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
  try { return new Date(s + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return s }
}
const fmtHora = (s: string) => String(s).slice(0, 5)

export async function GET() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const supabase = await createAdminClient()
  const { data: citas } = await supabase
    .from('citas_taller')
    .select('cliente_nombre, cliente_telefono, cliente_correo, vehiculo_marca, vehiculo_modelo, vehiculo_placa, motivo, fecha, hora_inicio, hora_fin, estado')
    .order('fecha', { ascending: true })
    .order('hora_inicio', { ascending: true })

  const wb = new ExcelJS.Workbook()
  wb.creator = BRANDING.empresa
  const ws = wb.addWorksheet('Citas de taller', { views: [{ state: 'frozen', ySplit: 5 }], pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } })
  ws.columns = [{ width: 24 }, { width: 16 }, { width: 24 }, { width: 22 }, { width: 12 }, { width: 24 }, { width: 12 }, { width: 22 }, { width: 12 }]
  const LAST = 'I'
  const hoy = new Date().toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Caracas' })

  ws.mergeCells(`A1:${LAST}1`)
  const h1 = ws.getCell('A1')
  h1.value = BRANDING.nombre
  h1.font = { name: 'Calibri', size: 20, bold: true, color: { argb: BLANCO } }
  h1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  h1.fill = bandFill(ROJO)
  ws.getRow(1).height = 40

  ws.mergeCells(`A2:${LAST}2`)
  const h2 = ws.getCell('A2')
  h2.value = 'CITAS DE TALLER'
  h2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: BLANCO } }
  h2.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  h2.fill = bandFill(NEGRO)
  ws.getRow(2).height = 22

  ws.mergeCells(`A3:${LAST}3`)
  const h3 = ws.getCell('A3')
  h3.value = `Generado el ${hoy}  ·  ${(citas ?? []).length} cita${(citas ?? []).length === 1 ? '' : 's'}`
  h3.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF6B7280' } }
  h3.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(3).height = 16
  ws.getRow(4).height = 6

  const headers = ['Cliente', 'Teléfono', 'Correo', 'Vehículo', 'Placa', 'Motivo', 'Fecha', 'Horario', 'Estado']
  const headRow = ws.getRow(5)
  headers.forEach((t, i) => {
    const c = headRow.getCell(i + 1)
    c.value = t
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: BLANCO } }
    c.fill = bandFill(NEGRO)
    c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true }
    c.border = { bottom: { style: 'thin', color: { argb: ROJO } } }
  })
  headRow.height = 24

  ;(citas ?? []).forEach((c, idx) => {
    const r = ws.addRow([
      c.cliente_nombre, c.cliente_telefono, c.cliente_correo,
      [c.vehiculo_marca, c.vehiculo_modelo].filter(Boolean).join(' ') || '—',
      c.vehiculo_placa || '—', c.motivo || '—',
      fmtFecha(c.fecha), `${fmtHora(c.hora_inicio)} – ${fmtHora(c.hora_fin)}`,
      c.estado === 'cancelada' ? 'Cancelada' : 'Confirmada',
    ])
    r.eachCell({ includeEmpty: true }, cell => {
      cell.font = { name: 'Calibri', size: 10, color: { argb: NEGRO } }
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      cell.border = { bottom: { style: 'hair', color: { argb: GRIS_LINEA } } }
      if (idx % 2 === 1) cell.fill = bandFill(GRIS_CLARO)
    })
    r.height = 20
  })

  if ((citas ?? []).length === 0) {
    const r = ws.addRow(['Aún no hay citas agendadas.'])
    ws.mergeCells(`A${r.number}:${LAST}${r.number}`)
    r.getCell(1).font = { italic: true, color: { argb: 'FF9CA3AF' } }
  }

  const buf = await wb.xlsx.writeBuffer()
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return new NextResponse(buf as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="citas-taller-${stamp}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
