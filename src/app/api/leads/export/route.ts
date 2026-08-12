export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { BRANDING } from '@/lib/branding'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem', 'carla']

// Colores del concesionario: rojo + negro (Ki Auto / Jetplus).
const ROJO = 'FFC41E3A'
const NEGRO = 'FF111827'
const GRIS_CLARO = 'FFF6F7F9'
const GRIS_LINEA = 'FFE5E7EB'
const BLANCO = 'FFFFFFFF'

const fmtFecha = (s: string) => {
  try {
    return new Date(s).toLocaleString('es-VE', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Caracas',
    })
  } catch { return s }
}

// Guía de valor agregado: cómo rebatir las objeciones más comunes en la
// llamada de seguimiento a los leads del evento.
const OBJECIONES: { o: string; r: string }[] = [
  { o: 'Está muy caro / no me alcanza',
    r: 'Enfócate en la cuota mensual, no en el precio total. Presenta el plan Asegúrate con $500 y las opciones de financiamiento; recuerda el alto valor de reventa de MG y MAXUS.' },
  { o: 'Lo voy a pensar',
    r: '“Claro, ¿qué es lo que más te gustaría evaluar?” Identifica la duda real. Ofrece una prueba de manejo sin compromiso y recuerda que los precios y unidades del evento son por tiempo limitado.' },
  { o: 'Estoy comparando con otras marcas',
    r: 'Resalta los diferenciales: garantía oficial, tecnología y equipamiento superior por el precio, y respaldo de postventa Vehimotors en el oriente del país.' },
  { o: 'No tengo el inicial completo',
    r: 'Con Asegúrate con $500 apartas tu unidad hoy; hay planes para ir completando el inicial. Agenda una cita para armar el plan a su medida.' },
  { o: 'Quiero esperar a que baje el dólar / el precio',
    r: 'Las tasas y precios del evento son preferenciales y no están garantizados a futuro. Apartar ahora con $500 te congela la oportunidad.' },
  { o: 'Tengo que consultarlo con mi pareja / familia',
    r: 'Propón una llamada o visita con ambos y envíales la ficha del vehículo y la proforma para que decidan juntos, con toda la información en la mano.' },
  { o: 'No conozco el servicio postventa',
    r: 'Contamos con taller propio y repuestos originales (Vehimotors): el vehículo siempre tendrá respaldo y garantía oficial.' },
  { o: 'Solo estaba mirando en el evento',
    r: 'Sin compromiso: te envío el catálogo y agendamos una prueba de manejo cuando gustes. Mantengamos el contacto para cuando estés listo.' },
]

const BUENAS_PRACTICAS = [
  'Llama dentro de las primeras 24–48 h: el cliente todavía recuerda el evento.',
  'Preséntate y menciona el evento de golf de Puerto Ordaz: “lo vi interesado en el ___”.',
  'Escucha primero: pregunta para qué usará el vehículo y en cuánto tiempo piensa comprar.',
  'Ofrece SIEMPRE una prueba de manejo y una proforma personalizada.',
  'Cierra con un próximo paso concreto (visita, cita o envío de proforma) y agéndalo.',
  'Anota el resultado de cada llamada en las columnas de la derecha.',
]

