export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// GET público: horarios ya ocupados para una fecha, para deshabilitarlos
// en el selector de /citas antes de que el cliente intente agendar.
export async function GET(req: Request) {
  const fecha = new URL(req.url).searchParams.get('fecha') ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
  }

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('citas_taller')
    .select('hora_inicio')
    .eq('fecha', fecha)
    .eq('estado', 'confirmada')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ocupadas: (data ?? []).map(r => String(r.hora_inicio).slice(0, 5)) })
}
