export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// Destinatarios frecuentes del correo "Enviar a almacén".
export async function GET() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('almacen_destinatarios')
    .select('email')
    .eq('activo', true)
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true })
  return NextResponse.json((data ?? []).map((d: any) => d.email))
}

// Agrega (guarda) un correo nuevo para que quede tildable en futuras solicitudes.
export async function POST(req: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const b = await req.json().catch(() => ({}))
  const email = String(b?.email ?? '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Correo inválido' }, { status: 400 })
  }

  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('almacen_destinatarios')
    .upsert({ email, activo: true }, { onConflict: 'email' })
  if (error) return NextResponse.json({ error: 'No se pudo guardar el correo' }, { status: 500 })
  return NextResponse.json({ ok: true, email })
}
