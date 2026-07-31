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

  // Ingresos que caen en la bóveda (por ahora: los $500 fijos por carro AC500
  // al pagar la cuota 1). El ledger permite sumar otras fuentes en el futuro.
  const rows = await fetchAllRows<any>((from, to) => supabase
    .from('boveda_ingresos')
    .select('id, origen, concepto, monto, moneda, cliente_nombre, vehiculo, created_at')
    .order('created_at', { ascending: false })
    .range(from, to))

  const ingresos = (rows ?? []).map((d: any) => ({
    id: d.id,
    fecha: d.created_at,
    monto: Number(d.monto || 0),
    origen: d.concepto || d.origen || 'Ingreso',
    detalle: d.vehiculo || '—',
    cliente: d.cliente_nombre || '—',
  }))

  const total = ingresos.reduce((s: number, i: { monto: number }) => s + i.monto, 0)

  return <BovedaPanel ingresos={ingresos} total={total} />
}
