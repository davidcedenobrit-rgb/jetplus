export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/* eslint-disable @typescript-eslint/no-explicit-any */
// Planes AC500 para la cotización. Fuente de verdad: ac500_vehiculos (lo que
// edita Rojas en el catálogo AC500). Antes leía de planes_ac500 (desactualizada),
// por eso no salían todos los planes ni su costo actualizado.
export async function GET(req: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const nParam = parseInt(searchParams.get('meses') ?? '6')
  const n = [6, 9, 12].includes(nParam) ? nParam : 6
  const pref = `p${n}_`

  const supabase = await createAdminClient()
  const { data, error } = await supabase.from('ac500_vehiculos').select('*').order('orden')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const planes = (data ?? [])
    // Configurado para ese plazo (tiene total) y no desactivado por Rojas.
    .filter((v: any) => Number(v[`${pref}total`]) > 0 && v[`${pref}activo`] !== false)
    .map((v: any) => {
      const plan: any = {
        id: v.id, marca: v.brand, modelo: v.model, meses: n,
        cuota_0: Number(v.reserva) || 0,
        total: Number(v[`${pref}total`]) || 0,
      }
      for (let i = 1; i <= 12; i++) plan[`cuota_${i}`] = i <= n ? (Number(v[`${pref}c${i}`]) || 0) : 0
      return plan
    })

  return NextResponse.json(planes)
}
