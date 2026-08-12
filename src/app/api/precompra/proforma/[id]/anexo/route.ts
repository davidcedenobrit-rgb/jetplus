export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { AnexoADocument } from '@/lib/anexo-a-pdf'
import { getConcesionarioIdentity } from '@/lib/concesionario'
import { buildAnexoData } from '@/lib/precompra-anexo'
import { resolverPrecompraProformaDB } from '@/lib/cotizacion-federada'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const url = new URL(req.url)
  const variante: 'oriental' | 'vehimotors' = url.searchParams.get('variante') === 'vehimotors' ? 'vehimotors' : 'oriental'
  const descargar = url.searchParams.get('download') === '1'

  const resuelta = await resolverPrecompraProformaDB(id)
  if (!resuelta) return NextResponse.json({ error: 'Proforma no encontrada' }, { status: 404 })
  const { db: supabase, proforma: pf } = resuelta

  const conces = await getConcesionarioIdentity(supabase, pf.concesionario_id ?? 'jetplus')
  const data = buildAnexoData(pf, conces, variante)

  const buffer = await renderToBuffer(
    React.createElement(AnexoADocument, { data }) as React.ReactElement<Record<string, unknown>>
  )
  const nombreArch = `Anexo-A-${variante === 'vehimotors' ? 'Vehimotors' : 'Oriental'}-${(pf.cliente_nombre || '').split(' ')[0] || 'cliente'}.pdf`
  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${descargar ? 'attachment' : 'inline'}; filename="${nombreArch}"`,
      'Cache-Control': 'private, no-cache',
    },
  })
}
