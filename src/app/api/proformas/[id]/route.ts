export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']
const n = (x: unknown) => { const v = Number(x); return Number.isFinite(v) ? v : 0 }

async function guard() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return { error: 'No autorizado', status: 401 as const, user: null }
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return { error: 'Sin permisos', status: 403 as const, user: null }
  return { error: null, status: 200 as const, user }
}

// PATCH: editar los montos/condiciones de una proforma (solo pre-venta).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await guard(); if (g.error) return NextResponse.json({ error: g.error }, { status: g.status })
  const supabase = await createAdminClient()

  const { data: pro } = await supabase.from('proformas').select('id, vehiculo_id, cronograma_snapshot').eq('id', id).maybeSingle()
  if (!pro) return NextResponse.json({ error: 'Proforma no encontrada' }, { status: 404 })
  if (pro.vehiculo_id) return NextResponse.json({ error: 'La venta ya fue registrada; no se puede editar la proforma.' }, { status: 409 })

  const b = await req.json().catch(() => ({}))
  const patch: Record<string, any> = { updated_at: new Date().toISOString() }
  if (b.precio != null) patch.precio_vehiculo = n(b.precio)
  if (b.inicial != null) patch.monto_inicial = n(b.inicial)
  if (b.financiado != null) { patch.monto_financiado = n(b.financiado); patch.saldo_pendiente = n(b.financiado) }
  if (b.meses != null) patch.num_cuotas = Math.max(0, Math.round(n(b.meses)))
  if (typeof b.condiciones === 'string') patch.condiciones_personalizadas = b.condiciones.trim() || null
  if (Array.isArray(b.cronograma)) {
    patch.cronograma_snapshot = b.cronograma.map((c: any, i: number) => ({
      numero: n(c.numero) || (i + 1), tipo: c.tipo ?? null, etiqueta: c.etiqueta ?? null,
      fecha_vencimiento: c.fecha_vencimiento ?? null, monto: n(c.monto), estado: 'pendiente', monto_pagado: 0,
    }))
  }

  const { error } = await supabase.from('proformas').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE: borrar una proforma (solo pre-venta). Libera la unidad reservada.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await guard(); if (g.error) return NextResponse.json({ error: g.error }, { status: g.status })
  const supabase = await createAdminClient()

  const { data: pro } = await supabase.from('proformas').select('id, vehiculo_id, showroom_id').eq('id', id).maybeSingle()
  if (!pro) return NextResponse.json({ error: 'Proforma no encontrada' }, { status: 404 })
  if (pro.vehiculo_id) return NextResponse.json({ error: 'La venta ya fue registrada; no se puede borrar la proforma.' }, { status: 409 })

  // Liberar la unidad reservada, si la hay.
  if (pro.showroom_id) {
    await supabase.from('vehiculos_showroom').update({
      estado: 'en_agencia', reservado_por: null, cliente_id: null, reserva_notas: null, reserva_vence: null, updated_at: new Date().toISOString(),
    }).eq('id', pro.showroom_id).eq('estado', 'reservado')
  }

  const { error } = await supabase.from('proformas').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'No se pudo borrar' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
