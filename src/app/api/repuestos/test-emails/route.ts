export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { enviarCorreosPrueba } from '@/lib/email-repuestos'

const TEST_SECRET = process.env.TEST_EMAIL_SECRET ?? 'prueba-sore-2026'

const CORREOS_VEHIMOTORS = [
  process.env.CORREO_VEHIMOTORS_1 ?? 'aaparicio@saicve.com',
  process.env.CORREO_VEHIMOTORS_2 ?? 'repuestos@saicve.com',
  process.env.CORREO_VEHIMOTORS_3 ?? 'fdiaz@saicve.com',
]

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('s')
  if (secret !== TEST_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const inclVhm = req.nextUrl.searchParams.get('vhm') === '1'

  const destinatarios = [
    'rojasjgx@gmail.com',
    'davidcedenobrit@gmail.com',
    ...(inclVhm ? CORREOS_VEHIMOTORS : []),
  ]

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
