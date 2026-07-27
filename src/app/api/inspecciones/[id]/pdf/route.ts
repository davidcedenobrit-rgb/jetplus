export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { InspeccionPDF, type InspeccionPDFData, type DamageMark } from '@/lib/inspeccion-pdf'
import { PLANTILLAS, agruparItems, type Plantilla } from '@/lib/inspecciones'
import { getConcesionarioIdentity } from '@/lib/concesionario'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const admin = await createAdminClient()

  const { data: insp } = await admin
    .from('inspecciones_vehiculo')
    .select('id, tipo, datos, items, realizado_por, notas, created_at, showroom_vehiculo_id')
    .eq('id', id).maybeSingle()
  if (!insp) return NextResponse.json({ error: 'Inspección no encontrada' }, { status: 404 })

  const plant = PLANTILLAS[insp.tipo as Plantilla['tipo']]
  if (!plant) return NextResponse.json({ error: 'Tipo de inspección desconocido' }, { status: 400 })

  const datos = (insp.datos ?? {}) as Record<string, string>
  const savedItems = (insp.items ?? []) as { clave: string; label: string; estado: string; nota?: string }[]
  const savedMap: Record<string, { estado: string; nota?: string }> = {}
  savedItems.forEach(x => { savedMap[x.clave] = { estado: x.estado, nota: x.nota } })

  // Campos generales (solo los que tienen valor)
  const campos = plant.campos
    .map(c => ({ label: c.label, valor: datos[c.clave] ?? '' }))
    .filter(c => c.valor !== '')

  // Checklist agrupado usando el orden de la plantilla
  const grupos = agruparItems(plant.items).map(({ grupo, items }) => ({
    grupo,
    items: items
      .filter(it => savedMap[it.clave])
      .map(it => ({ label: it.label, estado: savedMap[it.clave].estado, nota: savedMap[it.clave].nota })),
  })).filter(g => g.items.length > 0)

  const ident = await getConcesionarioIdentity(admin, 'la-oriental')
  const firmas = insp.tipo === 'pdi' ? ['Técnico responsable', 'Supervisor de taller'] : ['Cliente', 'Asesor técnico']

  // Marcas del diagrama de daños (guardadas en datos._damage como JSON)
  let marks: DamageMark[] = []
  try { if (datos._damage) marks = JSON.parse(datos._damage) as DamageMark[] } catch { marks = [] }

  const data: InspeccionPDFData = {
    membrete: {
      nombre: ident.nombre, rif: ident.rif, direccion: ident.direccion,
      telefono: ident.telefono, correo: ident.correo, logoSrc: ident.logoSrc,
      colorPrimario: ident.colorPrimario, colorSecundario: ident.colorSecundario,
    },
    titulo: plant.titulo,
    fecha: (datos.fecha || insp.created_at || '').slice(0, 10),
    campos,
    estados: plant.estados.map(e => ({ value: e.value, label: e.label })),
    grupos,
    notas: insp.notas ?? null,
    leyenda: plant.descripcion,
    firmas,
    marks,
  }

  const pdfBuffer = await renderToBuffer(React.createElement(InspeccionPDF, { data }) as any)
  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${insp.tipo}-${insp.id}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
