export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ComprobanteRetencionPDF } from '@/lib/comprobante-retencion-pdf'
import { buildComprobanteData } from '@/lib/comprobante-retencion-data'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

function getLogoBase64(): string | undefined {
  try { return `data:image/png;base64,${readFileSync(join(process.cwd(), 'public', 'logo-jetplus.png')).toString('base64')}` }
  catch { return undefined }
}
function getSelloBase64(): string | undefined {
  try { return `data:image/jpeg;base64,${readFileSync(join(process.cwd(), 'public', 'sello-jetplus.jpeg')).toString('base64')}` }
  catch { return undefined }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id } = await params
  const admin = await createAdminClient()

  const { data: e } = await admin.from('egresos').select('*').eq('id', id).maybeSingle()
  if (!e) return NextResponse.json({ error: 'Egreso no encontrado' }, { status: 404 })
  if (!e.ret_iva_aplica || !e.ret_iva_comprobante) {
    return NextResponse.json({ error: 'Este egreso no tiene retención de IVA generada.' }, { status: 400 })
  }

  const data = await buildComprobanteData(admin, e)
  data.logoSrc = getLogoBase64()
  data.selloSrc = getSelloBase64()
  const pdfBuffer = await renderToBuffer(React.createElement(ComprobanteRetencionPDF, { data }) as any)
  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="comprobante-retencion-${e.ret_iva_comprobante}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
