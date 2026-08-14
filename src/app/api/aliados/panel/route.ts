export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { permitido } from '@/lib/rate-limit'

// Panel propio del aliado (/aliados/panel): se autoriza solo por su código,
// igual que el panel de vendedoras. Devuelve únicamente sus propios leads.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const codigo = String(body?.codigo ?? '').trim().toUpperCase()
    if (!/^[A-Za-z]\d{3}$/.test(codigo)) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
    }

    if (!(await permitido(`aliados-panel:${codigo}`, 60, 60))) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera un momento.' }, { status: 429 })
    }

    const supabase = await createAdminClient()
    const { data: aliado } = await supabase
      .from('aliados')
      .select('codigo, nombre, sector, activo')
      .eq('codigo', codigo)
      .maybeSingle()

    if (!aliado || !aliado.activo) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 401 })
    }

    const { data: leads } = await supabase
      .from('aliados_leads')
      .select('id, cliente_nombre, cliente_telefono, vehiculo_interes, tiene_inicial, inicial_monto, created_at')
      .eq('aliado_codigo', codigo)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      aliado: { codigo: aliado.codigo, nombre: aliado.nombre, sector: aliado.sector },
      leads: leads ?? [],
    })
  } catch (err) {
    console.error('[aliados/panel] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
