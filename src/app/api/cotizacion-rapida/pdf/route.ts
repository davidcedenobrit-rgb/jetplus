export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { CotizacionRapidaPDF, CotizacionRapidaData } from '@/lib/cotizacion-rapida-pdf'
import { createAdminClient } from '@/lib/supabase/server'
import { getConcesionarioIdentity } from '@/lib/concesionario'

// Público (link de vendedores): genera el PDF del "rapidito".
//  · POST → desde el modal, con los datos + logo (data URI) en el cuerpo.
//  · GET ?d=<base64(json)> → link estable para compartir/enviar por WhatsApp al
//    cliente; el logo se resuelve en el servidor según el concesionario.

function parseComun(b: Record<string, unknown>): CotizacionRapidaData {
  const marca = String(b.marca ?? '').slice(0, 60)
  const modelo = String(b.modelo ?? '').slice(0, 160)
  const fecha = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Caracas' }))
    .toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const ac = b.ac500 as Record<string, unknown> | null | undefined
  return {
    brandNombre: String(b.brandNombre ?? 'JETPLUS').slice(0, 80),
    brandLogo: typeof b.brandLogo === 'string' && b.brandLogo.startsWith('data:') ? b.brandLogo : undefined,
    colorPrimario: String(b.colorPrimario ?? '#C41E3A'),
    colorSecundario: String(b.colorSecundario ?? '#111827'),
    marca, modelo,
    planNota: b.planNota ? String(b.planNota).slice(0, 160) : undefined,
    fecha,
    financiamiento: !!b.financiamiento,
    precio: Number(b.precio) || 0,
    gastosContado: Number(b.gastosContado) || 0,
    gastosCredito: Number(b.gastosCredito) || 0,
    placaMonto: Number(b.placaMonto) || 0,
    cuota: Number(b.cuota) || 0,
    ac500: ac && typeof ac === 'object' ? {
      meses: String(ac.meses ?? ''),
      color: ac.color ? String(ac.color) : undefined,
      total: ac.total != null ? Number(ac.total) : null,
      rows: Array.isArray(ac.rows) ? ac.rows.slice(0, 20).map((r: Record<string, unknown>) => ({
        label: String(r.label ?? '').slice(0, 60),
        val: r.val != null ? Number(r.val) : null,
        delivery: !!r.delivery,
        highlight: !!r.highlight,
      })) : [],
    } : null,
  }
}

async function pdfResponse(data: CotizacionRapidaData) {
  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(CotizacionRapidaPDF, { data }) as any
  )
  const nombre = `Cotizacion_${data.marca}_${data.modelo}`.replace(/[^\w-]+/g, '_').slice(0, 80)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextResponse(Buffer.from(buffer) as any, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${nombre}.pdf"`, 'Cache-Control': 'no-store' },
  })
}

export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}))
    const data = parseComun(b)
    if (!data.modelo) return NextResponse.json({ error: 'Faltan datos del vehículo' }, { status: 400 })
    return await pdfResponse(data)
  } catch {
    return NextResponse.json({ error: 'No se pudo generar el PDF' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const d = url.searchParams.get('d')
    if (!d) return NextResponse.json({ error: 'Falta el parámetro d' }, { status: 400 })
    let obj: Record<string, unknown>
    try {
      obj = JSON.parse(Buffer.from(d, 'base64').toString('utf8'))
    } catch {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    const data = parseComun(obj)
    if (!data.modelo) return NextResponse.json({ error: 'Faltan datos del vehículo' }, { status: 400 })

    // El logo/branding se resuelve en el servidor (no viaja en el link).
    if (!data.brandLogo) {
      try {
        const admin = await createAdminClient()
        const concId = obj.conc ? String(obj.conc) : null
        const c = await getConcesionarioIdentity(admin, concId)
        data.brandNombre = c.nombre || data.brandNombre
        data.brandLogo = c.logoSrc
        data.colorPrimario = c.colorPrimario || data.colorPrimario
        data.colorSecundario = c.colorSecundario || data.colorSecundario
      } catch { /* si falla, se genera sin logo */ }
    }
    return await pdfResponse(data)
  } catch {
    return NextResponse.json({ error: 'No se pudo generar el PDF' }, { status: 500 })
  }
}
