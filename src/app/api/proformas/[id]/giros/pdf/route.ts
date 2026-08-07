export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { GirosPDF, GirosData, GiroItem } from '@/lib/giros-pdf'
import { getConcesionarioIdentity } from '@/lib/concesionario'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function fechaLarga(iso?: string | null): string {
  const d = String(iso ?? '').slice(0, 10)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
  if (!m) return ''
  return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`
}

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

  const financiado = Number(pro.monto_financiado) || 0
  if (financiado <= 0) return NextResponse.json({ error: 'La proforma no tiene financiamiento; no hay giros que emitir.' }, { status: 400 })

  let concId: string | null = null
  if (pro.cotizacion_id) {
    const { data: cot } = await admin.from('cotizaciones').select('concesionario_id').eq('id', pro.cotizacion_id).maybeSingle()
    concId = cot?.concesionario_id ?? null
  }
  const c = await getConcesionarioIdentity(admin, concId)

  const cli = (pro.cliente_snapshot ?? {}) as Record<string, unknown>
  const veh = (pro.vehiculo_snapshot ?? {}) as Record<string, unknown>
  const cronograma = (pro.cronograma_snapshot ?? []) as { tipo?: string; monto?: number; fecha_vencimiento?: string }[]

  // Un giro por cada cuota del crédito (filas "Vehimotor" del cronograma).
  const cuotas = cronograma.filter(r => r.tipo === 'Vehimotor')
  let giros: GiroItem[]
  if (cuotas.length > 0) {
    giros = cuotas.map((r, i) => ({ nro: i + 1, vencimiento: fechaLarga(r.fecha_vencimiento), monto: Number(r.monto) || 0 }))
  } else {
    // Respaldo: reconstruir por num_cuotas y primera_cuota_fecha.
    const n = Number(pro.num_cuotas) || 0
    const cuotaMonto = n > 0 ? Math.round((financiado / n) * 100) / 100 : 0
    const base = pro.primera_cuota_fecha ? new Date(pro.primera_cuota_fecha + 'T12:00:00') : new Date()
    giros = Array.from({ length: n }, (_, i) => {
      const d = new Date(base); d.setMonth(d.getMonth() + i)
      return { nro: i + 1, vencimiento: fechaLarga(d.toISOString()), monto: cuotaMonto }
    })
  }

  // Nro de expediente: usa el de la proforma Vehimotors si existe (tramo S…), o el N° de proforma.
  const provm = String(veh.proforma_vehimotors ?? '')
  const expediente = provm ? (provm.split('-').pop()?.trim() || provm) : (pro.numero as string) ?? ''

  const data: GirosData = {
    membrete: { nombre: c.nombre, rif: c.rif, direccion: c.direccion, telefono: c.telefono, correo: c.correo, logoSrc: c.logoSrc, colorPrimario: c.colorPrimario, colorSecundario: c.colorSecundario },
    empresa: c.nombre,
    fechaEmision: fechaLarga(pro.fecha_emision) || fechaLarga(new Date().toISOString()),
    cliente: (cli.nombre as string) ?? '',
    clienteCiRif: (cli.cedula_rif as string) ?? '',
    clienteDireccion: (cli.direccion as string) ?? '',
    clienteTelefono: (cli.telefono as string) ?? '',
    clienteCorreo: (cli.correo as string) ?? '',
    numeroExpediente: expediente,
    total: giros.length,
    giros,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(React.createElement(GirosPDF, { data }) as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextResponse(buffer as any, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="giros-${pro.numero}.pdf"` },
  })
}
