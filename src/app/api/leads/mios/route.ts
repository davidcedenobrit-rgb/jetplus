export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Público (gated por código de vendedora): clientes que ELLA registró desde
// "Registrar cliente nuevo" en /ventas, para seleccionarlos al cotizar sin
// tener que volver a teclear sus datos. Socios ven los de toda la sede.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const codigo = String(url.searchParams.get('codigo') ?? '').trim()
  if (!/^[A-Za-z]\d{3}$/.test(codigo)) {
    return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
  }

  const supabase = await createAdminClient()
  const { data: vendedora } = await supabase
    .from('vendedoras')
    .select('nombre, rol, activa')
    .eq('codigo', codigo)
    .maybeSingle()

  const esCasa = codigo.toUpperCase() === 'R000'
  if (!esCasa && (!vendedora || vendedora.activa === false)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let query = supabase
    .from('leads_captacion')
    .select('id, nombre, telefono, correo, marca, modelo, created_at')
    .eq('origen', 'vendedor_lead')
    .order('created_at', { ascending: false })
    .limit(30)

  const veTodaLaSede = esCasa || vendedora?.rol === 'socio'
  if (!veTodaLaSede) {
    query = query.eq('vendedor', vendedora!.nombre)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
