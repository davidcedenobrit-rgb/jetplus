import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import { esSuperAdmin } from '@/lib/super-admin'
import BovedaPanel from './BovedaPanel'

// Bóveda: acceso reservado al admin/jefe (Rojas = super-admin).
export default async function SeguridadPage() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/login')
  if (!esSuperAdmin(user.email)) redirect('/dashboard')

  const supabase = await createAdminClient()

  // La bóveda suma DOS fuentes:
  //  1) boveda_ingresos: los $500 fijos por carro AC500 (al pagar la cuota 1).
  //  2) ventas_division_contable.pote_directiva: el "ingreso bóveda / la bolsa"
  //     que resulta de la división contable de cada venta normal.
  const [rows, divisiones] = await Promise.all([
    fetchAllRows<any>((from, to) => supabase
      .from('boveda_ingresos')
      .select('id, origen, concepto, monto, cliente_nombre, vehiculo, created_at')
      .order('created_at', { ascending: false })
      .range(from, to)),
    fetchAllRows<any>((from, to) => supabase
      .from('ventas_division_contable')
      .select('id, pote_directiva, created_at, vehiculos(marca, modelo, placa, clientes(nombre))')
      .order('created_at', { ascending: false })
      .range(from, to)),
  ])

  const deBoveda = (rows ?? []).map((d: any) => ({
    id: `b-${d.id}`,
    fecha: d.created_at,
    monto: Number(d.monto || 0),
    origen: d.concepto || d.origen || 'Ingreso',
    detalle: d.vehiculo || '—',
    cliente: d.cliente_nombre || '—',
  }))

  const deDivision = (divisiones ?? [])
    .filter((d: any) => Number(d.pote_directiva || 0) !== 0)
    .map((d: any) => ({
      id: `dc-${d.id}`,
      fecha: d.created_at,
      monto: Number(d.pote_directiva || 0),
      origen: 'Ingreso bóveda — división contable',
      detalle: [d.vehiculos?.marca, d.vehiculos?.modelo, d.vehiculos?.placa].filter(Boolean).join(' · ') || '—',
      cliente: d.vehiculos?.clientes?.nombre ?? '—',
    }))

  const ingresos = [...deBoveda, ...deDivision].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
  const total = ingresos.reduce((s: number, i: { monto: number }) => s + i.monto, 0)

  return <BovedaPanel ingresos={ingresos} total={total} />
}
