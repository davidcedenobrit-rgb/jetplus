export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ExoneracionPDF, ExoneracionData } from '@/lib/exoneracion-pdf'
import { getConcesionarioIdentity } from '@/lib/concesionario'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']
const fFecha = (s?: string | null) => {
  if (!s) return ''
  const d = String(s).slice(0, 10)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d
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

  let concId: string | null = null
  let solicitado = ''
  if (pro.cotizacion_id) {
    const { data: cot } = await admin.from('cotizaciones').select('concesionario_id, vendedora_nombre').eq('id', pro.cotizacion_id).maybeSingle()
    concId = cot?.concesionario_id ?? null
    solicitado = (cot?.vendedora_nombre as string) ?? ''
  }
  const c = await getConcesionarioIdentity(admin, concId)

  const cli = (pro.cliente_snapshot ?? {}) as Record<string, unknown>
  const veh = (pro.vehiculo_snapshot ?? {}) as Record<string, unknown>

  const hoy = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Caracas' })

  const data: ExoneracionData = {
    fecha: hoy,
    ciudad: (cli.ciudad as string) || 'Maturín',
    membrete: { nombre: c.nombre, rif: c.rif, direccion: c.direccion, telefono: c.telefono, correo: c.correo, logoSrc: c.logoSrc, colorPrimario: c.colorPrimario, colorSecundario: c.colorSecundario },
    selloSrc: c.selloSrc,
    numeroProforma: (pro.numero as string) ?? '',
    solicitado,
    clienteNombre: (cli.nombre as string) ?? '',
    clienteCiRif: (cli.cedula_rif as string) ?? '',
    vehiculo: {
      marca: (veh.marca as string) ?? '',
      modelo: (veh.modelo as string) ?? '',
      version: (veh.version as string) ?? '',
      vin: (veh.vin as string) ?? '',
      serialMotor: (veh.serial_motor as string) ?? '',
      anio: (veh.anio as string | number) ?? '',
      placa: (veh.placa as string) ?? '',
      color: (veh.color as string) ?? '',
      fechaLlegada: fFecha(veh.fecha_llegada as string),
    },
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(React.createElement(ExoneracionPDF, { data }) as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextResponse(buffer as any, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="exoneracion-${pro.numero}.pdf"` },
  })
}
