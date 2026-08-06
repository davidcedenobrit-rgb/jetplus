export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ReservaVehiculoPDF, ReservaData } from '@/lib/reserva-pdf'
import { getConcesionarioIdentity } from '@/lib/concesionario'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']
// La reserva se firma en la sede del CONCESIONARIO de turno, no en la ciudad
// del cliente. Ciudad por concesionario (igual que la exoneración).
const CIUDAD_CONCES: Record<string, string> = {
  'la-oriental': 'Maturín',
  'kiauto': 'Puerto Ordaz',
  'autosurca': 'El Tigre',
}
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

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

  // Fecha de firma = hoy (zona Caracas). El día y el mes se rellenan en el texto.
  const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Caracas' }))
  const dia = String(ahora.getDate()).padStart(2, '0')
  const mes = MESES[ahora.getMonth()]
  const anio = ahora.getFullYear()
  const hoy = ahora.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const data: ReservaData = {
    fecha: hoy,
    ciudad: CIUDAD_CONCES[concId ?? 'la-oriental'] ?? 'Maturín',
    diaTexto: dia,
    mesTexto: mes,
    anioTexto: String(anio).replace(/^(\d)(\d{3})$/, '$1.$2'),
    membrete: { nombre: c.nombre, rif: c.rif, direccion: c.direccion, telefono: c.telefono, correo: c.correo, logoSrc: c.logoSrc, colorPrimario: c.colorPrimario, colorSecundario: c.colorSecundario },
    selloSrc: c.selloSrc,
    numeroProforma: (pro.numero as string) ?? '',
    clienteNombre: (cli.nombre as string) ?? '',
    clienteCiRif: (cli.cedula_rif as string) ?? '',
    vehiculo: {
      marca: (veh.marca as string) ?? '',
      modelo: (veh.version ? `${veh.modelo ?? ''} ${veh.version}` : (veh.modelo as string)) ?? '',
      placa: (veh.placa as string) ?? '',
    },
    // Reserva prellenada con el inicial de la proforma (queda editable a mano
    // si la reserva real fuese otra). Vacío → línea en blanco.
    reservaInicial: pro.monto_inicial != null
      ? `$${Number(pro.monto_inicial).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '',
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(React.createElement(ReservaVehiculoPDF, { data }) as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextResponse(buffer as any, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="reserva-${pro.numero}.pdf"` },
  })
}
