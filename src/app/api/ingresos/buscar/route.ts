export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

// Busca ingresos YA registrados (por N° de recibo o por cliente) para "jalarlos"
// a una proforma. Se usa cuando una venta se registró directo como ingreso y se
// quiere reconstruir el flujo cotización → proforma → venta sin duplicar dinero.
export async function GET(req: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = user.app_metadata?.rol as string
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const url = new URL(req.url)
  const q = (url.searchParams.get('q') ?? '').replace(/[,()%*]/g, ' ').trim()
  if (q.length < 2) return NextResponse.json([])

  const supabase = await createAdminClient()
  const like = `%${q}%`

  // Clientes que coinciden con la búsqueda (para traer sus ingresos por cliente).
  const { data: cliRows } = await supabase
    .from('clientes')
    .select('id')
    .or(`nombre.ilike.${like},cedula_rif.ilike.${like}`)
    .limit(20)
  const cliIds = (cliRows ?? []).map(c => c.id)

  // Ingresos por N° de recibo/concepto, y por cliente coincidente.
  const cols = 'id, numero_recibo, concepto, monto, moneda, fecha_pago, estado, cliente_id, vehiculo_id, proforma_id, clientes(nombre, cedula_rif)'
  const orParts = [`numero_recibo.ilike.${like}`, `concepto.ilike.${like}`]
  if (cliIds.length) orParts.push(`cliente_id.in.(${cliIds.join(',')})`)

  const { data: ingRows } = await supabase
    .from('ingresos')
    .select(cols)
    .or(orParts.join(','))
    .order('fecha_pago', { ascending: false })
    .limit(40)

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const items = (ingRows ?? []).map((r: any) => ({
    id: r.id,
    numero_recibo: r.numero_recibo ?? '',
    concepto: r.concepto ?? '',
    monto: Number(r.monto) || 0,
    moneda: r.moneda ?? 'USD',
    fecha_pago: r.fecha_pago ?? null,
    estado: r.estado ?? '',
    cliente_id: r.cliente_id ?? null,
    cliente_nombre: r.clientes?.nombre ?? '',
    cliente_cedula: r.clientes?.cedula_rif ?? '',
    vehiculo_id: r.vehiculo_id ?? null,
    proforma_id: r.proforma_id ?? null,
  }))

  return NextResponse.json(items)
}
