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
  const { data: leads } = await admin
    .from('aliados_leads')
    .select('aliado_nombre, aliado_codigo, cliente_nombre, cliente_telefono, vehiculo_interes, tiene_inicial, inicial_monto, created_at')
    .order('created_at', { ascending: false })

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
    try { return new Date(s).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Caracas' }) }
    catch { return s }
  }

  const data: TablaPDFData = {
    titulo: 'Bitácora de aliados',
    subtitulo: `Generado ${hoy}`,
    membrete: { nombre: c.nombre, rif: c.rif, direccion: c.direccion, telefono: c.telefono, correo: c.correo, logoSrc: c.logoSrc, colorPrimario: c.colorPrimario, colorSecundario: c.colorSecundario },
    columnas: [
      { label: 'Aliado', flex: 1.4 },
      { label: 'Cliente', flex: 1.4 },
      { label: 'Teléfono', flex: 1 },
      { label: 'Vehículo de interés', flex: 1.4 },
      { label: 'Inicial', flex: 0.8 },
      { label: 'Fecha', flex: 1 },
    ],
    filas: (leads ?? []).map(l => [
      `${l.aliado_nombre} (${l.aliado_codigo})`,
      l.cliente_nombre,
      l.cliente_telefono,
      l.vehiculo_interes || '—',
      l.tiene_inicial ? (l.inicial_monto ? `$${l.inicial_monto}` : 'Sí') : 'No',
      fmtFecha(l.created_at),
    ]),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(React.createElement(TablaPDF, { data }) as any)
  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="bitacora-aliados.pdf"' },
  })
}
