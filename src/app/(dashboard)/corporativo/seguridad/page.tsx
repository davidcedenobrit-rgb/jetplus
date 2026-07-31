import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import BovedaPanel from './BovedaPanel'

// Solo Rojas (rol jose) puede acceder al módulo de Seguridad → Bóveda.
export default async function SeguridadPage() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (rol !== 'jose') redirect('/dashboard')

  const supabase = await createAdminClient()

  // "Ingreso bóveda" = lo que queda para la directiva por cada venta (la bolsa),
  // ya calculado en la división contable (pote_directiva).
  const divisiones = await fetchAllRows<any>((from, to) => supabase
    .from('ventas_division_contable')
    .select('id, pote_directiva, comision_directiva_monto, created_at, vehiculos(marca, modelo, placa, clientes(nombre))')
    .order('created_at', { ascending: false })
    .range(from, to))

  const ingresos = (divisiones ?? [])
    .filter((d: any) => Number(d.pote_directiva || 0) !== 0)
    .map((d: any) => ({
      id: d.id,
      fecha: d.created_at,
      monto: Number(d.pote_directiva || 0),
      origen: 'División contable — venta',
      detalle: [d.vehiculos?.marca, d.vehiculos?.modelo, d.vehiculos?.placa].filter(Boolean).join(' · '),
      cliente: d.vehiculos?.clientes?.nombre ?? '—',
    }))

  const total = ingresos.reduce((s: number, i: { monto: number }) => s + i.monto, 0)

  return <BovedaPanel ingresos={ingresos} total={total} />
}
