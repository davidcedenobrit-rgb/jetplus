export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { codigo } = await req.json()
    if (!codigo || typeof codigo !== 'string' || !/^[A-Za-z]\d{3}$/.test(codigo.trim())) {
      return NextResponse.json({ valida: false, error: 'Código inválido' }, { status: 400 })
    }

    const supabase = await createAdminClient()
    const { data } = await supabase
      .from('vendedoras')
      .select('nombre')
      .eq('codigo', codigo.trim())
      .eq('activa', true)
      .single()

    if (!data) return NextResponse.json({ valida: false })
    return NextResponse.json({ valida: true, nombre: data.nombre })
  } catch {
    return NextResponse.json({ valida: false }, { status: 500 })
  }
}
