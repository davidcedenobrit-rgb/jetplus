import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import { redirect } from 'next/navigation'
import MovimientosClient, { type Movimiento } from './MovimientosClient'
import type { Cuenta } from './actions'

export const dynamic = 'force-dynamic'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

export default async function MovimientosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) redirect('/dashboard')

  // Vista financiera completa: se lee con service-role tras la guarda de rol.
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: cuentasData } = await svc
    .from('cuentas').select('id, nombre, tipo, moneda, custodio, banco, orden, activo')
    .eq('activo', true).order('orden').order('nombre')
  const cuentas = (cuentasData ?? []) as Cuenta[]

  const ingresos = await fetchAllRows<any>((from, to) => svc
    .from('ingresos')
    .select('id, numero_recibo, concepto, monto, moneda, metodo_pago, fecha_pago, banco_receptor, deposito_banco, estado, cuenta_id, conciliado, conciliado_por, conciliado_at, clientes(nombre)')
    .neq('estado', 'anulado')
    .order('fecha_pago', { ascending: false })
    .range(from, to))

  const egresos = await fetchAllRows<any>((from, to) => svc
    .from('egresos')
    .select('id, numero_egreso, concepto, monto, moneda, metodo_pago, fecha_egreso, banco_origen, beneficiario, estado, cuenta_id, conciliado, conciliado_por, conciliado_at')
    .neq('estado', 'anulado')
    .order('fecha_egreso', { ascending: false })
    .range(from, to))

  const movs: Movimiento[] = []
  for (const i of ingresos) {
    movs.push({
      tipo: 'ingreso',
      id: i.id,
      numero: i.numero_recibo ?? null,
      fecha: i.fecha_pago ?? null,
      concepto: i.concepto ?? null,
      contraparte: (i.clientes?.nombre as string) ?? null,
      metodo: i.metodo_pago ?? null,
      moneda: i.moneda ?? 'USD',
      monto: Number(i.monto) || 0,
      banco: i.banco_receptor || i.deposito_banco || null,
      estado: i.estado ?? null,
      cuenta_id: i.cuenta_id ?? null,
      conciliado: !!i.conciliado,
      conciliado_por: i.conciliado_por ?? null,
      conciliado_at: i.conciliado_at ?? null,
    })
  }
  for (const e of egresos) {
    movs.push({
      tipo: 'egreso',
      id: e.id,
      numero: e.numero_egreso ?? null,
      fecha: e.fecha_egreso ?? null,
      concepto: e.concepto ?? null,
      contraparte: e.beneficiario ?? null,
      metodo: e.metodo_pago ?? null,
      moneda: e.moneda ?? 'USD',
      monto: Number(e.monto) || 0,
      banco: e.banco_origen ?? null,
      estado: e.estado ?? null,
      cuenta_id: e.cuenta_id ?? null,
      conciliado: !!e.conciliado,
      conciliado_por: e.conciliado_por ?? null,
      conciliado_at: e.conciliado_at ?? null,
    })
  }

  // Orden por fecha desc (los sin fecha al final)
  movs.sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''))

  return <MovimientosClient movimientos={movs} cuentas={cuentas} />
}
