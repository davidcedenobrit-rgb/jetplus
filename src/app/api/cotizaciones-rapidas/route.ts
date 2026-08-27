export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { permitido } from '@/lib/rate-limit'

// Deja rastro del "rapidito" (cotización rápida del link público). Se llama
// DESPUÉS de generar el PDF, sin bloquear su entrega: si el insert falla, el
// vendedor igual se lleva su documento — esto es solo el registro.
// El código de vendedora ya viene validado por el cliente (vía
// /api/vendedoras/verificar) antes de generar, pero se revalida aquí también
// porque el body lo manda el navegador y no es un canal de confianza.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const codigo = String(body.codigo ?? '').trim().toUpperCase()
    if (!/^[A-Za-z]\d{3}$/.test(codigo)) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
    }

    if (!(await permitido(`cotizacion-rapida:${codigo}`, 30, 60))) {
      return NextResponse.json({ error: 'Demasiados registros seguidos.' }, { status: 429 })
    }

    const supabase = await createAdminClient()
    const { data: vend } = await supabase
      .from('vendedoras')
      .select('nombre')
      .eq('codigo', codigo)
      .eq('activa', true)
      .maybeSingle()

    if (!vend) return NextResponse.json({ error: 'Código inválido o inactivo' }, { status: 401 })

    const clip = (s: unknown, n: number) => String(s ?? '').trim().slice(0, n) || null
    const num = (v: unknown) => (v == null || v === '' || Number.isNaN(Number(v))) ? null : Number(v)

    const { error } = await supabase.from('cotizaciones_rapidas').insert({
      vendedora_codigo: codigo,
      vendedora_nombre: vend.nombre,
      marca: clip(body.marca, 60),
      modelo: clip(body.modelo, 120),
      precio_base: num(body.precioBase),
      cuota_mensual: num(body.cuotaMensual),
      concesionario_id: clip(body.concesionarioId, 60),
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
