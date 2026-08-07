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

// GET: la fila completa de la proforma (para precargar el editor).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await guard(); if (g.error) return NextResponse.json({ error: g.error }, { status: g.status })
  const supabase = await createAdminClient()
  const { data, error } = await supabase.from('proformas').select('*').eq('id', id).maybeSingle()
  if (error || !data) return NextResponse.json({ error: 'Proforma no encontrada' }, { status: 404 })
  return NextResponse.json(data)
}

// PATCH: editar los montos/condiciones de una proforma (solo pre-venta).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await guard(); if (g.error) return NextResponse.json({ error: g.error }, { status: g.status })
  const supabase = await createAdminClient()

  const { data: pro } = await supabase.from('proformas').select('id, vehiculo_id, showroom_id, cliente_id, numero, cliente_snapshot, vehiculo_snapshot, cronograma_snapshot').eq('id', id).maybeSingle()
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
    const hoy = new Date()
    const fMasDias = (dias: number) => new Date(hoy.getTime() + Math.round(dias) * 86400000).toISOString().slice(0, 10)
    patch.cronograma_snapshot = b.cronograma.map((c: any, i: number) => {
      const dias = c.dias != null && c.dias !== '' ? Math.round(n(c.dias)) : null
      return {
        numero: n(c.numero) || (i + 1), tipo: c.tipo ?? null, etiqueta: c.etiqueta ?? null, dias,
        fecha_vencimiento: c.fecha_vencimiento ?? (dias != null ? fMasDias(dias) : null),
        monto: n(c.monto), estado: 'pendiente', monto_pagado: 0,
      }
    })
  }

  // Cambio de unidad del showroom (si aplica).
  const nuevoShowroom = (b.showroomId ?? '') as string
  const actualShowroom = (pro.showroom_id ?? '') as string
  if (b.showroomId !== undefined && nuevoShowroom !== actualShowroom) {
    // Liberar la unidad anterior.
    if (actualShowroom) {
      await supabase.from('vehiculos_showroom').update({ estado: 'en_agencia', reservado_por: null, cliente_id: null, reserva_notas: null, updated_at: new Date().toISOString() })
        .eq('id', actualShowroom).eq('estado', 'reservado')
    }
    if (nuevoShowroom) {
      const { data: u } = await supabase.from('vehiculos_showroom')
        .select('id, marca, modelo, version, color, placa, anio, vin, serial_motor, proforma_vehimotors, fecha_llegada, estado')
        .eq('id', nuevoShowroom).maybeSingle()
      if (!u || !['en_agencia', 'reservado'].includes(u.estado)) return NextResponse.json({ error: 'Esa unidad ya no está disponible (vendida o transferida)' }, { status: 409 })
      await supabase.from('vehiculos_showroom').update({
        estado: 'reservado', cliente_id: pro.cliente_id ?? null, reservado_por: g.user!.id,
        reserva_notas: `Proforma ${pro.numero}`, updated_at: new Date().toISOString(),
      }).eq('id', nuevoShowroom).in('estado', ['en_agencia', 'reservado'])
      patch.showroom_id = nuevoShowroom
      patch.vehiculo_snapshot = {
        ...(pro.vehiculo_snapshot ?? {}), showroom_id: u.id, marca: u.marca, modelo: u.modelo, version: u.version,
        placa: u.placa, color: u.color, anio: u.anio, vin: u.vin, serial_motor: u.serial_motor, proforma_vehimotors: u.proforma_vehimotors, fecha_llegada: u.fecha_llegada,
      }
    } else {
      patch.showroom_id = null
    }
  }

  // Certificado de origen (número + fecha de emisión) del vehículo — en el snapshot.
  if (typeof b.certificadoOrigen === 'string' || typeof b.certificadoOrigenFecha === 'string') {
    const baseSnap = (patch.vehiculo_snapshot ?? pro.vehiculo_snapshot ?? {}) as Record<string, any>
    const merged = { ...baseSnap }
    if (typeof b.certificadoOrigen === 'string') merged.certificado_origen = b.certificadoOrigen.trim() || null
    if (typeof b.certificadoOrigenFecha === 'string') merged.certificado_origen_fecha = b.certificadoOrigenFecha.trim() || null
    patch.vehiculo_snapshot = merged
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
