export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { enviarCorreosPrueba } from '@/lib/email-repuestos'

const TEST_SECRET = process.env.TEST_EMAIL_SECRET ?? 'prueba-sore-2026'

const DESTINATARIOS_PRUEBA = [
  'davidcedenobrit@gmail.com',
  'davidcedenobrit@gmail.com',
  'navigroup.ia@gmail.com',
]

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') return new Response(null, { status: 404 })
  const secret = req.nextUrl.searchParams.get('s')
  if (secret !== TEST_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const destinatarios = DESTINATARIOS_PRUEBA

  const soloVhm = req.nextUrl.searchParams.get('solo') === 'vhm'
  const results = await enviarCorreosPrueba(destinatarios, soloVhm)

  const ok    = results.filter(r => r.ok).length
  const total = results.length
  return NextResponse.json({
    ok: true,
    enviados: `${ok}/${total}`,
    destinatarios,
    detalle: results,
  })
}
