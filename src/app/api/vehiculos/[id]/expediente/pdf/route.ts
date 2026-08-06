export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getConcesionarioIdentity } from '@/lib/concesionario'

// Etiquetas legibles + orden de los documentos en el expediente.
const TIPO_LABEL: Record<string, string> = {
  proforma: 'Proforma', formato_entrega: 'Fe de entrega', acuerdo_pago: 'Acuerdo de pago',
  reserva: 'Acuerdo de reserva', exoneracion: 'Exoneración', resumen_entrega: 'Resumen de entrega',
  factura: 'Factura', certificado_origen: 'Certificado de origen', contrato: 'Contrato',
  contrato_consignacion: 'Contrato de consignación', autorizacion_consig: 'Autorización de consignación',
  poliza_vehiculo: 'Póliza vehículo', poliza_vida: 'Póliza vida', giros: 'Giros',
  retencion_iva: 'Retención de IVA', factura_comision: 'Factura de comisión', pdi: 'PDI', comprobante: 'Comprobante',
}
const ORDEN = Object.keys(TIPO_LABEL)
const rank = (t: string) => { const i = ORDEN.indexOf(t); return i < 0 ? 999 : i }

const A4: [number, number] = [595.28, 841.89]

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const admin = await createAdminClient()
  const { data: veh } = await admin.from('vehiculos').select('marca, modelo, placa, vin, clientes(nombre, cedula_rif)').eq('id', id).maybeSingle()
  if (!veh) return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 })

  // Documentos del carro + los de preventa del showroom vinculado.
  const { data: aVeh } = await admin.from('archivos').select('tipo, url, nombre').eq('vehiculo_id', id)
  let archivos = (aVeh ?? []) as { tipo: string; url: string; nombre: string | null }[]
  const { data: sh } = await admin.from('vehiculos_showroom').select('id').eq('vehiculo_id', id).maybeSingle()
  if (sh?.id) {
    const { data: aPre } = await admin.from('archivos').select('tipo, url, nombre').eq('showroom_id', sh.id)
    archivos = archivos.concat((aPre ?? []) as typeof archivos)
  }
  archivos.sort((a, b) => rank(a.tipo) - rank(b.tipo))

  // Concesionario (para la portada).
  let concId: string | null = null
  const { data: pro } = await admin.from('proformas').select('cotizacion_id').eq('vehiculo_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (pro?.cotizacion_id) {
    const { data: cot } = await admin.from('cotizaciones').select('concesionario_id').eq('id', pro.cotizacion_id).maybeSingle()
    concId = cot?.concesionario_id ?? null
  }
  const c = await getConcesionarioIdentity(admin, concId)
  const cli = ((Array.isArray(veh.clientes) ? veh.clientes[0] : veh.clientes) ?? {}) as Record<string, unknown>

  const merged = await PDFDocument.create()
  const bold = await merged.embedFont(StandardFonts.HelveticaBold)
  const reg = await merged.embedFont(StandardFonts.Helvetica)
  const primario = hexToRgb(c.colorPrimario || '#C41E3A')

  // ── Portada ──────────────────────────────────────────────────────────
  const cover = merged.addPage(A4)
  cover.drawRectangle({ x: 0, y: A4[1] - 8, width: A4[0], height: 8, color: rgb(primario.r, primario.g, primario.b) })
  let y = A4[1] - 90
  cover.drawText('EXPEDIENTE DEL CLIENTE', { x: 46, y, size: 20, font: bold, color: rgb(primario.r, primario.g, primario.b) })
  y -= 22
  cover.drawText(c.nombre, { x: 46, y, size: 11, font: bold, color: rgb(0.07, 0.09, 0.15) })
  y -= 40
  const line = (k: string, v: string) => {
    cover.drawText(k, { x: 46, y, size: 10, font: bold, color: rgb(0.42, 0.45, 0.5) })
    cover.drawText(v || '—', { x: 170, y, size: 11, font: bold, color: rgb(0.07, 0.09, 0.15) })
    y -= 20
  }
  line('Cliente:', String(cli.nombre ?? ''))
  line('C.I./RIF:', String(cli.cedula_rif ?? ''))
  line('Vehículo:', `${veh.marca ?? ''} ${veh.modelo ?? ''}`.trim())
  line('Placa:', String(veh.placa ?? ''))
  line('VIN/Chasis:', String(veh.vin ?? ''))
  const hoy = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Caracas' })
  line('Emitido:', hoy)
  y -= 14
  cover.drawText(`Documentos incluidos (${archivos.length}):`, { x: 46, y, size: 10, font: bold, color: rgb(0.07, 0.09, 0.15) })
  y -= 18
  archivos.forEach((a, i) => {
    if (y < 60) return
    cover.drawText(`${i + 1}.  ${TIPO_LABEL[a.tipo] ?? a.tipo}`, { x: 56, y, size: 10, font: reg, color: rgb(0.25, 0.28, 0.33) })
    y -= 16
  })

  // ── Documentos ───────────────────────────────────────────────────────
  let incluidos = 0
  for (const a of archivos) {
    try {
      const resp = await fetch(a.url, { signal: AbortSignal.timeout(15000) })
      if (!resp.ok) continue
      const ct = (resp.headers.get('content-type') || '').toLowerCase()
      const url = a.url.toLowerCase()
      const bytes = new Uint8Array(await resp.arrayBuffer())
      const esPdf = ct.includes('pdf') || url.includes('.pdf')
      const esPng = ct.includes('png') || url.includes('.png')
      const esJpg = ct.includes('jpeg') || ct.includes('jpg') || url.includes('.jpg') || url.includes('.jpeg')
      if (esPdf) {
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
        const pages = await merged.copyPages(src, src.getPageIndices())
        pages.forEach(p => merged.addPage(p))
        incluidos++
      } else if (esPng || esJpg) {
        const img = esPng ? await merged.embedPng(bytes) : await merged.embedJpg(bytes)
        const page = merged.addPage(A4)
        page.drawText(TIPO_LABEL[a.tipo] ?? a.tipo, { x: 46, y: A4[1] - 40, size: 11, font: bold, color: rgb(primario.r, primario.g, primario.b) })
        const maxW = A4[0] - 80, maxH = A4[1] - 110
        const sc = Math.min(maxW / img.width, maxH / img.height, 1)
        const w = img.width * sc, h = img.height * sc
        page.drawImage(img, { x: (A4[0] - w) / 2, y: (A4[1] - h) / 2 - 20, width: w, height: h })
        incluidos++
      }
    } catch { /* documento ilegible: se omite y sigue */ }
  }

  if (incluidos === 0) {
    cover.drawText('(No hay documentos adjuntos legibles para incluir.)', { x: 46, y: 50, size: 9, font: reg, color: rgb(0.6, 0.6, 0.6) })
  }

  const out = await merged.save()
  return new NextResponse(Buffer.from(out), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="expediente-${veh.placa || veh.modelo || 'cliente'}.pdf"` },
  })
}

function hexToRgb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m ? { r: parseInt(m[1], 16) / 255, g: parseInt(m[2], 16) / 255, b: parseInt(m[3], 16) / 255 } : { r: 0.77, g: 0.12, b: 0.23 }
}
