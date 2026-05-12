// RUTA TEMPORAL — ELIMINAR DESPUÉS DE USARLA
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const SETUP_TOKEN = 'laoriental2026'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('token') !== SETUP_TOKEN) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return NextResponse.json({ error: 'Env vars faltantes', url: !!url, key: !!key }, { status: 500 })
  }

  const USER_ID = '093b709c-58cb-41a4-bd1a-4ed1f3938d8d'
  const endpoint = `${url}/auth/v1/admin/users/${USER_ID}`

  try {
    const res = await fetch(endpoint, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${key}`,
        'apikey': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: 'auto12345', email_confirm: true }),
    })

    const text = await res.text()
    let parsed: any
    try { parsed = JSON.parse(text) } catch { parsed = text.slice(0, 300) }

    return NextResponse.json({
      httpStatus: res.status,
      urlCalled: endpoint.replace(USER_ID, '[uid]'),
      keyPrefix: key.slice(0, 20) + '...',
      response: parsed,
    })
  } catch (e: any) {
    return NextResponse.json({ fetchError: e.message }, { status: 500 })
  }
}
