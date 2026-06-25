export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const NUM_FIELDS = [
  'precio_base',
  // Gastos contado
  'placa_c', 'poliza_vehiculo_c', 'poliza_vida_c', 'gastos_vhm_c', 'honorarios_c', 'gastos_int_c', 'alfombras_c',
  // Gastos crédito
  'placa_cr', 'poliza_vehiculo_cr', 'poliza_vida_cr', 'gastos_vhm_cr', 'honorarios_cr', 'gastos_int_cr', 'alfombras_cr',
  'tasa_vhm_pct', 'cuotas_vhm', 'cuota_mensual',
  // Banco
  'placa_monto', 'poliza_vehiculo_banco', 'poliza_vida_banco', 'honorarios_banco', 'gastos_internos_banco', 'alfombras_banco',
  'diferencial_pct', 'tasa_banco_pct',
  // Totales legacy
  'gastos_contado', 'gastos_credito', 'orden',
]

export async function POST(req: Request) {
  const supabase = await createAdminClient()
  const body = await req.json()

  if (!body.marca || !body.modelo || !body.precio_base) {
    return NextResponse.json({ error: 'Marca, modelo y precio base son obligatorios' }, { status: 400 })
  }

  const row: Record<string, unknown> = {
    vehiculo_id: body.vehiculo_id || null,
    marca: body.marca,
    modelo: body.modelo,
    img_url: body.img_url || null,
    gastos_label: body.gastos_label || 'Póliza Seguro Vehículo, Traslado, Gastos, INTT, Gastos Notaría',
    mostrar_credito: !!body.mostrar_credito,
    mostrar_banco: !!body.mostrar_banco,
    orden: Number(body.orden) || 0,
  }
  for (const f of NUM_FIELDS) {
    if (f in body && body[f] != null) row[f] = Number(body[f]) || 0
  }

  const { data, error } = await supabase.from('promocion_vehiculos').insert(row).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}
