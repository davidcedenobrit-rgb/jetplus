export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director']
const CAMPOS_TEXTO = ['nombre', 'rif', 'direccion', 'telefono', 'correo', 'logo_url', 'sello_url', 'prefijo'] as const

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = user.app_metadata?.rol as string
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const body = await req.json()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  for (const c of CAMPOS_TEXTO) {
    if (c in body) {
      const v = body[c]
      update[c] = v == null || String(v).trim() === '' ? (c === 'nombre' || c === 'prefijo' ? undefined : null) : String(v).trim()
    }
  }
  if ('activo' in body) update.activo = !!body.activo
  if ('es_principal' in body) update.es_principal = !!body.es_principal

  // Validaciones mínimas
  if (update.nombre !== undefined && !String(update.nombre).trim()) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  }
  if (update.prefijo !== undefined) {
    const pfx = String(update.prefijo).trim().toUpperCase()
    if (!/^[A-Z]{2,5}$/.test(pfx)) {
      return NextResponse.json({ error: 'El prefijo debe tener 2 a 5 letras' }, { status: 400 })
    }
    update.prefijo = pfx
  }

  const supabase = await createAdminClient()

  // Solo un principal a la vez
  if (update.es_principal === true) {
    await supabase.from('concesionarios').update({ es_principal: false }).neq('id', id)
  }

  const { error } = await supabase.from('concesionarios').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
