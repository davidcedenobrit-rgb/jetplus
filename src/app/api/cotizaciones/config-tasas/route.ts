export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ADMIN_ROLES = ['jose', 'admin', 'director']

export async function GET() {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('config_cotizaciones')
    .select('clave, valor, updated_at')
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const rol = user.app_metadata?.rol as string
  if (!ADMIN_ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const body = await req.json()
  const bcv = Number(body.tasa_bcv)
  const usdt = Number(body.tasa_usdt)
  if (!bcv || !usdt || isNaN(bcv) || isNaN(usdt) || bcv <= 0 || usdt <= 0) {
    return NextResponse.json({ error: 'Valores de tasa inválidos' }, { status: 400 })
  }
  if (usdt <= bcv) {
    return NextResponse.json({ error: 'La tasa USDT debe ser mayor que la tasa BCV' }, { status: 400 })
  }

  const admin = await createAdminClient()
  const now = new Date().toISOString()
  await admin.from('config_cotizaciones').upsert([
    { clave: 'tasa_bcv',  valor: bcv,  updated_at: now },
    { clave: 'tasa_usdt', valor: usdt, updated_at: now },
  ])

  return NextResponse.json({ ok: true })
}
