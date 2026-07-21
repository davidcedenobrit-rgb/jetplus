export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// Devuelve la estructura de costos EDITABLE de una cotización para el panel
// "Aplicar descuento": si la cotización ya tiene estructura guardada la usa; si
// no, la siembra desde el catálogo del vehículo según su modalidad/plan.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const supabase = await createAdminClient()

  const { data: cot } = await supabase
    .from('cotizaciones')
    .select('id, vehiculo_id, modalidad, plan, precio_base, gastos_monto, diferencial_monto, cuota_mensual, estructura_costos, cuotas_banco, personalizado_inicial_pct, personalizado_meses, personalizado_tasa_pct')
    .eq('id', id)
    .single()
  if (!cot) return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })

  // Ya negociada: devolver lo guardado.
  if (cot.estructura_costos) {
    return NextResponse.json({ estructura: cot.estructura_costos, origen: 'guardada' })
  }

  const modalidad = cot.modalidad as 'contado' | 'credito_24'
  const plan = (cot.plan ?? 'vehimotors') as string

  // Sembrar desde el catálogo del vehículo.
  const vacio = { placa: 0, poliza_vehiculo: 0, poliza_vida: 0, gastos_vhm: 0, honorarios: 0, gastos_int: 0, alfombras: 0, transporte: 0, accesorios: 0, igtf: 0, diferencial: Number(cot.diferencial_monto ?? 0) }
  let lineas = { ...vacio }
  let inicialPct = modalidad === 'contado' ? 100 : 40
  let tasaPct = 0
  let meses = modalidad === 'contado' ? 0 : 24

  if (cot.vehiculo_id) {
    const { data: v } = await supabase
      .from('catalogo_ventas')
      .select('*')
      .eq('id', cot.vehiculo_id)
      .maybeSingle()
    if (v) {
      const n = (x: any) => Number(x ?? 0)
      if (modalidad === 'contado') {
        lineas = {
          placa: n(v.placa_c), poliza_vehiculo: n(v.poliza_vehiculo_c), poliza_vida: n(v.poliza_vida_c),
          gastos_vhm: n(v.gastos_vhm_c), honorarios: n(v.honorarios_c), gastos_int: n(v.gastos_int_c),
          alfombras: n(v.alfombras_c), transporte: n(v.transporte_c), accesorios: n(v.accesorios_c),
          igtf: n(v.igtf_c), diferencial: Number(cot.diferencial_monto ?? 0),
        }
        inicialPct = 100; tasaPct = 0; meses = 0
      } else if (plan === 'banco_100') {
        lineas = {
          placa: n(v.placa_monto), poliza_vehiculo: n(v.poliza_vehiculo_banco), poliza_vida: n(v.poliza_vida_banco),
          gastos_vhm: 0, honorarios: n(v.honorarios_banco), gastos_int: n(v.gastos_internos_banco),
          alfombras: n(v.alfombras_banco), transporte: n(v.transporte_banco), accesorios: n(v.accesorios_banco),
          igtf: n(v.igtf_banco), diferencial: Number(cot.diferencial_monto ?? 0),
        }
        inicialPct = 30; tasaPct = n(v.tasa_banco_pct) || 16; meses = Number(cot.cuotas_banco) || n(v.cuotas_banco) || 24
      } else if (plan === 'personalizado') {
        lineas = {
          placa: n(v.placa_cr), poliza_vehiculo: n(v.poliza_vehiculo_cr), poliza_vida: n(v.poliza_vida_cr),
          gastos_vhm: n(v.gastos_vhm_cr), honorarios: n(v.honorarios_cr), gastos_int: n(v.gastos_int_cr),
          alfombras: n(v.alfombras_cr), transporte: n(v.transporte_cr), accesorios: n(v.accesorios_cr),
          igtf: n(v.igtf_cr), diferencial: Number(cot.diferencial_monto ?? 0),
        }
        inicialPct = Number(cot.personalizado_inicial_pct) || 40
        tasaPct = Number(cot.personalizado_tasa_pct) || 0
        meses = Number(cot.personalizado_meses) || 24
      } else {
        // Crédito Vehimotors
        lineas = {
          placa: n(v.placa_cr), poliza_vehiculo: n(v.poliza_vehiculo_cr), poliza_vida: n(v.poliza_vida_cr),
          gastos_vhm: n(v.gastos_vhm_cr), honorarios: n(v.honorarios_cr), gastos_int: n(v.gastos_int_cr),
          alfombras: n(v.alfombras_cr), transporte: n(v.transporte_cr), accesorios: n(v.accesorios_cr),
          igtf: n(v.igtf_cr), diferencial: Number(cot.diferencial_monto ?? 0),
        }
        inicialPct = n(v.inicial_pct) || 40; tasaPct = n(v.tasa_vhm_pct) || 0; meses = n(v.cuotas_vhm) || 24
      }
    }
  }

  const estructura = {
    precioBase: Number(cot.precio_base ?? 0),
    modalidad, plan,
    inicialPct, tasaPct, meses,
    cuotaVehimotors: Number(cot.cuota_mensual ?? 0),
    lineas,
  }
  return NextResponse.json({ estructura, origen: 'catalogo' })
}
