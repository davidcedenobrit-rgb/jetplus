export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createAdminClient } from '@/lib/supabase/server'
import { CotizacionPDF } from '@/lib/cotizacion-pdf'
import type { CotizacionPDFData } from '@/lib/cotizacion-pdf'

function getLogoBase64(): string {
  try {
    const buf = readFileSync(join(process.cwd(), 'public', 'logo-la-oriental.png'))
    return `data:image/png;base64,${buf.toString('base64')}`
  } catch {
    return 'https://assets.cdn.filesafe.space/XZDJ4aSOAL1crWRCXyY6/media/698367bc1dfc0253b24abd7a.png'
  }
}

function fmtDate(s: string) {
  try { return new Date(s + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return s }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createAdminClient()
  const { data: cot, error } = await supabase
    .from('cotizaciones')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !cot) return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })

  const pdfData: CotizacionPDFData = {
    logoSrc: getLogoBase64(),
    numero: cot.numero,
    fecha: fmtDate(cot.fecha),
    vencimiento: fmtDate(cot.vencimiento),
    clienteNombre: cot.cliente_nombre,
    clienteCiRif: cot.cliente_ci_rif,
    clienteCorreo: cot.cliente_correo,
    clienteTelefono: cot.cliente_telefono ?? null,
    clienteDireccion: cot.cliente_direccion ?? null,
    clienteCiudadEstado: cot.cliente_ciudad_estado ?? null,
    clienteCodigoPostal: cot.cliente_codigo_postal ?? null,
    agenteRetencion: !!cot.agente_retencion,
    marca: cot.marca,
    modelo: cot.modelo,
    precioBase: Number(cot.precio_base),
    modalidad: cot.modalidad,
    plan: cot.plan ?? 'vehimotors',
    ivaMonto: Number(cot.iva_monto),
    gastosMonto: Number(cot.gastos_monto),
    totalVehiculo: cot.plan === 'banco_100' && cot.financiamiento_monto != null ? Number(cot.financiamiento_monto) / 0.70 : undefined,
    totalInicial: Number(cot.total_inicial),
    financiamientoMonto: cot.financiamiento_monto != null ? Number(cot.financiamiento_monto) : null,
    cuotaMensual: cot.cuota_mensual != null ? Number(cot.cuota_mensual) : null,
    costoTotal: Number(cot.costo_total),
  }

  const buffer = await renderToBuffer(
    React.createElement(CotizacionPDF, { data: pdfData }) as React.ReactElement<any>
  )

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${cot.numero}.pdf"`,
      'Cache-Control': 'private, no-cache',
    },
  })
}
