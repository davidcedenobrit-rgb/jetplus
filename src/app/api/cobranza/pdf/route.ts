export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { CobranzaPDF, CobranzaPDFData, CobranzaFila } from '@/lib/cobranza-pdf'
import { getConcesionarioIdentity } from '@/lib/concesionario'

export async function POST(req: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const filas: CobranzaFila[] = Array.isArray(body?.filas) ? body.filas : []
  const tot = body?.tot ?? { total: 0, cobrado: 0, porCobrar: 0, vencido: 0 }
  const split = body?.split ?? { orientalPC: 0, vehPC: 0, orientalV: 0, vehV: 0 }
  const subtitulo = String(body?.subtitulo ?? '')

  const admin = await createAdminClient()
  // Concesionario de turno (membrete): del config, o el principal de la base.
  let concId: string | null = null
  const { data: cfg } = await admin.from('config_cotizaciones').select('valor').eq('clave', 'concesionario_id').maybeSingle()
  concId = cfg?.valor ? String(cfg.valor) : null
  if (!concId) {
    const { data: prin } = await admin.from('concesionarios').select('id').eq('es_principal', true).limit(1).maybeSingle()
    concId = prin?.id ?? null
  }
  const c = await getConcesionarioIdentity(admin, concId)

  const hoy = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Caracas' })

  const data: CobranzaPDFData = {
    fecha: hoy,
    subtitulo,
    membrete: { nombre: c.nombre, rif: c.rif, direccion: c.direccion, telefono: c.telefono, correo: c.correo, logoSrc: c.logoSrc, colorPrimario: c.colorPrimario, colorSecundario: c.colorSecundario },
    tot, split, filas,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(React.createElement(CobranzaPDF, { data }) as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextResponse(buffer as any, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="cartera-cobranza.pdf"` },
  })
}
