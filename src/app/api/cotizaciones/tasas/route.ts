export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('config_cotizaciones')
    .select('clave, valor')

  const map: Record<string, number> = {}
  for (const row of data ?? []) map[row.clave] = Number(row.valor)

  return NextResponse.json({
    tasa_bcv: map['tasa_bcv'] ?? 0,
    tasa_vhm: map['tasa_vehimotors'] ?? 0,
  })
}
