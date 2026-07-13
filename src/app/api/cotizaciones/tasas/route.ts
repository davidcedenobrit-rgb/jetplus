export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('config_cotizaciones')
    .select('clave, valor')

  const map: Record<string, number> = {}
  for (const row of data ?? []) map[row.clave] = Number(row.valor)

  return NextResponse.json({
    tasa_bcv: map['tasa_bcv'] ?? 0,
    tasa_usdt: map['tasa_usdt'] ?? 0,
  })
}
