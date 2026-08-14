export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getConcesionarioIdentity } from '@/lib/concesionario'
import { TablaPDF, TablaPDFData } from '@/lib/tabla-pdf'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

export async function GET() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const admin = await createAdminClient()
  const { data: citas } = await admin
    .from('citas_taller')
    .select('cliente_nombre, cliente_telefono, vehiculo_marca, vehiculo_modelo, vehiculo_placa, motivo, fecha, hora_inicio, hora_fin, estado')
    .order('fecha', { ascending: true })
    .order('hora_inicio', { ascending: true })

  let concId: string | null = null
  const { data: cfg } = await admin.from('config_cotizaciones').select('valor').eq('clave', 'concesionario_id').maybeSingle()
  concId = cfg?.valor ? String(cfg.valor) : null
  if (!concId) {
    const { data: prin } = await admin.from('concesionarios').select('id').eq('es_principal', true).limit(1).maybeSingle()
    concId = prin?.id ?? null
  }
  const c = await getConcesionarioIdentity(admin, concId)

  const hoy = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Caracas' })
  const fmtFecha = (s: string) => {
    try { return new Date(s + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
    catch { return s }
  }
  const fmtHora = (s: string) => String(s).slice(0, 5)

  const data: TablaPDFData = {
    titulo: 'Citas de taller',
    subtitulo: `Generado ${hoy}`,
    membrete: { nombre: c.nombre, rif: c.rif, direccion: c.direccion, telefono: c.telefono, correo: c.correo, logoSrc: c.logoSrc, colorPrimario: c.colorPrimario, colorSecundario: c.colorSecundario },
    columnas: [
      { label: 'Cliente', flex: 1.3 },
      { label: 'Teléfono', flex: 1 },
      { label: 'Vehículo', flex: 1.3 },
      { label: 'Motivo', flex: 1.4 },
      { label: 'Fecha', flex: 0.9 },
      { label: 'Horario', flex: 1 },
      { label: 'Estado', flex: 0.8 },
    ],
    filas: (citas ?? []).map(c => [
      c.cliente_nombre, c.cliente_telefono,
      [c.vehiculo_marca, c.vehiculo_modelo].filter(Boolean).join(' ') || '—',
      c.motivo || '—', fmtFecha(c.fecha), `${fmtHora(c.hora_inicio)}–${fmtHora(c.hora_fin)}`,
      c.estado === 'cancelada' ? 'Cancelada' : 'Confirmada',
    ]),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(React.createElement(TablaPDF, { data }) as any)
  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="citas-taller.pdf"' },
  })
}
