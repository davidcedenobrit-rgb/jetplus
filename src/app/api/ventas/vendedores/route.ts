export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Público: nombres de vendedores activos para el desplegable del formulario
// "Interesado en" del link de ventas. Solo devuelve nombres (sin código).
export async function GET() {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('vendedoras')
    .select('nombre, activa')
    .order('nombre', { ascending: true })
  const nombres = (data ?? [])
    .filter((v: { activa: boolean | null }) => v.activa !== false)
    .map((v: { nombre: string }) => v.nombre)
    .filter(Boolean)
  return NextResponse.json(nombres)
}
