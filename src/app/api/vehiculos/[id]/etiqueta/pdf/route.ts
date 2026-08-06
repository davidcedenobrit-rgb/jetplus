export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { EtiquetaPDF, EtiquetaData } from '@/lib/etiqueta-pdf'
import { getConcesionarioIdentity } from '@/lib/concesionario'

const partes = (iso?: string | null) => {
  const d = String(iso ?? '').slice(0, 10)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
  return m ? { dia: String(Number(m[3])), mes: String(Number(m[2])), anio: m[1] } : { dia: '', mes: '', anio: '' }
}
const fFecha = (iso?: string | null) => {
  const p = partes(iso)
  return p.anio ? `${p.dia}/${p.mes}/${p.anio}` : '—'
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const admin = await createAdminClient()
  const { data: veh } = await admin.from('vehiculos').select('*, clientes(nombre)').eq('id', id).maybeSingle()
  if (!veh) return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 })

  // Proforma → cotización (vendedora + concesionario). Showroom → fechas/vendedor de respaldo.
  let concId: string | null = null
  let vendedor = ''
  const { data: pro } = await admin.from('proformas').select('cotizacion_id, vendedoras').eq('vehiculo_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (pro?.cotizacion_id) {
    const { data: cot } = await admin.from('cotizaciones').select('concesionario_id, vendedora_nombre').eq('id', pro.cotizacion_id).maybeSingle()
    concId = cot?.concesionario_id ?? null
    vendedor = (cot?.vendedora_nombre as string) ?? ''
  }
  if (!vendedor && Array.isArray(pro?.vendedoras)) vendedor = (pro!.vendedoras as { nombre?: string }[]).map(v => v?.nombre).filter(Boolean).join(', ')

  // Showroom vinculado: fecha de recepción (entrada al showroom) y respaldo de venta/vendedor.
  let recepcionISO: string | null = veh.created_at ?? null
  let fechaVentaISO: string | null = veh.fecha_entrega ?? null
  const { data: sh } = await admin.from('vehiculos_showroom').select('created_at, fecha_venta, vendedora_venta').eq('vehiculo_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (sh) {
    recepcionISO = sh.created_at ?? recepcionISO
    fechaVentaISO = sh.fecha_venta ?? fechaVentaISO
    if (!vendedor) vendedor = (sh.vendedora_venta as string) ?? ''
  }

  const c = await getConcesionarioIdentity(admin, concId)
  const cli = (veh.clientes ?? {}) as Record<string, unknown>

  const data: EtiquetaData = {
    logoSrc: c.logoSrc,
    empresa: c.nombre,
    colorPrimario: c.colorPrimario,
    marca: (veh.marca as string) ?? '',
    modelo: [veh.modelo, veh.version].filter(Boolean).join(' ') || (veh.modelo as string) || '',
    placa: (veh.placa as string) ?? '',
    color: (veh.color as string) ?? '',
    serialMotor: (veh.serial_motor as string) ?? '',
    serialCarroceria: (veh.vin as string) ?? '',
    recepcion: partes(recepcionISO),
    cliente: (cli.nombre as string) ?? '',
    vendedor,
    fechaVenta: fFecha(fechaVentaISO),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(React.createElement(EtiquetaPDF, { data }) as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextResponse(buffer as any, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="etiqueta-${veh.placa || veh.modelo || 'vehiculo'}.pdf"` },
  })
}
