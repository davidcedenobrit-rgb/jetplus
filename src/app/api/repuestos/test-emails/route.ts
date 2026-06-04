export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { enviarCorreosPrueba } from '@/lib/email-repuestos'

const TEST_SECRET = process.env.TEST_EMAIL_SECRET ?? 'prueba-sore-2026'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('s')
  if (secret !== TEST_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const results = await enviarCorreosPrueba([
    'rojasjgx@gmail.com',
    'davidcedenobrit@gmail.com',
  ])

  const ok    = results.filter(r => r.ok).length
  const total = results.length
  return NextResponse.json({ ok: true, enviados: `${ok}/${total}`, detalle: results })
}
