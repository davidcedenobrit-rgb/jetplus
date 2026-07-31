export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

// Registra el pago de la cuota 1 de una proforma AC500 y hace caer los
// $500 fijos en la BÓVEDA (idempotente: no duplica si ya se registró).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const supabase = await createAdminClient()
  const { data: pf } = await supabase
    .from('precompra_proformas')
    .select('id, cuota1_pagada, cuota1_monto_boveda, cliente_nombre, marca, modelo, concesionario_id')
    .eq('id', id)
    .maybeSingle()
  if (!pf) return NextResponse.json({ error: 'Proforma no encontrada' }, { status: 404 })
  if (pf.cuota1_pagada) return NextResponse.json({ error: 'La cuota 1 ya fue registrada' }, { status: 409 })

  const monto = Number(pf.cuota1_monto_boveda ?? 500) || 500
  const nowIso = new Date().toISOString()
  const vehiculo = [pf.marca, pf.modelo].filter(Boolean).join(' ')

  const { error: insErr } = await supabase.from('boveda_ingresos').insert({
    origen: 'ac500_cuota1',
    concepto: 'Asegúrate $500 — pago de cuota 1',
    monto,
    moneda: 'USD',
    proforma_id: id,
    cliente_nombre: pf.cliente_nombre ?? null,
    vehiculo: vehiculo || null,
    concesionario_id: pf.concesionario_id ?? null,
    creado_por: user.id,
    created_at: nowIso,
  })
  if (insErr) return NextResponse.json({ error: 'No se pudo registrar el ingreso en bóveda' }, { status: 500 })

  await supabase.from('precompra_proformas').update({
    cuota1_pagada: true, cuota1_pagada_at: nowIso, updated_at: nowIso,
  }).eq('id', id)

  return NextResponse.json({ ok: true, monto })
}
