// RUTA TEMPORAL — ELIMINAR DESPUÉS DE USARLA
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const SETUP_TOKEN = 'laoriental2026'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('token') !== SETUP_TOKEN) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const USER_ID = '093b709c-58cb-41a4-bd1a-4ed1f3938d8d'

  const { data, error } = await supabase.auth.admin.updateUserById(USER_ID, {
    email: 'admin@gmail.com',
    password: 'auto12345',
    email_confirm: true,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, email: data.user?.email, id: data.user?.id })
}
