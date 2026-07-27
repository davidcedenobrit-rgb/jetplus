export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES_PERMITIDOS = ['jose', 'admin', 'director']

async function checkAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES_PERMITIDOS.includes(rol)) return null
  return user
}

const num = (v: unknown): number | null => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// GET ?cotizacionId=... → devuelve el acuerdo de esa cotización (o null)
export async function GET(req: Request) {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const cotizacionId = new URL(req.url).searchParams.get('cotizacionId')
  if (!cotizacionId) return NextResponse.json({ error: 'Falta cotizacionId' }, { status: 400 })

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('acuerdos_cobro')
    .select('*')
    .eq('cotizacion_id', cotizacionId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ acuerdo: data ?? null })
}

// POST → crea/actualiza el acuerdo de una cotización (doble financiamiento).
export async function POST(req: Request) {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const {
    cotizacionId,
    inicialTotal, montoContado, montoFinanciado,
    numCuotas, cuotaMonto, planCuotas,
    observaciones,
  } = body

  if (!cotizacionId) return NextResponse.json({ error: 'Falta cotizacionId' }, { status: 400 })
  const financiado = num(montoFinanciado)
  if (!financiado || financiado <= 0) {
    return NextResponse.json({ error: 'Indica el monto financiado por La Oriental.' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  // La cotización debe existir; de ahí tomamos las vendedoras responsables.
  const { data: cot } = await supabase
    .from('cotizaciones')
    .select('id, vendedoras, vendedora_nombre')
    .eq('id', cotizacionId)
    .maybeSingle()
  if (!cot) return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })

  const vendedoras = cot.vendedoras
    ?? (cot.vendedora_nombre ? [{ nombre: cot.vendedora_nombre }] : null)

  // Un acuerdo por cotización: si ya existe, se actualiza (mientras no esté aceptado).
  const { data: existente } = await supabase
    .from('acuerdos_cobro')
    .select('id, estado')
    .eq('cotizacion_id', cotizacionId)
    .maybeSingle()

  const fields = {
    cotizacion_id: cotizacionId,
    inicial_total: num(inicialTotal),
    monto_contado: num(montoContado),
    monto_financiado: financiado,
    num_cuotas: num(numCuotas),
    cuota_monto: num(cuotaMonto),
    plan_cuotas: (typeof planCuotas === 'string' && planCuotas.trim()) ? planCuotas.trim() : null,
    vendedoras,
    observaciones: (typeof observaciones === 'string' && observaciones.trim()) ? observaciones.trim() : null,
    updated_at: new Date().toISOString(),
  }

  if (existente) {
    if (existente.estado === 'aceptado') {
      return NextResponse.json({ error: 'El acuerdo ya fue aceptado y no puede modificarse.' }, { status: 409 })
    }
    const { data, error } = await supabase
      .from('acuerdos_cobro')
      .update(fields)
      .eq('id', existente.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, acuerdo: data })
  }

  const { data, error } = await supabase
    .from('acuerdos_cobro')
    .insert([{ ...fields, estado: 'pendiente' }])
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, acuerdo: data })
}

// PATCH → marca el acuerdo como aceptado / rechazado / pendiente.
export async function PATCH(req: Request) {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { acuerdoId, estado } = await req.json().catch(() => ({}))
  if (!acuerdoId || !['aceptado', 'rechazado', 'pendiente'].includes(estado)) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const supabase = await createAdminClient()
  const update: Record<string, unknown> = { estado, updated_at: new Date().toISOString() }
  if (estado === 'aceptado') {
    update.aceptado_por = user.id
    update.aceptado_at = new Date().toISOString()
  } else {
    update.aceptado_por = null
    update.aceptado_at = null
  }

  const { data, error } = await supabase
    .from('acuerdos_cobro')
    .update(update)
    .eq('id', acuerdoId)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, acuerdo: data })
}

// DELETE ?id=... → elimina un acuerdo no aceptado.
export async function DELETE(req: Request) {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const supabase = await createAdminClient()
  const { error } = await supabase.from('acuerdos_cobro').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
