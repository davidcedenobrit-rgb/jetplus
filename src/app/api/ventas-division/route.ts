export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

function num(x: any) { const n = Number(x); return Number.isFinite(n) ? n : 0 }

// Guarda (upsert) la división contable de una venta.
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

  const precioVenta = num(b.precioVenta)
  const pagoVM = num(b.pagoVehimotors)
  const comisionPct = num(b.comisionPct)
  const comisionMonto = b.comisionMonto != null ? num(b.comisionMonto) : Math.round(precioVenta * comisionPct) / 100

  // Referencias opcionales (proforma/cotización/cliente) desde la proforma de la venta.
  let proformaId: string | null = b.proformaId ?? null
  let cotizacionId: string | null = b.cotizacionId ?? null
  let clienteId: string | null = b.clienteId ?? null
  if (!proformaId) {
    const { data: pro } = await supabase
      .from('proformas')
      .select('id, cotizacion_id, cliente_id')
      .eq('vehiculo_id', vehiculoId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (pro) { proformaId = pro.id; cotizacionId = cotizacionId ?? pro.cotizacion_id; clienteId = clienteId ?? pro.cliente_id }
  }

  const row = {
    vehiculo_id: vehiculoId,
    proforma_id: proformaId,
    cotizacion_id: cotizacionId,
    cliente_id: clienteId,
    precio_venta: precioVenta,
    pago_vehimotors: pagoVM,
    comision_pct: comisionPct,
    comision_monto: comisionMonto,
    vendedora: (b.vendedora ?? '').toString().trim() || null,
    reportado_vm: !!b.reportadoVm,
    notas: (b.notas ?? '').toString().trim() || null,
    actualizado_por: user.id,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('ventas_division_contable')
    .upsert(row, { onConflict: 'vehiculo_id' })
    .select()
    .single()

  if (error) {
    console.error('[ventas-division] upsert error:', error)
    return NextResponse.json({ error: 'No se pudo guardar la división' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, division: data })
}
