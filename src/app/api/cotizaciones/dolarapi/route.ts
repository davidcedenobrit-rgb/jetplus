export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Consulta las tasas de referencia de Venezuela desde dolarapi.
// - BCV (oficial): tasa automática confiable.
// - Paralelo (Monitor): referencia cercana al USDT/VES; se ofrece como
//   sugerencia, pero la tasa USDT que se guarda la decide el usuario.
export async function GET() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const res = await fetch('https://ve.dolarapi.com/v1/dolares', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'La fuente de tasas no respondió' }, { status: 502 })
    }
    const data = (await res.json()) as Array<{ fuente?: string; promedio?: number; fechaActualizacion?: string }>

    const oficial = data.find(d => d.fuente === 'oficial')
    const paralelo = data.find(d => d.fuente === 'paralelo')

    const bcv = Number(oficial?.promedio) || 0
    const par = Number(paralelo?.promedio) || 0

    if (bcv <= 0) {
      return NextResponse.json({ error: 'No se pudo obtener la tasa BCV' }, { status: 502 })
    }

    return NextResponse.json({
      bcv,
      paralelo: par,
      actualizado: oficial?.fechaActualizacion ?? paralelo?.fechaActualizacion ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'No se pudo conectar con la fuente de tasas' }, { status: 502 })
  }
}
