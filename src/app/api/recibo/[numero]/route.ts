export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

// GET /api/recibo/[numero]
// Proxy del PDF almacenado en Supabase Storage — URL limpia para WhatsApp y correo

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ numero: string }> }
) {
  const { numero } = await params
  if (!numero) return NextResponse.json({ error: 'Número de recibo requerido' }, { status: 400 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const storagePath = `recibos/${numero}.pdf`

  // Descarga el PDF desde Supabase Storage
  const { data, error } = await admin.storage.from('comprobantes').download(storagePath)

  if (error || !data) {
    return NextResponse.json({ error: 'Recibo no encontrado' }, { status: 404 })
  }

  const buffer = Buffer.from(await data.arrayBuffer())

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${numero}.pdf"`,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
