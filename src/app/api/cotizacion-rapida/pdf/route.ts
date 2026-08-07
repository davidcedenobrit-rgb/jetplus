export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { CotizacionRapidaPDF, CotizacionRapidaData } from '@/lib/cotizacion-rapida-pdf'

// Público (link de vendedores): genera el PDF del "rapidito" con los datos que
// envía el cliente. No toca la base; solo compone el PDF a partir del payload.
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}))
    const marca = String(b.marca ?? '').slice(0, 60)
    const modelo = String(b.modelo ?? '').slice(0, 160)
    if (!modelo) return NextResponse.json({ error: 'Faltan datos del vehículo' }, { status: 400 })

    const fecha = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Caracas' }))
      .toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })

    const data: CotizacionRapidaData = {
      brandNombre: String(b.brandNombre ?? 'La Oriental Automotors').slice(0, 80),
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
      cuota: Number(b.cuota) || 0,
      ac500: b.ac500 && typeof b.ac500 === 'object' ? {
        meses: String(b.ac500.meses ?? ''),
        color: b.ac500.color ? String(b.ac500.color) : undefined,
        total: b.ac500.total != null ? Number(b.ac500.total) : null,
        rows: Array.isArray(b.ac500.rows) ? b.ac500.rows.slice(0, 20).map((r: Record<string, unknown>) => ({
          label: String(r.label ?? '').slice(0, 60),
          val: r.val != null ? Number(r.val) : null,
          delivery: !!r.delivery,
          highlight: !!r.highlight,
        })) : [],
      } : null,
    }

    const buffer = await renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      React.createElement(CotizacionRapidaPDF, { data }) as any
    )
    const nombre = `Cotizacion_${marca}_${modelo}`.replace(/[^\w-]+/g, '_').slice(0, 80)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new NextResponse(Buffer.from(buffer) as any, {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${nombre}.pdf"`, 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json({ error: 'No se pudo generar el PDF' }, { status: 500 })
  }
}
