export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { CotizacionPDF } from '@/lib/cotizacion-pdf'
import type { CotizacionPDFData, AC500ScheduleData, AC500CuotaItem } from '@/lib/cotizacion-pdf'
import { getConcesionarioIdentity } from '@/lib/concesionario'
import { resolverCotizacionDB } from '@/lib/cotizacion-federada'
import { prepararImagenPdf } from '@/lib/pdf-image'

function fmtDate(s: string) {
  try { return new Date(s + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return s }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const descargar = new URL(_req.url).searchParams.get('download') === '1'

  // Resuelve en la base local o en la de otra sede (panel central federado).
  const resuelta = await resolverCotizacionDB(id)
  if (!resuelta) return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
  const { db: supabase, cot } = resuelta

  const conces = await getConcesionarioIdentity(supabase, cot.concesionario_id ?? null)

  // Reconstruir el cuadro del AC500 (reserva + cuotas) para que el PDF a demanda
  // se vea igual que el enviado por correo.
  let ac500Schedule: AC500ScheduleData | undefined
  if (cot.plan === 'ac500' && cot.ac500_meses && cot.ac500_cuotas) {
    const meses = Number(cot.ac500_meses)
    const montos = cot.ac500_cuotas as number[]
    const cuotas: AC500CuotaItem[] = montos.map((monto: number, i: number) => ({
      label: i + 1 === meses ? `Cuota ${i + 1} (Entrega)` : `Cuota ${i + 1}`,
      monto,
    }))
    ac500Schedule = { reserva: Number(cot.total_inicial), meses, modelo: cot.modelo, cuotas, total: Number(cot.costo_total) }
  }

  // Ficha técnica del vehículo (si tiene páginas cargadas): se anexa después
  // de la última hoja del presupuesto, con el mismo membrete y numeración
  // corrida. Best-effort: una sede federada sin esa columna no rompe el PDF.
  let fichaTecnicaImgs: string[] = []
  if (cot.vehiculo_id) {
    try {
      const { data: veh } = await supabase
        .from('catalogo_ventas')
        .select('ficha_tecnica_paginas')
        .eq('id', cot.vehiculo_id)
        .maybeSingle()
      const paginas = (veh?.ficha_tecnica_paginas ?? []) as { url: string; orden: number }[]
      if (paginas.length) {
        fichaTecnicaImgs = (await Promise.all(
          [...paginas].sort((a, b) => a.orden - b.orden).map(p => prepararImagenPdf(p.url, { maxWidth: 1600, quality: 86 }))
        )).filter((img): img is string => !!img)
      }
    } catch { /* sede federada sin ficha_tecnica_paginas: se omite */ }
  }

  const pdfData: CotizacionPDFData = {
    logoSrc: conces.logoSrc,
    selloSrc: conces.selloSrc,
    empresaNombre: conces.nombre,
    empresaRif: conces.rif,
    empresaDireccion: conces.direccion,
    empresaTelefono: conces.telefono,
    empresaCorreo: conces.correo,
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
    retencionPct: cot.retencion_pct != null ? Number(cot.retencion_pct) : null,
    marca: cot.marca,
    modelo: cot.modelo,
    color: cot.color ?? undefined,
    cantidad: Number(cot.cantidad) || 1,
    precioBase: Number(cot.precio_base),
    modalidad: cot.modalidad,
    plan: cot.plan ?? 'vehimotors',
    ivaMonto: Number(cot.iva_monto),
    gastosMonto: Number(cot.gastos_monto),
    totalVehiculo: cot.plan === 'banco_100' && cot.financiamiento_monto != null ? Number(cot.financiamiento_monto) / 0.70 : undefined,
    totalInicial: Number(cot.total_inicial),
    financiamientoMonto: cot.financiamiento_monto != null ? Number(cot.financiamiento_monto) : null,
    cuotaMensual: cot.cuota_mensual != null ? Number(cot.cuota_mensual) : null,
    mesesBanco: cot.cuotas_banco != null ? Number(cot.cuotas_banco) : undefined,
    costoTotal: Number(cot.costo_total),
    inicialPct: cot.plan === 'personalizado' && cot.personalizado_inicial_pct != null ? Number(cot.personalizado_inicial_pct) / 100 : undefined,
    mesesCredito: cot.plan === 'personalizado' && cot.personalizado_meses != null ? Number(cot.personalizado_meses) : undefined,
    condicionesPersonalizadas: cot.condiciones_personalizadas ?? null,
    bnVehimotors: cot.bn_vehimotors ?? null,
    ac500Schedule,
    fichaTecnica: fichaTecnicaImgs,
  }

  const buffer = await renderToBuffer(
    React.createElement(CotizacionPDF, { data: pdfData }) as React.ReactElement<any>
  )

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${descargar ? 'attachment' : 'inline'}; filename="${cot.numero}.pdf"`,
      'Cache-Control': 'private, no-cache',
    },
  })
}
