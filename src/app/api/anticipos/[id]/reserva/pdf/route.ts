export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ReservaVehiculoPDF, ReservaData } from '@/lib/reserva-pdf'
import { getConcesionarioIdentity } from '@/lib/concesionario'

const CIUDAD_CONCES: Record<string, string> = { 'jetplus': 'Porlamar', 'la-oriental': 'Maturín', 'kiauto': 'Puerto Ordaz', 'autosurca': 'El Tigre' }
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const fmt = (n: number) => Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const admin = await createAdminClient()
  const { data: ant } = await admin.from('anticipos').select('*, clientes(nombre, cedula_rif)').eq('id', id).maybeSingle()
  if (!ant) return NextResponse.json({ error: 'Anticipo no encontrado' }, { status: 404 })

  // Concesionario de turno (config o principal).
  let concId: string | null = null
  const { data: cfg } = await admin.from('config_cotizaciones').select('valor').eq('clave', 'concesionario_id').maybeSingle()
  concId = cfg?.valor ? String(cfg.valor) : null
  if (!concId) {
    const { data: prin } = await admin.from('concesionarios').select('id').eq('es_principal', true).limit(1).maybeSingle()
    concId = prin?.id ?? null
  }
  const c = await getConcesionarioIdentity(admin, concId)

  const cli = (ant.clientes ?? {}) as Record<string, unknown>
  const veh = (ant.reserva_vehiculo ?? {}) as Record<string, unknown>

  const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Caracas' }))
  const dia = String(ahora.getDate()).padStart(2, '0')
  const mes = MESES[ahora.getMonth()]
  const anio = ahora.getFullYear()

  const data: ReservaData = {
    fecha: ahora.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    ciudad: CIUDAD_CONCES[concId ?? 'jetplus'] ?? 'Porlamar',
    diaTexto: dia,
    mesTexto: mes,
    anioTexto: String(anio).replace(/^(\d)(\d{3})$/, '$1.$2'),
    membrete: { nombre: c.nombre, rif: c.rif, direccion: c.direccion, telefono: c.telefono, correo: c.correo, logoSrc: c.logoSrc, colorPrimario: c.colorPrimario, colorSecundario: c.colorSecundario },
    selloSrc: c.selloSrc,
    numeroProforma: '',
    clienteNombre: (cli.nombre as string) ?? '',
    clienteCiRif: (cli.cedula_rif as string) ?? '',
    vehiculo: {
      marca: (veh.marca as string) ?? '',
      modelo: (veh.modelo as string) ?? '',
      placa: (veh.placa as string) ?? '',
    },
    // El abono a la inicial que el cliente entrega como reserva (en USD).
    reservaInicial: `$${fmt(Number(ant.monto_usd) || 0)}`,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(React.createElement(ReservaVehiculoPDF, { data }) as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextResponse(buffer as any, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="acuerdo-reserva.pdf"` },
  })
}
