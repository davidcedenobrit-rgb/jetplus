export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { codigo } = await req.json()
    if (!codigo || typeof codigo !== 'string' || !/^[A-Za-z]\d{3}$/.test(codigo.trim())) {
      return NextResponse.json({ valido: false, error: 'Código inválido' }, { status: 400 })
    }

    const supabase = await createAdminClient()
    const { data } = await supabase
      .from('aliados')
      .select('nombre, sector')
      .eq('codigo', codigo.trim().toUpperCase())
      .eq('activo', true)
      .single()

    if (!data) return NextResponse.json({ valido: false })
    return NextResponse.json({ valido: true, nombre: data.nombre, sector: data.sector })
  } catch {
    return NextResponse.json({ valido: false }, { status: 500 })
  }
}
