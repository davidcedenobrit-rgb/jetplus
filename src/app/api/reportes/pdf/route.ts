export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ReportePDF } from '@/lib/reporte-pdf'
import { getConcesionarioIdentity } from '@/lib/concesionario'
import type { ReportePayload } from '@/lib/reporte-tipos'

const DIR = ['jose', 'admin', 'director', 'mary', 'leysdem']

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!DIR.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const payload = (await req.json().catch(() => null)) as ReportePayload | null
  if (!payload || !payload.titulo || !Array.isArray(payload.secciones)) {
    return NextResponse.json({ error: 'Datos del reporte inválidos' }, { status: 400 })
  }
  // Límite defensivo de filas para no generar PDFs enormes.
  payload.secciones = payload.secciones.map(sec => ({ ...sec, rows: (sec.rows ?? []).slice(0, 2000) }))

  const admin = await createAdminClient()
  const ident = await getConcesionarioIdentity(admin, 'la-oriental')
  const membrete = {
    nombre: ident.nombre, rif: ident.rif, direccion: ident.direccion,
    telefono: ident.telefono, correo: ident.correo, logoSrc: ident.logoSrc,
    colorPrimario: ident.colorPrimario, colorSecundario: ident.colorSecundario,
  }
  const generado = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const pdf = await renderToBuffer(React.createElement(ReportePDF, { data: payload, membrete, generado }) as any)
  const nombre = payload.titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return new NextResponse(pdf as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${nombre || 'reporte'}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
