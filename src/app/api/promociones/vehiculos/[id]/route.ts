export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const ALLOWED_FIELDS = [
  'marca', 'modelo', 'img_url', 'vehiculo_id',
  'precio_base', 'gastos_label',
  // Contado
  'placa_c', 'poliza_vehiculo_c', 'poliza_vida_c', 'gastos_vhm_c', 'honorarios_c', 'gastos_int_c', 'alfombras_c',
  'gastos_contado',
  // Crédito
  'mostrar_credito', 'placa_cr', 'poliza_vehiculo_cr', 'poliza_vida_cr',
  'gastos_vhm_cr', 'honorarios_cr', 'gastos_int_cr', 'alfombras_cr',
  'gastos_credito', 'cuota_mensual', 'tasa_vhm_pct', 'cuotas_vhm',
  // Banco
  'mostrar_banco', 'placa_monto', 'poliza_vehiculo_banco', 'poliza_vida_banco',
  'honorarios_banco', 'gastos_internos_banco', 'alfombras_banco',
  'diferencial_pct', 'tasa_banco_pct',
  'orden',
]

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createAdminClient()
  const body = await req.json()

  const update: Record<string, unknown> = {}
  for (const k of ALLOWED_FIELDS) {
    if (k in body) update[k] = body[k]
  }

  const { error } = await supabase.from('promocion_vehiculos').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createAdminClient()
  const { error } = await supabase.from('promocion_vehiculos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
