export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { EstadoCuentaPDF, EstadoCuentaData, EstadoCuentaCuota } from '@/lib/estado-cuenta-pdf'
import { getConcesionarioIdentity } from '@/lib/concesionario'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem', 'arianna']

const fFecha = (s?: string | null) => {
  if (!s) return '—'
  const d = String(s).slice(0, 10)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d
}
const hoyISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' }) // aaaa-mm-dd

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id } = await params
  const admin = await createAdminClient()
  const { data: cr } = await admin
    .from('creditos')
    .select('*, clientes(nombre, cedula_rif), vehiculos(marca, modelo, placa, color, anio)')
    .eq('id', id).maybeSingle()
  if (!cr) return NextResponse.json({ error: 'Crédito no encontrado' }, { status: 404 })

  const { data: cuotasRows } = await admin
    .from('cuotas')
    .select('numero_cuota, fecha_vencimiento, monto, monto_pagado, estado')
    .eq('credito_id', id)
    .order('numero_cuota')

  const hoy = hoyISO()
  const cuotas: EstadoCuentaCuota[] = (cuotasRows ?? []).map((c: Record<string, unknown>) => {
    const pagado = Number(c.monto_pagado) || 0
    const monto = Number(c.monto) || 0
    let estado = String(c.estado ?? 'pendiente') as EstadoCuentaCuota['estado']
    // Marca como vencida si pasó el vencimiento y no está saldada.
    if (estado !== 'pagada' && estado !== 'abono_parcial' && String(c.fecha_vencimiento ?? '').slice(0, 10) < hoy) estado = 'vencida'
    return { numero: Number(c.numero_cuota) || 0, vencimiento: fFecha(c.fecha_vencimiento as string), monto, pagado, estado }
  })

  const totalCuotas = cuotas.reduce((a, c) => a + c.monto, 0)
  const totalPagado = cuotas.reduce((a, c) => a + c.pagado, 0)

  // Concesionario de turno: se resuelve desde la proforma/cotización del vehículo; cae a La Oriental.
  let concId: string | null = null
  const { data: pro } = await admin.from('proformas').select('cotizacion_id').eq('vehiculo_id', cr.vehiculo_id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (pro?.cotizacion_id) {
    const { data: cot } = await admin.from('cotizaciones').select('concesionario_id').eq('id', pro.cotizacion_id).maybeSingle()
    concId = cot?.concesionario_id ?? null
  }
  const c = await getConcesionarioIdentity(admin, concId)

  const cli = (cr.clientes ?? {}) as Record<string, unknown>
  const veh = (cr.vehiculos ?? {}) as Record<string, unknown>
  const estadoLbl: Record<string, string> = { activo: 'Activo', pagado: 'Pagado', cancelado: 'Cancelado', vencido: 'Vencido' }

  const data: EstadoCuentaData = {
    fecha: fFecha(hoy),
    membrete: { nombre: c.nombre, rif: c.rif, direccion: c.direccion, telefono: c.telefono, correo: c.correo, logoSrc: c.logoSrc, colorPrimario: c.colorPrimario, colorSecundario: c.colorSecundario },
    numeroCredito: (cr.numero as string) ?? String(id).slice(0, 8).toUpperCase(),
    cliente: { nombre: (cli.nombre as string) ?? '', ciRif: (cli.cedula_rif as string) ?? '' },
    vehiculo: { marca: (veh.marca as string) ?? '', modelo: (veh.modelo as string) ?? '', placa: (veh.placa as string) ?? (cr.placa as string) ?? '', color: (veh.color as string) ?? null, anio: (veh.anio as number) ?? null },
    resumen: {
      montoFinanciado: Number(cr.monto_financiado) || 0,
      inicial: Number(cr.inicial) || 0,
      numCuotas: Number(cr.num_cuotas) || cuotas.length,
      cuota: cuotas[0]?.monto ?? 0,
      fechaInicio: fFecha(cr.fecha_inicio as string),
      estado: estadoLbl[String(cr.estado)] ?? String(cr.estado ?? ''),
      totalPagado,
      saldoPendiente: Math.max(0, Math.round((totalCuotas - totalPagado) * 100) / 100),
    },
    cuotas,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(React.createElement(EstadoCuentaPDF, { data }) as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextResponse(buffer as any, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="estado-cuenta-${data.numeroCredito}.pdf"` },
  })
}