export async function GET(req: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const eventoFiltro = new URL(req.url).searchParams.get('evento')?.trim() || ''

  const supabase = await createAdminClient()
  let query = supabase
    .from('leads_captacion')
    .select('nombre, telefono, marca, modelo, presupuesto, vendedor, evento, atendido, created_at')
    .order('created_at', { ascending: false })
    .limit(2000)
  if (eventoFiltro) query = query.eq('evento', eventoFiltro)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const leads = data ?? []

  const marca = (BRANDING.nombre + (BRANDING.sub ? ' ' + BRANDING.sub : '')).trim().toUpperCase()

  const wb = new ExcelJS.Workbook()
  wb.creator = BRANDING.empresa
  const ws = wb.addWorksheet('Clientes captados', {
    views: [{ state: 'frozen', ySplit: 5 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  // Columnas (10: A..J)
  ws.columns = [
    { width: 17 }, // A Fecha
    { width: 24 }, // B Cliente
    { width: 16 }, // C Teléfono
    { width: 28 }, // D Interés
    { width: 14 }, // E Presupuesto
    { width: 16 }, // F Vendedor
    { width: 14 }, // G Evento
    { width: 10 }, // H Atendido
    { width: 30 }, // I Resultado de la llamada
    { width: 24 }, // J Próximo paso
  ]
  const LAST = 'J'

  const bandFill = (color: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: color } })

  // ── Cabecera de marca ──────────────────────────────────────────────
  ws.mergeCells(`A1:${LAST}1`)
  const h1 = ws.getCell('A1')
  h1.value = marca
  h1.font = { name: 'Calibri', size: 20, bold: true, color: { argb: BLANCO } }
  h1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  h1.fill = bandFill(ROJO)
  ws.getRow(1).height = 40

  ws.mergeCells(`A2:${LAST}2`)
  const h2 = ws.getCell('A2')
  h2.value = 'CLIENTES CAPTADOS' + (eventoFiltro ? `  ·  ${eventoFiltro}` : '  ·  Todos los eventos')
  h2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: BLANCO } }
  h2.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  h2.fill = bandFill(NEGRO)
  ws.getRow(2).height = 22

  ws.mergeCells(`A3:${LAST}3`)
  const h3 = ws.getCell('A3')
  const hoy = new Date().toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Caracas' })
  h3.value = `Generado el ${hoy}  ·  ${leads.length} cliente${leads.length === 1 ? '' : 's'}`
  h3.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF6B7280' } }
  h3.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(3).height = 16

  ws.getRow(4).height = 6 // espaciador

  // ── Encabezado de tabla (fila 5) ───────────────────────────────────
  const headers = ['Fecha', 'Cliente', 'Teléfono', 'Interés', 'Presupuesto', 'Vendedor', 'Evento', 'Atendido', 'Resultado de la llamada', 'Próximo paso']
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

  // ── Filas de datos ─────────────────────────────────────────────────
  leads.forEach((l: Record<string, unknown>, idx: number) => {
    const interes = [l.marca, l.modelo].filter(Boolean).join(' ') || '—'
    const r = ws.addRow([
      fmtFecha(String(l.created_at ?? '')),
      l.nombre ?? '—',
      l.telefono ?? '—',
      interes,
      l.presupuesto || '—',
      l.vendedor || '—',
      l.evento || '—',
      l.atendido ? 'Sí' : 'No',
      '', // Resultado de la llamada (a completar por el vendedor)
      '', // Próximo paso
    ])
    r.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = { name: 'Calibri', size: 10, color: { argb: NEGRO } }
      cell.alignment = { vertical: 'middle', horizontal: col === 2 ? 'left' : 'left', indent: 1, wrapText: col >= 9 }
      cell.border = { bottom: { style: 'hair', color: { argb: GRIS_LINEA } } }
      if (idx % 2 === 1) cell.fill = bandFill(GRIS_CLARO)
    })
    r.getCell(2).font = { name: 'Calibri', size: 10, bold: true, color: { argb: NEGRO } }
    r.height = 20
  })

  if (leads.length === 0) {
    const r = ws.addRow(['Aún no hay clientes captados desde el link de ventas.'])
    ws.mergeCells(`A${r.number}:${LAST}${r.number}`)
    r.getCell(1).font = { italic: true, color: { argb: 'FF9CA3AF' } }
    r.getCell(1).alignment = { horizontal: 'center' }
  }

  // ── Guía para rebatir objeciones ───────────────────────────────────
  ws.addRow([]); ws.addRow([])
  const tituloRow = ws.addRow(['GUÍA PARA REBATIR OBJECIONES · LLAMADA DE SEGUIMIENTO'])
  ws.mergeCells(`A${tituloRow.number}:${LAST}${tituloRow.number}`)
  const tg = tituloRow.getCell(1)
  tg.font = { name: 'Calibri', size: 13, bold: true, color: { argb: BLANCO } }
  tg.fill = bandFill(ROJO)
  tg.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  tituloRow.height = 26

  // Buenas prácticas de la llamada
  const bpTitle = ws.addRow(['Antes de llamar — buenas prácticas'])
  ws.mergeCells(`A${bpTitle.number}:${LAST}${bpTitle.number}`)
  bpTitle.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: NEGRO } }
  bpTitle.getCell(1).fill = bandFill(GRIS_CLARO)
  bpTitle.getCell(1).alignment = { indent: 1, vertical: 'middle' }
  BUENAS_PRACTICAS.forEach(tip => {
    const r = ws.addRow([`•  ${tip}`])
    ws.mergeCells(`A${r.number}:${LAST}${r.number}`)
    r.getCell(1).font = { name: 'Calibri', size: 10, color: { argb: NEGRO } }
    r.getCell(1).alignment = { indent: 2, vertical: 'middle', wrapText: true }
    r.height = 18
  })

  ws.addRow([])

  // Tabla de objeciones (2 columnas: A:C objeción · D:J respuesta)
  const objHead = ws.addRow(['Si el cliente dice…', '', '', 'Cómo rebatirlo'])
  ws.mergeCells(`A${objHead.number}:C${objHead.number}`)
  ws.mergeCells(`D${objHead.number}:${LAST}${objHead.number}`)
  ;[objHead.getCell(1), objHead.getCell(4)].forEach(c => {
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: BLANCO } }
    c.fill = bandFill(NEGRO)
    c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  })
  objHead.height = 22

  OBJECIONES.forEach((item, idx) => {
    const r = ws.addRow([item.o, '', '', item.r])
    ws.mergeCells(`A${r.number}:C${r.number}`)
    ws.mergeCells(`D${r.number}:${LAST}${r.number}`)
    const izq = r.getCell(1)
    const der = r.getCell(4)
    izq.font = { name: 'Calibri', size: 10, bold: true, color: { argb: ROJO } }
    izq.alignment = { vertical: 'top', horizontal: 'left', indent: 1, wrapText: true }
    der.font = { name: 'Calibri', size: 10, color: { argb: NEGRO } }
    der.alignment = { vertical: 'top', horizontal: 'left', indent: 1, wrapText: true }
    const fill = idx % 2 === 1 ? bandFill(GRIS_CLARO) : bandFill(BLANCO)
    izq.fill = fill; der.fill = fill
    izq.border = der.border = { bottom: { style: 'hair', color: { argb: GRIS_LINEA } } }
    r.height = 46
  })

  // Pie
  ws.addRow([])
  const pie = ws.addRow(['Guía de apoyo comercial · Cortesía de Navi Group'])
  ws.mergeCells(`A${pie.number}:${LAST}${pie.number}`)
  pie.getCell(1).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF9CA3AF' } }
  pie.getCell(1).alignment = { horizontal: 'right', indent: 1 }

  const buf = await wb.xlsx.writeBuffer()
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const slug = (eventoFiltro || 'todos').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  const filename = `clientes-captados-${slug}-${stamp}.xlsx`

  return new NextResponse(buf as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
