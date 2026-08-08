export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { porcentajeContabilidadAC500, baseContabilidadAC500 } from '@/lib/ac500-porcentaje'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']
const r2 = (n: number) => Math.round(n * 100) / 100

// Registra el pago de la cuota 1 de una proforma AC500 y hace caer los
// $500 fijos en la BÓVEDA (idempotente: no duplica si ya se registró).
// Opcionalmente asocia anticipos/ingresos que el cliente ya pagó, para que
// cubran la cuota 1 y no se le cobre dos veces (mismo criterio que la venta
// normal): los anticipos descuentan su saldo y los ingresos se amarran a la
// proforma. Aun así se registran los $500 en bóveda + el % en contabilidad.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const body = (await req.json().catch(() => ({}))) as { anticipoIds?: string[]; ingresoIds?: string[] }
  const anticipoIds = (body.anticipoIds ?? []).filter(Boolean)
  const ingresoIds = (body.ingresoIds ?? []).filter(Boolean)

  const supabase = await createAdminClient()
  const { data: pf } = await supabase
    .from('precompra_proformas')
    .select('id, cliente_id, cuota1_pagada, cuota1_monto_boveda, cliente_nombre, marca, modelo, concesionario_id, cuotas')
    .eq('id', id)
    .maybeSingle()
  if (!pf) return NextResponse.json({ error: 'Proforma no encontrada' }, { status: 404 })
  if (pf.cuota1_pagada) return NextResponse.json({ error: 'La cuota 1 ya fue registrada' }, { status: 409 })

  const monto = Number(pf.cuota1_monto_boveda ?? 500) || 500
  const nowIso = new Date().toISOString()
  const vehiculo = [pf.marca, pf.modelo].filter(Boolean).join(' ')
  const cuota1 = Array.isArray(pf.cuotas) ? Number(pf.cuotas[0]) || 0 : 0

  // 1) $500 fijos → BÓVEDA
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

  // 2) Porcentaje del carro (sobre suma cuotas 1..5) → CONTABILIDAD
  const pct = porcentajeContabilidadAC500(pf.marca, pf.modelo)
  const base = baseContabilidadAC500(pf.cuotas)
  const montoContab = r2(base * pct / 100)
  if (montoContab > 0) {
    await supabase.from('contabilidad_ingresos').insert({
      origen: 'ac500_porcentaje',
      concepto: `Asegúrate $500 — ${pct}% del carro (cuotas 1-5)`,
      monto: montoContab,
      moneda: 'USD',
      porcentaje: pct,
      base_calculo: base,
      proforma_id: id,
      cliente_nombre: pf.cliente_nombre ?? null,
      vehiculo: vehiculo || null,
      concesionario_id: pf.concesionario_id ?? null,
      creado_por: user.id,
      created_at: nowIso,
    })
  }

  await supabase.from('precompra_proformas').update({
    cuota1_pagada: true, cuota1_pagada_at: nowIso,
    pct_contabilidad: pct, base_contabilidad: base, monto_contabilidad: montoContab,
    updated_at: nowIso,
  }).eq('id', id)

  // 3) Asociar pagos ya hechos por el cliente (best-effort; no revierte la venta).
  let anticiposAplicados = 0
  let ingresosAsociados = 0

  // (a) Ingresos YA registrados → se amarran a la proforma (no se recobra nada).
  if (ingresoIds.length) {
    const { data: ings } = await supabase.from('ingresos')
      .update({ proforma_id: id })
      .in('id', ingresoIds)
      .select('id, monto')
    ingresosAsociados = r2((ings ?? []).reduce((s, x) => s + (Number(x.monto) || 0), 0))
  }

  // (b) Anticipos del cliente → se convierten en ingreso ligado a la proforma,
  //     descontando su saldo (topado a lo que quede de la cuota 1).
  if (anticipoIds.length && pf.cliente_id) {
    const { data: ants } = await supabase.from('anticipos')
      .select('id, saldo_usd')
      .in('id', anticipoIds)
      .eq('cliente_id', pf.cliente_id)
      .in('estado', ['disponible', 'parcial'])
      .order('fecha_pago')
    let restante = cuota1 > 0 ? Math.max(0, r2(cuota1 - ingresosAsociados)) : Number.POSITIVE_INFINITY
    for (const a of ants ?? []) {
      if (restante <= 0.009) break
      const saldo = Number(a.saldo_usd) || 0
      if (saldo <= 0) continue
      const aplica = r2(Math.min(saldo, restante))
      if (aplica <= 0) continue
      const { error: aInsErr } = await supabase.from('ingresos').insert({
        cliente_id: pf.cliente_id,
        proforma_id: id,
        concepto: `Anticipo aplicado a cuota 1 (Asegúrate $500) — ${vehiculo}`,
        monto: aplica,
        moneda: 'USD',
        metodo_pago: 'Anticipo',
        fecha_pago: nowIso.slice(0, 10),
        estado: 'registrado',
        anticipo_id: a.id,
        registrado_por: user.id,
      })
      if (aInsErr) continue
      const nuevoSaldo = r2(saldo - aplica)
      await supabase.from('anticipos').update({
        saldo_usd: nuevoSaldo,
        estado: nuevoSaldo <= 0.009 ? 'aplicado' : 'parcial',
        updated_at: nowIso,
      }).eq('id', a.id)
      anticiposAplicados = r2(anticiposAplicados + aplica)
      restante = r2(restante - aplica)
    }
  }

  return NextResponse.json({ ok: true, monto, pct, base, montoContab, anticiposAplicados, ingresosAsociados })
}
