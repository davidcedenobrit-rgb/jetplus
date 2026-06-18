export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createAdminClient()
  const body = await req.json()
  const {
    vehiculo_id, marca, modelo, img_url,
    precio_base, gastos_label, gastos_contado,
    mostrar_credito, gastos_credito, cuota_mensual, orden,
  } = body

  if (!marca || !modelo || !precio_base) {
    return NextResponse.json({ error: 'Marca, modelo y precio base son obligatorios' }, { status: 400 })
  }

  const { data, error } = await supabase.from('promocion_vehiculos').insert({
    vehiculo_id: vehiculo_id || null,
    marca, modelo,
    img_url: img_url || null,
    precio_base: Number(precio_base),
    gastos_label: gastos_label || 'Póliza Seguro Vehículo, Traslado, Gastos, INTT, Gastos Notaría',
    gastos_contado: Number(gastos_contado) || 0,
    mostrar_credito: !!mostrar_credito,
    gastos_credito: Number(gastos_credito) || 0,
    cuota_mensual: Number(cuota_mensual) || 0,
    orden: Number(orden) || 0,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}
