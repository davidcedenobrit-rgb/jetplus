export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']
const num = (x: unknown) => { const n = Number(x); return Number.isFinite(n) ? n : 0 }

// Siembra un BORRADOR de división contable al registrar la venta, para que
// aparezca en la pestaña de división lista para completar. NO sobreescribe una
// división ya existente ni fabrica comisiones (quedan en 0 hasta que el
// director las cargue). Resuelve proforma/cotización/cliente desde el vehículo.
export async function POST(req: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const vehiculoId = b?.vehiculoId
  if (!vehiculoId) return NextResponse.json({ error: 'Falta el vehículo' }, { status: 400 })

  const supabase = await createAdminClient()

  // No sobreescribir si ya hay división para esta venta.
  const { data: existe } = await supabase.from('ventas_division_contable').select('id').eq('vehiculo_id', vehiculoId).maybeSingle()
  if (existe) return NextResponse.json({ ok: true, yaExistia: true })

  const precioVenta = num(b.precioVenta)
  const { data: pro } = await supabase
    .from('proformas')
    .select('id, cotizacion_id, cliente_id')
    .eq('vehiculo_id', vehiculoId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from('ventas_division_contable').insert({
    vehiculo_id: vehiculoId,
    proforma_id: pro?.id ?? null,
    cotizacion_id: pro?.cotizacion_id ?? null,
    cliente_id: pro?.cliente_id ?? null,
    precio_venta: precioVenta,
    monto_proforma: precioVenta,
    comision_pct: 0,
    comision_monto: 0,
    ingreso_neto_venta: 0,
    pote_directiva: 0,
    actualizado_por: user.id,
  })
  if (error) return NextResponse.json({ error: 'No se pudo sembrar la división' }, { status: 500 })
  return NextResponse.json({ ok: true, creada: true })
}
