export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const meses = searchParams.get('meses')
  const supabase = await createAdminClient()
  let q = supabase
    .from('planes_ac500')
    .select('id, marca, modelo, meses, cuota_0, cuota_1, cuota_2, cuota_3, cuota_4, cuota_5, cuota_6, cuota_7, cuota_8, cuota_9, total')
    .eq('activo', true)
    .order('marca')
    .order('modelo')
  if (meses) q = (q as any).eq('meses', parseInt(meses))
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
