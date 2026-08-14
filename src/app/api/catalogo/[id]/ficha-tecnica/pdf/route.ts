export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { Document, Page, Image, StyleSheet } from '@react-pdf/renderer'
import { createAdminClient } from '@/lib/supabase/server'

const styles = StyleSheet.create({
  page: { padding: 0 },
  image: { width: '100%' },
})

function FichaTecnicaPDF({ src }: { src: string }) {
  return React.createElement(
    Document,
    { title: 'Ficha técnica' },
    React.createElement(Page, { size: 'A4', style: styles.page }, React.createElement(Image, { src, style: styles.image }))
  )
}

// Envuelve la imagen de la ficha técnica (cargada aparte por el equipo) en un
// PDF de una sola página, para poder descargarla/compartirla igual que el
// resto de los documentos del sistema.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const descargar = new URL(req.url).searchParams.get('download') === '1'

  const supabase = await createAdminClient()
  const { data: v } = await supabase
    .from('catalogo_ventas')
    .select('model, ficha_tecnica_url')
    .eq('id', id)
    .maybeSingle()

  if (!v?.ficha_tecnica_url) {
    return NextResponse.json({ error: 'Ficha técnica no disponible' }, { status: 404 })
  }

  const buffer = await renderToBuffer(
    React.createElement(FichaTecnicaPDF, { src: v.ficha_tecnica_url }) as React.ReactElement
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
