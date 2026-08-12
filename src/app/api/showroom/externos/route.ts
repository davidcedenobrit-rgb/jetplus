export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { listaConcesionariosExternos } from '@/lib/concesionarios-externos'

// Inventario de showroom de los concesionarios aliados con base propia (Ki Auto).
// Sirve para vender desde Jetplus un carro que físicamente está en el aliado:
// se lista aquí y al registrar la venta se transfiere a Jetplus.
// Devuelve [] si no hay ningún aliado configurado (no rompe la venta normal).
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const externos = listaConcesionariosExternos()
  if (externos.length === 0) return NextResponse.json([])

  const out: any[] = []
  for (const c of externos) {
    try {
      const dest = createServiceClient(c.url, c.serviceKey)
      const { data } = await dest
        .from('vehiculos_showroom')
        .select('id, marca, modelo, version, anio, color, placa, vin, serial_motor, proforma_vehimotors, estado')
        .in('estado', ['en_agencia', 'reservado'])
        .order('created_at', { ascending: false })
        .limit(200)
      for (const v of data ?? []) {
        out.push({ ...v, origen: c.key, origen_label: c.label })
      }
    } catch (e) {
      console.error('[showroom/externos] error leyendo', c.key, e)
    }
  }
  return NextResponse.json(out)
}
