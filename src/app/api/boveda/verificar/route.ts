export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { esSuperAdmin } from '@/lib/super-admin'

// Verifica la clave secreta de la bóveda en el servidor (no se expone al navegador).
// La clave se puede sobreescribir con la variable de entorno BOVEDA_CLAVE.
export async function POST(req: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (rol !== 'jose' && !esSuperAdmin(user.email)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const clave = String(b.clave ?? '').trim()
  const esperada = (process.env.BOVEDA_CLAVE ?? '2208').trim()

  return NextResponse.json({ ok: clave.length > 0 && clave === esperada })
}
