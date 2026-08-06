import { createAdminClient } from '@/lib/supabase/server'
import AnticiposClient from './AnticiposClient'

export const dynamic = 'force-dynamic'

export default async function AnticiposPage() {
  const admin = await createAdminClient()
  const { data } = await admin
    .from('anticipos')
    .select('id, cliente_id, monto, moneda, monto_usd, saldo_usd, metodo_pago, referencia, fecha_pago, concepto, estado, created_at, reserva_vehiculo, clientes(nombre, cedula_rif)')
    .order('created_at', { ascending: false })
    .limit(300)

  return <AnticiposClient anticiposIniciales={(data ?? []) as never[]} />
}
