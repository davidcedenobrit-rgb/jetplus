export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

// Busca anticipos con saldo disponible (por cliente o referencia) para asociarlos
// a una proforma. El anticipo "vive" como saldo del cliente hasta la venta.
export async function GET(req: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = user.app_metadata?.rol as string
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const url = new URL(req.url)
  const q = (url.searchParams.get('q') ?? '').replace(/[,()%*]/g, ' ').trim()
  if (q.length < 2) return NextResponse.json([])

  const admin = await createAdminClient()
  const like = `%${q}%`

  // Clientes que coinciden, para traer sus anticipos.
  const { data: cliRows } = await admin.from('clientes').select('id').or(`nombre.ilike.${like},cedula_rif.ilike.${like}`).limit(20)
  const cliIds = (cliRows ?? []).map(c => c.id)

  const orParts: string[] = [`referencia.ilike.${like}`]
  if (cliIds.length) orParts.push(`cliente_id.in.(${cliIds.join(',')})`)

  const { data } = await admin
    .from('anticipos')
    .select('id, monto, moneda, monto_usd, saldo_usd, metodo_pago, referencia, fecha_pago, concepto, cliente_id, proforma_id, clientes(nombre, cedula_rif)')
    .in('estado', ['disponible', 'parcial'])
    .gt('saldo_usd', 0.009)
    .or(orParts.join(','))
    .order('fecha_pago', { ascending: false })
    .limit(30)

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const items = (data ?? []).map((r: any) => ({
    id: r.id,
    saldo_usd: Number(r.saldo_usd) || 0,
    monto: Number(r.monto) || 0,
    moneda: r.moneda ?? 'USD',
    metodo_pago: r.metodo_pago ?? null,
    referencia: r.referencia ?? null,
    fecha_pago: r.fecha_pago ?? null,
    concepto: r.concepto ?? null,
    cliente_id: r.cliente_id ?? null,
    cliente_nombre: r.clientes?.nombre ?? '',
    cliente_cedula: r.clientes?.cedula_rif ?? '',
    proforma_id: r.proforma_id ?? null,
  }))
  return NextResponse.json(items)
}
