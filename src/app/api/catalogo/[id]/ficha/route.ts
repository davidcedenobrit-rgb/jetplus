export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { createAdminClient } from '@/lib/supabase/server'
import { getConcesionarioIdentity } from '@/lib/concesionario'
import { prepararImagenPdf } from '@/lib/pdf-image'

const GRAY = '#6b7280'
const DARK = '#111827'

const s = StyleSheet.create({
  page: { padding: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '18 28 10' },
  logoWrap: { width: 140, height: 40, justifyContent: 'center' },
  logo: { maxWidth: 140, maxHeight: 40, objectFit: 'contain' },
  companyBlock: { alignItems: 'flex-end', maxWidth: '58%' },
  companyName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK },
  companyRif: { fontSize: 8, fontFamily: 'Helvetica-Bold', marginTop: 1 },
  companyLine: { fontSize: 7, color: GRAY, marginTop: 0.5, textAlign: 'right' },
  titleRow: { paddingHorizontal: 28, paddingBottom: 8 },
  title: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: DARK, textTransform: 'uppercase' },
  imgWrap: { paddingHorizontal: 14, paddingBottom: 14 },
  img: { width: '100%' },
  footer: { position: 'absolute', bottom: 12, left: 28, right: 28, flexDirection: 'row', justifyContent: 'space-between', borderTop: `0.5pt solid ${GRAY}`, paddingTop: 4 },
  footerText: { fontSize: 7, color: GRAY },
})

interface PaginaFicha { url: string; orden: number }

function FichaTecnicaPDF({ paginas, modelo, conces }: {
  paginas: string[] // ya preparadas (base64) en orden
  modelo: string
  conces: { nombre: string; rif: string | null; direccion: string | null; telefono: string | null; correo: string | null; logoSrc?: string; colorPrimario: string }
}) {
  const dir = (conces.direccion || '').split('\n').filter(Boolean)
  const contacto = [conces.telefono, conces.correo].filter(Boolean).join(' · ')
  return React.createElement(
    Document,
    { title: `Ficha técnica — ${modelo}` },
    ...paginas.map((img, i) =>
      React.createElement(
        Page,
        { key: i, size: 'A4', style: s.page },
        React.createElement(
          View,
          { style: [s.header, { borderBottom: `1.5pt solid ${conces.colorPrimario}` }] },
          React.createElement(View, { style: s.logoWrap },
            conces.logoSrc
              ? React.createElement(Image, { src: conces.logoSrc, style: s.logo })
              : React.createElement(Text, { style: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: DARK } }, conces.nombre)),
          React.createElement(
            View, { style: s.companyBlock },
            React.createElement(Text, { style: s.companyName }, conces.nombre),
            conces.rif ? React.createElement(Text, { style: [s.companyRif, { color: conces.colorPrimario }] }, `RIF: ${conces.rif}`) : null,
            ...dir.map((linea, li) => React.createElement(Text, { key: li, style: s.companyLine }, linea)),
            contacto ? React.createElement(Text, { style: s.companyLine }, contacto) : null,
          ),
        ),
        React.createElement(View, { style: s.titleRow },
          React.createElement(Text, { style: s.title }, `Ficha técnica · ${modelo}`)),
        React.createElement(View, { style: s.imgWrap },
          React.createElement(Image, { src: img, style: s.img })),
        React.createElement(View, { style: s.footer, fixed: true },
          React.createElement(Text, { style: s.footerText }, conces.nombre),
          React.createElement(Text, { style: s.footerText, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Página ${pageNumber} de ${totalPages}` })),
      )
    )
  )
}

// PDF público de la ficha técnica: se compone AL PEDIRLO con el membrete del
// concesionario de turno (si cambia el logo/color, las fichas salen con el
// nuevo sin tener que resubir nada). Solo el GET es público — cargar/borrar
// páginas vive en /api/catalogo/ficha-tecnica/subir, que exige sesión.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const descargar = new URL(req.url).searchParams.get('download') === '1'

  const admin = await createAdminClient()
  const { data: v } = await admin
    .from('catalogo_ventas')
    .select('model, ficha_tecnica_paginas')
    .eq('id', id)
    .maybeSingle()

  const paginas = (v?.ficha_tecnica_paginas ?? []) as PaginaFicha[]
  if (!v || paginas.length === 0) {
    return NextResponse.json({ error: 'Ficha técnica no disponible' }, { status: 404 })
  }
  const ordenadas = [...paginas].sort((a, b) => a.orden - b.orden)

  let concId: string | null = null
  const { data: cfg } = await admin.from('config_cotizaciones').select('valor').eq('clave', 'concesionario_id').maybeSingle()
  concId = cfg?.valor ? String(cfg.valor) : null
  if (!concId) {
    const { data: prin } = await admin.from('concesionarios').select('id').eq('es_principal', true).limit(1).maybeSingle()
    concId = prin?.id ?? null
  }
  const conces = await getConcesionarioIdentity(admin, concId)

  // Cada hoja de ficha es una tabla en letra pequeña: 1600px/calidad 86 para
  // que se lea bien, sin arrastrar el peso de la foto original del catálogo.
  const imagenes = (await Promise.all(
    ordenadas.map(p => prepararImagenPdf(p.url, { maxWidth: 1600, quality: 86 }))
  )).filter((img): img is string => !!img)

  if (imagenes.length === 0) {
    return NextResponse.json({ error: 'No se pudieron cargar las páginas de la ficha técnica' }, { status: 502 })
  }

  const buffer = await renderToBuffer(
    React.createElement(FichaTecnicaPDF, {
      paginas: imagenes,
      modelo: v.model,
      conces: {
        nombre: conces.nombre, rif: conces.rif, direccion: conces.direccion,
        telefono: conces.telefono, correo: conces.correo,
        logoSrc: conces.logoSrc, colorPrimario: conces.colorPrimario,
      },
    }) as React.ReactElement<any>
  )
  const nombre = `Ficha_${v.model}`.replace(/[^\w-]+/g, '_')

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${descargar ? 'attachment' : 'inline'}; filename="${nombre}.pdf"`,
      'Cache-Control': 'public, max-age=300',
    },
  })
}
