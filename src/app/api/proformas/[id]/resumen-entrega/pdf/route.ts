export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ResumenEntregaPDF, ResumenEntregaData } from '@/lib/resumen-entrega-pdf'
import { getConcesionarioIdentity } from '@/lib/concesionario'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']
const CIUDAD_CONCES: Record<string, string> = { 'la-oriental': 'Maturín', 'kiauto': 'Puerto Ordaz', 'autosurca': 'El Tigre' }

const DOCUMENTOS = [
  'Proforma', 'Fe de entrega', 'Exoneración de responsabilidad', 'Acuerdo de pago',
  'Acuerdo de reserva', 'Certificado de origen', 'Contrato de consignación', 'Factura Vehimotors',
]

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id } = await params
  const admin = await createAdminClient()
  const { data: pro } = await admin.from('proformas').select('*').eq('id', id).maybeSingle()
  if (!pro) return NextResponse.json({ error: 'Proforma no encontrada' }, { status: 404 })

  let concId: string | null = null
  if (pro.cotizacion_id) {
    const { data: cot } = await admin.from('cotizaciones').select('concesionario_id').eq('id', pro.cotizacion_id).maybeSingle()
    concId = cot?.concesionario_id ?? null
  }
  const c = await getConcesionarioIdentity(admin, concId)

  const cli = (pro.cliente_snapshot ?? {}) as Record<string, unknown>
  const veh = (pro.vehiculo_snapshot ?? {}) as Record<string, unknown>
  const credito = (pro.credito_snapshot ?? {}) as Record<string, unknown>
  const cronograma = (pro.cronograma_snapshot ?? []) as { tipo?: string; monto?: number }[]
  const cuotaVm = cronograma.find(c2 => c2.tipo === 'Vehimotor')?.monto ?? (cronograma[0]?.monto ?? 0)

  const financiamiento = Number(pro.monto_financiado) || 0
  const modalidad = pro.condiciones_personalizadas ? 'Condiciones personalizadas'
    : financiamiento > 0 ? 'Crédito' : 'Contado'

  const hoy = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Caracas' })

  const data: ResumenEntregaData = {
    fecha: hoy,
    ciudad: CIUDAD_CONCES[concId ?? 'la-oriental'] ?? 'Maturín',
    membrete: { nombre: c.nombre, rif: c.rif, direccion: c.direccion, telefono: c.telefono, correo: c.correo, logoSrc: c.logoSrc, colorPrimario: c.colorPrimario, colorSecundario: c.colorSecundario },
    numeroProforma: (pro.numero as string) ?? '',
    cliente: { nombre: (cli.nombre as string) ?? '', ciRif: (cli.cedula_rif as string) ?? '' },
    vehiculo: {
      marca: (veh.marca as string) ?? '', modelo: (veh.modelo as string) ?? '', version: (veh.version as string) ?? null,
      color: (veh.color as string) ?? null, anio: (veh.anio as string | number) ?? null,
      vin: (veh.vin as string) ?? null, serialMotor: (veh.serial_motor as string) ?? null,
      placa: (veh.placa as string) ?? null, proformaVehimotors: (veh.proforma_vehimotors as string) ?? null,
    },
    pago: {
      modalidad,
      total: Number(pro.precio_vehiculo) || 0,
      inicial: Number(pro.monto_inicial) || 0,
      financiamiento: financiamiento > 0 ? financiamiento : null,
      numCuotas: financiamiento > 0 ? (Number(pro.num_cuotas) || (credito.num_cuotas as number) || 0) : null,
      cuota: financiamiento > 0 ? Number(cuotaVm) : null,
    },
    documentos: DOCUMENTOS,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(React.createElement(ResumenEntregaPDF, { data }) as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextResponse(buffer as any, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="resumen-entrega-${pro.numero}.pdf"` },
  })
}
