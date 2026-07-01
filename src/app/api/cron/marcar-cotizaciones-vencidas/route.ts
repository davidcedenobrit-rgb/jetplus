export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Vercel cron ejecuta esto una vez al día (configurar en vercel.json)
// También se puede invocar manualmente con ?secret=<CRON_SECRET>
export async function GET(req: Request) {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  const authHeader = req.headers.get('authorization')

  // Vercel Cron envía Authorization: Bearer <CRON_SECRET>
  const isVercelCron =
    process.env.CRON_SECRET &&
    authHeader === `Bearer ${process.env.CRON_SECRET}`

  const isManualCall =
    process.env.CRON_SECRET && secret === process.env.CRON_SECRET

  if (!isVercelCron && !isManualCall) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = await createAdminClient()
  const { data, error } = await supabase.rpc('marcar_cotizaciones_vencidas')

  if (error) {
    console.error('[cron/vencer-cotizaciones] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    cotizaciones_marcadas_vencidas: data ?? 0,
    ejecutado_en: new Date().toISOString(),
  })
}
