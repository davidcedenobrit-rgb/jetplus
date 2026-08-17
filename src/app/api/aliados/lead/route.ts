export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES_PERMITIDOS = ['jose', 'admin', 'director', 'mary', 'leysdem']
const clip = (s: unknown, n: number) => String(s ?? '').trim().slice(0, n)

// POST público: un aliado (inmobiliaria/seguros) registra un cliente referido
// desde /aliados. Se valida el código contra la tabla aliados (igual que
// vendedoras) y se guarda el lead con la atribución del aliado para que
// Gabriel/Lucas puedan verlo en el panel interno.
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}))
    const aliadoCodigo = clip(b.aliadoCodigo, 10).toUpperCase()
    const clienteNombre = clip(b.clienteNombre, 120)
    const clienteTelefono = clip(b.clienteTelefono, 40)

    if (!/^[A-Za-z]\d{3}$/.test(aliadoCodigo)) {
      return NextResponse.json({ error: 'Código de aliado inválido' }, { status: 400 })
    }
    if (clienteNombre.length < 2 || clienteTelefono.length < 6) {
      return NextResponse.json({ error: 'Nombre y teléfono son obligatorios' }, { status: 400 })
    }
    const origenCaptacion = clip(b.origenCaptacion, 60)
    if (!origenCaptacion) {
      return NextResponse.json({ error: 'Indica dónde captaste al cliente' }, { status: 400 })
    }

    const supabase = await createAdminClient()
    const { data: aliado } = await supabase
      .from('aliados')
      .select('id, nombre')
      .eq('codigo', aliadoCodigo)
      .eq('activo', true)
      .maybeSingle()

    if (!aliado) return NextResponse.json({ error: 'Aliado no encontrado' }, { status: 401 })

    const tieneInicial = b.tieneInicial === true
    const inicialMontoRaw = Number(b.inicialMonto)
    const inicialMonto = tieneInicial && Number.isFinite(inicialMontoRaw) && inicialMontoRaw > 0 ? inicialMontoRaw : null

    const { error } = await supabase.from('aliados_leads').insert({
      aliado_id: aliado.id,
      aliado_codigo: aliadoCodigo,
      aliado_nombre: aliado.nombre,
      cliente_nombre: clienteNombre,
      cliente_telefono: clienteTelefono,
      vehiculo_interes: clip(b.vehiculoInteres, 120) || null,
      tiene_inicial: tieneInicial,
      inicial_monto: inicialMonto,
      origen_captacion: origenCaptacion,
    })
    if (error) return NextResponse.json({ error: 'No se pudo registrar' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// GET (staff): actividad de todos los aliados, para el panel interno de
// Gabriel/Lucas dentro de Gestión de ventas.
export async function GET() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES_PERMITIDOS.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('aliados_leads')
    .select('id, aliado_codigo, aliado_nombre, cliente_nombre, cliente_telefono, vehiculo_interes, tiene_inicial, inicial_monto, origen_captacion, created_at')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
